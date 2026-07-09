
var log = require("../utils/log");
var dataMgr = require("./DataMgr");
var configMgr = require("./ConfigMgr");

//logic
var WSMahjongGameBaseLogic = require("../base/logic/WSMahjongGameBaseLogic");
var WSGameBaseLogic = require("../base/logic/WSGameBaseLogic");
//mgr
var WSMahjongRoomBaseMgr = require("../base/mgr/WSMahjongRoomBaseMgr");
var WSMatchingBaseMgr = require("../base/mgr/WSMatchingBaseMgr");
var WSRoomBaseMgr = require("../base/mgr/WSRoomBaseMgr");
//module_entity
var CardInfoBaseBO = require("../base/module_entity/bo/CardInfoBaseBO");
var RoomInfoBaseBO = require("../base/module_entity/bo/RoomInfoBaseBO");
var RoomSeatsInfoBaseBO = require("../base/module_entity/bo/RoomSeatsInfoBaseBO");
var RoomsUsersListBaseBO = require("../base/module_entity/bo/RoomsUsersListBaseBO");

//module_entity——Mahjong
var MahjongCardInfoBaseBO = require("../base/module_entity/bo/mahjong/MahjongCardInfoBaseBO");
var MahjongRoomInfoBaseBO = require("../base/module_entity/bo/mahjong/MahjongRoomInfoBaseBO");
var MahjongRoomSeatsInfoBaseBO = require("../base/module_entity/bo/mahjong/MahjongRoomSeatsInfoBaseBO");
var MahjongRoomsUsersListBaseBO = require("../base/module_entity/bo/mahjong/MahjongRoomsUsersListBaseBO");

//service
var WSGameBaseService = require("../base/service/WSGameBaseService");
var WSMahjongGameBaseService = require("../base/service/WSMahjongGameBaseService");
var WSMatchingBaseService = require("../base/service/WSMatchingBaseService");
var WSRoomBaseService = require("../base/service/WSRoomBaseService");


/**
 * 注册当前运行得游戏
 * @param {*} game_key 游戏 config 中得 key 必传
 * @param {*} game_port 游戏端口 必传
 * 
 * @param {*} game_service 游戏服务实例 没有不传
 * @param {*} room_service 房间服务实例 没有不传
 * @param {*} matching_service 匹配服务实例 没有不传
 * @param {*} game_logic_class 游戏逻辑类 没有不传
 * 
 * @param {*} room_mgr 房间管理实例   没有不传
 * @param {*} matching_mgr 匹配管理实例   没有不传
 * @param {*} card_info_bo_class 牌信息bo实体类   没有不传
 * @param {*} room_info_bo_class 房间信息bo实体类   没有不传
 * @param {*} room_seats_info_bo_class 房间座位信息bo实体类   没有不传
 * @param {*} room_users_list_bo_class 房间用户信息bo实体类   没有不传
 * @returns 
 */
