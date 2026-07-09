/**
 * 普通房 AI 补位服务（独立模块）
 *
 * 作用：把一个已存在的普通房（同城竞技）里的空座位自动补成 AI 机器人，
 *      让单个真人也能凑齐人数开局（1 真人 + N 个 AI）。
 *
 * 复用：不实现任何出牌逻辑。AI 座位只打 is_ai / is_trusteeship / ai_level 标记，
 *      真正的自动出牌由引擎既有的 AI 调度核心驱动：
 *        WSMahjongGameBaseLogic.startAIScheduler() / on_trusteepship() / MahjongAIMixin.ai_decide()
 *
 * 不改动原有出牌/房间核心代码，仅作为可选模块被房间服务在「开发/测试建房」时调用。
 */
var log = require("../../utils/log");
var dbConstantMgr = require('../../mgr/DBConstantMgr');

var AI_NAMES = ['小明', '阿强', '老王', '阿芳', '大海', '小美'];

var WSAIFillService = {

    /**
     * 把房间空座位补满 AI
     * @param {*} roomid 房间号
     * @param {*} ai_level AI 难度 0入门/1中等/2高手，默认 0
     * @returns 实际补充的 AI 数量
     */
    fillEmptySeatsWithAI: function (roomid, ai_level) {
        var room_mgr  = globalMgr.present_room_mgr;
        var game_conf = globalMgr.present_game_config;

        var room_info = room_mgr.getRoomsInfoByRoomid(roomid);
        var max = room_info.max_people_num || 4;
        var level = (ai_level == null) ? 0 : ai_level;

        // 标记为 AI 补位房，并记录难度（供局间重置 / 退出销毁判断使用）
        room_info.__is_ai_fill = true;
        room_info.__ai_level = level;

        var added = 0;
        while (room_info.seats.length < max) {
            var seat_index = room_info.seats.length;
            var ai_uid = 'AI_' + roomid + '_' + seat_index;

            var ai_info = {
                userid: ai_uid,
                client_ip: null,
                user_name: AI_NAMES[seat_index % AI_NAMES.length],
                user_icon: '',
            };

            var ai_seat = room_mgr.addRoomsSeats(roomid, ai_info);
            if (!ai_seat) break; // 防御：加座失败时退出，避免死循环

            // AI 座位登记到房间用户表（state=playing，但不 bind socket）
            room_mgr.addRoomsUsersListBO(ai_uid, dbConstantMgr.ROOM_TYPE_ORDINARY, globalMgr.configMgr.rooms_users_state.playing);
            room_mgr.setRoomsUsersRoomid(ai_uid, roomid);
            room_mgr.setRoomsUsersSeatsIndex(ai_uid, ai_seat.seats_index);

            // 在线 + 托管 + AI 标记 + 难度：让引擎 AI 调度器把它当正常玩家轮转
            room_mgr.setRoomsSeatsOnline(ai_seat.seats_index, roomid, true);
            ai_seat.is_ai = true;
            ai_seat.ai_level = level;
            ai_seat.is_trusteeship = true;

            // 预置为「准备」，真人点准备后即满足全员准备 → 开局
            room_mgr.setRoomsSeatsActionState(ai_seat.seats_index, roomid, game_conf.action_state.prepare);

            added++;
        }

        if (added > 0) {
            log.warn('普通房 AI 补位完成 roomid=' + roomid + ' 补充AI=' + added
                + ' 座位总数=' + room_info.seats.length + ' ai_level=' + level);
        }
        return added;
    },

    /**
     * 是否为 AI 补位房
     */
    isAIFillRoom: function (roomid) {
        try {
            var r = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomid);
            return !!(r && r.__is_ai_fill);
        } catch (e) {
            return false;
        }
    },

    /**
     * 把房间内所有 AI 座位重置为「在线 + 准备」。
     * 用于多局对局：单局结束后真人点准备进入下一局时，AI 也需重新处于准备态，
     * 否则全员准备判定不通过，下一局开不了。
     */
    readyAISeats: function (roomid) {
        var room_mgr  = globalMgr.present_room_mgr;
        var game_conf = globalMgr.present_game_config;
        var room_info;
        try {
            room_info = room_mgr.getRoomsInfoByRoomid(roomid);
        } catch (e) {
            return;
        }
        if (!room_info || !room_info.__is_ai_fill) return;

        var seats = room_info.seats || [];
        for (var i = 0; i < seats.length; i++) {
            var s = seats[i];
            if (s && s.is_ai) {
                room_mgr.setRoomsSeatsOnline(s.seats_index, roomid, true);
                room_mgr.setRoomsSeatsActionState(s.seats_index, roomid, game_conf.action_state.prepare);
            }
        }
    },

    /**
     * 若 AI 补位房内已无在线真人，则销毁整个房间（停 AI 调度器 + 清座位/用户登记 + 删房）。
     * AI 房只为单个真人测试服务，真人一走就没有继续意义。
     * @returns 是否执行了销毁
     */
    destroyIfNoHuman: function (roomid) {
        var room_mgr = globalMgr.present_room_mgr;
        var room_info;
        try {
            room_info = room_mgr.getRoomsInfoByRoomid(roomid);
        } catch (e) {
            return false;
        }
        if (!room_info || !room_info.__is_ai_fill) return false;

        // 仍有在线真人则不销毁
        var seats = room_info.seats || [];
        for (var i = 0; i < seats.length; i++) {
            var s = seats[i];
            if (s && s.is_online && !s.is_ai) return false;
        }

        // 1) 停 AI 调度器（定时器）
        try {
            if (room_info.game_logic && typeof room_info.game_logic.stopAIScheduler === 'function') {
                room_info.game_logic.stopAIScheduler();
            }
        } catch (e) {
            log.warn('destroyIfNoHuman stopAIScheduler 忽略错误: ' + (e && e.message));
        }

        // 2) 销毁 game_logic
        try {
            globalMgr.present_game_service.onDestroy(roomid);
        } catch (e) {
            log.warn('destroyIfNoHuman onDestroy 忽略错误: ' + (e && e.message));
        }

        // 3) 清空房间座位/用户登记 + 删除房间
        try {
            room_mgr.emptyRoomByRoomid(roomid);
        } catch (e) {
            try { room_mgr.delRoomByRoomid(roomid); } catch (e2) {}
        }

        log.warn('AI 补位房无在线真人，已销毁 roomid=' + roomid);
        return true;
    },
};

module.exports = WSAIFillService;
