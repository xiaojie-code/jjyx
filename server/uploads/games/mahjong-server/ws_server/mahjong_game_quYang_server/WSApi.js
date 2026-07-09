var log = require("../../utils/log");
var tools = require('../../utils/tools');

var wsMsgKeyEnum = require('../../config/WSMsgKeyEnum');
var dataMgr = require('../../mgr/DataMgr');
var WSMahjongGameBaseApi = require('../../base/api/WSMahjongGameBaseApi');


/**
 * api
 */
class WSApi extends WSMahjongGameBaseApi{
    
    constructor(){
        super();
        console.log("ws_api 4、初始化 WSApi")
    }

    initEvent(socket){
        super.initEvent(socket);
        console.log("4、初始化 WSApi initEvent")
        if (!dataMgr.isData_UnNull(socket)) {
            return;
        }
        var self = this;

        // 扣牌阶段
        socket.on('hide_cards', function(data) {
            try {
                var userid = socket.userid;
                var hide_card_data = {
                    userid: userid
                }

                console.log("hide_cards   data = " + JSON.stringify(hide_card_data));
                
                globalMgr.present_game_service.hide_cards(hide_card_data);
            } catch (error) {
                log.error(error)
                return self.send(socket, wsMsgKeyEnum.sysError, error)
            }
        });

        // 不扣牌阶段
        socket.on('stop_hide_cards', function(data) {
            try {
                var userid = socket.userid;
                var stop_hide_card_data = {
                    userid: userid
                }

                console.log("hide_cards   data = " + JSON.stringify(stop_hide_card_data));
                
                globalMgr.present_game_service.stop_hide_cards(stop_hide_card_data);
            } catch (error) {
                log.error(error)
                return self.send(socket, wsMsgKeyEnum.sysError, error)
            }
        });
    }
}


module.exports = WSApi