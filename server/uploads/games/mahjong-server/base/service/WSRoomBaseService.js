var log = require("../../utils/log");
var tools = require('../../utils/tools');
var systemBizCodeEnum = require('../../config/SystemBizCodeEnum');
var wsMsgKeyEnum = require('../../config/WSMsgKeyEnum');
var wsUserMgr = require("../../mgr/WSUserMgr");
var gRoomDAO = require("../../DB/dao/GRoomDAO");
var GRoomUserDAO = require("../../DB/dao/GRoomUserDAO");
var dbConstantMgr = require('../../mgr/DBConstantMgr');
var wsAIFillService = require("./WSAIFillService");
var co = require('co');

class WSRoomBaseService{
    constructor(){
        console.log("");
        console.log("房间服务 1、初始化  WSRoomBaseService");
    }
    
    /**
     * 用户准备
     * @param {*} data 
     * @param {*} callback 
     * @returns 
     */
    prepare(data,callback){
        globalMgr.present_room_mgr.setRoomsSeatsActionState(data['seats_index'], data['roomid'], globalMgr.present_game_config['action_state'].prepare);

        // AI 补位房：真人点准备时，把所有 AI 座位也重置为准备（覆盖首局与局间），
        // 否则多局对局时下一局全员准备判定不通过。
        if(wsAIFillService.isAIFillRoom(data['roomid'])){
            wsAIFillService.readyAISeats(data['roomid']);
        }

        //开始游戏 切换场景
        if(this.checkRoomAllSeatsActionStateisPrepare(data['roomid'])){
            
            let room_info = globalMgr.present_room_mgr.getRoomsInfoByRoomid(data['roomid'])

            //max_inning
            if(room_info.cruent_inning > 0){

                globalMgr.present_game_service.next_game({
                    roomid : data['roomid']
                });


            }else{
                
                globalMgr.present_game_service.start_game({
                    roomid : data['roomid']
                });

            }


    
            callback && callback(true);
            return;
        }
    
        callback && callback(false);
    }

    /**
     * 取消准备
     * @param {*} data 
     * @param {*} callback 
     */
    cancelPrepare(data,callback){
        globalMgr.present_room_mgr.setRoomsSeatsActionState(data['seats_index'], data['roomid'], globalMgr.present_game_config['action_state'].await); 

        callback && callback(true);
    }

