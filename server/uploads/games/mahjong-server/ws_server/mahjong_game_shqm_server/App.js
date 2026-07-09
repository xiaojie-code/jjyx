require("../../mgr/GlobalMgr");
const log = require("../../utils/log");


console.log("上海敲麻  server  app  start   ")
console.log("上海敲麻 运行环境 "+process.env.H_NODE_ENV)
console.log("上海敲麻 运行端口 "+process.env.WS_PORT)
console.log("上海敲麻 game_key "+process.env.name)

  

try {
    var WSApi = require("./WSApi");
    var WSService = require("./WSService");
    var RoomSeatsInfoBO = require("./module_entity/bo/RoomSeatsInfoBO");
    var RoomInfoVO = require("./module_entity/vo/RoomInfoVO");
    var WSLogic = require("./WSLogic");
    

    globalMgr.registeredRunGames({
        game_key                    : process.env.name,
        game_port                   : process.env.WS_PORT,
        game_service                : new WSService(),
        room_seats_info_bo_class    : RoomSeatsInfoBO,
        room_info_vo_class          : RoomInfoVO,
        game_logic_class            : WSLogic
    });
    
    var ws_api = new WSApi();
    
    ws_api.connection();

} catch (error) {
    throw error
}

