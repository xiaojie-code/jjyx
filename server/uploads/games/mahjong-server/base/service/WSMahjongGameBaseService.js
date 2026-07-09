
var WSGamesBaseService = require('./WSGameBaseService');


class WSMahjongGameBaseService extends WSGamesBaseService{
                
    constructor(){
        super();
        console.log("游戏服务 2、初始化  WSMahjongGameBaseService");
    }

    /**
     * 出牌
     * @param {*} data 
     */
    send_card(data){
        try {
            let userid = data.userid;
            var cardInfoBO = data.card_info_bo;
            let roomsUser = globalMgr.present_room_mgr.getRoomsUsersByUserid(userid);
            let room_info = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomsUser.roomid);
    
            room_info.game_logic.send_card(userid,cardInfoBO);
        } catch (error) {
            throw error
        }
    }

    /**
     * 碰牌
     * @param {*} data 
     */
    knock_card(data){
        try {
            let userid = data.userid;
            let roomsUser = globalMgr.present_room_mgr.getRoomsUsersByUserid(userid);
            let room_info = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomsUser.roomid);
    
            room_info.game_logic.knock_card(userid);
        } catch (error) {
            throw error
        }
    }

    /**
     * 杠牌
     * @param {*} data 
     */
    collision_card(data){
        try {
            let userid = data.userid;
            let roomsUser = globalMgr.present_room_mgr.getRoomsUsersByUserid(userid);
            let room_info = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomsUser.roomid);
    
            room_info.game_logic.collision_card(userid);
        } catch (error) {
            throw error
        }
    }

    /**
     * 过牌，跳过当前阶段(适用于碰牌，杠牌，胡牌)
     * @param {*} data 
     */
    skip_this_part(data){
        try {
            let userid = data.userid;
            let roomsUser = globalMgr.present_room_mgr.getRoomsUsersByUserid(userid);
            let room_info = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomsUser.roomid);
    
            room_info.game_logic.skip_this_part(userid);
        } catch (error) {
            throw error
        }
    }

    /**
     * 胡牌接口
     * @param {*} data 
     */
    hu_card(data){
        try {
            let userid = data.userid;
            let roomsUser = globalMgr.present_room_mgr.getRoomsUsersByUserid(userid);
            let room_info = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomsUser.roomid);
    
            room_info.game_logic.hu_card(userid);
        } catch (error) {
            throw error
        }
    }

    /**
     * 听牌接口
     * @param {*} data 
     */
    ting_card(data){
        try {
            let userid = data.userid;
            let roomsUser = globalMgr.present_room_mgr.getRoomsUsersByUserid(userid);
            let room_info = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomsUser.roomid);
    
            room_info.game_logic.ting_card(userid);
        } catch (error) {
            throw error
        }
    }
}


module.exports = WSMahjongGameBaseService