    /**
     * 退出房间
     * @param {*} data 
     */
    exitRoom(data){
        return new Promise((resolve,reject)=>{
            co(function *(){
                let room_info = null;
                try {
                    room_info  = globalMgr.present_room_mgr.getRoomsInfoByRoomid(data.roomid);
                } catch (error) {
                    log.warn(error);
                    return;
                }
                try {
                
                    function repare(userid,roomid) {
    
                        return new Promise((resolve,reject)=>{
                            co(function *(){
                                try {
                          
                                    yield GRoomUserDAO.deletebyUserid(userid);
                                    globalMgr.present_room_mgr.delRoomUserByUserid(userid);
                                    globalMgr.present_room_mgr.delSeatByUseridAndRoomid(roomid,userid);

                                    globalMgr.present_room_service.sendMsg(wsMsgKeyEnum.update_room_info_all,userid,roomid)
                                    resolve(true);
                                } catch (error) {
                                    reject(error);
                                    throw error
                                }
    
                                
                            });
                
                        });
    
                    }
                    
                    function playing(userid,seats_index,roomid) {

                        switch (room_info.room_type) {
                            case dbConstantMgr.ROOM_TYPE_MATCHING:

                                globalMgr.present_room_mgr.setRoomsSeatsOnline(seats_index,roomid,false);
                                globalMgr.present_room_mgr.delRoomUserByUserid(userid);
                                
                                break;
                            case dbConstantMgr.ROOM_TYPE_ORDINARY:
 
                                globalMgr.present_room_mgr.setRoomsSeatsOnline(seats_index,roomid,false);

                                break;
                            default:
                                break;
                        }

                        room_info.game_logic && room_info.game_logic.sendMsg(wsMsgKeyEnum.update_room_info_all);
      
                        return true
                    }
    
                    function gameOver(userid,roomid,seats_index) {
                        return new Promise((resolve,reject)=>{
                            co(function *(){
                                try {

                                    switch (room_info.room_type) {
                                        case dbConstantMgr.ROOM_TYPE_MATCHING:

                                            globalMgr.present_room_mgr.delRoomUserByUserid(userid);
                                            globalMgr.present_room_mgr.setRoomsSeatsOnline(seats_index,roomid,false);

                                            yield GRoomUserDAO.deletebyUserid(userid);
                                    
                                            room_info.game_logic && room_info.game_logic.sendMsg(wsMsgKeyEnum.update_room_info_all);

                                            var isAllOffline = globalMgr.present_room_service.checkRoomAllSeatsIsAllOffline(roomid);
                                            //保证没有在线用户
                                            if(isAllOffline){
                                                globalMgr.present_game_service.onDestroy(roomid);
                                                globalMgr.present_room_mgr.delRoomByRoomid(roomid);
                                            }
     
                                            break;
                                        case dbConstantMgr.ROOM_TYPE_ORDINARY:
            

                                            globalMgr.present_room_mgr.delRoomUserByUserid(userid);
                                            globalMgr.present_room_mgr.setRoomsSeatsOnline(seats_index,roomid,false);

                                            yield GRoomUserDAO.deletebyUserid(userid);
                                    
                                            room_info.game_logic && room_info.game_logic.sendMsg(wsMsgKeyEnum.update_room_info_all);

                                            //待优化 本来逻辑 之后代替 下面 临时逻辑
                                            let iswin_deleteByRoomidAndRoomUserisNull =  yield gRoomDAO.deleteByRoomidAndRoomUserisNull(roomid);
                                            //保证最后一个人退出
                                            if(iswin_deleteByRoomidAndRoomUserisNull){
                                                globalMgr.present_game_service.onDestroy();
                                                globalMgr.present_room_mgr.delRoomByRoomid(roomid);
                                            }
                                            
                                            // //临时逻辑
                                            // var isAllOffline = globalMgr.present_room_service.checkRoomAllSeatsIsAllOffline(roomid);
                                            // //保证没有在线用户
                                            // if(isAllOffline){
                                            //     globalMgr.present_game_service.onDestroy(roomid);
                                            //     globalMgr.present_room_mgr.delRoomByRoomid(roomid);
                                            // }


                                            break;
                                        default:
                                            break;
                                    }
                    
                                    resolve(true);
                                } catch (error) {
                                    reject(error);
                                    throw error
                                }
    
                
                            });
                
                        });
                    }
    
                    let roomsUser = globalMgr.present_room_mgr.getRoomsUsersByUserid(data.userid);

                    switch (roomsUser['state']) {
     
                        case globalMgr.configMgr.rooms_users_state.match:

                            globalMgr.present_matching_service.exit_matching({
                                userid : userid
                            }); 

                            break;

                        case globalMgr.configMgr.rooms_users_state.room:
                            resolve(yield repare(data.userid,data.roomid))
                            break;

                        case globalMgr.configMgr.rooms_users_state.playing:

                            resolve(playing(data.userid,data.seats_index,data.roomid))
                            break;
                        case globalMgr.configMgr.rooms_users_state.game_over:
                            resolve(yield gameOver(data.userid,data.roomid,data.seats_index))
                            break;
                        default:
                            break;
                    }

                    // AI 补位房：真人离开后，若房内已无在线真人，则销毁整个房间
                    // （停 AI 调度器 + 清座位/用户登记 + 删房），避免内存泄漏与 AI 空转。
                    try {
                        if(wsAIFillService.isAIFillRoom(data.roomid)){
                            wsAIFillService.destroyIfNoHuman(data.roomid);
                        }
                    } catch (e) {
                        log.warn("exitRoom AI 房销毁忽略错误: " + (e && e.message));
                    }
                } catch (error) {
                    throw error
                }
            });
        });
    }

