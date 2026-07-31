var tools = require('../../utils/tools');
var log = require("../../utils/log");
var wsMsgKeyEnum = require('../../config/WSMsgKeyEnum')
var wsUserMgr = require("../../mgr/WSUserMgr");
var systemBizCodeEnum = require('../../config/SystemBizCodeEnum');
var WSGameBaseLogic = require("./WSGameBaseLogic");
var MahjongAIMixin = require("./MahjongAIMixin");

const CardTypeMixin = {



        /**
     * 根据拆解位判断最终是否能平胡
     */
        ping_hu(mainsparts, mainsparts_length) {

            //平胡
            for (var i = 0; i < mainsparts_length; i++) {
                if (!this.is_main_part(mainsparts[i], mainsparts[i].length)) {
                    return false;
                }
            }
            return true;
        },
    
    
    
    
    
        /**
         * 判断一条龙
         */
        check_dragon(card, card_length, check_num, real_value) {
            var count = 0;
            var cacheCard = card.slice(0);
            var cardInfoBO = new globalMgr.present_card_info_bo_class();
            cardInfoBO.value = 0x00;
            cardInfoBO.isTouch = true;
            cardInfoBO.isCard = false;
    
            if (card_length % 3 != 0) {
                return false;
            }
    
            for (var i = 0; i < card_length - 1; i++) {
                if (real_value == card[i].value && card[i].value + 1 == card[i + 1].value) {
                    real_value++;
                    count++;
                    cacheCard.splice(i, 1, cardInfoBO);
                    count == 8 ? cacheCard.splice(i + 1, 1, cardInfoBO) : null;
                }
            }
    
            if (count < 8 && check_num >= 0) {
                check_num--;
                real_value = check_num == 2 ? 17 : 33;
                return this.check_dragon(card, card_length, check_num, real_value);
            }
    
            if (count == 8 && card_length == 12) {
                cacheCard.sort((a, b) => a.value - b.value);
                cacheCard.splice(0, 9);
                if (this.check_min_part(cacheCard, cacheCard.length)) {
                    return true;
                }
            }
            else if (count == 8) {
                return true;
            }
    
            return false;
        },
    
    
        /**
         * 检测最小部分（3张）符合顺子和刻子
         */
        check_min_part(card, card_length) {
            var count = 1;
            for (var i = 1; i < card_length; i++) {
                card[i - 1].value == card[i].value ? count++ : count = 1;
            }
    
            if (count < card_length) {
                for (var i = 1; i < card_length; i++) {
                    card[i - 1].value == card[i].value - 1 ? count++ : count = 1;
                }
            }
    
            return count == card_length ? true : false;
        },
    
    
    
    
    
    
    
    
    
    
    
        /**
         * 判断清一色
         */
        check_same_color(card, card_length) {
            var index_type = this.check_card_type(card[0]);
    
            for (var i = 1; i < card_length; i++) {
                if (index_type != this.check_card_type(card[i])) {
                    return false;
                }
    
            }
            return true;
        },
    
        /**
         * 对对胡(四副刻子+将)
         */
        check_dui_dui(arr, arr_length) {
            var status = true;
            var translation_result = this.postion_translate(arr, arr_length);
    
            for (var i = 0; i < translation_result.length; i++) {
                status = status && translation_result[i] == 3 ? true : false;
            }
    
            return status;
        },
    
    
        /**
         * 七对
         */
        check_qi_dui(arr, arr_length, index) {
            var status = true;
    
            if (!this.bu_xia_jia(index)) return false;
    
            arr.sort((a, b) => a.value - b.value);
            var translation_result = this.postion_translate(arr, arr_length);
    
            for (var i = 0; i < translation_result.length; i++) {
                status = status && translation_result[i] % 2 == 0 ? true : false;
            }
    
            return status;
        },
    
    
        /**
         * 十三幺
         */
        shi_san_yao(arr, arr_length, cacheCard) {
            let status = false;
            let check_arr = [];
            let base_arr = [0x01, 0x09, 0x11, 0x19, 0x21, 0x29, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80, 0x90];
    
            for (let i = 0; i < base_arr.length; i++) {
                status = status || base_arr[i] == cacheCard.value ? true : false;
            }
    
            if (!status) return status;
    
            for (let i = 0; i < arr_length; i++) {
                check_arr.push(arr[i].value);
            }
    
            base_arr.push(cacheCard.value);
            base_arr.sort((a, b) => a - b);
            check_arr.sort((a, b) => a - b);
    
            for (let i = 0; i < arr_length; i++) {
                status = status && check_arr[i] == base_arr[i] ? true : false;
            }
    
            status ? log.warn('十三幺') : null;
            return status;
        },
    
    
        /**
         * 混一色(胡了额外加算一个缺一门)
         */
        hun_yi_se(arr, arr_length) {
            let status = false;
            let check_arr = [0, 0, 0, 0];
    
            for (let i = 0; i < arr_length; i++) {
                this.check_card_type(arr[i]) == 0 ? check_arr[0] = 1 : null;
                this.check_card_type(arr[i]) == 1 ? check_arr[1] = 1 : null;
                this.check_card_type(arr[i]) == 2 ? check_arr[2] = 1 : null;
                this.check_card_type(arr[i]) == 3 ? check_arr[3] = 1 : null;
            }
    
            status = check_arr[0] != 0 && (check_arr[1] + check_arr[2] + check_arr[3] == 1);
            status ? log.warn('混一色') : null;
    
            return status;
        },
    
    
        /**
         * 缺一门
         */
        lack_one(arr, arr_length) {
            return this.caculate_main_card_type_num(arr, arr_length) == 2 ? true : false;
        },
    
    
        /**
         * 不下架
         */
        bu_xia_jia(index) {
            let status = false;
            status = this.room_seats[index].knock_holds.length == 0 && this.room_seats[index].collision_holds.length == 0 ? true : false;
    
            return status;
        },

}

