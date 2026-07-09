var log = require("../../utils/log");
var tools = require('../../utils/tools');
var wsUserMgr = require("../../mgr/WSUserMgr");
var dbConstantMgr = require('../../mgr/DBConstantMgr');
var wsMsgKeyEnum = require('../../config/WSMsgKeyEnum')
var uuid = require('uuid');
var systemBizCodeEnum = require('../../config/SystemBizCodeEnum');
var wsAIFillService = require('./WSAIFillService');

// 匹配超时时长（毫秒）：超过则用机器人补满空缺并自动开局
var MATCH_TIMEOUT_MS = 15000;

class WSMatchingBaseService{

    constructor(){
        console.log("");
        console.log("匹配服务 1、初始化  WSMatchingBaseService");
        // play_constant -> setTimeout 句柄；每个匹配分组一个超时定时器
        this._matchTimers = {};
    }

    /**
     * 由 play_constant(圈数) 计算该房间的总局数：人数 × 圈数
     * play_constant 取值即用户选择的圈数(1/2/8)
     */
    _calcMaxInning(play_constant){
        var rounds = parseInt(play_constant);
        if(isNaN(rounds) || rounds < 1) rounds = 1;
        var people = globalMgr.present_game_config.matching['max_people_num'] || 4;
        return people * rounds;
    }

    /**
     * 开始匹配
     * @param {*} data { userid, socket, play_constant, user_name, user_icon }
     * @returns 满员时返回 roominfo（由上层立即广播+开局）；未满返回 false（并已启动/维持 15s 超时定时器）
     */
    start_matching(data){
        try {
            var req_data = data;
            wsUserMgr.bind(req_data['userid'], req_data['socket']);

            // 保存玩家名/头像，供匹配建房时各座位显示真实信息
            wsUserMgr.setUserName(req_data['userid'], req_data['user_name']);
            wsUserMgr.setUserIcon(req_data['userid'], req_data['user_icon']);

            wsUserMgr.setPlayConstant(req_data['userid'], req_data['play_constant']);
            globalMgr.present_matching_mgr.addUserToMatch(req_data['play_constant'], req_data['userid']);

            var match_group = globalMgr.present_matching_mgr.getMatchGroup(req_data['play_constant']);

            if (Object.keys(match_group).length >= globalMgr.present_game_config.matching['max_people_num']) {
                // 凑齐真人：立即建房，清掉该分组的超时定时器
                this._clearTimer(req_data['play_constant']);
                let roominfo = this._buildRoomFromGroup(req_data['play_constant'], match_group);
                return roominfo;
            }

            // 未满：确保该分组有一个 15s 超时定时器（第一个进来的人启动）
            this._ensureTimer(req_data['play_constant']);
            return false
        } catch (error) {
            throw error
        }
    }

    /**
     * 把匹配分组里的真人加入到一个新房间，并返回 roominfo（不含 AI，AI 在超时路径单独补）
     */
    _buildRoomFromGroup(play_constant, match_group){
        let roomid = uuid.v1();
        let max_inning = this._calcMaxInning(play_constant);

        for (const key in match_group) {
            if (match_group.hasOwnProperty(key)) {
                const uid = key;
                wsUserMgr.setRoomid(uid, roomid);

                let res_data = {
                    userid          :   uid,
                    client_ip       :   wsUserMgr.getClientIP(uid),
                    user_name       :   wsUserMgr.getUserName(uid),
                    user_icon       :   wsUserMgr.getUserIcon(uid),
                    game_rules      :   globalMgr.present_game_config.matching['rule_conf'],
                    max_inning      :   max_inning,
                    max_people_num  :   globalMgr.present_game_config.matching['max_people_num'],
                }
                globalMgr.present_room_mgr.addUserToRooms(dbConstantMgr.ROOM_TYPE_MATCHING, res_data, roomid)
            }
        }

        let roominfo = globalMgr.present_room_mgr.getRoomsInfoByRoomid(roomid);
        globalMgr.present_matching_mgr.clearMatchGroup(play_constant);
        for (let i = 0; i < roominfo.seats.length; i++) {
            const element = roominfo.seats[i];
            wsUserMgr.setSeatsIndex(element.user_id, element.seats_index);
        }
        return roominfo;
    }

