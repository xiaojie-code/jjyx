var tools = require('../../utils/tools');
var log = require("../../utils/log");
var e = require('events');
var dataMgr = require('../../mgr/DataMgr');
var wsUserMgr = require("../../mgr/WSUserMgr");
var systemBizCodeEnum = require('../../config/SystemBizCodeEnum');
var dbConstantMgr = require('../../mgr/DBConstantMgr');
var wsMsgKeyEnum = require('../../config/WSMsgKeyEnum')
var appPointsClient = require('../../utils/app_points_client');

var WSMahjongGameBaseLogic = require("../../base/logic/WSMahjongGameBaseLogic");

/**
 * 胡牌类型 或 结算分数类型 的算法
 */
const CardTypeMixin = {

    

}
/**
 * 公共调用的 方法 工具类  给游戏流程 和 CardTypeMixin、GameBtnCallBackMixin   来使用的 一些 公共接口
 */
const GameToolsMixin = {


}
/**
 * 按钮响应事件
 */
const GameBtnCallBackMixin = {
    syncAppPointSettlement() {
        try {
            if (!this.room_seats || !this.room_info) return;
            let roomId = this.roomid;
            let inning = this.room_info.cruent_inning || 0;
            for (let i = 0; i < this.room_seats.length; i++) {
                let seat = this.room_seats[i];
                if (!seat || !seat.user_id) continue;
                let amount = Number(seat.score || 0);
                if (!isFinite(amount) || amount === 0) continue;
                amount = Number(amount.toFixed(6));
                let context = wsUserMgr.getAppPointsContext(seat.user_id);
                if (!context) continue;
                let side = amount > 0 ? 'settle' : 'bet';
                let requestId = ['mahjong', roomId, inning, seat.user_id, side].join(':');
                appPointsClient.changePoints(context, amount, amount > 0 ? 'mahjong_settle' : 'mahjong_bet', {
                    requestId: requestId,
                    roomId: roomId,
                    roundId: 'mahjong:' + roomId + ':' + inning,
                    inning: inning,
                    seatIndex: seat.seats_index,
                    score: amount,
                    totalScore: seat.total_score,
                }).then((ret) => {
                    log.warn('[mahjong points] synced ' + requestId + ' amount=' + amount + ' balance=' + (ret && (ret.balance || ret.points)));
                }).catch((error) => {
                    log.error('[mahjong points] failed ' + requestId + ' amount=' + amount + ' ' + (error && error.message || error));
                });
            }
        } catch (error) {
            log.error('[mahjong points] sync exception ' + (error && error.message || error));
        }
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
        
        this.removeHuaCard(index);

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
}

class WSLogic extends WSMahjongGameBaseLogic {
    constructor(roomid) {
        super(roomid);



        Object.assign(this, CardTypeMixin, GameBtnCallBackMixin,GameToolsMixin);

        console.log("游戏逻辑 3、初始化 WSLogic roomid = " + roomid)

    }


    //清一色（同种花色）2番4倍
    check_same_color(card, card_length) {
        var index_type = this.check_card_type(card[0]);

        for (var i = 1; i < card_length; i++) {
            if (index_type != this.check_card_type(card[i])) {
                return false;
            }

        }
        
        return true;
    }



    //混一色（万条筒种任意一个花色和风牌组成的胡牌类型）1番2倍
    check_hun_color(card){
        //先去除掉牌里的字牌，再去检查是否为清一色
        let filter_arr = card.filter(item => item.value <= 0x29);
        if(filter_arr.length<1)return false;

        return this.check_same_color(filter_arr,filter_arr.length) ? true : false;
    }



    //碰碰胡（由刻子或者杠子组成的牌型称为碰碰胡）1番2倍
    check_pen_pen_hu(card){
        //先去除将牌
        let filter_arr = card.filter(item => item.value != this.jiang_value);
        if(filter_arr.length<1)return false;

        var status = true;
        let chai_arr = this.postion_translate(filter_arr, filter_arr.length);

        for(var i = 0; i < chai_arr.length; i++)
        {
            status = status && chai_arr[i] == 3 ? true : false;
        }

        return status;
    }


    //混碰（碰碰胡的基础上判断是不是混一色）2番4倍
    check_hun_pen(card, card_length){
        return this.check_pen_pen_hu(card, card_length) && this.check_hun_color(card, card_length) ? true : false;
    }



    //清碰（碰碰胡的基础上判断是不是清一色）3番8倍
    check_qin_pen(card, card_length){
        return this.check_pen_pen_hu(card, card_length) && this.check_same_color(card, card_length) ? true : false;
    }



    //大吊车（手牌里除了将牌，剩下全是通过吃，碰杠来的）1番2倍
    check_da_diao_che(index, card, card_length){
        //去除杠牌和碰牌后，检测是否只剩两张，只剩两张就是大吊车
        let check_arr = this.remove_knock_and_collision(index,card.slice(0),card_length).slice(0);

        return check_arr.length == 2 ? true : false;
    }



    //门清（玩家没有进行过吃，碰，明杠，而达成的胡牌）1番2倍
    check_men_qin(index){
        //根据座位找到这个人，检测这个人碰牌和杠牌的数组长度加起来是否等于4，等于4返回true
        return (this.room_seats[index].knock_holds.length + this.room_seats[index].collision_holds.length) == 0 ? true : false;
    }

    //检测风向碰(用于花分计算)
    check_feng_pen(index){
        let knock_arr = this.room_seats[index].knock_holds.slice(0);

        let filter_arr = knock_arr.filter(item => item.value > 0x29);
        if(filter_arr.length<1)return 0;


        return filter_arr.length;
    }

    //检测风向杠
    check_collision_num(index){
        let collision_arr = this.room_seats[index].collision_holds.slice(0);
        
        let filter_arr = collision_arr.filter(item => item.value > 0x29);
        if(filter_arr.length<1)return 0;
        
        return filter_arr.length;
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

            //摇色子 设定 当局底分
            this.set_cruent_inning_end_points();

            //更新用户手牌
            this.sendMsg(wsMsgKeyEnum.update_hand_holds);

            //更新房间信息(确定好庄家后，就更新房间信息)
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
        }

        switch (game_scene_key) {
            case globalMgr.present_game_config.game_scene.game_start: 
                game_start.bind(this)();
                break;
      
            default:
                super.runScene(game_scene_key);
                break;
        }
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
            element.out_buhua_holds = [];
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
     * 设置当前底分
     */
    set_cruent_inning_end_points(){
        this.room_info.cruent_inning_end_points = tools.Num.randomNumber(1,6);
    }
    /**
     * 创建的假数据用来 测试 胡牌 规则
     * fake_data(fake news)
     */
    create_fake_data() {

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
        // this.create_fake_data();
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
     * 洗牌
     */
    shuffle() {
        if (!this._cards) {
            this._cards = [];
        }

        //读取配置
        var card_conf = globalMgr.present_game_config['card_conf'][0];
        var card_conf_hua = globalMgr.present_game_config['card_conf'][1];
        

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

        for (var i in card_conf_hua) {
            for (let j = 0; j < 1; j++) {
                //格式化数据
                let cardInfoBO = new globalMgr.present_card_info_bo_class()
                cardInfoBO.isShow = true;
                cardInfoBO.value = card_conf_hua[i];
                cardInfoBO.isTouch = true;
                cardInfoBO.isCard = false;

                //将格式化后得数据 添加至内存
                this._cards.push(cardInfoBO);
            }
        }

        this._card_length = this._cards.length;
        // log.warn(this._cards);
        // log.warn(this._cards.length);

        //数组顺序打乱
        tools.Arr.upsetArr(this._cards);
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

        if (this.room_seats[index].hand_holds.length>=14) {
            log.warn("坂牌溢出 ：",this.room_seats[index].user_name);
            return;
        }

        var card_info_bo = this._cards[this.card_site++];
        var seats_index = this.room_seats[index].seats_index;
        console.warn("前 card_info_bo = ",card_info_bo.value)

        /**
         * 一开始发完牌以后进到这里就把牌初始化了；
         */
        if (this._card_length - this.card_site == this._cards.length - this.room_seats.length * 13 - 1) {
            this.previous_card = card_info_bo;
            this.previous_index = index;

            for (let i = 0; i < this.room_seats.length; i++) {
                this.cards_sort(i);
            }
        }



        //检测自摸
        if (this.check_can_hu(index, card_info_bo) && !this.room_seats[index].skip_hu_state && this.room_seats[index].ting_state == globalMgr.present_game_config.ting_state.ting) {

            globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.send_card);
            
            this.sendMsg(wsMsgKeyEnum.update_hand_holds);
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);


            this.check_collision_card(seats_index, card_info_bo) && !this.check_knock_state(seats_index, card_info_bo)
                ? globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.collision_and_hu)
                : globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.self_hu);

            this.previous_card = card_info_bo;
            this.cards_sort(index);
            this.room_seats[index].hand_holds.push(card_info_bo);
            this.removeHuaCard(index);
            this.startOutCardCountDown();


            this.sendMsg(wsMsgKeyEnum.update_hand_holds);
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
            return;
        }


        //检测听牌
        // this.room_seats[index].hu_prompt = this.prompt_hu_cards(index);
        // if (this.room_seats[index].hu_prompt.length >= 1 && this.room_seats[index].ting_state != globalMgr.present_game_config.ting_state.ting) {

        //     console.log("cy 听牌提示");
        //     globalMgr.present_room_mgr.setRoomsSeatsTingState(index, this.roomid, globalMgr.present_game_config.ting_state.wait_ting);
        //     this.cards_sort(index);
        //     this.sendMsg(wsMsgKeyEnum.update_room_info_all);
        //     this.sendMsg(wsMsgKeyEnum.update_hand_holds);
            
        //     return;
        // }

        var hand_holds = this.room_seats[index].hand_holds;
        let card_copy = this.check_dark_collsion(hand_holds, hand_holds.length) != false ? this.check_dark_collsion(hand_holds, hand_holds.length) : JSON.parse(JSON.stringify(card_info_bo));

        //检测弯杠
        if (this.check_wan_collsion(index, card_copy)) {
            this.cards_sort(index);
            this.room_seats[index].hand_holds.push(card_info_bo);
            this.removeHuaCard(index);
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
            this.removeHuaCard(index);
            this.startOutCardCountDown();
            this.sendMsg(wsMsgKeyEnum.update_hand_holds);
            globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.collision_card);
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
            return;
        }

        this.cards_sort(index);
        this.room_seats[index].hand_holds.push(card_info_bo);
        
        this.removeHuaCard(index);

        var cache_hand_holds = this.room_seats[index].hand_holds.slice(0);

        //通知该出牌了
        this.turn = seats_index;

        if (this.room_seats[index].ting_state == globalMgr.present_game_config.ting_state.ting) { //听牌         
            this.startOutCardCountDown();
            this.sendMsg(wsMsgKeyEnum.update_hand_holds);
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
            this.upIndex = index;
                    
            this.room_seats[this.upIndex].card_info_bo = this.room_seats[this.upIndex].hand_holds.pop();
            this.room_seats[this.upIndex].hand_holds = cache_hand_holds;
            // this.send_card(this.room_seats[index].user_id, card_info_bo);

            console.warn("后 card_info_bo = ",card_info_bo.value)
        }
        else {
            globalMgr.present_room_mgr.setRoomsSeatsActionState(seats_index, this.roomid, globalMgr.present_game_config.action_state.send_card);
            this.startOutCardCountDown();
            this.sendMsg(wsMsgKeyEnum.update_room_info_all);
            this.room_seats[index].hand_holds = cache_hand_holds;
            this.sendMsg(wsMsgKeyEnum.update_hand_holds);
        }
    }

    getSeatsHuaCards(index){
        var arr = [];
        var hand_holds = this.room_seats[index].hand_holds;
        
        for (let index = 0; index < hand_holds.length; index++) {
            const card_hold_bo = hand_holds[index];
            if(card_hold_bo.value>=0x70){
                arr.push(card_hold_bo);
            }
        }

        return arr;
    }

    /**
     * 过滤花牌
     * @param {*} get_card_index 
     */
    removeHuaCard(get_card_index){
        var huacards = this.getSeatsHuaCards(get_card_index);

        for (let i = 0; i < huacards.length; i++) {
            const huacard_info_bo = huacards[i];

            for (let j = 0; j < this.room_seats[get_card_index].hand_holds.length; j++) {
                const hand_hold_info_bo = this.room_seats[get_card_index].hand_holds[j];
                
                
                if (this.check_card_equal(hand_hold_info_bo, huacard_info_bo)) {

                    this.room_seats[get_card_index].hand_holds.splice(j, 1);

                    this.room_seats[get_card_index].out_buhua_holds.push(huacard_info_bo);

                    globalMgr.present_room_mgr.setRoomsSeatsAnimState(get_card_index, this.roomid, 1001);
            
                    this.sendMsg(wsMsgKeyEnum.update_room_info_all);
                    this.sendMsg(wsMsgKeyEnum.update_hand_holds);
                    globalMgr.present_room_mgr.setRoomsSeatsAnimState(get_card_index, this.roomid, globalMgr.present_game_config.anim_state.empty);


                    this.get_card(get_card_index);
                }
            }  
            
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
                card_arr.sort((a, b) => a.value - b.value);

                this.room_seats[i].hu_state == globalMgr.present_game_config.hu_state.qi_dui ? this.room_seats[i].result_score[2] += 1 : null;

                this.room_seats[i].hu_state == globalMgr.present_game_config.hu_state.yi_tiao_long ? this.room_seats[i].result_score[2] += 3 : null;

                this.room_seats[i].hu_state == globalMgr.present_game_config.hu_state.dui_dui ? this.room_seats[i].result_score[2] += 1 : null;

                this.room_seats[i].hu_state == globalMgr.present_game_config.hu_state.shi_san_yao ? this.room_seats[i].result_score[2] += 1 : null;

                this.room_seats[i].hu_state == globalMgr.present_game_config.hu_state.ping_hu ? this.room_seats[i].result_score[2] += 1 : null;

                //计算花分
                let hua_score = 0;
                //无花果(正常花牌)
                this.room_seats[i].out_buhua_holds.length == 0 ? hua_score+=10 : hua_score += this.room_seats[i].out_buhua_holds.length;
                //风向碰
                this.check_feng_pen(i) > 0 ? hua_score += this.check_feng_pen(i) : null;
                //检测杠牌
                this.room_seats[i].collision_holds.length > 0 ? hua_score += this.room_seats[i].collision_holds.length : null;
                //检测风向杠
                this.check_collision_num(i) > 0 ? hua_score += this.check_collision_num(i) : null;

                
                //计算游戏翻倍倍率(清一色/混一色 互斥;碰碰胡/大吊车/门清 叠乘)
                //叠乘后自然得到:混碰=混一色2×碰碰胡2=4倍、清碰=清一色4×碰碰胡2=8倍
                let multpie = 1;

                if (this.check_same_color(card_arr, card_arr.length)) {
                    multpie *= 4;                                                       // 清一色 2番4倍
                } else if (this.check_hun_color(card_arr, card_arr.length)) {
                    multpie *= 2;                                                       // 混一色 1番2倍
                }
                this.check_pen_pen_hu(card_arr) ? multpie *= 2 : null;                  // 碰碰胡 1番2倍
                this.check_da_diao_che(i, card_arr, card_arr.length) ? multpie *= 2 : null; // 大吊车 1番2倍
                this.check_men_qin(i) ? multpie *= 2 : null;                            // 门清 1番2倍

                // 本局单注 = (当局底分 + 花分) × 倍数;底分为开局摇骰子点数(1-6)
                let base_point = this.room_info.cruent_inning_end_points || 1;
                let unit = (base_point + hua_score) * multpie;

                let boss_code = globalMgr.present_game_config.identity_conf.boss_code;
                if (is_self) {
                    // 自摸:其余三家各付 unit(庄家涉及则翻倍),赢家收齐 —— 零和
                    let gain = 0;
                    for (var j = 0; j < this.room_seats.length; j++) {
                        if (j == i) continue;
                        let pay = unit;
                        (this.room_seats[i].identity == boss_code || this.room_seats[j].identity == boss_code) ? pay *= 2 : null;
                        this.room_seats[j].score -= pay;
                        gain += pay;
                    }
                    this.room_seats[i].score += gain;
                } else {
                    // 点炮:放炮者单独赔付 unit(庄家涉及则翻倍)
                    let payer = this.previous_index;
                    let pay = unit;
                    (this.room_seats[i].identity == boss_code || this.room_seats[payer].identity == boss_code) ? pay *= 2 : null;
                    this.room_seats[payer].score -= pay;
                    this.room_seats[i].score += pay;
                }
            }
        }

        //更新用户总分；
        for (let i = 0; i < this.room_seats.length; i++) {
            this.room_seats[i].total_score += this.room_seats[i].score;
            console.warn("用户当前总分 = ",this.room_seats[i].score + ' / '+this.room_seats[i].total_score);
        }
        this.syncAppPointSettlement();

    }



    /**
    * 开始出牌倒计时
    */
    startOutCardCountDown(ishua) {
        this.closeOutCardCountDown();
        var ready_index = this.get_ready_index();
        let index = !ready_index ? this.turn : ready_index;
        this.outCardCountDown_time = this.room_seats[index].is_trusteeship ? globalMgr.present_game_config.countdown_conf.trusteeship : globalMgr.present_game_config.countdown_conf.playing;
        if (this.room_seats[index].ting_state === globalMgr.present_game_config.ting_state.ting || ishua){
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
                    cruent_inning_end_points      : this.room_info.cruent_inning_end_points, //当局底分
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
                        out_buhua_holds : this.room_seats[i].out_buhua_holds,//补花
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