const GameBtnCallBackMixin = {

    /**
         * 胡牌
         * @param {*} uid 
         */
    hu_card(uid) {
        var index = this.find_user_index(uid);
        var is_self = this.room_seats[index].hand_holds.length == 14;
        is_self ? null : this.room_seats[this.previous_index].out_holds.pop();

        //设置胡牌状态
        globalMgr.present_room_mgr.setRoomsSeatsActionState(index, this.roomid, globalMgr.present_game_config.action_state.hu_card_over);

        //计算所有分数(这里搬回手牌)
        this.caculate_score(is_self);

        let over_state = false;

        for (let i = 0; i < this.room_seats.length; i++) {
            let current_hu_state = this.room_seats[i].action_state == globalMgr.present_game_config.action_state.hu_card
                || this.room_seats[i].action_state == globalMgr.present_game_config.action_state.self_hu
                || this.room_seats[i].action_state == globalMgr.present_game_config.action_state.knock_collsion_hu
                || this.room_seats[i].action_state == globalMgr.present_game_config.action_state.knock_and_hu
                || this.room_seats[i].action_state == globalMgr.present_game_config.action_state.collision_and_hu ? true : false;
            over_state = over_state || current_hu_state;
        }
        

        //设置点炮
        !is_self ? this.room_seats[this.previous_index].is_shot = true : null;

        //自摸为高优先级
        switch (this.room_seats[index].hu_state) {
            case globalMgr.present_game_config.hu_state.yi_tiao_long:
                this.check_same_color(this.room_seats[index].hand_holds, this.room_seats[index].hand_holds.length) ?
                    globalMgr.present_room_mgr.setRoomsSeatsAnimState(index, this.roomid, globalMgr.present_game_config.anim_state.yi_tiao_long_and_qing_yi_se)
                    : globalMgr.present_room_mgr.setRoomsSeatsAnimState(this.initStates, this.roomid, globalMgr.present_game_config.anim_state.yi_tiao_long);
                break;

            case globalMgr.present_game_config.hu_state.ping_hu:
                this.check_same_color(this.room_seats[index].hand_holds, this.room_seats[index].hand_holds.length) ?
                    globalMgr.present_room_mgr.setRoomsSeatsAnimState(index, this.roomid, globalMgr.present_game_config.anim_state.qing_yi_se)
                    : globalMgr.present_room_mgr.setRoomsSeatsAnimState(index, this.roomid, globalMgr.present_game_config.anim_state.ping_hu);
                break;
        }
        is_self ? globalMgr.present_room_mgr.setRoomsSeatsAnimState(index, this.roomid, globalMgr.present_game_config.anim_state.self_hu) : null;
        this.sendMsg(wsMsgKeyEnum.update_room_info_all);
        globalMgr.present_room_mgr.setRoomsSeatsAnimState(index, this.roomid, globalMgr.present_game_config.anim_state.empty);

        if (!over_state) {
            //场景切换到结束场景
            this.runScene(globalMgr.present_game_config.game_scene.single_over);
            return;
        }
        else {
            log.warn('一炮多胡');
            var loop_arr = [];
            var loop_num = this.room_seats.length - 1;
            while (loop_num > 0) {
                index += 1;
                index > this.room_seats.length - 1 ? index = 0 : null;
                loop_arr.push(index);
                loop_num -= 1;
            }

            log.warn(loop_arr);

            for (var i = 0; i < loop_arr.length; i++) {
                let seats_index = loop_arr[i];

                if (this.check_can_hu(seats_index, cardInfoBO) && !this.room_seats[seats_index].skip_hu_state) {
                    var hand_holds = this.room_seats[seats_index].hand_holds;
                    var dark_collision_state = this.check_dark_collsion(hand_holds, hand_holds.length) != false ? true : false;
                    let ting_state = this.room_seats[i].ting_state == globalMgr.present_game_config.ting_state.ting;

                    this.check_collision_card(seats_index, cardInfoBO) && !dark_collision_state && !this.check_knock_state(seats_index, cardInfoBO)
                        ? ting_state ? globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.hu_card) :
                            globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.knock_collsion_hu)
                        : this.check_knock_card(seats_index, cardInfoBO)
                            ? globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.knock_and_hu)
                            : globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.hu_card);
                    this.cards_sort(seats_index);
                    this.sendMsg(wsMsgKeyEnum.update_room_info_all);
                    return true;
                }
                else {
                    this.cards_sort(seats_index);
                }
            }
        }
    },

    /**
     * 托管
     */
    trusteeship(uid) {
        let index = this.find_user_index(uid);
        if (index < 0 || !this.room_seats[index]) return;
        this.room_seats[index].is_trusteeship = true;
        // A room without robot seats may not have an automation scheduler yet.
        this.startAIScheduler();
        this.on_trusteepship(index);
        this.sendMsg(wsMsgKeyEnum.update_room_info_all);
    },


    /**
     * 取消托管
     */
    cancel_trusteepship(uid) {
        let index = this.find_user_index(uid);
        if (index < 0 || !this.room_seats[index]) return;
        this.room_seats[index].is_trusteeship = false;
        if (this._ai_pending_timers && this._ai_pending_timers[index]) {
            clearTimeout(this._ai_pending_timers[index]);
            this._ai_pending_timers[index] = null;
        }
        this.sendMsg(wsMsgKeyEnum.update_room_info_all);
    },
    /**
     * 出牌
     */
    send_card(uid, cardInfoBO,ting_state) {
        let index = this.find_user_index(uid);
        log.warn('index ........',index)
        log.warn(this.upIndex)
        if(ting_state != true){
            if (this.turn != index) {
                return;
            }
        }
        

        if (this.room_seats[index].hand_holds.length < 14){
            console.warn("断了")
            return false;
        } 

        cardInfoBO = this.fresh_card_info_bo(cardInfoBO);
        this.previous_card = cardInfoBO;
        this.previous_index = index;
        log.warn(this.previous_card.value % 16);

        for (var i = 0; i < this.room_seats[index].hand_holds.length; i++) {
            if (this.check_card_equal(this.room_seats[index].hand_holds[i], cardInfoBO)) {
                this.room_seats[index].hand_holds.splice(i, 1);
                break;
            }
        }

        if (this.room_seats[index].skip_hu_state == true) {
            this.room_seats[index].skip_hu_state = false;
        }

        this.room_seats[index].out_holds.push(cardInfoBO);
        

        //检测听牌
        this.room_seats[index].hu_prompt = this.prompt_hu_cards(index);
        if (this.room_seats[index].hu_prompt.length >= 1 && this.room_seats[index].ting_state != globalMgr.present_game_config.ting_state.ting) {

            console.log("cy 听牌提示");
            globalMgr.present_room_mgr.setRoomsSeatsTingState(index, this.roomid, globalMgr.present_game_config.ting_state.wait_ting);
            this.cards_sort(index);
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
            this.sendMsg(wsMsgKeyEnum.update_hand_holds);
            
            return;
        }


        //检测其他人是否胡牌，碰牌，杠牌
        let model = 'normal';
        let is_break = this.check_all_part(index, cardInfoBO, model);
        this.cards_sort(index);
        globalMgr.present_room_mgr.setRoomsSeatsActionState(index, this.roomid, globalMgr.present_game_config.action_state.wait);
        this.sendMsg(wsMsgKeyEnum.update_room_info_all);
        this.sendMsg(wsMsgKeyEnum.update_hand_holds);

        if (is_break) {
            this.startOutCardCountDown();
            log.warn(` 检测 到 其他人是否胡牌，碰牌，杠牌`)
            return;
        }

        var next_index = this.getNextSeat(index).seats_index;
        this.get_card(next_index);
    },


    //碰牌(直接将这张牌搬到手里来),碰牌后要打一张牌(设置位置)
    knock_card(uid) {
        let index = this.find_user_index(uid);
        var hand_holds = this.room_seats[index].hand_holds;
        var seats_index = this.room_seats[index].seats_index;
        var cardInfoBO = null;
        var collision_knock_state =
            this.room_seats[seats_index].action_state == globalMgr.present_game_config.action_state.knock_collsion_hu ||
            this.room_seats[seats_index].action_state == globalMgr.present_game_config.action_state.knock_and_collsion;
        cardInfoBO = collision_knock_state ? JSON.parse(JSON.stringify(this.check_collision_card(index, this.previous_card))) : JSON.parse(JSON.stringify(this.previous_card));

        hand_holds.push(cardInfoBO);
        let knock_data = {
            card_info_bo: cardInfoBO,
            card_owner_index: this.previous_index
        };

        this.room_seats[this.previous_index].out_holds.pop();
        this.room_seats[index].knock_holds.push(knock_data);
        hand_holds.sort((a, b) => a.value - b.value);

        let count = 0;
        for (var i = 0; i < hand_holds.length; i++) {
            hand_holds[i].value == cardInfoBO.value ? count += 1 : null;
            hand_holds[i].value == cardInfoBO.value && count < 4 ? hand_holds[i].isTouch = false : null;
            hand_holds[i].value == cardInfoBO.value && count < 4 ? hand_holds[i].isShow = false : null;
        }
        this.cards_sort(index);

        //碰牌完成之后，出牌
        this.turn = seats_index;
        globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.send_card);
        globalMgr.present_room_mgr.setRoomsSeatsAnimState(seats_index, this.roomid, globalMgr.present_game_config.anim_state.knock_card);
        this.sendMsg(wsMsgKeyEnum.update_hand_holds);
        this.sendMsg(wsMsgKeyEnum.update_room_info_all);
        this.startOutCardCountDown();
        globalMgr.present_room_mgr.setRoomsSeatsAnimState(seats_index, this.roomid, globalMgr.present_game_config.anim_state.empty);




    },


    //杠牌(明杠，暗杠)
    collision_card(uid) {
        let index = this.find_user_index(uid);
        var cardInfoBO = null;
        var hand_holds = this.room_seats[index].hand_holds;
        var seats_index = this.room_seats[index].seats_index;

        //明杠，未搬牌，杠别人的,也可以杠自己刚才未杠的，这里提示也有问题(加个判别)，这个cardInfoBO就有问题
        if (hand_holds.length == 13) {
            cardInfoBO = this.check_dark_collsion(hand_holds, hand_holds.length) != false ? JSON.parse(JSON.stringify(this.check_dark_collsion(hand_holds, hand_holds.length))) : JSON.parse(JSON.stringify(this.previous_card));
            cardInfoBO.isShow = true;
            this.room_seats[this.previous_index].out_holds.pop();
        }
        else if (hand_holds.length == 14) {
            cardInfoBO = this.check_collision_card(index, this.previous_card);

            if (this.check_knock_state(index, cardInfoBO)) {
                for (var i = 0; i < this.room_seats[index].knock_holds.length; i++) {
                    this.room_seats[index].knock_holds[i].card_info_bo.value == cardInfoBO.value ? this.room_seats[index].knock_holds.splice(i, 1) : null;
                }
            }

            for (var i = 0; i < hand_holds.length; i++) {
                if (this.check_card_equal(hand_holds[i], cardInfoBO)) {
                    hand_holds.splice(i, 1);
                    break;
                }
            }

            cardInfoBO.isShow = false;
        }


        let collision_data = {
            card_info_bo: cardInfoBO,
            card_owner_index: this.previous_index
        };

        this.room_seats[index].collision_holds.push(collision_data);
        for (var i = 0; i < hand_holds.length; i++) {
            hand_holds[i].value == cardInfoBO.value ? hand_holds[i].isTouch = false : null;
            hand_holds[i].value == cardInfoBO.value ? hand_holds[i].isShow = false : null;
        }
        this.cards_sort(index);

        //杠牌后摸牌
        this.get_card(seats_index);

        //杠牌完成之后，出牌
        globalMgr.present_room_mgr.setRoomsSeatsAnimState(seats_index, this.roomid, globalMgr.present_game_config.anim_state.collision_card);
        this.sendMsg(wsMsgKeyEnum.update_hand_holds);
        this.sendMsg(wsMsgKeyEnum.update_room_info_all);
        globalMgr.present_room_mgr.setRoomsSeatsAnimState(seats_index, this.roomid, globalMgr.present_game_config.anim_state.empty);

    },

    /**
     * 过牌，跳过此阶段(适用于碰牌，杠牌，胡牌)暗杠不搬牌，直接打牌 先判断暗杠
     */
    skip_this_part(uid) {
        var seats_index = this.find_user_index(uid);
        let current_hu_state = this.room_seats[seats_index].action_state == globalMgr.present_game_config.action_state.hu_card
            || this.room_seats[seats_index].action_state == globalMgr.present_game_config.action_state.self_hu
            || this.room_seats[seats_index].action_state == globalMgr.present_game_config.action_state.knock_collsion_hu
            || this.room_seats[seats_index].action_state == globalMgr.present_game_config.action_state.knock_and_hu ? true : false;

        if (current_hu_state == true) {
            this.room_seats[seats_index].skip_hu_state = true;
        }

        //检测其他人是否胡牌，碰牌，杠牌
        let model = 'skip';
        let is_break = this.check_all_part(seats_index, this.previous_card, model);
        globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.wait);
        this.room_seats[seats_index].ting_state == globalMgr.present_game_config.ting_state.wait_ting ? this.room_seats[seats_index].ting_state = globalMgr.present_game_config.ting_state.not_ting : null;

        if (!is_break) {
            var next_seats = this._card_length - this.card_site == this._cards.length - this.room_seats.length * 13 - 1 ? seats_index : this.getNextSeat(this.previous_index).seats_index;

            this.turn = next_seats;
            if (this.room_seats[next_seats].hand_holds.length == 13) this.get_card(next_seats);
            globalMgr.present_room_mgr.setRoomsSeatsActionState(next_seats, this.roomid, globalMgr.present_game_config.action_state.send_card);
        }

        this.sendMsg(wsMsgKeyEnum.update_room_info_all);
        this.startOutCardCountDown();
    },


    /**
     * 听牌(waiting test)
     */
    ting_card(uid) {
        var index = this.find_user_index(uid);

        if (this.room_seats[index].ting_state != globalMgr.present_game_config.ting_state.wait_ting) //这个拿卡牌长度限制也可以（充分条件）
        {
            log.warn('未满足听牌条件');
            return;
        }

        for (let i = 0; i < this.room_seats[index].hand_holds.length; i++) {
            this.room_seats[index].hand_holds[i].isTouch = false;
        }

        globalMgr.present_room_mgr.setRoomsSeatsActionState(index, this.roomid, globalMgr.present_game_config.action_state.ting);
        globalMgr.present_room_mgr.setRoomsSeatsTingState(index, this.roomid, globalMgr.present_game_config.ting_state.ting);

        //检测其他人是否胡牌，碰牌，杠牌
        let model = 'normal';
        let cardInfoBO = this.previous_card;
        let is_break = this.check_all_part(index, cardInfoBO, model);
        this.cards_sort(index);
        globalMgr.present_room_mgr.setRoomsSeatsActionState(index, this.roomid, globalMgr.present_game_config.action_state.wait);
        globalMgr.present_room_mgr.setRoomsSeatsAnimState(index, this.roomid, globalMgr.present_game_config.anim_state.ting_card);

        this.sendMsg(wsMsgKeyEnum.update_room_info_all);
        this.sendMsg(wsMsgKeyEnum.update_hand_holds);
        globalMgr.present_room_mgr.setRoomsSeatsAnimState(index, this.roomid, globalMgr.present_game_config.anim_state.empty);

        if (is_break) {
            this.startOutCardCountDown();
            log.warn(` 检测 到 其他人是否胡牌，碰牌，杠牌`)
            return;
        }

        var next_index = this.getNextSeat(index).seats_index;
        this.get_card(next_index);
    },
    
}

