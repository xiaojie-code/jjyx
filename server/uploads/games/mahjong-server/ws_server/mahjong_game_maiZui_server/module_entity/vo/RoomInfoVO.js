var dbConstantMgr = require('../../../../mgr/DBConstantMgr');

module.exports = class RoomInfoVO {

    constructor(roomid) {
        this.roomid     =  roomid;
        this.room_info  =  globalMgr.present_room_mgr.getRoomsInfoByRoomid(this.roomid);
        this.room_seats =  this.room_info['seats'];
    }

    getRoomInfoVO(){

        var resdata = {
            roomid          : this.roomid, //房间id
            end_points      : this.room_info.end_points, //底分
            home_state      : this.room_info.home_state, //房间状态
            cruent_inning   : this.room_info.cruent_inning,
            max_inning      : this.room_info.max_inning,
            max_people_num  : this.room_info.max_people_num,
            deduct_tickets  : this.room_info.deduct_tickets,
            rule_conf       : this.room_info.rule_conf,
            baseinfo_conf   : this.room_info.baseinfo_conf,
            seats : [], //其它座位信息
        };

        for (let i = 0; i < this.room_seats.length; ++i) {
            let seat = {
                user_id             : this.room_seats[i].user_id,
                user_name           : this.room_seats[i].user_name,
                user_icon           : this.room_seats[i].user_icon,
                user_ip             : this.room_seats[i].user_ip,
                seats_index         : this.room_seats[i].seats_index,
                is_online           : this.room_seats[i].is_online,
                is_reconnection     : this.room_seats[i].is_reconnection,
                action_state        : this.room_seats[i].action_state,
            }
            resdata.seats.push(seat)
        }
        return resdata         
    }
} 