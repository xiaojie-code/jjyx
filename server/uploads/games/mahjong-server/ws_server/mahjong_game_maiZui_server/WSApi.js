var log = require("../../utils/log");
var tools = require('../../utils/tools');
var wsMsgKeyEnum = require('../../config/WSMsgKeyEnum');
var dataMgr = require('../../mgr/DataMgr');
var systemBizCodeEnum = require('../../config/SystemBizCodeEnum')
var WSMahjongGameBaseApi = require('../../base/api/WSMahjongGameBaseApi');


/**
 * 买嘴 游戏玩法 api
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

        //买嘴阶段
        socket.on('maizui', function(data) {
            console.log("maizui   data = " + JSON.stringify(data));
            try {
                var userid     = socket.userid;
                var maizui_arr = data.maizui_arr;
    
                var send_card_data = {
                    userid    :    userid,
                    maizui_arr:    maizui_arr 
                }

                globalMgr.present_game_service.maizui(send_card_data);
            } catch (error) {
                log.error(error)
                return self.send(socket, wsMsgKeyEnum.sysError, error)
            }
        });

        console.log("4、初始化 WSApi initEvent successful")
    }
}


module.exports = WSApi