var registeredRunGames = function (data){

    if(!dataMgr.isData_UnNull(data['game_key'])
    || !dataMgr.isData_UnNull(data['game_port'])){
        throw new Error("registeredRunGames game_key or game_port parameter is null");
    }
    if(!dataMgr.isData_UnNull(configMgr.game_conf[data['game_key']])){
        log.error("registeredRunGames configMgr.game_conf not find "+data['game_key'])
        return
    }

    if(!dataMgr.isData_UnNull(data['game_service'])){

        switch (configMgr.game_conf[data['game_key']]['game_type']) {
            case "mahjong":
                data['game_service'] = new WSMahjongGameBaseService();
                break;
            
            default:
                log.warn(configMgr.game_conf[data['game_key']]['game_type'] +" set in default by registeredRunGames->game_service")
                break;
        }

    }

    if(!dataMgr.isData_UnNull(data['room_service'])){

        switch (configMgr.game_conf[data['game_key']]['game_type']) {
            case "mahjong":
                data['room_service'] = new WSRoomBaseService();
                break;
            
            default:
                log.warn(configMgr.game_conf[data['game_key']]['game_type'] +" set in default by registeredRunGames->room_service")
                break;
        }

    }

    if(!dataMgr.isData_UnNull(data['matching_service'])){

        switch (configMgr.game_conf[data['game_key']]['game_type']) {
            case "mahjong":
                data['matching_service'] = new WSMatchingBaseService();
                break;
            
            default:
                log.warn(configMgr.game_conf[data['game_key']]['game_type'] +" set in default by registeredRunGames->matching_service")
                break;
        }

    }

    if(!dataMgr.isData_UnNull(data['game_logic_class'])){

        switch (configMgr.game_conf[data['game_key']]['game_type']) {
            case "mahjong":
                data['game_logic_class'] = new WSMahjongGameBaseLogic();
                break;
            
            default:
                log.warn(configMgr.game_conf[data['game_key']]['game_type'] +" set in default by registeredRunGames->game_logic_class")
                break;
        }

    }

    if(!dataMgr.isData_UnNull(data['matching_mgr'])){

        switch (configMgr.game_conf[data['game_key']]['game_type']) {
            case "mahjong":
                data['matching_mgr'] = new WSMatchingBaseMgr();
                break;
            
            default:
                log.warn(configMgr.game_conf[data['game_key']]['game_type'] +" set in default by registeredRunGames->matching_mgr")
                break;
        }

    }

    if(!dataMgr.isData_UnNull(data['room_mgr'])){

        switch (configMgr.game_conf[data['game_key']]['game_type']) {
            case "mahjong":
                data['room_mgr'] = new WSMahjongRoomBaseMgr();
                break;
            
            default:
                log.warn(configMgr.game_conf[data['game_key']]['game_type'] +" set in default by registeredRunGames->room_mgr")
                break;
        }

    }

    if(!dataMgr.isData_UnNull(data['card_info_bo_class'])){

        switch (configMgr.game_conf[data['game_key']]['game_type']) {
            case "mahjong":
                data['card_info_bo_class'] = MahjongCardInfoBaseBO;
                break;
            
            default:
                log.warn(configMgr.game_conf[data['game_key']]['game_type'] +" set in default by registeredRunGames->card_info_bo_class")
                break;
        }

    }

    if(!dataMgr.isData_UnNull(data['room_info_bo_class'])){

        switch (configMgr.game_conf[data['game_key']]['game_type']) {
            case "mahjong":
                data['room_info_bo_class'] = RoomInfoBaseBO;
                break;
            
            default:
                log.warn(configMgr.game_conf[data['game_key']]['game_type'] +" set in default by registeredRunGames->room_info_bo_class")
                break;
        }

    }

    if(!dataMgr.isData_UnNull(data['room_seats_info_bo_class'])){

        switch (configMgr.game_conf[data['game_key']]['game_type']) {
            case "mahjong":
                data['room_seats_info_bo_class'] = MahjongRoomSeatsInfoBaseBO;
                break;
            
            default:
                log.warn(configMgr.game_conf[data['game_key']]['game_type'] +" set in default by registeredRunGames->room_seats_info_bo_class")
                break;
        }

    }

    if(!dataMgr.isData_UnNull(data['room_users_list_bo_class'])){

        switch (configMgr.game_conf[data['game_key']]['game_type']) {
            case "mahjong":
                data['room_users_list_bo_class'] = MahjongRoomsUsersListBaseBO;
                break;
            
            default:
                log.warn(configMgr.game_conf[data['game_key']]['game_type'] +" set in default by registeredRunGames->room_users_list_bo_class")
                break;
        }

    }

    global.myframework_present_game_key         = data['game_key'];
    global.myframework_present_game_port        = data['game_port'];
    global.myframework_present_game_config      = configMgr.game_conf[data['game_key']];

    //service 
    global.myframework_present_game_service     = data['game_service'];
    global.myframework_present_room_service     = data['room_service'];
    global.myframework_present_matching_service = data['matching_service'];
    
    //logic
    global.myframework_present_game_logic_class = data['game_logic_class'];
    
    //mgr
    global.myframework_present_matching_mgr     = data['matching_mgr'];
    global.myframework_present_room_mgr         = data['room_mgr'];
    
    //bo
    global.myframework_present_card_info_bo_class = data['card_info_bo_class'];
    global.myframework_present_room_info_bo_class = data['room_info_bo_class'];
    global.myframework_present_room_seats_info_bo_class = data['room_seats_info_bo_class'];
    global.myframework_present_room_users_list_bo_class = data['room_users_list_bo_class'];

    //vo  待优化 没有父类 需要兼容个 父类
    global.myframework_present_room_info_vo_class = data['room_info_vo_class'];
}


