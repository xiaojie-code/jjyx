
var WSRoomBaseMgr = require('./WSRoomBaseMgr');
class WSMahjongRoomBaseMgr extends WSRoomBaseMgr {
    constructor(){
        super();
        console.log("房间管理者 2、初始化 WSMahjongRoomBaseMgr");
    }
    
    //设置 听牌 状态
    setRoomsSeatsTingState(seats_index, roomid, ting_state) {
        if (!this.roomsList[roomid]) throw systemBizCodeEnum.HOOM_NOT_FIND;
        if (!this.roomsList[roomid].seats[seats_index]) throw systemBizCodeEnum.HOOM_SEATS_NOT_FIND;
        this.roomsList[roomid].seats[seats_index].ting_state = ting_state;
        return this.roomsList[roomid].seats[seats_index]
    }
}

module.exports = WSMahjongRoomBaseMgr;