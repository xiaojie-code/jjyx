var log = require("../../utils/log");
var tools = require('../../utils/tools');
var wsMsgKeyEnum = require('../../config/WSMsgKeyEnum');
var WSMahjongGameBaseService = require('../../base/service/WSMahjongGameBaseService');


/**
 * 买嘴 游戏玩法 逻辑
 */
class WSService extends WSMahjongGameBaseService{
    
    constructor(){
        super();
        console.log("游戏服务 3、初始化  WSService");
    }
   
    /**
     * 
     * @param {*} data 
     */
    maizui(data){
        try {
            let userid = data.userid;
            let maizui_arr = data.maizui_arr;
            let roomsUser = globalMgr.present_room_mgr.getRoomsUsersByUserid(userid);
            let room_info = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomsUser.roomid);
            
            room_info.game_logic.set_maizui_status(userid,maizui_arr);
        } catch (error) {
            throw error
        }
    }

}


module.exports = WSService;