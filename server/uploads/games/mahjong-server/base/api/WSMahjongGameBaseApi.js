

var log = require("../../utils/log");
var dataMgr = require('../../mgr/DataMgr');
var WSGameBaseApi = require('./WSGameBaseApi');
var wsMsgKeyEnum = require('../../config/WSMsgKeyEnum')
var systemBizCodeEnum = require('../../config/SystemBizCodeEnum')
class WSMahjongGameBaseApi extends WSGameBaseApi {


    constructor(){
        super();
        console.log("ws_api 3、初始化 WSMahjongGameBaseApi")
    }
    initEvent(socket){
        super.initEvent(socket);
        console.log("3、初始化 WSMahjongGameBaseApi initEvent")
        if (!dataMgr.isData_UnNull(socket)) {
            return;
        }
        var self = this;


        // 出牌阶段
        socket.on('send_card', function(data) {
            var req_data = data;
            console.log("send_card   data = " + JSON.stringify(data));
            try {
                var userid = socket.userid;
                var card_info_bo = new globalMgr.present_card_info_bo_class();
                card_info_bo.isShow     = req_data['isShow'];
                card_info_bo.value      = req_data['value'];
                card_info_bo.isTouch    = req_data['isTouch'];
                card_info_bo.isCard     = req_data['isCard'];

                if (!dataMgr.isData_UnNull(req_data['isShow'])  ||
                    !dataMgr.isData_UnNull(req_data['value'])   ||
                    !dataMgr.isData_UnNull(req_data['isTouch']) ||
                    !dataMgr.isData_UnNull(req_data['isCard'])) {

                    return self.send(socket, wsMsgKeyEnum.sysError, systemBizCodeEnum.PARAMETER_INCORRECT)
                }
                

                var send_card_data = {
                    userid: userid,
                    card_info_bo: card_info_bo
                }

                globalMgr.present_game_service.send_card(send_card_data);
            } catch (error) {
                log.error(error)
                return self.send(socket, wsMsgKeyEnum.sysError, error)
            }
        });


        // 碰牌阶段
        socket.on('knock_card', function(data) {
            var req_data = data;
            console.log("knock_card   data = " + JSON.stringify(data));
            try {
                var userid = socket.userid;
    
                var send_card_data = {
                    userid: userid
                }

                globalMgr.present_game_service.knock_card(send_card_data);
            } catch (error) {
                log.error(error)
                return self.send(socket, wsMsgKeyEnum.sysError, error)
            }
        });


        // 杠牌阶段
        socket.on('collision_card', function(data) {
            console.log("collision_card   data = " + JSON.stringify(data));
            try {
                var userid = socket.userid;
               
                var send_card_data = {
                    userid: userid
                }

                globalMgr.present_game_service.collision_card(send_card_data);
            } catch (error) {
                log.error(error)
                return self.send(socket, wsMsgKeyEnum.sysError, error)
            }
        });

        
        // 过牌阶段
        socket.on('skip_this_part', function(data) {
            console.log("skip_this_part   data = " + JSON.stringify(data));
            try {
                var userid = socket.userid;
               
                var send_card_data = {
                    userid: userid
                }

                globalMgr.present_game_service.skip_this_part(send_card_data);
            } catch (error) {
                log.error(error)
                return self.send(socket, wsMsgKeyEnum.sysError, error)
            }
        });


        //胡牌阶段
        socket.on('hu_card', function(data) {
            console.log("hu_card   data = " + JSON.stringify(data));
            try {
                var userid = socket.userid;
               
                var send_card_data = {
                    userid: userid
                }

                globalMgr.present_game_service.hu_card(send_card_data);
            } catch (error) {
                log.error(error)
                return self.send(socket, wsMsgKeyEnum.sysError, error)
            }
        });


        //听牌阶段
        socket.on('ting_card', function(data) {
            var req_data = data;
            console.log("ting_card   data = " + JSON.stringify(data));
            try {
                var userid     = socket.userid;
    
                var send_card_data = {
                    userid    :    userid
                }

                globalMgr.present_game_service.ting_card(send_card_data);
            } catch (error) {
                log.error(error)
                return self.send(socket, wsMsgKeyEnum.sysError, error)
            }
        });

        console.log("3、初始化 WSMahjongGameBaseApi initEvent successful")
    }
}

module.exports = WSMahjongGameBaseApi;