const GameToolsMixin = {

    /**
     * 检查主牌张数
     */
    caculate_main_card_num(card, card_length) {
        var max = 0;
        var type0_count = 0;

        var type1_count = 0;
        var type2_count = 0;

        for (var i = 0; i < card_length; i++) {
            this.check_card_type(card[i]) == 1 ? type0_count++ : type0_count = type0_count;
            this.check_card_type(card[i]) == 2 ? type1_count++ : type1_count = type1_count;
            this.check_card_type(card[i]) == 3 ? type2_count++ : type2_count = type2_count;
        }

        max = type0_count > type1_count ? type0_count : type1_count;
        max = max > type2_count ? max : type2_count;

        max == type0_count ? this.main_card_type = 1 : null;
        max == type1_count ? this.main_card_type = 2 : null;
        max == type2_count ? this.main_card_type = 3 : null;

        return max;
    },

        /**
     * 检测字牌个数
     */
    caculate_zi_card_num(card, card_length) {
        let count = 0;

        for (let i = 0; i < card_length; i++) {
            card[i].value % 16 == 0 ? count += 1 : null;
        }

        return count
    },


    /**
     * 获取将牌
     */
    find_final_jiangs(jiangs, success_index) {
        let jiangs_arr = [];

        for (let i = 0; i < jiangs.length; i++) {
            jiangs[i] != 0 ? jiangs_arr.push(jiangs[i]) : null;
        }

        this.jiang_value = jiangs_arr[success_index];
        log.warn("将牌值为：" + this.jiang_value);
    },

    /**
     * 获取每个人手牌中的扣牌张数
     */
    get_hide_card_num(index) {
        let hide_card_num = 0;
        let card_copy = this.room_seats[index].hand_holds.slice(0);
        card_copy = this.remove_knock_and_collision(index, card_copy, card_copy.length).slice(0);

        for (var i = 0; i < card_copy.length; i++) {
            card_copy[i].isCard ? hide_card_num += 1 : null;
        }

        return hide_card_num;
    },
    /**
     * 获取到所有的将牌(2张相同的),未来可能加个去重
     */
    get_jiang(card, cardLength) {
        var count = 1;
        var arr = new Array();

        for (var i = 1; i < cardLength; i++) {
            if (card[i].value == card[i - 1].value) {
                if (count == 1) arr[i - 1] = card[i].value;
                if (count != 1) arr[i - 1] = 0;
                count += 1;
            }
            else {
                count = 1;
                arr[i - 1] = 0; //(waiting)
            }
        }

        return arr;
    },
    
    /**
     * 去除将牌，返回所有牌的情况
     */
    qu_jiang_arrs(card, jiangs, length) {
        var list = [];
        var cardInfoBO = new globalMgr.present_card_info_bo_class();
        cardInfoBO.isShow = true;
        cardInfoBO.value = 0x00;
        cardInfoBO.isTouch = true;
        cardInfoBO.isCard = false;


        for (let i = 0; i < length; i++) {

            if (jiangs[i] != 0 && jiangs[i] != null) {
                var src = new Array();
                var arr = new Array();
                for (var j = 0; j < length; j++) {
                    src[j] = card[j];
                }

                src[i] = cardInfoBO;
                src[i + 1] = cardInfoBO;

                src.sort((a, b) => a.value - b.value);
                for (let k = 2; k < length; k++) {
                    arr[k - 2] = src[k];
                }
                list.push(arr);
            }
        }

        return list;
    },

    /**
     * 查找去除将牌后的断点（没有连续的牌就是一个断点）
     */
    get_breaks(card, card_length) {
        var breaks = [];
        var count = 1;
        breaks[0] = 0;

        for (var i = 1; i < card_length; i++) {
            if ((card[i].value - card[i - 1].value) > 1 && i < card_length - 1) {
                breaks[count] = i;
                count += 1;
            }
            else if (i == card_length - 1) //最后一次
            {
                if ((card[i + 1].value - card[i].value) > 1) {
                    breaks[count] = i + 1;
                    count += 1;
                }

                if ((card[i].value - card[i - 1].value) > 1) {
                    breaks[count] = i;
                    count += 1;
                }
            }
        }

        breaks[count] = card_length + 1;
        var breakss = [];
        breakss[0] = 0;

        for (var i = 0; i < count + 1; i++) {
            breakss[i] = breaks[i];
        }

        return breakss;
    },
    
    
    /**
     * 断点后，检查所断的牌型是不是顺子或者刻子
     * false 表示断牌为顺子或者刻字  true表示不符合胡牌规则
     */
    breaks_check(breaks, length) {
        for (var i = 1; i < length; i++) {
            if ((breaks[i] - breaks[i - 1]) % 3 != 0)
                return true;
        }
        return false;
    },

        /**
     * 根据手牌和断点的数组 返回经过处理的牌型
     */
    all_parts(card, breaks) {
        var partnum = breaks.length - 1;  //断点个数
        var parts = [];
        var arr = [];

        for (var i = 0; i < partnum; i++) {
            for (var j = 0; j < breaks[i + 1] - breaks[i]; j++) {
                j == 0 ? arr = [] : null;
                arr[j] = card[breaks[i] + j];
            }

            parts[i] = this.postion_translate(arr, arr.length);
        }

        return parts;
    },
    
    
    /**
     * 拆解位转换 
     * （五万、五万、五万、六万、七万、七万、八万、八万、九万）=》（3 1 2 2 1）
     */
    postion_translate(arr, arr_length) {
        var count = 1;
        var split = [];
        var status = 0; //0状态下为单数状态，1状态下为计数状态

        for (var i = 0; i < arr_length - 1;) {
            var index_value = arr[i].value;

            if (index_value == arr[i + 1].value) {
                status = 1;
                i++;
                count += 1;
            }
            else {
                status == 1 ? split.push(count) : count = 1;
                i++;
                count = 1;
                status == 0 ? split.push(count) : count = 1;
                status = 0;
            }

            i == arr_length - 1 ? split.push(count) : count = count;
        }

        return split;
    },

    /**
     * 判断断点处理后的值是否符合胡牌规则(3,1,2,2,1)
     */
    is_main_part(arr, arr_length) {
        var cache = [];
        cache = arr;
        var count = 0;

        for (var i = 0; i < arr_length; i++) {
            //遇到三位直接拆
            if (cache[i] >= 3) {
                cache.splice(i, 1, cache[i] - 3);
                cache[i] != 0 ? i-- : i = i;
            }
            else if (cache[i] != 0 && cache[i] > 0 && i < arr_length - 2) //按顺子拆
            {
                cache[i] -= 1;
                cache[i + 1] -= 1;
                cache[i + 2] -= 1;
                cache[i] != 0 ? i-- : i = i;
            }

        }

        for (var i = 0; i < arr_length; i++) {
            count += Math.abs(cache[i]);
        }

        return count == 0 ? true : false;
    },

    /**
     * 数组去重
     * @param {*} arr 
     */
    remove_repeat(arr) {
        var new_arr = [];
        for (var i = 0; i < arr.length; i++) {
            new_arr.indexOf(arr[i]) == -1 ? new_arr.push(arr[i]) : null;
        }
        return new_arr;
    },

    /**
     * 检测某张牌的牌型（1->万  2->条  3->饼 0->字）
     * @param {*} cardInfoBO 
     */
    check_card_type(cardInfoBO) {
        var type = 0;
        var value = cardInfoBO.value;

        if (value >= 1 && value <= 9) {
            type = 1;
        }
        else if (value >= 17 && value <= 25) {
            type = 2;
        }
        else if (value >= 33 && value <= 41) {
            type = 3;
        }

        return type;
    },

    /**
     * 检查主牌类型数（几门）
     */
    caculate_main_card_type_num(card, card_length) {
        var type_num = 0;

        var type1_status = false;
        var type2_status = false;
        var type3_status = false;

        for (var i = 0; i < card_length; i++) {
            this.check_card_type(card[i]) == 1 && !type1_status ? type_num += 1 : null;
            this.check_card_type(card[i]) == 1 && !type1_status ? type1_status = true : null;

            this.check_card_type(card[i]) == 2 && !type2_status ? type_num += 1 : null;
            this.check_card_type(card[i]) == 2 && !type2_status ? type2_status = true : null;

            this.check_card_type(card[i]) == 3 && !type3_status ? type_num += 1 : null;
            this.check_card_type(card[i]) == 3 && !type3_status ? type3_status = true : null;
        }

        return type_num;
    },




    //牌桌(其余人)检测胡牌，碰牌，杠牌
    check_all_part(index, cardInfoBO, model) {
        var loop_arr = [];

        if (model == 'normal') {
            var loop_num = this.room_seats.length - 1;
            while (loop_num > 0) {
                index += 1;
                index > this.room_seats.length - 1 ? index = 0 : null;
                loop_arr.push(index);
                loop_num -= 1;
            }
        }

        if (model == 'skip') {
            let skip_hu_state = false;
            for (let i = 0; i < this.room_seats.length; i++) {
                this.room_seats[i].skip_hu_state ? skip_hu_state = true : null;
            }

            if (skip_hu_state) {
                let init_index = parseInt(this.previous_index);
                let loop_num = this.room_seats.length - 1;
                while (loop_num > 0) {
                    init_index += 1;
                    init_index > this.room_seats.length - 1 ? init_index = 0 : null;
                    this.room_seats[init_index].skip_hu_state == true || init_index == this.previous_index ? null : loop_arr.push(init_index);
                    loop_num -= 1;
                }
                log.warn(loop_arr);
            }
            else {
                while (index != this.previous_index) {

                    index += 1;
                    index > this.room_seats.length - 1 ? index = 0 : null;
                    this.previous_index == index ? null : loop_arr.push(index);
                }
            }


        }

        for (var i = 0; i < loop_arr.length; i++) {
            var seats_index = loop_arr[i];

            if (this.check_can_hu(seats_index, cardInfoBO) && !this.room_seats[seats_index].skip_hu_state) {
                var hand_holds = this.room_seats[seats_index].hand_holds;
                var dark_collision_state = this.check_dark_collsion(hand_holds, hand_holds.length) != false ? true : false;
                let ting_state = this.room_seats[seats_index].ting_state == globalMgr.present_game_config.ting_state.ting;

                ting_state ? log.warn('听-') : null;

                this.check_collision_card(seats_index, cardInfoBO) && !dark_collision_state && !this.check_knock_state(seats_index, cardInfoBO)

                    ? ting_state ? globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.collision_and_hu)
                        : globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.knock_collsion_hu)
                    : this.check_knock_card(seats_index, cardInfoBO)
                        ? globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.knock_and_hu)
                        : globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.hu_card);
                        
                this.cards_sort(seats_index);
                this.sendMsg(wsMsgKeyEnum.update_room_info_all);
                return true;
            }
            else {
                this.cards_sort(seats_index);
            }
        }

        for (var i = 0; i < loop_arr.length; i++) {
            var seats_index = loop_arr[i];
            let ting_state = this.room_seats[seats_index].ting_state == globalMgr.present_game_config.ting_state.ting;

            if (!ting_state && this.check_knock_card(seats_index, cardInfoBO)) {
                console.log('碰牌检测：' + ting_state);
                globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.knock_card);
                this.cards_sort(seats_index);
                this.sendMsg(wsMsgKeyEnum.update_room_info_all);
                return true;
            }
            else {
                this.cards_sort(seats_index);
            }
        }

        for (var i = 0; i < loop_arr.length; i++) {
            var seats_index = loop_arr[i];
            var hand_holds = this.room_seats[seats_index].hand_holds;
            var dark_collision_state = this.check_dark_collsion(hand_holds, hand_holds.length) != false ? true : false;
            let card_copy = dark_collision_state ? this.check_dark_collsion(hand_holds, hand_holds.length) : JSON.parse(JSON.stringify(cardInfoBO));
            var wan_collsion_state = this.check_wan_collsion(seats_index, card_copy);
            let ting_state = this.room_seats[seats_index].ting_state == globalMgr.present_game_config.ting_state.ting;

            if (this.check_collision_card(seats_index, cardInfoBO) && !this.check_knock_state(seats_index, cardInfoBO))//只检查明杠，弯杠
            {
                this.cards_sort(seats_index);
                wan_collsion_state || dark_collision_state ? null :
                    ting_state ?
                        globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.collision_card) :
                        globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.knock_and_collsion);
                wan_collsion_state || dark_collision_state ? null : this.sendMsg(wsMsgKeyEnum.update_room_info_all);

                return !(wan_collsion_state || dark_collision_state);
            }
            else {
                this.cards_sort(seats_index);
            }
        }

        return false;
    },


    //检测碰牌
    check_knock_card(index, cardInfoBO) {
        var count = 0;
        var hand_holds = this.room_seats[index].hand_holds;
        hand_holds.sort((a, b) => a.value - b.value);

        for (var i = 0; i < hand_holds.length; i++) {
            hand_holds[i].value == cardInfoBO.value ? count++ : null;
        }

        this.cards_sort(index);
        return count == 2 ? true : false;
    },


    /**
 * 检测胡牌（满足公式:N*ABC + M*DDD + EE）
 * @param {*} uid 
 * @param {*} cacheCard
 */
    check_can_hu(index, cacheCard) {
        var hand_holds = this.room_seats[index].hand_holds;
        var hu_state = this.room_seats[index].action_state == globalMgr.present_game_config.action_state.hu_card_over;

        //判断手牌张数
        var first = hu_state ? 13 : hand_holds.length;

        //新建数组，来判断是否可以胡牌
        var card_copy = hand_holds.slice(0);
        card_copy.length == 14 ? null : card_copy.push(cacheCard);
        card_copy.sort((a, b) => a.value - b.value);
        var all_card_copy = card_copy.slice(0);


        //手中牌不符合胡牌规则 3n*2
        if ((first + 1) % 3 != 2) return false;
        else {
            card_copy = this.remove_knock_and_collision(index, card_copy, card_copy.length).slice(0);
            first = card_copy.length - 1;

            //找出所有可能的将牌，其余长度用0补全
            var jiangs = this.get_jiang(card_copy, first + 1);

            //去除将牌
            var mains = [];
            var mains = this.qu_jiang_arrs(card_copy, jiangs, first + 1);

            //当前去除将牌后牌的长度
            var size = mains.length;
            //将去除将牌后分段是否符合可胡牌型的bool值
            var ones = [];
            //每一个断点的所有牌的集合
            var breaks = [];


            if (this.check_qi_dui(card_copy, card_copy.length, index)) {
                this.find_final_jiangs(jiangs, i);
                hu_state ? this.room_seats[index].hu_state = globalMgr.present_game_config.hu_state.qi_dui : null;
                log.warn('七对');
                return true;
            }

            if (this.shi_san_yao(card_copy, card_copy.length, cacheCard)) {
                this.jiang_value = cacheCard.value;
                hu_state ? this.room_seats[index].hu_state = globalMgr.present_game_config.hu_state.shi_san_yao : null;
                log.warn('十三幺');
                return true;
            }

            for (var i = 0; i < size; i++) {
                //判断一条龙
                if (this.check_dragon(mains[i], mains[i].length, 3, 1)) {
                    this.find_final_jiangs(jiangs, i);
                    hu_state ? this.room_seats[index].hu_state = globalMgr.present_game_config.hu_state.yi_tiao_long : null;
                    console.log("一条龙");
                    return true;
                }

                //根据打的断点 获取到第一个长度的所有牌型
                breaks = this.get_breaks(mains[i], first - 2);

                if (this.breaks_check(breaks, breaks.length)) {
                    //获取到的牌不符合3n的格式、直接为false
                    ones[i] = false;
                }
                else {
                    //如果断点断的牌符合顺子或者刻子（3n）的格式
                    var mainsparts = this.all_parts(mains[i], breaks);
                    ones[i] = this.ping_hu(mainsparts, mainsparts.length);

                    if (ones[i] == true) {
                        this.find_final_jiangs(jiangs, i);

                        if (this.check_dui_dui(mains[i], mains[i].length)) {
                            log.warn("对对胡");
                            hu_state ? this.room_seats[index].hu_state = globalMgr.present_game_config.hu_state.dui_dui : null;
                            return true;
                        }
                        else {
                            log.warn("平胡");
                            hu_state ? this.room_seats[index].hu_state = globalMgr.present_game_config.hu_state.ping_hu : null;
                            return true;
                        }
                    }
                }
            }

            //满足任意条件即可胡牌
            for (var i = 0; i < size; i++) {
                if (ones[i]) {
                    this.find_final_jiangs(jiangs, i);
                    return true;
                }
            }

        }

        return false;
    },

    //检测杠牌
    check_collision_card(index, cardInfoBO) {
        var count = 0;
        var hand_holds = this.room_seats[index].hand_holds;

        if (this.check_dark_collsion(hand_holds, hand_holds.length) != false) {
            return this.check_dark_collsion(hand_holds, hand_holds.length);
        }
        
        for (var i = 0; i < hand_holds.length; i++) {
            hand_holds[i].value == cardInfoBO.value ? count++ : null;

            if (count == 3) {
                return hand_holds[i];
            }
        }



        return false;
    },


    //检测暗杠
    check_dark_collsion(arr, arr_length) {
        var count = 0;
        arr.sort((a, b) => a.value - b.value);

        for (var i = 1; i < arr_length; i++) {
            arr[i].value == arr[i - 1].value ? count += 1 : count = 0;

            if (count == 3) {
                console.log("检测暗杠成功");
                return arr[i];
            }
        }
        return false;
    },


    /**
     * 检测弯杠
     */
    check_wan_collsion(index, cardInfoBO) {
        var count = 0;
        var hand_holds = this.room_seats[index].hand_holds;
        var knock_state = false;    //代表是否碰过牌

        for (var i = 0; i < hand_holds.length; i++) {
            hand_holds[i].value == cardInfoBO.value ? count++ : null;
        }

        knock_state = this.check_knock_state(index, cardInfoBO);

        if (knock_state == true) {
            //knock_state =  knock_state && this.turn == index;
            return (count == 3 || count == 4) && knock_state ? true : false;
        }

        return false;
    },

    /**
     * 检测碰牌
     * @param {*} index 
     * @param {*} cardInfoBO 
     * @returns 
     */
    check_knock_state(index, cardInfoBO) {
        var knock_state = false;

        for (var j = 0; j < this.room_seats[index].knock_holds.length; j++) {
            if (this.room_seats[index].knock_holds[j].card_info_bo.value == cardInfoBO.value) {
                knock_state = true;
            }
        }

        return knock_state;
    },

        /**
     * 可杠牌数组提示
     */
    get_collision_prompt_arr(index) {
        let result_arr = [];
        this.room_seats[index].collision_prompt = [];
        let card_copy = this.room_seats[index].hand_holds.slice(0);

        let remove_card = new globalMgr.present_card_info_bo_class();
        remove_card.value = 0x00;
        remove_card.isTouch = true;

        card_copy.length == 13 ? card_copy.push(this.previous_card) : null;
        card_copy.sort((a, b) => a.value - b.value);


        for (var i = 0; i < this.room_seats[index].collision_holds.length; i++) {
            let collision_count = 3;
            let collision_value = this.room_seats[index].collision_holds[i].card_info_bo.value;

            for (let j = 0; j < card_copy.length; j++) {
                if (card_copy[j].value == collision_value && collision_count > 0) {
                    card_copy.splice(j, 1, remove_card);
                    collision_count -= 1;
                }
            }
        }

        let remove_count = this.room_seats[index].collision_holds.length * 3;
        card_copy.sort((a, b) => a.value - b.value);
        card_copy.splice(0, remove_count);


        let same_card_num = 0;
        let pre_value = 0;
        for (let i = 1; i < card_copy.length; i++) {
            i - 1 == 0 ? pre_value = card_copy[i - 1].value : null;
            pre_value == card_copy[i].value ? same_card_num += 1 : pre_value = card_copy[i].value;
            pre_value == card_copy[i].value ? null : same_card_num = 0;
            same_card_num == 3 ? this.room_seats[index].collision_prompt.push(card_copy[i]) : null;
            same_card_num == 3 ? same_card_num = 0 : null;
        }

        return result_arr;
    },


    /**
     * 去除手牌中的碰牌和杠牌
     */
    remove_knock_and_collision(index, card_copy, card_copy_length) {
        let remove_count = 0;
        let remove_card = new globalMgr.present_card_info_bo_class();
        remove_card.value = 0x00;
        remove_card.isTouch = true;
        card_copy.sort((a, b) => a.value - b.value);

        for (var i = 0; i < this.room_seats[index].knock_holds.length; i++) {
            let knock_count = 3;
            let knock_value = this.room_seats[index].knock_holds[i].card_info_bo.value;

            for (let j = 0; j < card_copy_length; j++) {
                if (card_copy[j].value == knock_value && knock_count > 0) {
                    card_copy.splice(j, 1, remove_card);
                    knock_count -= 1;
                }
            }
        }


        for (var i = 0; i < this.room_seats[index].collision_holds.length; i++) {
            let collision_count = 3;
            let collision_value = this.room_seats[index].collision_holds[i].card_info_bo.value;

            for (let j = 0; j < card_copy_length; j++) {
                if (card_copy[j].value == collision_value && collision_count > 0) {
                    card_copy.splice(j, 1, remove_card);
                    collision_count -= 1;
                }
            }
        }

        remove_count = (this.room_seats[index].knock_holds.length + this.room_seats[index].collision_holds.length) * 3;
        card_copy.sort((a, b) => a.value - b.value);
        card_copy.splice(0, remove_count);
        return card_copy;
    },
    /**
 * 获取预测胡牌数组
 */
    get_prompt_arr(index) {
        let check_arr = [];
        var card_conf = globalMgr.present_game_config['card_conf'][0];

        for (var i in card_conf) {
            let cardInfoBO = new globalMgr.present_card_info_bo_class()
            cardInfoBO.isShow = true;
            cardInfoBO.value = card_conf[i];
            cardInfoBO.isTouch = true;

            this.check_can_hu(index, cardInfoBO) ? check_arr.push(cardInfoBO) : null;
        }

        return check_arr;
    },
    
    
    /**
     * 返回uid在座位中的下标
     * @param {} uid 
     */
    find_user_index(uid) {
        var seatsLen = this.room_seats.length;

        for (var i = 0; i < seatsLen; i++) {

            if (this.room_seats[i].user_id == uid) {
                return i;
            }

        }
    },
    
    
    /**
     * 更新卡牌数据(转换值)
     * @param {*} card_info_bo 
     */
    fresh_card_info_bo(card_info_bo) {
        card_info_bo.value = parseInt(card_info_bo.value);
        return card_info_bo;
    },


    /**
     * 检查两卡牌对象是否相等
     */
    check_card_equal(real, check) {
        return real.value == check.value && real.isTouch == check.isTouch && real.isCard == check.isCard && real.isShow == check.isShow ? true : false;
    },
    
    
    /**
     * 打牌中对牌进行排序
     */
    cards_sort(index) {
        var hide_arr = [];
        var light_arr = [];

        for (var i = 0; i < this.room_seats[index].hand_holds.length; i++) {
            this.room_seats[index].hand_holds[i].isCard == true ? hide_arr.push(this.room_seats[index].hand_holds[i]) : light_arr.push(this.room_seats[index].hand_holds[i]);
        }

        light_arr.sort((a, b) => a.value - b.value);
        this.room_seats[index].hand_holds = hide_arr.concat(light_arr);
    },
    
    
    /**
     * 获取实时牌的张数
     */
    get_real_card_num(index) {
        var count = 0;

        for (var i = 0; i < this.room_seats[index].hand_holds.length; i++) {
            this.room_seats[index].hand_holds[i].isShow == true ? count += 1 : null;
        }

        return count;
    },


    /**
     * 获取下一个座位模型对象  
     * @param {*} present_seats_index  //当前的座位号
     */
    getNextSeat(present_seats_index) {
        present_seats_index = present_seats_index + 1 >= this.room_seats.length ? 0 : present_seats_index + 1;
        return this.room_seats[present_seats_index];
    },

    /**
     * 获取自动化时要操作的下标
     */
    get_ready_index() {
        for (var i = 0; i < this.room_seats.length; i++) {
            if (this.room_seats[i].action_state != globalMgr.present_game_config.action_state.wait) {
                return i;
            }
        }

    },
    /**
     *  设置座位名称(东南西北)
     */
    set_pos_name(index) {
        let real_index = 0;
        let pos_name = [1, 2, 3, 4];

        for (let i = 0; i < this.room_seats.length; i++) {
            real_index = i == 0 ? index : this.getNextSeat(real_index).seats_index;
            this.room_seats[real_index].pos_name = pos_name[i];
        }
    },


    /**
     * 提示胡牌可能及桌面上剩余的胡牌数(同时置空提示数组)
     */
    prompt_hu_cards(index) {
        let surplus_arr = [];
        let result_arr = [];
        let check_arr = this.get_prompt_arr(index);
        this.room_seats[index].hu_prompt = null;

        for (var i = this.card_site; i < this._card_length; i++) {
            surplus_arr.push(this._cards[i]);
        }


        for (var i = 0; i < this.room_seats.length; i++) {
            surplus_arr = surplus_arr.concat(this.room_seats[i].hand_holds).slice(0);
        }
        surplus_arr.sort((a, b) => a.value - b.value);


        for (var i = 0; i < check_arr.length; i++) {
            let count = 0;
            let prompt_data = {
                card_info_bo: check_arr[i],
                card_num: count
            };
            for (var j = 0; j < surplus_arr.length; j++) {
                check_arr[i].value == surplus_arr[j].value ? count += 1 : null;
                j == surplus_arr.length - 1 ? result_arr.push(prompt_data) : null;
            }
        }

        return result_arr;
    },

}


