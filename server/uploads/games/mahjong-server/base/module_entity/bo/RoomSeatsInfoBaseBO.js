/**
 * 房间座位属性 模型
 */
module.exports = class RoomSeatsInfoBaseBO {
    user_id = null; //当前座位用户ID
    user_name = null; //当前座位用户名称
    user_icon = null; //当前用户头像
    user_ip = null; //用户 IP
    is_reconnection = null; //是否断线重连

    hand_holds_num  =   null;   //当前手牌数量
    seats_index = null;         //座位号
    imultiple = null;           //倍数
    hand_holds = [];            //目前持有的牌
    out_holds = [];             //打出去的牌
    is_online = true;           //是否在线
    identity = null;            //身份
    score = 0;                  //结算分数
    total_score = 0;            //累计分数
    result_score  = [];         //结算分数结果数据
    is_trusteeship = false;     //是否托管
    pos_name = null;            //方位名称(东南西北)
    is_shot = false;            //是否为点炮
    
    is_ai = false;              //是否为AI机器人
    ai_level = 0;               //AI难度 0入门 1中等 2高手
}