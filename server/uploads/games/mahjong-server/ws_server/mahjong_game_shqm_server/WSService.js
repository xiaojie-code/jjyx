var log = require("../../utils/log");
var tools = require('../../utils/tools');
var wsMsgKeyEnum = require('../../config/WSMsgKeyEnum');
var WSMahjongGameBaseService = require('../../base/service/WSMahjongGameBaseService');


/**
 * 买嘴 游戏玩法 逻辑
 */
class WSService extends WSMahjongGameBaseService{
    
    constructor(){
        super();
        console.log("游戏服务 3、初始化  WSService");
    }

}


module.exports = WSService;