class WSMahjongGameBaseLogic extends WSGameBaseLogic {
    constructor(roomid,scene1,scene2) {

        // 可以在这里调用super()，如果有父类构造函数的话，当前代码示例中未体现完整的父类相关逻辑所以先省略
        super();

        Object.assign(this, CardTypeMixin, GameBtnCallBackMixin,GameToolsMixin);

        Object.assign(this, MahjongAIMixin);

        
        this.upIndex = null;


        this.initParam(roomid);

        this.startGames(scene1,scene2);

        console.log("游戏逻辑 2、初始化 WSMahjongGameBaseLogic")
    }

    /**
     * 开始游戏
     */
    startGames(scene1,scene2) {
        this.room_info.cruent_inning == 0 ? this.runScene(scene1||globalMgr.present_game_config.game_scene.game_start) : this.runScene(scene2||globalMgr.present_game_config.game_scene.game_start);
        this.startAIScheduler();
    }

    /**
     * 初始化座位
     */
    initStates() {
        this._cards = []; //游戏牌
        this.card_site = 0;//发了牌的总数
        this._card_length = 0;//牌的长度
        this.previous_index = 0;   //上一个用户的座位下标
        this.previous_card = null; //上一张打出的牌
        this.turn = 0;    //当前出牌人的下标
        this.main_card_type = null; //主牌类型
        this.jiang_value = null; //胡牌将牌数值
        this._collision_count = 0;//杠牌次数
        this.outCardCountDown_time = null; //出牌倒计时
        this.outCardCountDown_setInterval = null; //出牌计时器

        for (let i = 0; i < this.room_seats.length; i++) {
            const element = this.room_seats[i];
            element.hand_holds = [];
            element.out_holds = [];
            element.knock_holds = [];
            element.collision_holds = [];
            element.boss_situation = [];
            element.hu_state = -1;
            element.identity = globalMgr.present_game_config.identity_conf.common_code;
            element.score = 0;
            element.skip_hu_state = false;
            element.hide_num = 0;
            element.hide_card_num = 0;
            element.hu_prompt = [];
            element.collision_prompt = [];
            element.ting_state = globalMgr.present_game_config.ting_state.not_ting;
            element.anim_state = globalMgr.present_game_config.anim_state.empty;
            element.is_shot = false;

            let maizui_data = {
                maizui_arr: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                maizui_score: 0
            }
            element.result_score = [maizui_data, 0, 0, 0, 0, 0];;

            globalMgr.present_room_mgr.setRoomsSeatsActionState(element.seats_index, this.roomid, globalMgr.present_game_config.action_state.wait);
        }
    }


