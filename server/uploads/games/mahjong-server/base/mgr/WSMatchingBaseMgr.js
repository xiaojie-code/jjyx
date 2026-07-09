var log = require("../../utils/log");
var systemBizCodeEnum = require('../../config/SystemBizCodeEnum');

class WSMatchingBaseMgr {
    matchUsersList = {}; //匹配中的用户

    constructor() {
        console.log("");
        console.log("匹配管理者 1、初始化 WSMatchingBaseMgr");
    }


        
    /**
     * 获取匹配组
     * @param {*} play_constant 玩法类型常量 欢乐场 / 金币场 .........
     * @returns 
     */
    getMatchGroup(play_constant) {
        return this.matchUsersList[play_constant];
    }
    
    /**
     * 获取匹配组 用户数量
     * @param {*} play_constant 玩法类型常量 欢乐场 / 金币场 .........
     * @returns 
     */
    getMatchGroupUserLength(play_constant) {
        return Object.keys(this.matchUsersList[play_constant]).length
    }


    /**
     * 添加用户 到 匹配组
     * @param {*} play_constant 玩法类型常量 欢乐场 / 金币场 .........
     * @param {*} userid 
     * @returns 
     */
    addUserToMatch(play_constant, userid) {
        this.matchUsersList[play_constant] = this.matchUsersList[play_constant] || {};
        if (this.matchUsersList[play_constant][userid]) throw systemBizCodeEnum.MATCH_USER_EXIST;
        this.matchUsersList[play_constant][userid] = play_constant;

        globalMgr.present_room_mgr.addRoomsUsersListBO(userid,play_constant,globalMgr.configMgr.rooms_users_state.match);

        console.log(" addUserToMatch = " + Object.keys(this.matchUsersList));
        return true
    }
     
    /**
     * 删除匹配用户 和 房间用户  
     * 目前在 退出匹配使用
     * @param {*} userid 
     * @returns 
     */
    delMatchGroupUserAndRoomUserByUserid(userid) {
        if (!globalMgr.present_room_mgr.ishasRoomUserByUserid(userid)) return;
        let play_constant = globalMgr.present_room_mgr.getRoomsUsersByUserid(userid)['play_constant']
        let ret_obj = this.matchUsersList[play_constant][userid];
        ret_obj && delete this.matchUsersList[play_constant][userid];
        globalMgr.present_room_mgr.delRoomUserByUserid(userid);
        return ret_obj
    }
    
    /**
     * 删除匹配组用户
     * @param {*} play_constant 玩法类型常量
     * @param {*} userid 
     * @returns 
     */
     delMatchGroupUser(play_constant, userid) {
        return delete this.matchUsersList[play_constant][userid];
    }

    /**
     * 清空指定匹配组
     * @param {*} play_constant 玩法类型常量
     * @returns
     */
    clearMatchGroup(play_constant) {
        if (!this.matchUsersList[play_constant]) return false;
        delete this.matchUsersList[play_constant];
        return true;
    }
}

module.exports = WSMatchingBaseMgr