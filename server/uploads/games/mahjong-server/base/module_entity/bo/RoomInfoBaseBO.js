/**
 * 房间属性 模型
 */
module.exports = class RoomInfoBaseBO {
    roomid = null;
    room_type = null;//房间类型  对应 DBConstantMgr->房间类型
    end_points = null; //底分
    deduct_tickets = null; //房费
    home_state = null; //房间状态  待优化  home_state 改成 room_state
    create_time = null; //此房间游戏开始时间
    seats = []; //座位
    last_index = null;    //最后出牌的人
    game_playing_out_holds = []; //游戏中出过的牌 不包括其它状态 CardInfoBO
    game_logic = null;
    cruent_inning = 0;//当前局数
    max_inning = 1;//最大局数
    max_people_num = null;//最大人数
    home_cards_num = null; //房间剩余牌数
    last_card  =    null; // 当前最后一张牌

    /**
     * 房间规则 针对 不同游戏规则
     * JSON格式：
     * key：在程序中规定，动态添加
     * 
     * 每个游戏特殊规则不一样子类 需要重写
     */
    rule_conf = null;//房间规则  针对 不同游戏规则



    /**
     * 当前房间进度 断线重连使用 针对 不同游戏规则
     * JSON格式：
     * key：在程序中规定，动态添加
     * 
     * 每个游戏特殊规则不一样子类 需要重写
     * * */
    baseinfo_conf   =    null;


    setRuleConf(game_rules) {
        
        if(!game_rules)return;
        
    }
}