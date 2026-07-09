
var dataMgr = require("../../mgr/DataMgr");
var log = require("../../utils/log");
var wsMsgKeyEnum = require('../../config/WSMsgKeyEnum')
var systemBizCodeEnum = require('../../config/SystemBizCodeEnum')
var wsUserMgr = require('../../mgr/WSUserMgr');
var co = require('co');
var WSBaseApi  = require("./WSBaseApi");
class WSGameBaseApi extends WSBaseApi{

    constructor(){
        super();
        console.log("ws_api 2、初始化 WSGameBaseApi")
    }

    initEvent(socket){
        console.log("2、初始化 WSGameBaseApi initEvent")
        if (!dataMgr.isData_UnNull(socket)) {
            return;
        }

        this.initRoomEvent(socket);
        this.initMatchingEvent(socket);

        //托管阶段
        socket.on('trusteeship', function(data) {
            console.log("trusteeship   data = " + JSON.stringify(data));
            try {
                var userid = socket.userid;
                
                var send_card_data = {
                    userid: userid
                }

                globalMgr.present_game_service.trusteeship(send_card_data);
            } catch (error) {
                log.error(error)
                return self.send(socket, wsMsgKeyEnum.sysError, error)
            }
        });

        //取消托管阶段
        socket.on('cancel_trusteepship', function(data) {
            console.log("cancel_trusteepship   data = " + JSON.stringify(data));
            try {
                var userid = socket.userid;
                
                var send_card_data = {
                    userid: userid
                }

                globalMgr.present_game_service.cancel_trusteepship(send_card_data);
            } catch (error) {
                log.error(error)
                return self.send(socket, wsMsgKeyEnum.sysError, error)
            }
        });

        console.log("2、初始化 WSGameBaseApi initEvent successful")
    }

    //后期优化 到独立进程
    initRoomEvent(socket){
        console.log("2、初始化 WSGameBaseApi initRoomEvent")
        if (!dataMgr.isData_UnNull(socket)) {
            return;
        }
        var self = this;

        // 准备
        socket.on('prepare', function(data) {
            try {
                console.log("prepare   data = " + JSON.stringify(data));

                var userid = socket.userid;
                var roomid = socket.roomid;
                var seats_index = socket.seats_index;

                if (!dataMgr.isData_UnNull(userid)
                ||  !dataMgr.isData_UnNull(roomid)
                ||  !dataMgr.isData_UnNull(seats_index)) {

                    self.send(socket, wsMsgKeyEnum.sysError, systemBizCodeEnum.NOT_LOGIN);
                    return;
                }
                
                var prepare_data = {
                    userid : userid,
                    roomid : roomid,
                    seats_index : seats_index
                }

                globalMgr.present_room_service.prepare(prepare_data,function(is_start_game) {
                    console.log('is_start_game:'+is_start_game);

                    if(!is_start_game){
                        globalMgr.present_room_service.sendMsg(wsMsgKeyEnum.update_room_info_all,socket.userid,socket.roomid)
                    }    
                })

            } catch (error) {
                log.error(error)
                let obj = null;
                try {
                    obj = JSON.parse(error.message);
                } catch (e) {
                    obj = error
                }
                
                if (obj['showClient']) {
                    return self.send(socket, wsMsgKeyEnum.message_type_banner, obj)
                }
                return self.send(socket, wsMsgKeyEnum.sysError, systemBizCodeEnum.SYS_ERROR,obj)
            }
        });
        
        // 取消准备
        socket.on('cancelPrepare', function(data) {
            try {
                console.log("cancelPrepare   data = " + JSON.stringify(data));
                var userid = socket.userid;
                var roomid = socket.roomid;
                var seats_index = socket.seats_index;

                if (!dataMgr.isData_UnNull(userid)
                ||  !dataMgr.isData_UnNull(roomid)
                ||  !dataMgr.isData_UnNull(seats_index)) {

                    
                    self.send(socket, wsMsgKeyEnum.sysError, systemBizCodeEnum.NOT_LOGIN);
                    return;
                }
                
                var cancelPrepare_data = {
                    userid : userid,
                    roomid : roomid,
                    seats_index : seats_index
                }
                globalMgr.present_room_service.cancelPrepare(cancelPrepare_data,function() {
                    globalMgr.present_room_service.sendMsg(wsMsgKeyEnum.update_room_info_all,socket.userid,socket.roomid)
                })

            } catch (error) {
                log.error(error)
                let obj = null;
                try {
                    obj = JSON.parse(error.message);
                } catch (e) {
                    obj = error
                }
                
                if (obj['showClient']) {
                    return self.send(socket, wsMsgKeyEnum.message_type_banner, obj)
                }
                return self.send(socket, wsMsgKeyEnum.sysError, systemBizCodeEnum.SYS_ERROR,obj)
            }
        });

        // 同城竞技  进入房间
        socket.on('joinRoom', function(data) {
            co(function *(){
                var req_data = data;
                try {
                    console.log("joinRoom   data = " + JSON.stringify(data));

                    if (!dataMgr.isData_UnNull(req_data['user_token']) ||
                        !dataMgr.isData_UnNull(req_data['roomid'])) {

                        return self.send(socket, wsMsgKeyEnum.sysError, systemBizCodeEnum.PARAMETER_INCORRECT)
                    }

                    if(socket.userid && socket.roomid){
                        //待优化 需要兼容 message_type_banner && sysError
                        return self.send(socket, wsMsgKeyEnum.message_type_banner, systemBizCodeEnum.HOOM_HAS_USER)
                    }
                    
                    let uid =  yield self.isLogin(req_data['user_token']);
                    if(!uid){
                        return self.send(socket, wsMsgKeyEnum.sysError, systemBizCodeEnum.NOT_LOGIN)
                    }
                    self.bindAppPointsContext(socket, req_data, uid);
                    
                    var service_joinRoom_data = {
                        userid : uid,
                        roomid : req_data['roomid'],
                        socket : socket,
                        user_name   : req_data['user_name'],
                        user_icon   : req_data['user_icon'],
                        ai_level        : req_data['ai_level'],
                        max_people_num  : req_data['max_people_num'],
                        max_inning      : req_data['max_inning'],
                        is_create_friend: !!req_data['is_create_friend'],
                    }

                    if(globalMgr.present_room_service.checkRoomStateIsGameOver(service_joinRoom_data['roomid'])){
                        log.warn(`该房间已经游戏结束 不能进入 杀掉 userid = ${service_joinRoom_data['userid']}  roomid = ${service_joinRoom_data['roomid']}`)
                        socket.disconnect();
                        return; 
                    }

                    //检测 最大人数 时 不能在进入
                    if(globalMgr.present_room_service.checkRoomUserNumisMaxOrSeatsHasUser(service_joinRoom_data['userid'],service_joinRoom_data['roomid'])){
                        log.warn(`该房间用户数已满 杀掉 userid = ${service_joinRoom_data['userid']}  roomid = ${service_joinRoom_data['roomid']}`)
                        socket.disconnect();
                        return;
                    }
                    //检测 当前 用户是否在线 异地登陆
                    if(globalMgr.present_room_service.checkRoomisHasUserAndOnline(service_joinRoom_data['userid'],service_joinRoom_data['roomid'])){
                        log.warn(`杀掉 异地登陆 userid = ${service_joinRoom_data['userid']}  roomid = ${service_joinRoom_data['roomid']}`)
                        socket.disconnect();
                        return;
                    }

                    let joinRoom_ret_data = yield globalMgr.present_room_service.joinRoom(service_joinRoom_data);


                    if(joinRoom_ret_data && joinRoom_ret_data['isReconnection']){ //断线重连处理

                        globalMgr.present_room_service.onReconnection(service_joinRoom_data)

                        
                    }else{ //非断线重连 处理
                        
                        globalMgr.present_room_service.sendMsg(wsMsgKeyEnum.update_room_info_all,socket.userid,socket.roomid)
                    }
                    

                } catch (error) {
                    
                }
            });

        });
        
        //聊天
        socket.on('chatMessage', function(data) {
            console.log("chatMessage   data = " + JSON.stringify(data));
        });

        console.log("2、初始化 WSGameBaseApi initRoomEvent successful")
    }
    
