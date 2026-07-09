var tools = require('../../utils/tools');
var log = require("../../utils/log");
var e = require('events');
var dataMgr = require('../../mgr/DataMgr');
var wsUserMgr = require("../../mgr/WSUserMgr");
var systemBizCodeEnum = require('../../config/SystemBizCodeEnum');
var dbConstantMgr = require('../../mgr/DBConstantMgr');
var wsMsgKeyEnum = require('../../config/WSMsgKeyEnum')

var WSMahjongGameBaseLogic = require("../../base/logic/WSMahjongGameBaseLogic");

const CardTypeMixin = {
    /**
     * 臭张
     */
    chou_zhang(index, card_info_bo) {
        if (this.room_seats[index].ting_state != globalMgr.present_game_config.ting_state.ting) {
            log.warn('未显听，无臭张');
            return;
        }

        let count = 0;
        for (let i = 0; i < this.room_seats.length; i++) {
            for (let j = 0; j < this.room_seats[i].out_holds.length; j++) {
                index != i && this.room_seats[i].out_holds[j].value == card_info_bo.value ? count += 1 : null;
            }
            count = count == 3 ? 4 : count;
            // index != i ? this.room_seats[i].result_score.splice(1, 1, -count) : null;
            // this.room_seats[index].result_score[1] += parseInt(count);
        }
        this.room_seats[this.previous_index].result_score[1] -= parseInt(count);
        this.room_seats[index].result_score[1] += parseInt(count);
    },


    /**
     * 幺鸡头
     */
    yao_ji_tou() {
        let jiang_value = this.jiang_value % 16;
        return jiang_value == 0 || jiang_value == 1 || jiang_value == 9 ? true : false;
    },



    /**
     * 连六
     */
    lian_liu(pre_arr, arr_length) {
        let count = 0;
        let new_arr = [];
        let wan_arr = [];
        let tiao_arr = [];
        let bing_arr = [];

        let arr = pre_arr.slice(0);
        arr.sort((a, b) => a.value - b.value);

        for (let i = 0; i < arr_length; i++) {
            new_arr.indexOf(arr[i].value) == -1 && arr[i].isTouch == true ? new_arr.push(arr[i].value) : arr.splice(i, 1, 0);
        }

        for (let i = 0; i < arr_length; i++) {
            let card_type = arr[i] == 0 ? -1 : this.check_card_type(arr[i]);
            card_type == 1 ? wan_arr.push(arr[i]) : null;
            card_type == 2 ? tiao_arr.push(arr[i]) : null;
            card_type == 3 ? bing_arr.push(arr[i]) : null;
        }

        let wan_secutive_num = this.check_secutive_card(wan_arr, wan_arr.length);
        let tiao_secutive_num = this.check_secutive_card(tiao_arr, tiao_arr.length);
        let bing_secutive_num = this.check_secutive_card(bing_arr, bing_arr.length);

        count += wan_secutive_num == 9 ? 2 : wan_secutive_num >= 6 ? 1 : 0;
        count += tiao_secutive_num == 9 ? 2 : tiao_secutive_num >= 6 ? 1 : 0;
        count += bing_secutive_num == 9 ? 2 : bing_secutive_num >= 6 ? 1 : 0;

        return count;
    },


    /**
     * 检测卡牌是否连续(有序)
     */
    check_secutive_card(arr, arr_length) {
        let count = 0;
        let max = 0;

        for (let i = 1; i < arr_length; i++) {
            arr[i].value - arr[i - 1].value == 1 ? count += 1 : count = 0;
            max = max < count ? count : max;
        }

        max = max == 0 ? 0 : max + 1;
        return max;
    },


    /**
     * 五个头
     */
    wu_ge_tou(arr, arr_length) {
        let result_arr = [];
        let count = 0;
        let status = false;

        for (let i = 0; i < arr_length; i++) {
            result_arr.push(arr[i].value % 16);
        }

        result_arr.sort((a, b) => a - b);

        for (let i = 1; i < result_arr.length; i++) {
            result_arr[i] == result_arr[i - 1] ? count += 1 : count = 0;
            count >= 4 ? status = true : null;
        }

        status ? log.warn('五个头') : null;
        return status;
    },


    /**
     * 断幺
     */
    duan_yao(arr, arr_length) {
        let status = true;
        for (let i = 0; i < arr_length; i++) {
            let val = arr[i].value % 16;
            val == 0 || val == 1 || val == 9 ? status = false : null;
        }

        status ? log.warn('断幺') : null;
        return status;
    },


    /**
     * 独五
     */
    du_wu(arr, arr_length) {
        let status = false;
        let count = 0;

        for (let i = 0; i < arr_length; i++) {
            arr[i].value % 16 == 5 ? count += 1 : null;
        }

        status = count == 1 ? true : false;
        status ? log.warn('独五') : null;

        return status;
    },


    /**
     * 八只
     */
    ba_zhi(arr, arr_length) {
        let status = false;
        let main_card_num = this.caculate_main_card_num(arr, arr_length);
        let zi_card_num = this.caculate_zi_card_num(arr, arr_length);

        main_card_num >= 8 || zi_card_num >= 8 ? status = true : null;

        status ? log.warn('八只') : null;
        return status;
    },


    /**
     * 番子
     */
    fan_zi(arr, arr_length) {
        let fan_count = 0;
        let zhong_count = 0;
        let fa_count = 0;
        let bai_count = 0;

        for (let i = 0; i < arr_length; i++) {
            arr[i].value / 16 == 7 ? zhong_count += 1 : null;
            arr[i].value / 16 == 8 ? fa_count += 1 : null;
            arr[i].value / 16 == 9 ? bai_count += 1 : null;
        }

        zhong_count >= 3 ? fan_count += 1 : null;
        fa_count >= 3 ? fan_count += 1 : null;
        bai_count >= 3 ? fan_count += 1 : null;

        fan_count > 0 ? log.warn('番子*' + fan_count) : null;
        return fan_count;
    },


    /**
     * 连庄
     */
    lian_zhuang(index) {
        let status = false;
        status = index == this.previous_boss ? true : false;
        status ? this.room_info.max_inning += 1 : null;
        status ? log.warn('连庄') : null;
        return status;
    },


    /**
     * 坎子
     */
    kan_zi(index,card_copy,card_copy_length) 
    {
        let kan_zi_num = this.room_seats[index].collision_holds.length;
        let check_arr = this.remove_knock_and_collision(index,card_copy.slice(0),card_copy_length).slice(0);
        let jiangs_num = 2;
        let final_arr = [];

        for(let i = 0; i < check_arr.length; i++)
        {
            this.jiang_value == check_arr[i].value && jiangs_num > 0 ? null : final_arr.push(check_arr[i].value);
            this.jiang_value == check_arr[i].value && jiangs_num > 0 ? jiangs_num -= 1 : null;
        }

        let count = 0;
        for (let i = 1; i < final_arr.length; i++) {
            final_arr[i] - final_arr[i - 1] == 0 ? count += 1 : count = 0;
            count >= 2 ? kan_zi_num += 1 : null;
            count >= 2 ? count = 0 : null;
        }

        kan_zi_num >= 0 ? log.warn('坎子数:' + kan_zi_num) : null;
        return kan_zi_num;
    },
}

