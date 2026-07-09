require("../../mgr/GlobalMgr");
const log = require("../../utils/log");


console.log("曲阳麻将  server  app  start   ")
console.log("曲阳麻将 运行环境 "+process.env.H_NODE_ENV)
console.log("曲阳麻将 运行端口 "+process.env.WS_PORT)
console.log("曲阳麻将 game_key "+process.env.name)

  

try {
    var WSApi = require("./WSApi");
    var WSService = require("./WSService");
    var WSLogic = require("./WSLogic");
    

    globalMgr.registeredRunGames({
        game_key                    : process.env.name,
        game_port                   : process.env.WS_PORT,
        game_service                : new WSService(),
        game_logic_class            : WSLogic
    });
    
    var ws_api = new WSApi();
    
    ws_api.connection();

} catch (error) {
    throw error
}

