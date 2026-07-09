var log = require("../../utils/log");
var tools = require('../../utils/tools');
var wsMsgKeyEnum = require('../../config/WSMsgKeyEnum');
var WSMahjongGameBaseService = require('../../base/service/WSMahjongGameBaseService');


/**
 * 服务层
 */
class WSService extends WSMahjongGameBaseService{

    constructor(){
        super();
        console.log("游戏服务 3、初始化  WSService");
    }

    /**
     * 扣牌
     * @param {*} data 
     */
     hide_cards(data){
        try {
            log.warn('扣牌');
            let userid = data.userid;
            let roomsUser = globalMgr.present_room_mgr.getRoomsUsersByUserid(userid);
            let room_info = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomsUser.roomid);
    
            room_info.game_logic.hide_cards(userid);
        } catch (error) {
            throw error
        }
    }

    /**
     * 停止扣牌
     * @param {*} data 
     */
    stop_hide_cards(data){
        try {
            log.warn('不扣牌');
            let userid = data.userid;
            let roomsUser = globalMgr.present_room_mgr.getRoomsUsersByUserid(userid);
            let room_info = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomsUser.roomid);
    
            room_info.game_logic.stop_hide_cards(userid);
        } catch (error) {
            throw error
        }
    }
}


module.exports = WSService