module.exports = {
    registeredRunGames : registeredRunGames,
    configMgr   :   configMgr,
    get present_game_key(){
        if(!dataMgr.isData_UnNull(global.myframework_present_game_key)){
            log.error("present_game_key is null")
            return;
        }
        return global.myframework_present_game_key
    },
    get present_game_port(){
        if(!dataMgr.isData_UnNull(global.myframework_present_game_port)){
            log.error("present_game_port is null")
            return;
        }
        return global.myframework_present_game_port
    },
    get present_game_config(){
        if(!dataMgr.isData_UnNull(global.myframework_present_game_config)){
            log.error("present_game_config is null")
            return;
        }
        return global.myframework_present_game_config
    },
    get present_game_service(){
        if(!dataMgr.isData_UnNull(global.myframework_present_game_service)){
            log.error("present_game_service is null")
            return;
        }
        return global.myframework_present_game_service
    },
    get present_room_service(){
        if(!dataMgr.isData_UnNull(global.myframework_present_room_service)){
            log.error("present_room_service is null")
            return;
        }
        return global.myframework_present_room_service
    },
    get present_matching_service(){
        if(!dataMgr.isData_UnNull(global.myframework_present_matching_service)){
            log.error("present_room_service is null")
            return;
        }
        return global.myframework_present_matching_service
    },
    get present_game_logic_class(){
        if(!dataMgr.isData_UnNull(global.myframework_present_game_logic_class)){
            log.error("present_game_logic is null")
            return;
        }
        return global.myframework_present_game_logic_class
    },
    get present_matching_mgr(){
        if(!dataMgr.isData_UnNull(global.myframework_present_matching_mgr)){
            log.error("present_matching_mgr is null")
            return;
        }
        return global.myframework_present_matching_mgr
    },
    get present_room_mgr(){
        if(!dataMgr.isData_UnNull(global.myframework_present_room_mgr)){
            log.error("present_room_mgr is null")
            return;
        }
        return global.myframework_present_room_mgr
    },
    get present_card_info_bo_class(){
        if(!dataMgr.isData_UnNull(global.myframework_present_card_info_bo_class)){
            log.error("present_card_info_bo_class is null")
            return;
        }
        return global.myframework_present_card_info_bo_class
    },
    get present_room_info_bo_class(){
        if(!dataMgr.isData_UnNull(global.myframework_present_room_info_bo_class)){
            log.error("present_room_info_bo_class is null")
            return;
        }
        return global.myframework_present_room_info_bo_class
    },
    get present_room_seats_info_bo_class(){
        if(!dataMgr.isData_UnNull(global.myframework_present_room_seats_info_bo_class)){
            log.error("present_room_seats_info_bo_class is null")
            return;
        }
        return global.myframework_present_room_seats_info_bo_class
    },
    get present_room_users_list_bo_class(){
        if(!dataMgr.isData_UnNull(global.myframework_present_room_users_list_bo_class)){
            log.error("present_room_users_list_bo_class is null")
            return;
        }
        return global.myframework_present_room_users_list_bo_class
    }
}

global.globalMgr = module.exports