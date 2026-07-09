
var dbConstantMgr = require('../../mgr/DBConstantMgr');
var GRoomDAO = require("../../DB/dao/GRoomDAO");
var GRoomUserDAO = require("../../DB/dao/GRoomUserDAO");
var wsMsgKeyEnum = require('../../config/WSMsgKeyEnum')
var wsUserMgr = require("../../mgr/WSUserMgr");
var systemBizCodeEnum = require('../../config/SystemBizCodeEnum');
class WSGameBaseLogic{
    constructor(){
        console.log("");
        console.log("游戏逻辑 1、初始化 WSGameBaseLogic")
    }


    onGameStart(room_type,roomid){
        // 人机对局房间为纯内存房间（roomid 以 ai_ 开头），不写数据库
        if (typeof roomid === 'string' && roomid.indexOf('ai_') === 0) return;
        if(room_type == dbConstantMgr.ROOM_TYPE_ORDINARY){
            GRoomDAO.updateRoomStateByRoomid(roomid,dbConstantMgr.ROOM_STATE_PLAYING);
        }
        
        
    }
    onGameOver(room_type,roomid){

        if (typeof roomid === 'string' && roomid.indexOf('ai_') === 0) return;
        if(room_type == dbConstantMgr.ROOM_TYPE_ORDINARY){
            GRoomDAO.deleteByRoomid(roomid);
            GRoomUserDAO.deleteByRoomid(roomid);
        }


    }

    //断线重连
    onReconnection(userid){

    }
    //销毁
    onDestroy(){

    }



    sendMsg(key, data, uid, seats_index) {

        function update_hand_holds() {
            for (let i = 0; i < this.room_seats.length; ++i) {
                //通知手牌
                var resdata = {
                    holds: this.room_seats[i].hand_holds,
                };
                if (!this.room_seats[i].is_online) continue;
                wsUserMgr.sendMsg(this.room_seats[i].user_id, wsMsgKeyEnum.update_hand_holds, systemBizCodeEnum.SUCCESS, resdata)
            }
        }

        function update_hand_holds_single() {
            //通知手牌
            var resdata = {
                holds: this.room_seats[seats_index].hand_holds,
            };
            wsUserMgr.sendMsg(uid, wsMsgKeyEnum.update_hand_holds, systemBizCodeEnum.SUCCESS, resdata)
        }

        function update_room_info_all() {
            console.log(this.previous_index);
        }

        /**
         * 更新倒计时
         */
        function update_countdown_all() {
            for (let i = 0; i < this.room_seats.length; ++i) {
                //通知手牌
                var resdata = {
                    countdown: data.countdown
                };
                if (!this.room_seats[i].is_online) continue;
                wsUserMgr.sendMsg(this.room_seats[i].user_id, wsMsgKeyEnum.update_countdown_all, systemBizCodeEnum.SUCCESS, resdata)
            }
        }



        switch (key) {
            case wsMsgKeyEnum.update_hand_holds:
                update_hand_holds.bind(this)();
                break;
            case wsMsgKeyEnum.update_hand_holds_single: //更新单个用户手牌
                update_hand_holds_single.bind(this)();
                break;
            case wsMsgKeyEnum.update_room_info_all:
                update_room_info_all.bind(this)();
                break;
            case wsMsgKeyEnum.update_countdown_all:
                update_countdown_all.bind(this)();
                break;
            default:
                break;
        }


    }

}

module.exports = WSGameBaseLogic