    //后期优化 到独立进程
    initMatchingEvent(socket){
        console.log("2、初始化 WSGameBaseApi initMatchingEvent")
        if (!dataMgr.isData_UnNull(socket)) {
            return;
        }
        var self = this;

        /**
         * 开始匹配
         */
        socket.on('start_matching', function(data) {

            co(function *(){

                var req_data = data;
                console.log("start_matching   data = " + JSON.stringify(data));
                try {
                    if (!dataMgr.isData_UnNull(req_data['user_token']) ||
                        !dataMgr.isData_UnNull(req_data['play_constant'])) {
    
                        return self.send(socket, wsMsgKeyEnum.sysError, systemBizCodeEnum.PARAMETER_INCORRECT)
                    }
                    
                    let uid =  yield self.isLogin(req_data['user_token']);
                    if(!uid){
                        return self.send(socket, wsMsgKeyEnum.sysError, systemBizCodeEnum.NOT_LOGIN)
                    }
                    self.bindAppPointsContext(socket, req_data, uid);
                    
                    var service_start_matching_data = {
                        "play_constant": req_data['play_constant'],
                        "userid": uid, 
                        "socket": socket,
                        "user_name": req_data['user_name'],
                        "user_icon": req_data['user_icon'],
                    }

                    let is_matching_win = globalMgr.present_matching_service.start_matching(service_start_matching_data);

                    if (is_matching_win) {
                        
                        wsUserMgr.broacastInRoom(uid, wsMsgKeyEnum.matching_win_all, systemBizCodeEnum.SUCCESS, null, true);
                        
                        let ws_games_service_start_game_data = is_matching_win;

                        globalMgr.present_game_service.start_game(ws_games_service_start_game_data);

                        return;
                    } else {

                        self.send(socket, wsMsgKeyEnum.start_matching, systemBizCodeEnum.SUCCESS)
                        
                        globalMgr.present_matching_service.notice_matching_number(uid,req_data['play_constant']);
                        
                        return 
                    }
                    

                } catch (error) {
                    log.error(error)
                    return self.send(socket, wsMsgKeyEnum.sysError, systemBizCodeEnum.SYS_ERROR)
                }
            });

        });
        
        // 退出匹配
        socket.on('exit_matching', function(data) {
            try {
                console.log("exit_matching   data = " + JSON.stringify(data));
                var userid = socket.userid;
                var service_exit_matching_data = {
                    userid: userid
                }
                let is_exit_matching = globalMgr.present_matching_service.exit_matching(service_exit_matching_data);
                if (is_exit_matching) {
                    self.send(socket, wsMsgKeyEnum.exit_matching, systemBizCodeEnum.SUCCESS)
                }
            } catch (error) {
                log.error(error)
                return self.send(socket, wsMsgKeyEnum.sysError, error)
            }


        });

        console.log("2、初始化 WSGameBaseApi initMatchingEvent successful")
    }

}

module.exports = WSGameBaseApi;