const GameBtnCallBackMixin = {

    /**
     * 设置买嘴状态
     */
    set_maizui_status(uid, maizui_arr) {
        var send_ready = true;
        let index = this.find_user_index(uid);
        maizui_arr[0] = 1; //默认都买占庄
        this.room_seats[index].maizui_arr = maizui_arr;
        globalMgr.present_room_mgr.setRoomsSeatsActionState(index, this.roomid, globalMgr.present_game_config.action_state.wait);

        for (let i = 0; i < this.room_seats.length; i++) {
            send_ready = send_ready && this.room_seats[i].action_state == globalMgr.present_game_config.action_state.wait ? true : false;
        }

        send_ready ? this.closeOutCardCountDown() : null;
        send_ready ? this.runScene(globalMgr.present_game_config.game_scene.game_start) : null;
        this.sendMsg(wsMsgKeyEnum.update_hand_holds);
        this.sendMsg(wsMsgKeyEnum.update_room_info_all);
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

        //买嘴杠四次后直接流庄
        this._collision_count += 1;
        this._collision_count >= 4 ? this.runScene(globalMgr.present_game_config.game_scene.tie_over) : null;
        this._collision_count >= 2 ? this._hold_cards_length += 2 : null;

        //杠牌完成之后，出牌
        globalMgr.present_room_mgr.setRoomsSeatsAnimState(seats_index, this.roomid, globalMgr.present_game_config.anim_state.collision_card);
        this.sendMsg(wsMsgKeyEnum.update_hand_holds);
        this.sendMsg(wsMsgKeyEnum.update_room_info_all);
        globalMgr.present_room_mgr.setRoomsSeatsAnimState(seats_index, this.roomid, globalMgr.present_game_config.anim_state.empty);
    }

}

