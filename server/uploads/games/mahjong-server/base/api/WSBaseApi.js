var log = require("../../utils/log");
var https = require('https');

var systemBizCodeEnum = require('../../config/SystemBizCodeEnum')
var wsMsgKeyEnum = require('../../config/WSMsgKeyEnum')
var redisMgr = require('../../mgr/RedisMgr');
let wsUserMgr = require('../../mgr/WSUserMgr');
var dataMgr = require('../../mgr/DataMgr');
var wsSocketMgr = require('../../mgr/WSSocketMgr');

class WSBaseApi {
    io      =   null;
    socket  =   null;

    constructor() {
        console.log("");
        console.log("ws_api 1、初始化 WSBaseApi");
    }
    
    connection(){
        var config = globalMgr.configMgr.getRunConfig;
        if (config.isHTTPS) {
            var privateKey = fs.readFileSync(config.key_path, 'utf8');
            var certificate = fs.readFileSync(config.crt_path, 'utf8');
    
            var credentials = { key: privateKey, cert: certificate };
            var httpsServer = https.createServer(credentials).listen(globalMgr.present_game_port);
    
            this.io = require('socket.io')(httpsServer, { 'pingTimeout': 180000, 'pingInterval': 25000 });
        } else {
            const server = require('http').createServer();
            server.listen(globalMgr.present_game_port);
            this.io = require('socket.io')(server, { 'pingTimeout': 180000, 'pingInterval': 25000 });
        }
        console.log("ws_api listen...." + globalMgr.present_game_port);

        this.io.sockets.on('connection', function(socket) {
            this.socket = socket;
            this.initSystemEvent(socket);
            this.initEvent(socket);
        }.bind(this));
    }
    send (socket, event, systemBizCodeEnum, data) {
        wsSocketMgr.send(socket, event, systemBizCodeEnum, data);
    };

    /**
     * 检测用户是否登陆
     * @param {*} usertoken 
     * @param {*} callback 
     * @returns 
     */
    isLogin (usertoken) {
        return new Promise((resolve,reject)=>{
            if (!usertoken) { resolve(false); return; }
            // dev 模式：token 格式 "dev_{uid}"，跳过 Redis 直接解析
            if (process.env.H_NODE_ENV === 'dev' && usertoken.startsWith('dev_')) {
                const uid = usertoken.replace('dev_', '');
                console.log("dev isLogin uid = " + uid);
                resolve(uid);
                return;
            }
            if (usertoken.startsWith('app_')) {
                const uid = usertoken.replace('app_', '').replace(/[^0-9]/ig, "");
                console.log("app isLogin uid = " + uid);
                resolve(uid || false);
                return;
            }
            redisMgr.get(usertoken, function(err, reply) {
                if (err) {
                    log.error('redisMgr Error by wsapiMgr.isLogin  err = '+err)
                    resolve(false)
                    return;
                }
                if (!reply || reply == "") { resolve(false); return; }
                var uid = reply.replace(/[^0-9]/ig, "");
                console.log("uid = " + uid)
                resolve(uid)
            });
        });
    }

    bindAppPointsContext(socket, reqData, userid) {
        reqData = reqData || {};
        const query = (socket && socket.handshake && socket.handshake.query) || {};
        const token = reqData.app_token || query.appToken || '';
        const apiBaseUrl = reqData.api_base_url || query.apiBaseUrl || '';
        const appUserId = reqData.app_user_id || query.appUserId || userid;
        const appGameId = reqData.app_game_id || query.appGameId || '';
        if (!token || !apiBaseUrl || !appGameId) return null;
        const context = {
            token: token,
            apiBaseUrl: apiBaseUrl,
            appUserId: String(appUserId || userid),
            gameId: String(appGameId),
        };
        socket.appPointsContext = context;
        wsUserMgr.setAppPointsContext(userid, context);
        return context;
    }

    initSystemEvent(socket){
        console.log("");
        console.log("1、初始化 WSBaseApi initSystemEvent")
        if (!dataMgr.isData_UnNull(socket)) {
            return;
        }
        var self = this;
        socket.on('ping', function(data) {
            console.log('ping');
            var userid = socket.userid;
            if (!userid) {
                log.error("userid = " + userid + " 不存在")
                return;
            }
            socket.emit('pong');
        });

        // 系统事件 意外断开
        socket.on('disconnect', function(data) {
            try {
                console.log("disconnect  data = " + data);
                if (socket.userid == null) {
                    return;
                }
                
                var exitRoom_data = {
                    userid : socket.userid,
                    roomid : socket.roomid,
                    seats_index : socket.seats_index
                }
                globalMgr.present_room_service.exitRoom(exitRoom_data);


                globalMgr.present_matching_service.notice_matching_number(socket.userid,socket.play_constant);

                wsUserMgr.disconnectSocket(socket.userid);
                

            } catch (error) {
                log.error(error)
                return self.send(socket, wsMsgKeyEnum.sysError, error)
            }

        });

        console.log("1、初始化 WSBaseApi initSystemEvent successful")
    }
}

module.exports = WSBaseApi;
