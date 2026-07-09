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


        console.log("4、初始化 WSApi initEvent successful")
    }
}


module.exports = WSApi