const GameToolsMixin = {

}


class WSLogic extends WSMahjongGameBaseLogic {
    constructor(roomid) {
        super(roomid,globalMgr.present_game_config.game_scene.game_maizui);


        Object.assign(this, CardTypeMixin, GameBtnCallBackMixin,GameToolsMixin);

        console.log("游戏逻辑 3、初始化 WSLogic roomid = " + roomid)

    }


    /**
     * 切换场景
     * @param {*} game_scene_key 
     */
    runScene(game_scene_key) {

        function game_maizui() {

            this.onGameStart(this.room_info.room_type, this.roomid);

            globalMgr.present_room_mgr.setRoomsAllUsersStateByRoomid(this.roomid, globalMgr.configMgr.rooms_users_state.playing);
            globalMgr.present_room_mgr.setRoomsState(this.roomid, globalMgr.present_game_config.game_scene.game_maizui);
            for (let i = 0; i < this.room_seats.length; i++) {
                globalMgr.present_room_mgr.setRoomsSeatsActionState(i, this.roomid, globalMgr.present_game_config.action_state.mai_zui);
            }

            this.hideOutCardCountDown();
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
        }

        switch (game_scene_key) {
            case globalMgr.present_game_config.game_scene.game_maizui: //买嘴阶段
                game_maizui.bind(this)();
                break;
      
            default:
                super.runScene(game_scene_key);
                break;
        }
    }

    /**
     * 创建的假数据用来 测试 胡牌 规则
     * fake_data(fake news)
     */
    create_fake_data() {
        return;
          var cards = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x11, 0x11, 0x13, 0x14, 0x15];
          var cards1 = [0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x12, 0x12, 0x12, 0x06];
          var cards2 = [0x01, 0x01, 0x01, 0x02, 0x04, 0x07, 0x08, 0x09, 0x18, 0x18, 0x05, 0x05, 0x05];
  
          this.room_seats[0].hand_holds.length = 0;
          for (var i = 0; i < cards.length; i++) {
              var cib = new globalMgr.present_card_info_bo_class();
              cib.value = cards[i];
              cib.isTouch = true;
              cib.isShow = true;
              cib.isCard = false;
              this.room_seats[0].hand_holds.push(cib);
          }
  
          this.room_seats[1].hand_holds.length = 0;
          for (var i = 0; i < cards1.length; i++) {
              var cib1 = new globalMgr.present_card_info_bo_class();
              cib1.value = cards1[i];
              cib1.isTouch = true;
              cib1.isShow = true;
              cib1.isCard = false;
              this.room_seats[1].hand_holds.push(cib1);
          }

