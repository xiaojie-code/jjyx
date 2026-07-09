var RoomSeatsInfoBaseBO = require('../RoomSeatsInfoBaseBO');
/**
 * 房间座位属性 模型
 */
module.exports = class MahjongRoomSeatsInfoBaseBO extends RoomSeatsInfoBaseBO {

    //  操作类型       
    /**
     * 当前座位状态
     *  0:  摸牌
     *  1:  出牌
     *  2:  碰牌
     *  3： 杠牌
     *  4： 扣牌
     *  5： 胡牌 
     */
    action_state = 0; 

    knock_holds = [];           //碰牌数组
    collision_holds = [];       //杠牌数组(看属性设置，显示属性false->暗杠，true->明杠)
    ting_state    = -1;         //听牌状态（已听，未听
    anim_state    = 0;          //动画特效

    is_trusteeship = false;     //是否托管

    /**
     *  -1: 未胡
     *  0： 平胡
     *  1： 清一色
     *  2： 一条龙
     *  3： 清一色&&一条龙
     *  4： 边牌或坎牌
     */
    hu_state       =   -1;      //胡牌类型

    hu_prompt           = [];        //可胡牌提醒
    collision_prompt    = [];        //可杠牌提醒
    skip_hu_state       = false;     //胡牌后跳过的状态（跳过得等一轮再胡）
    skip_all_state      = false;     //过牌后的检测状态
}