    /**
     * 初始化参数
     * @param {*} roomid 
     */
    initParam(roomid) {
        this.roomid = roomid;
        this.room_info = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomid);
        this.room_seats = this.room_info.seats;
        this._cards = []; //游戏牌
        this.card_site = 0;
        this._card_length = 0;
        this.previous_index = 0;   //上一个用户的座位下标
        this.previous_card = null; //上一张打出的牌
        this.turn = 0;    //当前出牌人的下标
        this.main_card_type = null; //主牌类型
        this.jiang_value = null; //胡牌将牌数值
        this.previous_boss = null; //上一个胡牌的庄家
        this._collision_count = 0;
        this._hold_cards_length = 14; //所保留的牌（不打的牌）

        this.outCardCountDown_time = null;
        this.outCardCountDown_setInterval = null;
    }
 

    /**
     * 切换场景
     * @param {*} game_scene_key 
     */
    runScene(game_scene_key) {

        function game_start() {

            this.onGameStart(this.room_info.room_type, this.roomid);

            globalMgr.present_room_mgr.setRoomsAllUsersStateByRoomid(this.roomid, globalMgr.configMgr.rooms_users_state.playing); 

            //局数增加
            globalMgr.present_room_mgr.setRoomsCruentInning(this.roomid, this.room_info.cruent_inning += 1)

            //设置房间状态
            globalMgr.present_room_mgr.setRoomsState(this.roomid, globalMgr.present_game_config.game_scene.game_start)
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
            globalMgr.present_room_mgr.setRoomsState(this.roomid, globalMgr.present_game_config.game_scene.game_move)

            //初始化 座位 模型属性
            this.initStates();

            //洗牌
            this.shuffle();

            //选择庄家
            this.choose_boss();

            //发牌
            this.deal_cards();

            //庄主搬牌
            this.boss_get_card();


            //更新用户手牌
            this.sendMsg(wsMsgKeyEnum.update_hand_holds);

            //更新房间信息(确定好庄家后，就更新房间信息)
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
        }


        function game_playing() {
            //开始出牌倒计时
            this.startOutCardCountDown();
        }

        function single_over() {
            let win_state = false;
            let win_index = -1;

            for (let i = 0; i < this.room_seats.length; i++) {
                win_state = win_state || this.room_seats[i].hand_holds.length == 14 ? true : false;
                win_state && this.room_seats[i].hand_holds.length == 14 ? win_index = i : null;
                this.room_seats[i].hand_holds.length == 14 ? globalMgr.present_room_mgr.setRoomsSeatsActionState(i, this.roomid, globalMgr.present_game_config.action_state.hu_card_over)
                    : globalMgr.present_room_mgr.setRoomsSeatsActionState(i, this.roomid, globalMgr.present_game_config.action_state.wait);
            }

            this.previous_boss = this.previous_boss == win_index ? win_index : this.getNextSeat(this.previous_boss).seats_index;

            if (this.room_info.cruent_inning >= this.room_info.max_inning) {
                this.onGameOver(this.room_info.room_type, this.roomid);

                //上传记录
                globalMgr.present_room_mgr.setRoomsAllUsersStateByRoomid(this.roomid, globalMgr.configMgr.rooms_users_state.single_over);
                globalMgr.present_room_mgr.setRoomsState(this.roomid, globalMgr.present_game_config.game_scene.game_over);
                this.sendMsg(wsMsgKeyEnum.update_room_info_all);
                globalMgr.present_room_mgr.setRoomsState(this.roomid, globalMgr.present_game_config.game_scene.wait_over);


                //待优化  临时逻辑 客户测试完后 删除  以免测试时候 房间卡住
                var isAllOffline = globalMgr.present_room_service.checkRoomAllSeatsIsAllOffline(this.roomid);
                //保证没有在线用户
                if (isAllOffline) {
                    globalMgr.present_game_service.onDestroy(this.roomid);
                    globalMgr.present_room_mgr.delRoomByRoomid(this.roomid);
                }
            }
            else {
                globalMgr.present_room_mgr.setRoomsState(this.roomid, globalMgr.present_game_config.game_scene.single_over);
                this.sendMsg(wsMsgKeyEnum.update_room_info_all);
                globalMgr.present_room_mgr.setRoomsState(this.roomid, globalMgr.present_game_config.game_scene.wait_over);
            }




            this.closeOutCardCountDown();
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
        }

        function tie_over() {
            this.previous_index = this.getNextSeat(this.previous_index).seats_index;

            for (var i = 0; i < this.room_seats.length; i++) {
                globalMgr.present_room_mgr.setRoomsSeatsActionState(i, this.roomid, globalMgr.present_game_config.action_state.wait);
            }

            if (this.room_info.cruent_inning >= this.room_info.max_inning) {

                this.onGameOver(this.roomid);

                //上传记录
                globalMgr.present_room_mgr.setRoomsAllUsersStateByRoomid(this.roomid, globalMgr.configMgr.rooms_users_state.single_over);
                globalMgr.present_room_mgr.setRoomsState(this.roomid, globalMgr.present_game_config.game_scene.game_over);
                this.sendMsg(wsMsgKeyEnum.update_room_info_all);
                globalMgr.present_room_mgr.setRoomsState(this.roomid, globalMgr.present_game_config.game_scene.wait_over);
                



                //待优化  临时逻辑 客户测试完后 删除  以免测试时候 房间卡住
                var isAllOffline = globalMgr.present_room_service.checkRoomAllSeatsIsAllOffline(this.roomid);
                //保证没有在线用户
                if (isAllOffline) {
                    globalMgr.present_game_service.onDestroy(this.roomid);
                    globalMgr.present_room_mgr.delRoomByRoomid(this.roomid);
                }

            } else {
                globalMgr.present_room_mgr.setRoomsState(this.roomid, globalMgr.present_game_config.game_scene.single_over);
                this.sendMsg(wsMsgKeyEnum.update_room_info_all);
                globalMgr.present_room_mgr.setRoomsState(this.roomid, globalMgr.present_game_config.game_scene.wait_over);
            }

            //更新房间信息
            this.closeOutCardCountDown();
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
        }

        //这个有啥用  待优化
        function game_over() {


            globalMgr.present_room_mgr.setRoomsAllUsersStateByRoomid(this.roomid, globalMgr.configMgr.rooms_users_state.single_over);

            globalMgr.present_room_mgr.setRoomsState(this.roomid, globalMgr.present_game_config.game_scene.game_over);
            this.closeOutCardCountDown();

            for (var i = 0; i < this.room_seats.length; i++) {
                this.room_seats[i].hand_holds.length != 14 ? this.room_seats[i].action_state = globalMgr.present_game_config.action_state.wait : null;
            }

            //通知房间内的其他人
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
        }


        switch (game_scene_key) {
            case globalMgr.present_game_config.game_scene.game_start: //游戏开始
                game_start.bind(this)();
                break;
            case globalMgr.present_game_config.game_scene.game_move://游戏中
                game_playing.bind(this)();
                break;
            case globalMgr.present_game_config.game_scene.single_over://单局结束
                single_over.bind(this)();
                break;
            case globalMgr.present_game_config.game_scene.tie_over://和局 流局
                tie_over.bind(this)();
                break;
            case globalMgr.present_game_config.game_scene.game_over://游戏结束
                game_over.bind(this)();
                break;
            default:
                break;
        }
    }


    /**
     * 设置庄主
     */
    choose_boss() {
        var users = [];
        for (let i = 0; i < this.room_seats.length; i++) {
            users.push(i);
        }
        let boss_situation = null;
        boss_situation = this.room_info.cruent_inning == 1 ? tools.Arr.randomOne(users) : this.previous_boss;
        this.room_info.cruent_inning == 1 ? this.set_pos_name(boss_situation) : null;
        this.room_seats[boss_situation].identity = globalMgr.present_game_config.identity_conf.boss_code;
        this.turn = boss_situation;
        this.previous_boss = boss_situation;

        console.log("=======确定庄主==========");
        console.log(this.room_seats[boss_situation].user_id);
        console.log("=======确定庄主==========");
    }

    /**
     * 洗牌
     */
    shuffle() {
        if (!this._cards) {
            this._cards = [];
        }

        //读取配置
        var card_conf = globalMgr.present_game_config['card_conf'][0];

        for (var i in card_conf) {
            for (let j = 0; j < 4; j++) {
                //格式化数据
                let cardInfoBO = new globalMgr.present_card_info_bo_class()
                cardInfoBO.isShow = true;
                cardInfoBO.value = card_conf[i];
                cardInfoBO.isTouch = true;
                cardInfoBO.isCard = false;

                //将格式化后得数据 添加至内存
                this._cards.push(cardInfoBO);
            }
        }
        this._card_length = this._cards.length;
        log.warn(this._cards);
        log.warn(this._cards.length);

        //数组顺序打乱
        tools.Arr.upsetArr(this._cards);
    }


    /**
     * 发牌
     */
    deal_cards() {
        var seatsLen = this.room_seats.length;      //所有用户
        var boss_site = -1;                         //庄家在数组中的位置

        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < seatsLen; j++) {
                for (var k = 0; k < 4; k++) {
                    this.room_seats[j].hand_holds.push(this._cards[this.card_site++]);
                }
            }

        }

        for (var i = 0; i < seatsLen; i++) {
            this.room_seats[i].hand_holds.push(this._cards[this.card_site++]);
            if (this.room_seats[i].identity == globalMgr.present_game_config.identity_conf.boss_code) {
                boss_site = i;
            }
        }


        for (let i = 0; i < this.room_seats.length; i++) {
            this.cards_sort(i);
        }

        this.create_fake_data();
    }
    
    /**
     * 创建的假数据用来 测试 胡牌 规则
     */
    create_fake_data(){

    }

    /**
     * 庄主搬牌
     */
    boss_get_card() {
        var seatsLen = this.room_seats.length;      //所有用户
        var boss_site = -1;                         //庄家在数组中的位置

        for (var i = 0; i < seatsLen; i++) {
            if (this.room_seats[i].identity == globalMgr.present_game_config.identity_conf.boss_code) {
                boss_site = i;
            }
        }

        this.get_card(boss_site);
    }
        

    /**
     * 搬牌
     * @param {*} CardInfoBO 
     */
    get_card(index) {
        if (this._card_length - this.card_site <= this._hold_cards_length) {
            log.warn("牌已被摸完，流庄");
            this.runScene(globalMgr.present_game_config.game_scene.tie_over)
            return;
        }

        var card_info_bo = this._cards[this.card_site++];
        var seats_index = this.room_seats[index].seats_index;

        if (this._card_length - this.card_site == 83) {
            this.previous_card = card_info_bo;
            this.previous_index = index;

            for (let i = 0; i < this.room_seats.length; i++) {
                this.cards_sort(i);
            }
        }



        //检测自摸
        if (this.check_can_hu(index, card_info_bo) && !this.room_seats[index].skip_hu_state && this.room_seats[index].ting_state == globalMgr.present_game_config.ting_state.ting) {

            this.check_collision_card(seats_index, card_info_bo) && !this.check_knock_state(seats_index, card_info_bo)
                ? globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.collision_and_hu)
                : globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.self_hu);

            this.previous_card = card_info_bo;
            this.cards_sort(index);
            this.room_seats[index].hand_holds.push(card_info_bo);
            this.startOutCardCountDown();
            this.sendMsg(wsMsgKeyEnum.update_hand_holds);
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
            return;
        }


        //检测听牌
        this.room_seats[index].hu_prompt = this.prompt_hu_cards(index);
        if (this.room_seats[index].hu_prompt.length >= 1 && this.room_seats[index].ting_state != globalMgr.present_game_config.ting_state.ting) {

            console.log("cy 听牌提示");
            globalMgr.present_room_mgr.setRoomsSeatsTingState(index, this.roomid, globalMgr.present_game_config.ting_state.wait_ting);
            this.cards_sort(index);
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
            this.sendMsg(wsMsgKeyEnum.update_hand_holds);
            
            return;
        }

        var hand_holds = this.room_seats[index].hand_holds;
        let card_copy = this.check_dark_collsion(hand_holds, hand_holds.length) != false ? this.check_dark_collsion(hand_holds, hand_holds.length) : JSON.parse(JSON.stringify(card_info_bo));

        //检测弯杠
        if (this.check_wan_collsion(index, card_copy)) {
            this.cards_sort(index);
            this.room_seats[index].hand_holds.push(card_info_bo);
            this.startOutCardCountDown();
            this.sendMsg(wsMsgKeyEnum.update_hand_holds);
            globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.collision_card);
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
            return;
        }

        //检测暗杠
        if (this.check_collision_card(index, card_info_bo) != false) {
            this.cards_sort(index);
            this.room_seats[index].hand_holds.push(card_info_bo);
            this.startOutCardCountDown();
            this.sendMsg(wsMsgKeyEnum.update_hand_holds);
            globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.collision_card);
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
            return;
        }

        this.cards_sort(index);
        this.room_seats[index].hand_holds.push(card_info_bo);
        var cache_hand_holds = this.room_seats[index].hand_holds.slice(0);
        //通知该出牌了
        this.turn = seats_index;
        if (this.room_seats[index].ting_state == globalMgr.present_game_config.ting_state.ting) { //听牌         
            this.startOutCardCountDown();
            this.sendMsg(wsMsgKeyEnum.update_hand_holds);
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
            this.upIndex = index;
                    
            this.room_seats[this.upIndex].card_info_bo = card_info_bo;
            this.room_seats[this.upIndex].hand_holds = cache_hand_holds;
            // this.send_card(this.room_seats[index].user_id, card_info_bo);
        }
        else {
            globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.send_card);
            this.startOutCardCountDown();
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
            this.room_seats[index].hand_holds = cache_hand_holds;
            this.sendMsg(wsMsgKeyEnum.update_hand_holds);
        }
    }




    /**
 * 监管并响应在托管状态下的任何操作（自动化）
 */
    on_trusteepship(index) {
        var uid = this.room_seats[index].user_id;
        var action_state = this.room_seats[index].action_state;

        // AI 机器人：交给分级决策引擎
        if (this.room_seats[index].is_ai) {
            this.ai_decide(index);
            return;
        }

        if (this.room_seats[index].ting_state == globalMgr.present_game_config.ting_state.wait_ting) {
            this.skip_this_part(uid);
            return;
        }
        else if (action_state == globalMgr.present_game_config.action_state.send_card) {
            log.warn("出牌");
            var hand_holds = this.room_seats[index].hand_holds;
            var last_valid_index = hand_holds.length - 1;
            log.warn(hand_holds);
            
            if(hand_holds.length != 14)
            {
                log.warn('错了');
                return;
            }

            while (hand_holds[last_valid_index].isTouch == false) {
                log.warn(last_valid_index);
                last_valid_index -= 1;
            }

            var head_card = hand_holds[last_valid_index];
            this.send_card(uid, head_card);
            return;
        }
        else if (action_state == globalMgr.present_game_config.action_state.mai_zui) {
            log.warn("买嘴");
            let maizui_arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];//waiting，前端测试好，马上修改
            this.set_maizui_status(uid, maizui_arr);
            return;
        }
        else if (action_state == globalMgr.present_game_config.action_state.wait) {
            log.warn("等待状态");
            return;
        }
        else {
            this.skip_this_part(uid);
            return;
        }

    }



    /**
    * 开始出牌倒计时
    */
    startOutCardCountDown() {
        this.closeOutCardCountDown();
        var ready_index = this.get_ready_index();
        let index = !ready_index ? this.turn : ready_index;
        this.outCardCountDown_time = this.room_seats[index].is_trusteeship ? globalMgr.present_game_config.countdown_conf.trusteeship : globalMgr.present_game_config.countdown_conf.playing;
        if (this.room_seats[index].ting_state === globalMgr.present_game_config.ting_state.ting){
            this.outCardCountDown_time = globalMgr.present_game_config.countdown_conf.ting_card;
            // this.turn = this.getNextSeat(this.turn).seats_index;
            globalMgr.present_room_mgr.setRoomsSeatsActionState(this.turn, this.roomid, globalMgr.present_game_config.action_state.send_card);
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);        
        }
            

        this.outCardCountDown_setInterval = setInterval(this.outCardCountDown.bind(this), 1000)

        //更新倒计时
        let res_data = {
            countdown: this.outCardCountDown_time
        }
        this.sendMsg(wsMsgKeyEnum.update_countdown_all, res_data);
    }


    outCardCountDown() {
        this.outCardCountDown_time--;
        //更新倒计时
        let res_data = {
            countdown: this.outCardCountDown_time
        }
        this.sendMsg(wsMsgKeyEnum.update_countdown_all, res_data);

        const index = this.upIndex;
        if(this.upIndex != null){
            if (this.outCardCountDown_time <= 0 && this.room_seats[index].ting_state === globalMgr.present_game_config.ting_state.ting) {
                clearInterval(this.outCardCountDown_setInterval);
                log.warn("ting_card startOutCardCountDown Over");
                // this.turn = index;
                this.send_card(this.room_seats[index].user_id, this.room_seats[index].card_info_bo,true);
                this.upIndex = null;
                this.room_seats[index].card_info_bo = null;
                return;
            }
        }
        
        if (this.outCardCountDown_time <= 0) {
            clearInterval(this.outCardCountDown_setInterval);
            log.warn("startOutCardCountDown Over");
            var ready_index = this.get_ready_index();
            this.trusteeship(this.room_seats[ready_index].user_id);
        }
    }


    /**
     * 关闭出牌计时器
     */
    closeOutCardCountDown() {
        this.outCardCountDown_setInterval && clearInterval(this.outCardCountDown_setInterval);
    }

    /**
     * 启动 AI 调度器：周期扫描，发现 AI 座位处于可操作状态则按难度延时执行决策。
     * 不影响真人座位的既有倒计时逻辑。
     */
    startAIScheduler() {
        if (this._ai_scheduler) return;
        // AI robots and human seats in trusteeship both need continuous scheduling.
        var hasAutomatedSeat = false;
        for (var i = 0; i < this.room_seats.length; i++) {
            if (this.room_seats[i].is_ai || this.room_seats[i].is_trusteeship) {
                hasAutomatedSeat = true;
                break;
            }
        }
        if (!hasAutomatedSeat) return;

        this._ai_pending = {};   // seats_index -> true 表示已安排，避免重复触发
        this._ai_scheduler = setInterval(this.aiTick.bind(this), 400);
        log.warn("AI 调度器已启动 roomid=" + this.roomid);
    }

    stopAIScheduler() {
        if (this._ai_scheduler) {
            clearInterval(this._ai_scheduler);
            this._ai_scheduler = null;
        }
        if (this._ai_pending_timers) {
            for (var k in this._ai_pending_timers) {
                this._ai_pending_timers[k] && clearTimeout(this._ai_pending_timers[k]);
            }
        }
        this._ai_pending_timers = {};
        this._ai_pending = {};
    }

    /**
     * 调度器心跳：找到需要操作的 AI 座位并延时执行。
     */
    aiTick() {
        try {
            var cfg = globalMgr.present_game_config;
            var AS = cfg.action_state;

            // 房间结束则停止
            if (this.room_info && (this.room_info.home_state == cfg.game_scene.single_over
                || this.room_info.home_state == cfg.game_scene.game_over
                || this.room_info.home_state == cfg.game_scene.tie_over
                || this.room_info.home_state == cfg.game_scene.wait_over)) {
                this.stopAIScheduler();
                return;
            }

            this._ai_pending_timers = this._ai_pending_timers || {};

            for (var i = 0; i < this.room_seats.length; i++) {
                var seat = this.room_seats[i];
                if (!seat || (!seat.is_ai && !seat.is_trusteeship)) continue;
                if (this._ai_pending_timers[i]) continue; // 已安排

                var as = seat.action_state;
                var needAct =
                    seat.ting_state == cfg.ting_state.wait_ting ||
                    as == AS.send_card || as == AS.self_hu || as == AS.collision_and_hu ||
                    as == AS.hu_card || as == AS.knock_collsion_hu || as == AS.knock_and_hu ||
                    as == AS.knock_card || as == AS.knock_and_collsion || as == AS.collision_card;

                if (!needAct) continue;

                // 按难度设定"思考"延时：入门慢、高手快但不至于瞬间
                var level = seat.ai_level || 0;
                var delay = level === 0 ? 1500 : (level === 1 ? 1100 : 800);
                delay += Math.floor(Math.random() * 400);

                // 测试加速：环境变量 AI_FAST=1 时几乎无延时
                if (process.env.AI_FAST === '1') {
                    delay = 20 + Math.floor(Math.random() * 30);
                }

                (function (self, seatIndex) {
                    self._ai_pending_timers[seatIndex] = setTimeout(function () {
                        self._ai_pending_timers[seatIndex] = null;
                        try {
                            var s = self.room_seats[seatIndex];
                            if (!s || (!s.is_ai && !s.is_trusteeship)) return;
                            // 二次确认仍需操作（状态可能已变）
                            self.on_trusteepship(seatIndex);
                        } catch (e) {
                            log.error("aiTick exec error: " + (e && e.message));
                        }
                    }, delay);
                })(this, i);
            }
        } catch (error) {
            log.error("aiTick error: " + (error && error.message));
        }
    }

        
    /**
     * 计算所有人分数
     */
    caculate_score(){

    }

    //断线重连
    onReconnection(userid) {
        let seat = globalMgr.present_room_mgr.getSeatsInfoByUseridAndRoomid(this.roomid, userid);
        this.sendMsg(wsMsgKeyEnum.update_room_info_all);
        this.sendMsg(wsMsgKeyEnum.update_hand_holds_single, null, seat.user_id, seat.seats_index);
        
    }


    //销毁
    onDestroy() {
        this.closeOutCardCountDown();
        this.stopAIScheduler();
    }

}

module.exports = WSMahjongGameBaseLogic
