var log = require("../../utils/log");
var tools = require('../../utils/tools');
var wsMsgKeyEnum = require('../../config/WSMsgKeyEnum');
var dataMgr = require('../../mgr/DataMgr');
class WSGamesBaseService {

    constructor(){
        console.log("");
        console.log("游戏服务 1、初始化  WSGamesBaseService");
    }

    /**
     * 开始游戏
     * @param {*} data 
     */
    start_game(data){
        try {
            let roomid = data.roomid; 
            let game_logic = new globalMgr.present_game_logic_class(roomid)
            globalMgr.present_room_mgr.setRoomsGamesLogic(roomid, game_logic);
            
        } catch (error) {
            throw error
        }
    }

    /**
     * 开始下一局
     * @param {*} data 
     */
    next_game(data){
        try {
            let roomid = data.roomid;
            let room_info = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomid);
    
            room_info.game_logic.startGames();
            
        } catch (error) {
            throw error
        }
    }


    /**
     * 托管接口
     * @param {*} data 
     */
    trusteeship(data){
        try {
            let userid = data.userid;
            let roomsUser = globalMgr.present_room_mgr.getRoomsUsersByUserid(userid);
            let room_info = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomsUser.roomid);
    
            room_info.game_logic.trusteeship(userid);
        } catch (error) {
            throw error
        }
    }

    /**
     * 取消托管接口
     * @param {*} data 
     */
    cancel_trusteepship(data){
        try {
            let userid = data.userid;
            let roomsUser = globalMgr.present_room_mgr.getRoomsUsersByUserid(userid);
            let room_info = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomsUser.roomid);
    
            room_info.game_logic.cancel_trusteepship(userid);
        } catch (error) {
            throw error
        }
    }

     /**
     * 断线重连 处理 
     */
    onReconnection = function(data) {
        try {
            let userid = data.userid;
            let roomsUser = globalMgr.present_room_mgr.getRoomsUsersByUserid(userid);
            let room_info = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomsUser.roomid);
            room_info.game_logic.onReconnection(userid);
        } catch (error) {
            throw error
        }
    }



    /**
     * 销毁房间处理
     * @param {*} params 
     */
    onDestroy = function (roomid) {
        try {

            let room_info = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomid);
            room_info.game_logic && room_info.game_logic.onDestroy && room_info.game_logic.onDestroy();
            room_info.game_logic = null;
        } catch (error) {
            throw error
        }
    }

}

module.exports = WSGamesBaseService