    /**
     * 检测该房间人数是否已满 或 房间座位包含该用户
     * @param {*} roomid 
     */
    checkRoomUserNumisMaxOrSeatsHasUser(userid,roomid){
        try {
            let roominfo = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomid);
            let seats = roominfo['seats'];
            

            if(globalMgr.present_room_mgr.getSeatsInfoByUseridAndRoomid(roomid,userid))return false;

            if(seats.length<roominfo['max_people_num']) return false;

            return true
        } catch (error) {
            return false
        }
    }

    /**
     * 待优化   修改函数命名 以免误导
     * 检测该房间人数是否已满并且 在线
     * @param {*} roomid 
     */
    checkRoomUserAllOnline(roomid){
        try {
            let roominfo = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomid);
            let seats = roominfo['seats'];
            if(seats.length<roominfo['max_people_num']) return false;
            for (let i = 0; i < seats.length; i++) {
                const element = seats[i];
                if(element.is_online == false){
                    return false
                }
            }
        
            return true
        } catch (error) {
            return false
        }
    }

    /**
     * 检测该房间所有座位 是否都为 准备状态
     * @param {*} roomid 
     */
    checkRoomAllSeatsActionStateisPrepare(roomid){
        let roominfo = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomid);
        let seats = roominfo['seats'];
       
        for (let i = 0; i <  roominfo['max_people_num']; i++) {
            const element = seats[i];
            if(!element || element.action_state != globalMgr.present_game_config['action_state'].prepare || !element.is_online){
                return false
            }
        }
        
        return true
    }

    /**
     * 检测房间所有 用户是否全部离线
     */
    checkRoomAllSeatsIsAllOffline(roomid){
        try {
            let roominfo = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomid);
            let seats = roominfo['seats'];
            for (let i = 0; i < seats.length; i++) {
                const element = seats[i];
                if(element.is_online == true){
                    return false
                }
            }
        
            return true
        } catch (error) {
            return false
        }
    }


    /**
     * 检测该房间 游戏是否结束
     */
    checkRoomStateIsGameOver(roomid){
        try {
            let roominfo = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomid);

            return roominfo.home_state == globalMgr.present_game_config.game_scene.game_over
        } catch (error) {
            return false
        }
    }
    /**
     * 检测房间是否包含此用户且在线
     * @param {*} userid 
     * @param {*} roomid 
     * @returns 
     */
    checkRoomisHasUserAndOnline(userid,roomid){
        try {
            let seat = globalMgr.present_room_mgr.getSeatsInfoByUseridAndRoomid(roomid,userid);
            if (!seat) {
                return false
            }
            if(!seat.is_online){
                return false;
            }
            return seat;
        } catch (error) {
            log.warn(error)
        }
    }

    /**
     * 加入房间
     * @param {*} data 
     * @returns 
     */
    joinRoom(data){
        return new Promise((resolve,reject)=>{
            co(function *(){
                try {
                   
                    var req_data = data;
                    var roomid = req_data['roomid'];

                    // 好友房：房间号由玩家自定义(6位)，纯内存房，不落数据库、不补 AI。
                    // 第一个进入该房号的人负责创建房间；后续玩家输入相同房号即加入同一房间。
                    let roominfo = globalMgr.present_room_mgr.roomsList[roomid];

                    if(!roominfo){
                        if(!req_data['is_create_friend']){
                            let err = Object.assign({}, systemBizCodeEnum.HOOM_NOT_FIND, { showClient: true });
                            throw new Error(JSON.stringify(err));
                        }
                        // 房间不存在 → 由第一个人创建好友房（4人，局数由客户端透传的圈数决定）
                        let matching_conf = (globalMgr.present_game_config && globalMgr.present_game_config.matching) || {};
                        var friend_people = matching_conf.max_people_num || 4;
                        var friend_inning = parseInt(req_data['max_inning']);
                        if(isNaN(friend_inning) || friend_inning < 1) friend_inning = friend_people * 1;
                        roominfo = {
                            rule_conf       :   null,
                            max_inning      :   friend_inning,
                            max_people_num  :   friend_people,
                        };
                        log.warn(`[好友房] 房间 ${roomid} 不存在，创建好友房 max_people_num=${roominfo.max_people_num} max_inning=${roominfo.max_inning}`);
                    } else {
                        // 房间已存在：沿用房间既有配置
                        roominfo = {
                            rule_conf       :   roominfo.rule_conf,
                            max_inning      :   roominfo.max_inning,
                            max_people_num  :   roominfo.max_people_num,
                        };
                    }

                    wsUserMgr.bind(req_data['userid'], req_data['socket']);
                    wsUserMgr.setRoomid(req_data['userid'], roomid);
                                  
                    let res_data = {
                        userid          :   req_data['userid'],
                        client_ip       :   wsUserMgr.getClientIP(req_data['userid']),
                        game_rules      :   roominfo.rule_conf,
                        max_inning      :   roominfo.max_inning,
                        max_people_num  :   roominfo.max_people_num,
                        user_name       :   req_data['user_name'],
                        user_icon       :   req_data['user_icon']
                    }
                    let addLocalUserToRooms_ret_data =  globalMgr.present_room_mgr.addUserToRooms(dbConstantMgr.ROOM_TYPE_ORDINARY,res_data,roomid);
                    
                    wsUserMgr.setSeatsIndex(req_data['userid'],addLocalUserToRooms_ret_data['seat']['seats_index'])

                    // 好友房：坐满 max_people_num 人且尚未开局时，自动开局（无需点准备）
                    try {
                        if(!addLocalUserToRooms_ret_data['isReconnection']){
                            let cur_room = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomid);
                            let seat_num = (cur_room && cur_room.seats) ? cur_room.seats.length : 0;
                            let is_repare = cur_room && cur_room.home_state == globalMgr.present_game_config.game_scene.repare;
                            if(seat_num >= cur_room.max_people_num && is_repare && (cur_room.cruent_inning || 0) == 0){
                                // 全员置为在线+准备，直接开局
                                for(let si = 0; si < cur_room.seats.length; si++){
                                    globalMgr.present_room_mgr.setRoomsSeatsOnline(si, roomid, true);
                                    globalMgr.present_room_mgr.setRoomsSeatsActionState(si, roomid, globalMgr.present_game_config.action_state.prepare);
                                }
                                log.warn(`[好友房] 房间 ${roomid} 已坐满 ${seat_num} 人，自动开局`);
                                globalMgr.present_game_service.start_game({ roomid: roomid });
                            }
                        }
                    } catch (e) {
                        log.warn('好友房满员自动开局判断忽略错误: ' + (e && e.message));
                    }

                    resolve(addLocalUserToRooms_ret_data);

                } catch (error) {
                   reject(error);
                   throw error
                }
            })
        });
    }

    /**
     * 断线重连 处理 
     * 待优化   需要确定 是否 应该根据房间状态 来判断 而不是用户 状态
     */
    onReconnection(data) {
        try {
            let roomid = data.roomid;
            let userid = data.userid;

            let roomsUser = globalMgr.present_room_mgr.getRoomsUsersByUserid(userid);

            switch (roomsUser['state']) {
    
                case globalMgr.configMgr.rooms_users_state.playing:

                    globalMgr.present_game_service.onReconnection(data);
                    break;

                default:
                    break;
            }

    
        } catch (error) {
            throw error
        }
    }