          if(!this.room_seats[2])return;
          this.room_seats[2].hand_holds.length = 0;
          for (var i = 0; i < cards2.length; i++) {
              var cib1 = new globalMgr.present_card_info_bo_class();
              cib1.value = cards2[i];
              cib1.isTouch = true;
              cib1.isShow = true;
              cib1.isCard = false;
              this.room_seats[2].hand_holds.push(cib1);
          }

    }

    /**
     * 计算所有人的分数
     */
    caculate_score(is_self) {

        for (var i = 0; i < this.room_seats.length; i++) {
            if (this.room_seats[i].action_state == globalMgr.present_game_config.action_state.hu_card_over) {
                //检测所胡的牌型(清一色，一条龙，清一色一条龙，边坎，平胡)
                this.check_can_hu(i, this.previous_card);

                this.room_seats[i].hand_holds.length == 14 ? null : this.room_seats[i].hand_holds.push(this.previous_card);
                this.sendMsg(wsMsgKeyEnum.update_hand_holds);

                let card_arr = this.room_seats[i].hand_holds;

                this.room_seats[i].hu_state == globalMgr.present_game_config.hu_state.qi_dui ? this.room_seats[i].result_score[2] += 1 : null;

                this.room_seats[i].hu_state == globalMgr.present_game_config.hu_state.yi_tiao_long ? this.room_seats[i].result_score[2] += 3 : null;

                this.room_seats[i].hu_state == globalMgr.present_game_config.hu_state.dui_dui ? this.room_seats[i].result_score[2] += 1 : null;

                this.room_seats[i].hu_state == globalMgr.present_game_config.hu_state.shi_san_yao ? this.room_seats[i].result_score[2] += 1 : null;

                this.room_seats[i].hu_state == globalMgr.present_game_config.hu_state.ping_hu ? this.room_seats[i].result_score[2] += 1 : null;

                this.check_same_color(card_arr, card_arr.length) ? this.room_seats[i].result_score[2] += 1 : null;

                this.hun_yi_se(card_arr, card_arr.length) ? this.room_seats[i].result_score[2] += 1 : null;

                this.bu_xia_jia(i) ? this.room_seats[i].result_score[2] += 1 : null;

                //嘴子(已结算)
                this.caculate_maizui_score(i, is_self);

                //臭张(已结算)
                this.chou_zhang(i, this.previous_card);

                //显听
                this.room_seats[i].ting_state == globalMgr.present_game_config.ting_state.ting ? this.room_seats[i].result_score[4] += 1 : null;

                //显听自摸
                let self_xian = false;
                this.room_seats[i].ting_state == globalMgr.present_game_config.ting_state.ting && is_self ? self_xian = true : null;

                //结算胡牌/自摸/显听(自摸跟普通胡牌分开，考虑一个自摸后清除状态)
                for (let j = 0; j < this.room_seats.length; j++) {
                    for (let k = 0; k < this.room_seats[j].result_score.length; k++) {
                        if ((k == 2 && !is_self) || k == 4)//平胡
                        {
                            is_self && j != i ? this.room_seats[j].result_score[k] -= 1 : null;
                            is_self && j == i ? this.room_seats[i].result_score[k] *= 3 : null;
                            !is_self && this.previous_index == j ? this.room_seats[this.previous_index].result_score[k] -= this.room_seats[i].result_score[k] : null;
                        }
                        else if (k == 2 && is_self)//自摸
                        {
                            j != i ? this.room_seats[j].result_score[3] -= this.room_seats[i].result_score[2] : null;
                            j == i ? this.room_seats[j].result_score[3] += this.room_seats[i].result_score[2] * 3 : null;
                            j == this.room_seats.length - 1 ? this.room_seats[i].result_score[2] = 0 : null;
                        }
                    }
                }

                //核算分数部分
                for (let j = 0; j < this.room_seats.length; j++) {
                    let score = 0;
                    for (let k = 0; k < this.room_seats[j].result_score.length - 1; k++) {
                        score += k == 0 ? parseInt(this.room_seats[j].result_score[k].maizui_score) : parseInt(this.room_seats[j].result_score[k])
                    }
                    this.room_seats[j].score += self_xian ? score * 2 : score;
                    self_xian ? this.room_seats[i].result_score[5] = 'x2' : null;
                    this.room_seats[j].total_score += this.room_seats[j].score;
                }

            }
        }

    }


    /**
     * 计算买嘴分数
     */
    caculate_maizui_score(index, is_self) {
        let mai_zui_score_arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        let card_arr = this.room_seats[index].hand_holds;
        let maizui_arr = this.room_seats[index].maizui_arr;
        let calc_arr = [0, 0, 0, 0];
        let score_arr = [0, 0, 0, 0];


        //根据胡牌者合并算出买嘴最大子集
        for (let i = 0; i < this.room_seats.length; i++) {
            //初始化数组
            let init_arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            score_arr.splice(i, 1, init_arr);
            if (index != i) {
                let merge_arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                for (let j = 0; j < this.room_seats[i].maizui_arr.length; j++) {
                    maizui_arr[j] && this.room_seats[i].maizui_arr[j] ? merge_arr[j] = 1 : null;
                }
                calc_arr.splice(i, 1, merge_arr);
            }
        }
        calc_arr.splice(index, 1, maizui_arr)


        for (let i = 0; i < maizui_arr.length; i++) {
            //连庄
            i == 0 && maizui_arr[i] == 1 && this.lian_zhuang(index) ? mai_zui_score_arr[i] += 2 : null;

            i == 1 && maizui_arr[i] == 1 && this.lian_liu(card_arr, card_arr.length) ? mai_zui_score_arr[i] += 1 : null;

            i == 2 && maizui_arr[i] == 1 && this.duan_yao(card_arr, card_arr.length) ? mai_zui_score_arr[i] += 1 : null;

            i == 3 && maizui_arr[i] == 1 && this.fan_zi(card_arr, card_arr.length) ? mai_zui_score_arr[i] += 1 : null;

            i == 4 && maizui_arr[i] == 1 && this.du_wu(card_arr, card_arr.length) ? mai_zui_score_arr[i] += 1 : null;

            i == 5 && maizui_arr[i] == 1 && this.kan_zi(index,card_arr, card_arr.length) > 0 ? mai_zui_score_arr[i] += this.kan_zi(index,card_arr, card_arr.length) * 2 : null;

            i == 6 && maizui_arr[i] == 1 && this.ba_zhi(card_arr, card_arr.length) ? mai_zui_score_arr[i] += 1 : null;

            i == 7 && maizui_arr[i] == 1 && this.wu_ge_tou(card_arr, card_arr.length) ? mai_zui_score_arr[i] += 1 : null;

            i == 8 && maizui_arr[i] == 1 && this.yao_ji_tou() ? mai_zui_score_arr[i] += 1 : null;

            i == 9 && maizui_arr[i] == 1 && this.lack_one(card_arr, card_arr.length) ? mai_zui_score_arr[i] += 1 : null;
        }


        //合并计算项
        for (let i = 0; i < this.room_seats.length; i++) {
            let merge_arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            for (let j = 0; j < calc_arr[i].length; j++) {
                mai_zui_score_arr[j] && calc_arr[i][j] ? merge_arr[j] = 1 : null;
            }
            calc_arr.splice(i, 1, merge_arr);
        }

        //计算各人买嘴分数
        if (is_self) {
            //自己先把分数叠加到自己身上，然后所有人取负
            log.warn('自摸扣分环节');
            for (let i = 0; i < this.room_seats.length; i++) {
                for (let j = 0; j < calc_arr[i].length; j++) {
                        i != index && calc_arr[i][j] > 0 ? score_arr[i][j] -= calc_arr[i][j] * 2 : null;
                        i != index && calc_arr[index][j] > 0 ? score_arr[i][j] -= calc_arr[index][j] * 2 : null;
                }

                for (let j = 0; j < score_arr[i].length; j++) {
                    i != index && score_arr[i][j] < 0 ? score_arr[index][j] -= score_arr[i][j] : null;
                }
            } 
        }
        else {
            log.warn('扣分环节');
            //输牌者分数叠加到自己身上，然后自己取负
            for (let i = 0; i < calc_arr[this.previous_index].length; i++) {
                calc_arr[index][i] > 0 ? score_arr[this.previous_index][i] -= calc_arr[index][i] : null;
                calc_arr[this.previous_index][i] > 0 ? score_arr[this.previous_index][i] -= calc_arr[this.previous_index][i] : null;
            }

            for (let i = 0; i < calc_arr[index].length; i++) {
                score_arr[index][i] -= score_arr[this.previous_index][i];
            }
        }

        console.log('买嘴结果' + mai_zui_score_arr);

        for (let i = 0; i < this.room_seats.length; i++) {
            let score = 0;
            for (let j = 0; j < score_arr[i].length; j++) {
                score += score_arr[i][j];
            }

            let result = {
                maizui_arr: score_arr[i],
                maizui_score: score
            }

            this.room_seats[i].result_score.splice(0, 1, result);
        }
    }


    /**
     * 买嘴倒计时
     */
    hideOutCardCountDown() {
        this.closeOutCardCountDown();
        this.outCardCountDown_time = globalMgr.present_game_config.countdown_conf.hide_card;
        this.outCardCountDown_setInterval = setInterval(this.hideCardCountDown.bind(this), 1000)

        //更新倒计时
        let res_data = {
            countdown: this.outCardCountDown_time
        }
        this.sendMsg(wsMsgKeyEnum.update_countdown_all, res_data);
    }


    hideCardCountDown() {
        this.outCardCountDown_time--;
        //更新倒计时
        let res_data = {
            countdown: this.outCardCountDown_time
        }
        this.sendMsg(wsMsgKeyEnum.update_countdown_all, res_data);

        if (this.outCardCountDown_time <= 0) {
            clearInterval(this.outCardCountDown_setInterval);
            log.warn("买嘴倒计时结束");
            for (var i = 0; i < this.room_seats.length; i++) {
                this.on_trusteepship(i);
            }
        }
    }


    sendMsg(key, data, uid, seats_index) {

        function update_room_info_all(){
            console.log(this.previous_index);

            let roomid = null;
            if (this.room_info.room_type == dbConstantMgr.ROOM_TYPE_ORDINARY) {
                roomid = this.roomid;
            } else {
                // 匹配房：内部 roomid 是 UUID，不适合展示。
                // 生成并缓存一个随机 6 位展示房号，整局保持不变。
                if (!this.room_info.display_roomid) {
                    this.room_info.display_roomid = String(Math.floor(100000 + Math.random() * 900000));
                }
                roomid = this.room_info.display_roomid;
            }
            for (let i = 0; i < this.room_seats.length; ++i) {

                var resdata = {
                    roomid          : roomid, //房间id
                    end_points      : this.room_info.end_points, //底分
                    home_state      : this.room_info.home_state, //房间状态
                    last_index      : this.previous_index,//上一个用户的座位下标
                    home_cards_num  : this._card_length-this.card_site, // 房间剩余牌数
                    cruent_inning   : this.room_info.cruent_inning,//当前局数
                    max_inning      : this.room_info.max_inning,//最大局数
                    max_people_num  : this.room_info.max_people_num,//最大人数
                    deduct_tickets  : this.room_info.deduct_tickets,//房费
                    rule_conf       : this.room_info.rule_conf,//特殊动态规则
                    baseinfo_conf   : this.room_info.baseinfo_conf,//当前房间进度 断线重连使用 针对 不同游戏规则
                    seats : [], //其它座位信息
                };
                let over_state = this.room_info.home_state == globalMgr.present_game_config.game_scene.wait_over ||  this.room_info.home_state == globalMgr.present_game_config.game_scene.single_over || this.room_info.home_state == globalMgr.present_game_config.game_scene.game_over;
        
                for (let i = 0; i < this.room_seats.length; ++i) {
                    let seat = {
                        user_id         : this.room_seats[i].user_id,
                        user_name       : this.room_seats[i].user_name,
                        user_icon       : this.room_seats[i].user_icon,
                        user_ip         : this.room_seats[i].user_ip,
                        action_state    : this.room_seats[i].action_state,//座位当前状态
                        is_reconnection : this.room_seats[i].is_reconnection,//是否断线重连
                        seats_index     : this.room_seats[i].seats_index,//座位号
                        imultiple       : this.room_seats[i].imultiple,//倍数
                        is_online       : this.room_seats[i].is_online,//是否在线
                        is_trusteeship  : this.room_seats[i].is_trusteeship,//是否托管
                        identity        : this.room_seats[i].identity,//身份   房主 平民
                        card_num        : this.get_real_card_num(i),//获取实时牌的张数
                        score           : this.room_seats[i].score,//当前分数
                        total_score     : this.room_seats[i].total_score,//累计分数
                        out_holds       : this.room_seats[i].out_holds,//打出去的牌
                        knock_holds     : this.room_seats[i].knock_holds,//碰牌
                        collision_holds : this.room_seats[i].collision_holds,//杠牌
                        hide_num        : this.room_seats[i].hide_num,//隐藏牌数量
                        hu_state        : this.room_seats[i].hu_state,//胡的状态 类型
                        hu_prompt       : this.room_seats[i].hu_prompt, //可胡牌提醒
                        hide_card_num   : this.get_hide_card_num(i), //手牌数量
                        collision_prompt: this.room_seats[i].collision_prompt,//可杠牌提醒
                        present_card    : this.room_seats[i].anim_state == globalMgr.present_game_config.anim_state.empty && i == this.previous_index ? this.previous_card : null,//当前颁的 牌
                        ting_state      : this.room_seats[i].ting_state,//听牌 状态
                        anim_state      : this.room_seats[i].anim_state,//动画 状态
                        result_score    : this.room_seats[i].result_score,//结算分数结果数据
                        hand_holds      : over_state ? this.room_seats[i].hand_holds : null,//手牌
                        pos_name        : this.room_seats[i].pos_name,//方位名称(东南西北)
                        is_shot         : this.room_seats[i].is_shot,//是否为点炮
                    }
                    
                    resdata.seats.push(seat)
                }

                if (!this.room_seats[i].is_online) continue;
                wsUserMgr.sendMsg(this.room_seats[i].user_id, wsMsgKeyEnum.update_room_info_all, systemBizCodeEnum.SUCCESS, resdata)
            }
        }
        switch (key) {
            case wsMsgKeyEnum.update_room_info_all:
                update_room_info_all.bind(this)();
                break;
        
            default:
                super.sendMsg(key, data, uid, seats_index);
                break;
        }
        
    }
}

module.exports = WSLogic