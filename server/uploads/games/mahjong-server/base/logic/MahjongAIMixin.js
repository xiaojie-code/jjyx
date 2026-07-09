/**
 * 麻将 AI 决策引擎（混入到 WSMahjongGameBaseLogic）
 *
 * 三档难度（技术梯度逐级提升）：
 *   0 入门 rookie  —— 摸到啥打啥；不主动碰/杠；会胡、会听（保证牌局能结束）
 *   1 中等 normal  —— 启发式搭子估值出牌（留刻子/对子/搭子，丢孤张）；会碰刻子；不杠
 *   2 高手 master  —— 向听数精算出牌 + 进张最大化；防点炮（危险张规避）；
 *                     碰/杠按向听代价判断；会做清一色（番型）
 *
 * 设计原则：不改动引擎既有出牌/碰/杠/胡接口，只在"轮到 AI 操作"时决定调用哪个接口。
 * 牌值编码：万 0x01-0x09 / 条 0x11-0x19 / 筒 0x21-0x29 / 字 0x30,0x40,0x50,0x60,0x70,0x80,0x90 / 花 0xa0+
 */

var log = require("../../utils/log");

const AI_LEVEL = {
    ROOKIE: 0,
    NORMAL: 1,
    MASTER: 2,
};

const MahjongAIMixin = {

    /**
     * AI 总入口：当某个 AI 座位处于可操作状态时调用，决定执行什么动作。
     * 由 on_trusteepship(index) 在 is_ai 座位时转交到这里。
     */
    ai_decide(index) {
        var seat = this.room_seats[index];
        if (!seat || !seat.is_ai) return;

        var uid = seat.user_id;
        var cfg = globalMgr.present_game_config;
        var action_state = seat.action_state;
        var AS = cfg.action_state;
        var level = seat.ai_level || 0;

        try {
            // 听牌待确认阶段：三档都听（听牌才能自摸/接铳胡，保证牌局正常结束）
            if (seat.ting_state == cfg.ting_state.wait_ting) {
                if (typeof this.ting_card === 'function') { this.ting_card(uid); return; }
                this.skip_this_part(uid);
                return;
            }

            switch (action_state) {
                case AS.send_card:
                    this.ai_send_card(index, level);
                    return;

                // 自摸胡
                case AS.self_hu:
                case AS.collision_and_hu:
                    this.hu_card(uid);
                    return;

                // 点炮可胡（含 碰/杠/胡 复合）—— 三档都抓铳胡
                case AS.hu_card:
                case AS.knock_collsion_hu:
                case AS.knock_and_hu:
                    this.hu_card(uid);
                    return;

                // 可碰
                case AS.knock_card:
                    this.ai_on_knock(index, level);
                    return;
                // 碰/杠 二选一
                case AS.knock_and_collsion:
                    this.ai_on_knock_or_collision(index, level);
                    return;
                // 可杠
                case AS.collision_card:
                    this.ai_on_collision(index, level);
                    return;

                case AS.wait:
                    return;

                default:
                    this.skip_this_part(uid);
                    return;
            }
        } catch (error) {
            log.error("ai_decide error seat=" + index + " err=" + (error && error.message));
            try { this.skip_this_part(uid); } catch (e) {}
        }
    },

    // ============================ 出牌 ============================

    ai_send_card(index, level) {
        var seat = this.room_seats[index];
        var uid = seat.user_id;
        var hand = seat.hand_holds;
        if (!hand || hand.length < 1) return;

        // 只在能打出的（isTouch=true、非花牌）牌里选
        var candidates = [];
        for (var i = 0; i < hand.length; i++) {
            if (hand[i].isTouch !== false && hand[i].value < 0xa0) candidates.push(hand[i]);
        }
        if (candidates.length < 1) candidates = hand.slice(0);

        var pick;
        if (level === AI_LEVEL.ROOKIE) {
            // 入门：打摸进来的那张（最后一张可打的）
            pick = candidates[candidates.length - 1];
        } else if (level === AI_LEVEL.NORMAL) {
            // 中等：启发式搭子估值，丢"保留价值最低"的
            pick = this.ai_pick_discard_heuristic(index, candidates);
        } else {
            // 高手：向听数精算 + 进张最大化 + 防点炮 + 清一色做番
            pick = this.ai_pick_discard_master(index, candidates);
        }

        this.send_card(uid, this.ai_clone_card(pick || candidates[candidates.length - 1]));
    },

    // -------- 中等：启发式估值出牌 --------

    ai_pick_discard_heuristic(index, candidates) {
        var hand = this.room_seats[index].hand_holds;
        var counts = this.ai_value_counts(hand);
        var best = null, bestScore = Infinity;
        for (var i = 0; i < candidates.length; i++) {
            var v = candidates[i].value;
            var score = this.ai_card_keep_value(v, counts);
            if (score < bestScore) { bestScore = score; best = candidates[i]; }
        }
        return best || candidates[candidates.length - 1];
    },

    /** 牌的"保留价值"，越高越该留（中等用） */
    ai_card_keep_value(v, counts) {
        var isHonor = v >= 0x30;
        var cnt = counts[v] || 0;
        var value = 0;
        if (cnt >= 3) value += 100;        // 刻子
        else if (cnt === 2) value += 40;   // 对子
        else value += 5;

        if (isHonor) {
            if (cnt === 1) value -= 2;      // 孤张字牌偏丢
        } else {
            var sameSuit = function (a, b) { return (a >> 4) === (b >> 4); };
            if (counts[v - 1] && sameSuit(v, v - 1)) value += 15;
            if (counts[v + 1] && sameSuit(v, v + 1)) value += 15;
            if (counts[v - 2] && sameSuit(v, v - 2)) value += 8;
            if (counts[v + 2] && sameSuit(v, v + 2)) value += 8;
        }
        return value;
    },

    // -------- 高手：向听 + 进张 + 防点炮 + 做番 --------

    ai_pick_discard_master(index, candidates) {
        var seat = this.room_seats[index];
        var melds = this.ai_melds_count(seat);
        var baseCnt = this.ai_counts34(seat.hand_holds);

        // 清一色意向：手里数牌某一门占绝对多数时，追清一色
        var pursueSuit = this.ai_pursue_flush_suit(seat.hand_holds, melds);
        // 是否有对手具备威胁（已碰/杠多 或 已听）—— 决定是否启用防点炮
        var threat = this.ai_opponent_threat(index);
        // 自身距离听牌的向听（越大越远，越该顾进攻）；组合向听：标准型与七对取最优
        var myShanten = this.ai_shanten_combined(baseCnt, melds);

        var evals = [];
        for (var i = 0; i < candidates.length; i++) {
            var v = candidates[i].value;
            var ti = this.ai_tile_index(v);
            if (ti < 0) continue;
            var cnt = baseCnt.slice(0);
            cnt[ti] -= 1;
            var sh = this.ai_shanten_combined(cnt, melds);
            evals.push({ card: candidates[i], value: v, ti: ti, cnt: cnt, shanten: sh });
        }
        if (evals.length < 1) return candidates[candidates.length - 1];

        // 1) 选向听最小
        var minSh = Infinity;
        for (var a = 0; a < evals.length; a++) minSh = Math.min(minSh, evals[a].shanten);
        var pool = evals.filter(function (e) { return e.shanten === minSh; });

        // 2) 进张数最大（剩余可改良张数）
        for (var b = 0; b < pool.length; b++) {
            pool[b].useful = this.ai_useful_tiles_count(pool[b].cnt, melds, pool[b].shanten, index);
        }
        var maxUseful = -1;
        for (var c = 0; c < pool.length; c++) maxUseful = Math.max(maxUseful, pool[c].useful);
        pool = pool.filter(function (e) { return e.useful === maxUseful; });

        // 2.5) 二步进张前瞻：仍并列时，看"进张后还能保持多少后续进张"，选牌效更宽的
        if (pool.length > 1) {
            for (var f = 0; f < pool.length; f++) {
                pool[f].twoStep = this.ai_two_step_score(pool[f].cnt, melds, pool[f].shanten, index);
            }
            var maxTwo = -1;
            for (var g = 0; g < pool.length; g++) maxTwo = Math.max(maxTwo, pool[g].twoStep);
            var refined = pool.filter(function (e) { return e.twoStep === maxTwo; });
            if (refined.length > 0) pool = refined;
        }

        // 3) 清一色做番：若在追某门，优先丢"非该门数牌 / 字牌"
        if (pursueSuit >= 0 && pool.length > 1) {
            var self = this;
            var off = pool.filter(function (e) { return self.ai_suit_of_value(e.value) !== pursueSuit; });
            if (off.length > 0) pool = off;
        }

        // 4) 防点炮：仅当对手有威胁、且自己还没听（向听>0）时，优先丢安全牌
        if (threat && minSh > 0 && pool.length > 1) {
            var self2 = this;
            var safest = null, safestScore = -Infinity;
            for (var d = 0; d < pool.length; d++) {
                var sc = self2.ai_safety_score(pool[d].value, index);
                if (sc > safestScore) { safestScore = sc; safest = pool[d]; }
            }
            if (safest) return safest.card;
        }

        // 5) 仍并列：用搭子估值兜底（丢价值最低）
        var counts = this.ai_value_counts(seat.hand_holds);
        var best = null, bestKeep = Infinity;
        for (var e2 = 0; e2 < pool.length; e2++) {
            var kv = this.ai_card_keep_value(pool[e2].value, counts);
            if (kv < bestKeep) { bestKeep = kv; best = pool[e2]; }
        }
        return (best || pool[0]).card;
    },

    // ============================ 碰 / 杠 ============================

    ai_on_knock(index, level) {
        var seat = this.room_seats[index];
        var uid = seat.user_id;
        if (level === AI_LEVEL.ROOKIE) { this.skip_this_part(uid); return; }
        if (level === AI_LEVEL.NORMAL) { this.knock_card(uid); return; }

        // 高手：碰需"不破坏清一色 且 向听不变差"
        if (this.ai_master_should_knock(index)) this.knock_card(uid);
        else this.skip_this_part(uid);
    },

    ai_on_knock_or_collision(index, level) {
        var seat = this.room_seats[index];
        var uid = seat.user_id;
        if (level === AI_LEVEL.ROOKIE) { this.skip_this_part(uid); return; }
        if (level === AI_LEVEL.NORMAL) { this.knock_card(uid); return; }
        // 高手：优先按碰评估（保留变化），不利则过
        if (this.ai_master_should_knock(index)) this.knock_card(uid);
        else this.skip_this_part(uid);
    },

    ai_on_collision(index, level) {
        var seat = this.room_seats[index];
        var uid = seat.user_id;
        if (level < AI_LEVEL.MASTER) { this.skip_this_part(uid); return; } // 入门/中等：不杠
        // 高手：已听则不杠（避免改变听口/牌墙风险）；否则杠（多花分）
        var cfg = globalMgr.present_game_config;
        if (seat.ting_state == cfg.ting_state.ting) { this.skip_this_part(uid); return; }
        this.collision_card(uid);
    },

    /** 高手判断是否该碰：碰后向听不变差，且不破坏清一色意向 */
    ai_master_should_knock(index) {
        try {
            var seat = this.room_seats[index];
            var tile = this.previous_card;
            if (!tile) return false;
            var tv = tile.value;
            var ti = this.ai_tile_index(tv);
            if (ti < 0) return false;

            var melds = this.ai_melds_count(seat);
            var cnt = this.ai_counts34(seat.hand_holds);
            if ((cnt[ti] || 0) < 2) return false; // 没有对子，无法碰

            // 清一色意向：碰的是别门数牌则不碰
            var pursue = this.ai_pursue_flush_suit(seat.hand_holds, melds);
            if (pursue >= 0 && this.ai_suit_of_value(tv) !== pursue) return false;

            // 碰是明组，会拆掉一个暗对，对七对是负面的：用"标准型向听"评估碰的收益。
            // 若手牌更接近七对（七对向听更优）则不碰，保护七对成型。
            var stdBefore = this.ai_shanten(cnt, melds);
            var qiduiBefore = this.ai_shanten_qidui(cnt, melds);
            if (qiduiBefore < stdBefore) return false; // 走七对更近，碰会破坏，放弃

            var after = cnt.slice(0); after[ti] -= 2;
            var afterSh = this.ai_shanten(after, melds + 1);
            // 碰后向听变小或持平才碰（持平也碰：把暗对变明刻，推进固定）
            return afterSh <= stdBefore;
        } catch (e) {
            return true; // 异常兜底：按原行为碰
        }
    },

    // ============================ 向听 / 进张 ============================

    /**
     * 标准型向听数（不含七对/十三幺特例；上海敲麻以标准型为主）
     * @param {number[]} cnt34 concealed 手牌 34 维计数
     * @param {number} melds 已成的明组（碰/杠）数
     */
    ai_shanten(cnt34, melds) {
        var arr = cnt34.slice(0);
        var need = 4 - melds;            // 还需从手牌凑的"组"数
        if (need < 0) need = 0;
        var best = { v: 8 };

        function dfs(idx, sets, partials, hasPair) {
            var s = sets, p = partials;
            if (s + p > need) p = need - s;           // 组+搭子 不超过所需
            if (p < 0) p = 0;
            var sh = need * 2 - s * 2 - p - (hasPair ? 1 : 0);
            if (sh < best.v) best.v = sh;

            while (idx < 34 && arr[idx] === 0) idx++;
            if (idx >= 34) return;

            // 跳过该张（当孤张丢弃）
            arr[idx]--; dfs(idx, sets, partials, hasPair); arr[idx]++;

            // 刻子
            if (arr[idx] >= 3) { arr[idx] -= 3; dfs(idx, sets + 1, partials, hasPair); arr[idx] += 3; }

            // 对子：作将 或 作搭子
            if (arr[idx] >= 2) {
                if (!hasPair) { arr[idx] -= 2; dfs(idx, sets, partials, true); arr[idx] += 2; }
                arr[idx] -= 2; dfs(idx, sets, partials + 1, hasPair); arr[idx] += 2;
            }

            // 顺子（仅数牌、同门、不跨门）
            if (idx < 27 && (idx % 9) <= 6 && arr[idx + 1] > 0 && arr[idx + 2] > 0) {
                arr[idx]--; arr[idx + 1]--; arr[idx + 2]--;
                dfs(idx, sets + 1, partials, hasPair);
                arr[idx]++; arr[idx + 1]++; arr[idx + 2]++;
            }
            // 两面/坎张搭子
            if (idx < 27 && (idx % 9) <= 7 && arr[idx + 1] > 0) {
                arr[idx]--; arr[idx + 1]--; dfs(idx, sets, partials + 1, hasPair); arr[idx]++; arr[idx + 1]++;
            }
            if (idx < 27 && (idx % 9) <= 6 && arr[idx + 2] > 0) {
                arr[idx]--; arr[idx + 2]--; dfs(idx, sets, partials + 1, hasPair); arr[idx]++; arr[idx + 2]++;
            }
        }

        dfs(0, 0, 0, false);
        return best.v;
    },

    /**
     * 七对向听数：仅在无明组(melds==0)时有效。
     * 七对需要 7 个对子；向听 = 6 - 对子数（不足 7 种牌时按缺失牌种补偿）。
     * @param {number[]} cnt34 concealed 手牌 34 维计数
     * @param {number} melds 明组数（>0 则七对不可能，返回大值）
     */
    ai_shanten_qidui(cnt34, melds) {
        if (melds > 0) return 8; // 有碰/杠则不可能七对
        var pairs = 0;
        var kinds = 0;
        for (var i = 0; i < 34; i++) {
            var c = cnt34[i] || 0;
            if (c > 0) kinds++;
            if (c >= 2) pairs++;
        }
        // 标准七对向听：6 - 对子数；若牌种不足 7，缺的种类也要摸，需加补偿
        var sh = 6 - pairs;
        if (kinds < 7) sh += (7 - kinds);
        return sh;
    },

    /**
     * 组合向听：标准型与七对取最优（越小越接近听牌）。
     * 上海敲麻支持七对(qi_dui)胡，高手档必须两者兼顾，否则一手多对子的牌会被误判。
     */
    ai_shanten_combined(cnt34, melds) {
        var std = this.ai_shanten(cnt34, melds);
        var qidui = this.ai_shanten_qidui(cnt34, melds);
        return std < qidui ? std : qidui;
    },

    /**
     * 二步进张评分：对当前手牌的每一种有效进张，模拟摸进后再计算下一步的进张宽度，
     * 用于在"向听相同、一步进张也相同"时，选择后续发展更宽的那张牌（更强的牌效）。
     * 返回加权后的二步进张总和（越大越好）。
     * @param {number[]} cnt34 丢牌后的 concealed 计数
     * @param {number} melds 明组数
     * @param {number} curShanten 当前向听
     * @param {number} index 座位
     */
    ai_two_step_score(cnt34, melds, curShanten, index) {
        var remain = this.ai_remaining_counts(index, cnt34);
        var total = 0;
        for (var ti = 0; ti < 34; ti++) {
            if ((remain[ti] || 0) <= 0) continue;
            cnt34[ti] += 1;
            var sh = this.ai_shanten_combined(cnt34, melds);
            if (sh < curShanten) {
                // 这张能推进向听：评估推进后还剩多少后续进张宽度
                var next = this.ai_useful_tiles_count(cnt34, melds, sh, index);
                total += remain[ti] * next;
            }
            cnt34[ti] -= 1;
        }
        return total;
    },

    /**
     * 进张数：丢牌后，还能让向听数下降的"牌种"数量（按剩余可用张数加权）。
     * @param {number[]} cnt34 当前 concealed 计数
     * @param {number} melds 明组数
     * @param {number} curShanten 当前向听
     * @param {number} index 座位（用于扣除已现张）
     */
    ai_useful_tiles_count(cnt34, melds, curShanten, index) {
        var remain = this.ai_remaining_counts(index, cnt34);
        var total = 0;
        for (var ti = 0; ti < 34; ti++) {
            if ((remain[ti] || 0) <= 0) continue;        // 这种牌已摸不到
            cnt34[ti] += 1;
            var sh = this.ai_shanten_combined(cnt34, melds);
            cnt34[ti] -= 1;
            if (sh < curShanten) total += remain[ti];    // 按剩余张数加权
        }
        return total;
    },

    // ============================ 防点炮 / 做番 辅助 ============================

    /** 某门数牌占绝对多数 → 返回该门 suit(0万/1条/2筒)，否则 -1（不追清一色） */
    ai_pursue_flush_suit(hand, melds) {
        var suitCnt = [0, 0, 0];
        var honor = 0, totalNum = 0;
        for (var i = 0; i < hand.length; i++) {
            var v = hand[i].value;
            if (v >= 0xa0) continue;
            var s = this.ai_suit_of_value(v);
            if (s === 3) { honor++; continue; }
            suitCnt[s]++; totalNum++;
        }
        if (totalNum < 6) return -1;
        var maxS = 0;
        if (suitCnt[1] > suitCnt[maxS]) maxS = 1;
        if (suitCnt[2] > suitCnt[maxS]) maxS = 2;
        var other = totalNum - suitCnt[maxS];
        // 主门占比高、杂牌很少（含已碰/杠也偏单门时）才认为在做清一色
        if (suitCnt[maxS] >= 7 && other <= 2) return maxS;
        return -1;
    },

    /** 是否有对手构成威胁：已碰/杠 ≥2 组，或已宣告听牌 */
    ai_opponent_threat(selfIndex) {
        var cfg = globalMgr.present_game_config;
        for (var i = 0; i < this.room_seats.length; i++) {
            if (i === selfIndex) continue;
            var s = this.room_seats[i];
            if (!s) continue;
            var melds = this.ai_melds_count(s);
            if (melds >= 2) return true;
            if (s.ting_state == cfg.ting_state.ting) return true;
        }
        return false;
    },

    /**
     * 危险度→安全分（越高越安全）：
     *  现物（已被各家打出过）最安全；字牌/边张较安全；中张(3-7)最危险。
     */
    ai_safety_score(v, selfIndex) {
        var score = 0;
        // 现物：场上弃牌池里出现过的张，安全
        var poolCount = this.ai_pool_count(v);
        score += poolCount * 10;

        if (v >= 0x30) {
            // 字牌：读牌估计——可见张数越多越安全（≥2 张时对家难做刻子/将）
            var seen = this.ai_seen_count(v);
            score += 6 + seen * 3;
        } else {
            var low = v & 0x0f;
            if (low === 1 || low === 9) score += 4;       // 幺九较安全
            else if (low === 2 || low === 8) score += 2;
            else score -= 2;                              // 中张危险

            // 读牌猜听：筋牌 + 壁牌，针对每个威胁对手做针对性安全评估
            score += this.ai_suji_safe(v, selfIndex) * 4;   // 筋牌：降低两面铳概率
            score += this.ai_wall_safe(v) * 3;              // 壁牌：相邻搭子听口不成立
        }

        // 针对性现物：对"每个威胁对手"，若该牌是它自己打过的现物，则对它绝对安全
        score += this.ai_furiten_safe(v, selfIndex) * 8;

        return score;
    },

    /** 全场某张牌的可见张数（各家弃牌 + 各家明组 + 补花池） */
    ai_seen_count(v) {
        var c = this.ai_pool_count(v);
        for (var i = 0; i < this.room_seats.length; i++) {
            var s = this.room_seats[i];
            if (!s) continue;
            c += this.ai_meld_value_count(s.knock_holds, v);
            c += this.ai_meld_value_count(s.collision_holds, v);
        }
        return c;
    },

    ai_meld_value_count(melds, v) {
        if (!melds) return 0;
        var c = 0;
        for (var i = 0; i < melds.length; i++) {
            var m = melds[i];
            var mv = (m && m.card_info_bo && m.card_info_bo.value) != null ? m.card_info_bo.value : (m && m.value);
            if (mv === v) c += 3;
        }
        return c;
    },

    /**
     * 筋牌安全度（越大越安全）：对每个威胁对手，若其弃牌里出现过 v-3 或 v+3（同门），
     * 说明它不太可能用 (v-3,v-2) 或 (v+1,v+2) 的两面等 v，v 作为两面铳的概率下降。
     * 仅对数牌中张(3-7)有意义。返回命中的威胁对手数量。
     */
    ai_suji_safe(v, selfIndex) {
        var suit = this.ai_suit_of_value(v);
        if (suit === 3 || suit < 0) return 0;
        var low = v & 0x0f;
        if (low < 3 || low > 7) return 0; // 边张/幺九无筋概念

        var cfg = globalMgr.present_game_config;
        var hits = 0;
        for (var i = 0; i < this.room_seats.length; i++) {
            if (i === selfIndex) continue;
            var s = this.room_seats[i];
            if (!s) continue;
            // 只对"有威胁"的对手评估（已听 或 明组≥2）
            var threat = (s.ting_state == cfg.ting_state.ting) || (this.ai_melds_count(s) >= 2);
            if (!threat) continue;

            var hasLow = this.ai_seat_discarded(s, v - 3) && ((v - 3) & 0x0f) >= 1;
            var hasHigh = this.ai_seat_discarded(s, v + 3) && ((v + 3) & 0x0f) <= 9;
            // 两面听被双筋覆盖最安全；单筋部分安全
            if (hasLow && hasHigh) hits += 2;
            else if (hasLow || hasHigh) hits += 1;
        }
        return hits;
    },

    /** 某座位是否打出过某值的牌（同门同值） */
    ai_seat_discarded(seat, v) {
        var out = seat && seat.out_holds;
        if (!out) return false;
        for (var i = 0; i < out.length; i++) if (out[i].value === v) return true;
        return false;
    },

    /**
     * 壁牌安全度：若某数牌 x 全场可见 4 张（摸尽），则依赖 x 的两面/坎张搭子听口不成立，
     * 使相邻的 x±1、x±2 相对更安全。返回相邻满壁的数量（越大越安全）。
     */
    ai_wall_safe(v) {
        var suit = this.ai_suit_of_value(v);
        if (suit === 3 || suit < 0) return 0;
        var safe = 0;
        var neighbors = [v - 2, v - 1, v + 1, v + 2];
        for (var i = 0; i < neighbors.length; i++) {
            var nv = neighbors[i];
            if (this.ai_suit_of_value(nv) !== suit) continue; // 不跨门
            if (this.ai_seen_count(nv) >= 4) safe += 1;       // 该邻张已摸尽=壁
        }
        return safe;
    },

    /**
     * 针对性现物安全度：统计有多少个威胁对手，v 是其自己打出过的牌（对它绝对安全，
     * 因为它若听 v 则处于振听不能荣和）。返回命中的威胁对手数。
     */
    ai_furiten_safe(v, selfIndex) {
        var cfg = globalMgr.present_game_config;
        var hits = 0;
        for (var i = 0; i < this.room_seats.length; i++) {
            if (i === selfIndex) continue;
            var s = this.room_seats[i];
            if (!s) continue;
            var threat = (s.ting_state == cfg.ting_state.ting) || (this.ai_melds_count(s) >= 2);
            if (!threat) continue;
            if (this.ai_seat_discarded(s, v)) hits += 1;
        }
        return hits;
    },

    /** 弃牌池中某张牌出现的次数（各家 out_holds 合计） */
    ai_pool_count(v) {
        var c = 0;
        for (var i = 0; i < this.room_seats.length; i++) {
            var out = this.room_seats[i] && this.room_seats[i].out_holds;
            if (!out) continue;
            for (var j = 0; j < out.length; j++) if (out[j].value === v) c++;
        }
        return c;
    },

    /** 每种牌还剩多少张可摸（4 - 自己手牌 - 各家弃牌 - 各家明组） */
    ai_remaining_counts(selfIndex, myCnt34) {
        var remain = new Array(34);
        for (var k = 0; k < 34; k++) remain[k] = 4;
        // 扣自己手牌
        for (var t = 0; t < 34; t++) remain[t] -= (myCnt34[t] || 0);
        // 扣所有弃牌 + 明组
        for (var i = 0; i < this.room_seats.length; i++) {
            var s = this.room_seats[i];
            if (!s) continue;
            this.ai_sub_pile(remain, s.out_holds);
            this.ai_sub_pile(remain, s.out_buhua_holds);
            this.ai_sub_meld(remain, s.knock_holds);
            this.ai_sub_meld(remain, s.collision_holds);
        }
        for (var m = 0; m < 34; m++) if (remain[m] < 0) remain[m] = 0;
        return remain;
    },

    ai_sub_pile(remain, pile) {
        if (!pile) return;
        for (var i = 0; i < pile.length; i++) {
            var ti = this.ai_tile_index(pile[i].value);
            if (ti >= 0) remain[ti]--;
        }
    },
    ai_sub_meld(remain, melds) {
        if (!melds) return;
        for (var i = 0; i < melds.length; i++) {
            var m = melds[i];
            var v = (m && m.card_info_bo && m.card_info_bo.value) != null
                ? m.card_info_bo.value : (m && m.value);
            var ti = this.ai_tile_index(v);
            if (ti >= 0) remain[ti] -= 3; // 碰/杠 约按 3 张扣（杠第4张影响极小，忽略）
        }
    },

    // ============================ 通用工具 ============================

    ai_melds_count(seat) {
        var k = (seat.knock_holds && seat.knock_holds.length) || 0;
        var c = (seat.collision_holds && seat.collision_holds.length) || 0;
        return k + c;
    },

    /** value → 0..33 索引（万0-8/条9-17/筒18-26/字27-33），花/非法返回 -1 */
    ai_tile_index(v) {
        if (v >= 0x01 && v <= 0x09) return v - 1;
        if (v >= 0x11 && v <= 0x19) return 9 + (v - 0x11);
        if (v >= 0x21 && v <= 0x29) return 18 + (v - 0x21);
        if (v >= 0x30 && v <= 0x90 && (v & 0x0f) === 0) return 27 + ((v >> 4) - 3);
        return -1;
    },

    /** value 的花色：0万 1条 2筒 3字；花/非法返回 -1 */
    ai_suit_of_value(v) {
        if (v >= 0x01 && v <= 0x09) return 0;
        if (v >= 0x11 && v <= 0x19) return 1;
        if (v >= 0x21 && v <= 0x29) return 2;
        if (v >= 0x30 && v <= 0x90 && (v & 0x0f) === 0) return 3;
        return -1;
    },

    /** concealed 手牌 → 34 维计数（忽略花牌） */
    ai_counts34(hand) {
        var arr = new Array(34);
        for (var k = 0; k < 34; k++) arr[k] = 0;
        for (var i = 0; i < hand.length; i++) {
            var ti = this.ai_tile_index(hand[i].value);
            if (ti >= 0) arr[ti]++;
        }
        return arr;
    },

    ai_value_counts(hand) {
        var counts = {};
        for (var i = 0; i < hand.length; i++) {
            var v = hand[i].value;
            counts[v] = (counts[v] || 0) + 1;
        }
        return counts;
    },

    ai_clone_card(card) {
        return { value: card.value, isTouch: card.isTouch, isCard: card.isCard, isShow: card.isShow };
    },
};

module.exports = MahjongAIMixin;
module.exports.AI_LEVEL = AI_LEVEL;