/**
 * 待优化    update_room_info_all 得时候没必要传  userid,roomid,data 等参数
 * @param {*} key 
 * @param {*} userid 
 * @param {*} roomid 
 * @param {*} data 
 */
    sendMsg(key,userid,roomid,data){
        function update_room_info_all(){
            try {

                let room_info = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomid);

                switch (room_info.home_state) {

                    case globalMgr.present_game_config.game_scene.repare:

                        let roomInfoVO  = new global.myframework_present_room_info_vo_class(roomid).getRoomInfoVO()


                        for (let i = 0; i < room_info.seats.length; i++) {
                            const element = room_info.seats[i];
                            wsUserMgr.sendMsg(element.user_id, wsMsgKeyEnum.update_room_info_all, systemBizCodeEnum.SUCCESS, roomInfoVO);
                        }

                    break;

                    default:
                        room_info.game_logic && room_info.game_logic.sendMsg(wsMsgKeyEnum.update_room_info_all);
                        break;
                }


            } catch (error) {
                log.warn(error)
            }
    
        }
    
        function on_update_chat_message_data_all() {
            
            wsUserMgr.broacastInRoom(userid, wsMsgKeyEnum.on_update_chat_message_data_all, systemBizCodeEnum.SUCCESS, data, true);
        }
    
        switch (key) {
            case wsMsgKeyEnum.update_room_info_all:
                update_room_info_all();
                break;
            case wsMsgKeyEnum.on_update_chat_message_data_all:
                on_update_chat_message_data_all();
                break;
            default:
                break;
        }
    }


    /** 
     * 获取可用得 房间号 
     * 待优化 为了客户测试 临时添加  
     */
    getUsableRoomid(userid){
        let roomids = [
            763368,
            111111,
            222222,
            333333,
            444444,
            555555,
            666666,
            777777,
            999999,
            141415,
            151515
        ]


        for (let i = 0; i < roomids.length; i++) {
            const element = roomids[i];
            let roominfo = globalMgr.present_room_mgr.roomsList[element];
            if(roominfo){
                if(roominfo.home_state == globalMgr.present_game_config.game_scene.game_over){
                    return element
                }
                if(roominfo.home_state == globalMgr.present_game_config.game_scene.repare && !this.checkRoomUserNumisMaxOrSeatsHasUser(userid,element)){
                    return element
                }
                if(!this.checkRoomUserNumisMaxOrSeatsHasUser(userid,element)){
                    return element
                }
            }
        }

        let new_arr = [];
        for (let i = 0; i < roomids.length; i++) {
            const element = roomids[i];

            if(!globalMgr.present_room_mgr.roomsList[element]){
                new_arr.push(element);
            }
            
        }
        if(Object.keys(globalMgr.present_room_mgr.roomsList).length<1){
            new_arr = roomids;
        }

        if(!new_arr[0]){
            log.error("已经没有可用房间")
        }
        return new_arr[0];

    }
}

module.exports = WSRoomBaseService