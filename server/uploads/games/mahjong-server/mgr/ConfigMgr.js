
var configMgr = configMgr || {};

var config_list = {
    "dev": require("../config/Config_dev"),
    "pro": require("../config/Config_pro"),
    "test": require("../config/Config_test")
}

configMgr.getRunConfig = config_list[process.env.H_NODE_ENV || process.env.WS_NM_NODE_ENV]



configMgr.room_state = {
    repare      : 1, //准备
    playing     : 2, //游戏中
    single_over : 3, //单局结束
    game_over   : 4, //游戏结束
}
configMgr.rooms_users_state = {
    match: 1, //匹配中
    playing: 2, //游戏中
    game_over: 3, //游戏结束
    room: 4, //房间中
}


configMgr.game_conf = {

    "mahjong_game_shqm_server": { //上海敲麻
        game_key    :"mahjong_game_shqm_server",
        game_type   :"mahjong",
        
        matching : {//匹配配置
            rule_conf       : null, //特殊动态规则
            max_inning      : 1, //最大局数
            max_people_num  : 4, //最大人数
        },

        imultiple       : 1, //默认分数
        innings         : [8,16,24], //局数
        card_conf : {
            "0" : [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09,   //万 1 2 3 4 5 6 7 8 9
                0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19,    //条 17 18 19 20 21 22 23 24 25
                0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29,    //饼 33 34 35 36 37 38 39 40 41
                0x30, 0x40, 0x50, 0x60, 0x70, 0x80, 0x90],                //东西南北中发白 48 64 80 96 112 128 144（中发白也是花牌，搬到后需要额外放出去做补花）
            "1" : [0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7]          //春夏秋冬梅兰竹菊160-167（这块只有一张，做补花用，一共20张花牌+）
        },

        //  操作类型       
        action_state : {
            hold_card               :   0,//摸牌
            send_card               :   1,//出牌
            knock_card              :   2,//碰牌
            collision_card          :   3,//杠牌
            hu_card                 :   5,//待胡牌
            wait                    :   6,//等待状态
            self_hu                 :   7,//自摸
            hu_card_over            :   8,//胡牌结束
            self_hu_over            :   9, //自摸结束
            knock_and_collsion      :   10,//碰 杠 过
            knock_collsion_hu       :   11,//杠 碰 胡 过
            knock_and_hu            :   12,//碰 胡 过
            ting                    :   14,//听牌
            winner                  :   15,//胜利者
            loser                   :   16,//失败者
            prepare                 :   17,//准备
            await                   :   18,//房间  时候 的 等待状态
            collision_and_hu        :   19,//杠  胡 过
            room_await              :   20,//房间等待

            chi_card                :   21,//吃
            chi_knock               :   22,//吃 碰 过
            chi_knock_collsion      :   24,//吃 碰 杠 过
        },
        /**
         * 听牌状态
         */
        ting_state :{
            not_ting                :  -1,
            wait_ting               :   0,
            ting                    :   1,
        },
        /**
         *  -1: 未胡
         *  0： 平胡
         *  1： 清一色
         *  2： 一条龙
         *  3： 清一色&&一条龙
         *  4： 边牌或坎牌
         */
        hu_state : {
            not_hu                      :  -1,
            ping_hu                     :   0,
            qing_yi_se                  :   1,
            yi_tiao_long                :   2,
            yi_tiao_long_and_qing_yi_se :   3,
            bian_or_kan                 :   4,
            qi_dui                      :   5,
            shi_san_yao                 :   6,
            dui_dui                     :   7,
            hun_yi_se                   :   8,
            bu_xia_jia                  :   9,
            chou_zhang                  :   10,
        },
        countdown_conf : {                  //倒计时配置
            playing               : 30,     //出牌时间60
            trusteeship           : 60 ,     //托管时间3
            hide_card             : 60,     //买嘴时间
            ting_card             : 5,      //听牌时间
        },
        game_scene : {
            repare          : 1, //准备
            game_start      : 2, //游戏开始
            game_move       : 4, //游戏中
            game_over       : 5, //游戏结束
            single_over     : 6, //单局结束
            tie_over        : 7, //流局
            wait_over       : 8, //等待结束
        },
        identity_conf : {
            boss_code       : 1,//代表庄家
            common_code     : 0,//代表普通人
        },
        anim_state: {
            empty                           : 0, //空闲状态
            knock_card                      : 1, //碰牌特效
            collision_card                  : 2, //杠牌特效
            ping_hu                         : 3, //平胡特效
            self_hu                         : 4, //自摸特效
            qing_yi_se                      : 5, //清一色特效
            yi_tiao_long                    : 6, //一条龙
            yi_tiao_long_and_qing_yi_se     : 7, //清一色一条龙
            ting_card                       : 8, //听牌特效

            chi_card                        : 9, //吃牌特效
        }
    },

    "mahjong_game_maiZui_server": { //买嘴麻将
        game_key    :"mahjong_game_maiZui_server",
        game_type   :"mahjong",
        
        matching : {//匹配配置
            rule_conf       : null, //特殊动态规则
            max_inning      : 1, //最大局数
            max_people_num  : 4, //最大人数
        },

        imultiple       : 1, //默认分数
        innings         : [8,12,20], //局数
        card_conf : {
           "0": [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09,   //万 1 2 3 4 5 6 7 8 9
                0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19,    //条 17 18 19 20 21 22 23 24 25
                0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29,    //饼 33 34 35 36 37 38 39 40 41
                0x30, 0x40, 0x50, 0x60, 0x70, 0x80, 0x90]                //东西南北中发白 48 64 80 96 112 128 144
        },
        //  操作类型       
        /**
         * 当前座位状态
         *  0:  摸牌
         *  1:  出牌
         *  2:  碰牌
         *  3： 杠牌
         *  4： 扣牌
         *  5： 待胡牌 
         *  6:  等待状态
         *  7:  托管
         *  8： 自摸
         *  9： 胡牌结束 
         */
        action_state : {
            hold_card               :   0,
            send_card               :   1,
            knock_card              :   2,
            collision_card          :   3,
            hide_card               :   4,
            hu_card                 :   5,
            wait                    :   6,
            self_hu                 :   7,
            hu_card_over            :   8,
            self_hu_over            :   9, 
            knock_and_collsion      :   10,
            knock_collsion_hu       :   11,
            knock_and_hu            :   12,
            mai_zui                 :   13,
            ting                    :   14,
            winner                  :   15,
            loser                   :   16,
            prepare                 :   17,
            await                   :   18,
            collision_and_hu        :   19,
            room_await              :   20
        },
        /**
         * 听牌状态
         */
        ting_state :{
            not_ting                :  -1,
            wait_ting               :   0,
            ting                    :   1,
        },
        /**
         *  -1: 未胡
         *  0： 平胡
         *  1： 清一色
         *  2： 一条龙
         *  3： 清一色&&一条龙
         *  4： 边牌或坎牌
         */
        hu_state : {
            not_hu                      :  -1,
            ping_hu                     :   0,
            qing_yi_se                  :   1,
            yi_tiao_long                :   2,
            yi_tiao_long_and_qing_yi_se :   3,
            bian_or_kan                 :   4,
            qi_dui                      :   5,
            shi_san_yao                 :   6,
            dui_dui                     :   7,
            hun_yi_se                   :   8,
            bu_xia_jia                  :   9,
            chou_zhang                  :   10,
        },
        countdown_conf : {                  //倒计时配置
            playing               : 30,     //出牌时间60
            trusteeship           : 60 ,     //托管时间3
            hide_card             : 60,     //买嘴时间
            ting_card             : 1,      //听牌时间
        },
        game_scene : {
            repare          : 1, //准备
            game_start      : 2, //游戏开始
            game_maizui     : 3, //买嘴阶段
            game_move       : 4, //游戏中
            game_over       : 5, //游戏结束
            single_over     : 6, //单局结束
            tie_over        : 7, //流局
            wait_over       : 8, //等待结束
        },

        identity_conf : {
            boss_code       : 1,//代表庄家
            common_code     : 0,//代表普通人
        },
        anim_state: {
            empty                           : 0, //空闲状态
            knock_card                      : 1, //碰牌特效
            collision_card                  : 2, //杠牌特效
            ping_hu                         : 3, //平胡特效
            self_hu                         : 4, //自摸特效
            qing_yi_se                      : 5, //清一色特效
            yi_tiao_long                    : 6, //一条龙
            yi_tiao_long_and_qing_yi_se     : 7, //清一色一条龙
            ting_card                       : 8, //听牌特效
        }
    },
    
    "mahjong_game_quYang_server": { //曲阳麻将
        game_key    :"mahjong_game_quYang_server",
        game_type   :"mahjong",

        matching : {//匹配配置
            rule_conf       : null, //特殊动态规则
            max_inning      : 2, //最大局数
            max_people_num  : 4, //最大人数
        },

        imultiple       : 1, //默认分数
        innings         : [8,12,20], //局数
        card_conf : {
           "0": [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09,   //万 1 2 3 4 5 6 7 8 9
                0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19,    //条 17 18 19 20 21 22 23 24 25
                0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29]    //东西南北中发白 48 64 80 96 112 128 144
        },
        //  操作类型       
        /**
         * 当前座位状态
         *  0:  摸牌
         *  1:  出牌
         *  2:  碰牌
         *  3： 杠牌
         *  4： 扣牌
         *  5： 待胡牌 
         *  6:  等待状态
         *  7:  托管
         *  8： 自摸
         *  9： 胡牌结束 
         */
        action_state : {
            hold_card               :   0,
            send_card               :   1,
            knock_card              :   2,
            collision_card          :   3,
            hide_card               :   4,
            hu_card                 :   5,
            wait                    :   6,
            self_hu                 :   7,
            hu_card_over            :   8,
            self_hu_over            :   9, 
            knock_and_collsion      :   10,
            knock_collsion_hu       :   11,
            knock_and_hu            :   12,
            mai_zui                 :   13,
            ting                    :   14,
            winner                  :   15,
            loser                   :   16,
            prepare                 :   17,
            await                   :   18,
        },
        /**
         * 听牌状态
         */
        ting_state :{
            not_ting                :  -1,
            wait_ting               :   0,
            ting                    :   1,
        },
        /**
         *  -1: 未胡
         *  0： 平胡
         *  1： 清一色
         *  2： 一条龙
         *  3： 清一色&&一条龙
         *  4： 边牌或坎牌
         */
        hu_state : {
            not_hu                      :  -1,
            ping_hu                     :   0,
            qing_yi_se                  :   1,
            yi_tiao_long                :   2,
            yi_tiao_long_and_qing_yi_se :   3,
            bian_or_kan                 :   4,
            qi_dui                      :   5,
            shi_san_yao                 :   6,
            dui_dui                     :   7,
            hun_yi_se                   :   8,
            bu_xia_jia                  :   9,
            chou_zhang                  :   10,
        },
        countdown_conf : {                  //倒计时配置
            playing               : 30,     //出牌时间
            trusteeship           : 3 ,     //托管时间
            hide_card             : 120,     //扣牌时间
        },
        game_scene : {
            game_start      : 1, //游戏开始
            hide_holds      : 2, //扣牌阶段
            game_move       : 3, //游戏中
            game_over       : 4, //游戏结束
            single_over     : 5, //单局结束
            tie_over        : 6, //流局
            wait_over       : 7, //等待结束
        },
        identity_conf : {
            boss_code       : 1,//代表庄家
            common_code     : 0,//代表普通人
        },
        anim_state: {
            empty                           : 0, //空闲状态
            knock_card                      : 1, //碰牌特效
            collision_card                  : 2, //杠牌特效
            ping_hu                         : 3, //平胡特效
            self_hu                         : 4, //自摸特效
            qing_yi_se                      : 5, //清一色特效
            yi_tiao_long                    : 6, //一条龙
            yi_tiao_long_and_qing_yi_se     : 7, //清一色一条龙
            ting_card                       : 8, //听牌特效
        }
    }
    
}


module.exports = configMgr;