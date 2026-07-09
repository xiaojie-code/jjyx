var log = require("../utils/log");
var wsSocketMgr = require('./WSSocketMgr');
class WSUserMgr {

    static userList = {};
    static appPointsContexts = {};
    static userOnline = 0; //此游戏 用户总数

    constructor() {
        if (typeof WSUserMgr.instance === 'object') {
            console.log("获取到单例", "WSUserMgr");
            return WSUserMgr.instance;
        }
        WSUserMgr.instance = this;
        console.log("首次初始化 单例-", "WSUserMgr");
        return this;
    }

    bind(userid, socket) {
        if (!socket || !userid || WSUserMgr.userList[userid]) return;
        WSUserMgr.userList[userid] = socket;
        this.setUserid(userid);


        //设置 socket 

        let client_ip = null;
        if(socket.handshake.headers['x-forwarded-for'] != null){
            client_ip = socket.handshake.headers['x-forwarded-for'];
        }else{
            client_ip = socket.handshake.address;
        }

        this.setClientIP(userid,client_ip);

        WSUserMgr.userOnline++;
        try {
            log.warn("userList = " + JSON.stringify(WSUserMgr.userList))
        } catch (error) {}
        console.log('WSUserMgr 设置', {
            userid,
            userList: Object.keys(WSUserMgr.userList)
        });

        console.log("当前Socket用户人数：" + this.getOnlineCount());
    }

    get(userid) {
        console.log('WSUserMgr 获取', {
            userid,
            userList: Object.keys(WSUserMgr.userList)
        });
        return WSUserMgr.userList[userid];
    }
    //绑定 roomid 到 socket
    setRoomid(userid,roomid){
        if(!WSUserMgr.userList[userid])return;
        WSUserMgr.userList[userid].roomid = roomid;
    }
    //绑定 座位下标 到 socket
    setSeatsIndex(userid,seats_index){
        if(!WSUserMgr.userList[userid])return;
        WSUserMgr.userList[userid].seats_index = seats_index;
    }
    /**
     * 绑定 玩法类型 到 socket
     * @param {*} userid 
     * @param {*} play_constant  
     *    
     * @returns 
     */
    setPlayConstant(userid,play_constant){
        if(!WSUserMgr.userList[userid])return;
        WSUserMgr.userList[userid].play_constant = play_constant;
    }
    setClientIP(userid,client_ip){
        if(!WSUserMgr.userList[userid])return;
        WSUserMgr.userList[userid].client_ip = client_ip;
    }
    getClientIP(userid){
        if(!WSUserMgr.userList[userid])return;
        if(!WSUserMgr.userList[userid].client_ip)return;
        return WSUserMgr.userList[userid].client_ip;
    }
    //绑定 玩家昵称 到 socket
    setUserName(userid,user_name){
        if(!WSUserMgr.userList[userid])return;
        WSUserMgr.userList[userid].user_name = user_name;
    }
    getUserName(userid){
        if(!WSUserMgr.userList[userid])return null;
        return WSUserMgr.userList[userid].user_name || null;
    }
    //绑定 玩家头像 到 socket
    setUserIcon(userid,user_icon){
        if(!WSUserMgr.userList[userid])return;
        WSUserMgr.userList[userid].user_icon = user_icon;
    }
    getUserIcon(userid){
        if(!WSUserMgr.userList[userid])return null;
        return WSUserMgr.userList[userid].user_icon || null;
    }
    setAppPointsContext(userid, context){
        if(!userid || !context)return;
        WSUserMgr.appPointsContexts[userid] = context;
    }
    getAppPointsContext(userid){
        return WSUserMgr.appPointsContexts[userid] || null;
    }
    setUserid(userid){
        if(!WSUserMgr.userList[userid])return;
        WSUserMgr.userList[userid].userid = userid;
    }

    isOnline(userid) {
        var data = WSUserMgr.userList[userid];
        if (data != null) {
            return true;
        }
        return false;
    }

    getOnlineCount() {
        return WSUserMgr.userOnline;
    }

    sendMsg = function(send_userid, event, systemBizCodeEnum, resdata) {
        console.log(event);
        var user_socket = WSUserMgr.userList[send_userid];
        if(!user_socket){
            return;
        }

        var roomid = user_socket.roomid;

        if (roomid == null) {
            return;
        }

        var rs = globalMgr.present_room_mgr.getSeatsInfoByUseridAndRoomid(roomid,send_userid);
            
        if(!rs.is_online)return;
        wsSocketMgr.send(user_socket, event, systemBizCodeEnum, resdata)
    };

    sendMsgToOnlineUser = function(send_userid, event, systemBizCodeEnum, resdata) {
        var user_socket = WSUserMgr.userList[send_userid];
        if(!user_socket){
            return;
        }
        wsSocketMgr.send(user_socket, event, systemBizCodeEnum, resdata)
    };

    //通知给房间中的所有客户端
    broacastInRoom = function(send_userid, event, systemBizCodeEnum, resdata, includingSender) {

        var user_socket = WSUserMgr.userList[send_userid];
        if(!user_socket){
            return;
        }

        var roomid = user_socket.roomid;

        if (roomid == null) {
            return;
        }

        var roomInfo = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomid);
        if (roomInfo == null) {
            return;
        }

        for (var i = 0; i < roomInfo.seats.length; ++i) {
            var rs = roomInfo.seats[i];
            
            if(!rs.is_online)continue;

            //如果不需要发给发送方，则跳过
            if (rs.user_id == send_userid && includingSender != true) {
                continue;
            }
            var socket = WSUserMgr.userList[rs.user_id];
            if (socket != null) {
                wsSocketMgr.send(socket, event, systemBizCodeEnum, resdata)
            }
        }
    };
    //通知给所有客户端
    broacastInAll = function(send_userid, event, systemBizCodeEnum, resdata, includingSender) {

        var user_socket = WSUserMgr.userList[send_userid];
        if(!user_socket){
            return;
        }

        
        for (const userid in WSUserMgr.userList) {
            if (WSUserMgr.userList[userid]) {

                const user_socket = WSUserMgr.userList[userid];

                //如果不需要发给发送方，则跳过
                if (userid == send_userid && includingSender != true) {
                    continue;
                }
               
                wsSocketMgr.send(user_socket, event, systemBizCodeEnum, resdata)
                
            }

        }

    };
    disconnectSocket = function(userid) {
        var socket = WSUserMgr.userList[userid];
        if (socket) {
            socket.disconnect();
            delete WSUserMgr.userList[userid];
            delete WSUserMgr.appPointsContexts[userid];
            WSUserMgr.userOnline && WSUserMgr.userOnline--;
        }

        console.log('WSUserMgr 删除', {
            userid,
            userList: Object.keys(WSUserMgr.userList)
        });

        console.log("当前Socket用户人数：" + this.getOnlineCount());
    };

}

module.exports = new WSUserMgr();