    /**
     * 为某个匹配分组启动 15s 超时定时器（若已存在则不重复启动）
     */
    _ensureTimer(play_constant){
        if(this._matchTimers[play_constant]) return;
        var self = this;
        this._matchTimers[play_constant] = setTimeout(function(){
            self._onMatchTimeout(play_constant);
        }, MATCH_TIMEOUT_MS);
        log.warn('匹配超时定时器启动 play_constant=' + play_constant + ' timeout=' + MATCH_TIMEOUT_MS + 'ms');
    }

    _clearTimer(play_constant){
        if(this._matchTimers[play_constant]){
            clearTimeout(this._matchTimers[play_constant]);
            delete this._matchTimers[play_constant];
        }
    }

    /**
     * 匹配超时：用现有分组的真人建房，空缺补 AI，广播匹配成功并开局
     */
    _onMatchTimeout(play_constant){
        try {
            this._clearTimer(play_constant);

            var match_group = globalMgr.present_matching_mgr.getMatchGroup(play_constant);
            if(!match_group || Object.keys(match_group).length < 1){
                return; // 没人了，无需处理
            }

            // 记录任一真人 uid，用于建房后广播
            var any_uid = Object.keys(match_group)[0];

            let roominfo = this._buildRoomFromGroup(play_constant, match_group);
            let roomid = roominfo.roomid;

            // 空缺补 AI（难度 2 高手，最高水平）：向听数精算 + 进张最大化 + 防点炮 + 清一色做番，
            // 会碰/杠、会听会胡，胡牌率与对抗强度最高，正常产出结算得分。
            wsAIFillService.fillEmptySeatsWithAI(roomid, 2);

            log.warn('匹配超时补 AI 完成 roomid=' + roomid + ' 座位数=' + roominfo.seats.length);

            // 广播匹配成功给房间内所有人，并开局
            wsUserMgr.broacastInRoom(any_uid, wsMsgKeyEnum.matching_win_all, systemBizCodeEnum.SUCCESS, null, true);
            globalMgr.present_game_service.start_game({ roomid: roomid });
        } catch (error) {
            log.error('匹配超时处理异常: ' + (error && error.message));
        }
    }

    /**
     * 退出匹配
     * @param {*} data 
     * @returns 
     */
    exit_matching(data){
        try {
            var req_data = data;
            if(!globalMgr.present_room_mgr.ishasRoomUserByUserid(req_data['userid']))return;
    
            let roomsUser = globalMgr.present_room_mgr.getRoomsUsersByUserid(req_data['userid']);
    
            if (roomsUser['state'] == globalMgr.configMgr.rooms_users_state.playing) {
                return systemBizCodeEnum.USER_HAS_GAMES
            }

            let play_constant = roomsUser['play_constant'];
            let ret = globalMgr.present_matching_mgr.delMatchGroupUserAndRoomUserByUserid(req_data['userid']);

            // 若该分组已无人，清掉超时定时器
            var group = globalMgr.present_matching_mgr.getMatchGroup(play_constant);
            if(!group || Object.keys(group).length < 1){
                this._clearTimer(play_constant);
            }
            return ret;
        } catch (error) {
            throw error
        }
    }

    /**
     * 通知当前匹配人数
     */
    notice_matching_number(userid,play_constant){
        var match_group = globalMgr.present_matching_mgr.getMatchGroup(play_constant);
        if(!play_constant || !match_group)return;
        
        let res_data = {
            cruent_online_person: globalMgr.present_matching_mgr.getMatchGroupUserLength(play_constant),
            total_person        : globalMgr.present_game_config.matching['max_people_num'],
        }
    
        for (const uid in match_group) {
            if (match_group.hasOwnProperty(uid)) {
                wsUserMgr.sendMsgToOnlineUser(uid, wsMsgKeyEnum.update_matching_all, systemBizCodeEnum.SUCCESS, res_data);
            }
        }
    
    }


}

module.exports = WSMatchingBaseService
