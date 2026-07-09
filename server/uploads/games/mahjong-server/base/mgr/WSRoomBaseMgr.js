var log = require("../../utils/log");
var dbConstantMgr = require('../../mgr/DBConstantMgr');
var systemBizCodeEnum = require('../../config/SystemBizCodeEnum');

class WSRoomBaseMgr {

    roomsUsersList = {}; //房间中的用户(待优化，下个版本遗弃)
    roomsList = {}; //已匹配成功的 房间列表

    constructor() {
        console.log("");
        console.log("房间管理者 1、初始化 WSRoomBaseMgr");
    }

    addUserToRooms(roomType,data,roomid){
        let userid              =  data['userid']
        let client_ip           =  data['client_ip']
        let user_name           =  data['user_name']
        let user_icon           =  data['user_icon']
        let max_people_num      =  data['max_people_num']
        let max_inning          =  data['max_inning']
        let game_rules          =  data['game_rules'] && JSON.parse(data['game_rules'])
        
        let init_room_info = {
            rule_conf       :   game_rules,
            max_people_num  :   max_people_num,
            max_inning      :   max_inning,
            room_type       :   roomType
        }

        var room_info = this.getRoomsCache(roomid,init_room_info);

        /**
         * 匹配
         */
        function matching() {
            if (!this.roomsUsersList[userid]) return;

            let play_constant = this.roomsUsersList[userid]['play_constant']


            globalMgr.present_matching_mgr.delMatchGroupUser(play_constant,userid);

            let user_info = {
                userid      :   userid,
                user_name   :   user_name,
                user_icon   :   user_icon,
                client_ip   :   client_ip
            }
            let new_add_seat = this.addRoomsSeats(roomid,user_info);
    
    
            this.setRoomsUsersState(userid, globalMgr.configMgr.rooms_users_state.playing);
            this.setRoomsUsersRoomid(userid, roomid);
            this.setRoomsUsersSeatsIndex(userid, new_add_seat.seats_index);
    
            console.log('addUserToRooms 更新', {
                roomid: roomid,
                roomsList: this.roomsList[roomid],
                userid: userid,
                seats: room_info.seats,
                matchUsersList: globalMgr.present_matching_mgr.getMatchGroup(play_constant)
            });
        }

        /**
         * 同城竞技
         */
        function ordinary() {
            try {

                let ret_data = {
                    roomid: roomid,
                    roominfo: this.roomsList[roomid],
                    userid: userid,
                    seat: null,
                    isReconnection : false
                }
    
                let seat = this.getSeatsInfoByUseridAndRoomid(roomid,userid);
                
                

                if(!seat){

                    

                    let user_info = {
                        userid      : userid,
                        client_ip   : client_ip,
                        user_name   : user_name,
                        user_icon   : user_icon
                    }
                    let new_add_seat = this.addRoomsSeats(roomid,user_info);
    
                    if(this.roomsList[roomid].home_state == null){
                        this.setRoomsState(roomid,globalMgr.present_game_config.game_scene.repare)
                    }
                    
                    this.setRoomsSeatsActionState(new_add_seat.seats_index, roomid, globalMgr.present_game_config['action_state'].room_await);
                    this.setRoomsSeatsOnline(new_add_seat.seats_index, roomid, true) 

                    this.addRoomsUsersListBO(userid,roomType,globalMgr.configMgr.rooms_users_state.room);
                    this.setRoomsUsersRoomid(userid, roomid);
                    this.setRoomsUsersSeatsIndex(userid, new_add_seat.seats_index);

                    ret_data.seat = new_add_seat
                    ret_data.isReconnection = false

                }else{
                    
                    this.setRoomsSeatsOnline(seat.seats_index, roomid, true);
                    this.setRoomsSeatsIP(seat.seats_index, roomid,client_ip);
                    ret_data.seat = seat
                    ret_data.isReconnection = true

                }
    
    
                this.setRoomsSeatsisReconnection(ret_data.seat.seats_index, roomid, ret_data.isReconnection)
                
                return ret_data
            } catch (error) {
                
                throw error
                
            }
        }

        switch (roomType) {
            case dbConstantMgr.ROOM_TYPE_MATCHING:

                return matching.bind(this)();

            case dbConstantMgr.ROOM_TYPE_ORDINARY:

                return ordinary.bind(this)();

            default:
                log.error("roomType = "+roomType + " undefined  by addUserToRooms")
                break;
        }

    }


    addRoomsUsersListBO(userid,play_constant,state){

        let roomsUsersListBO = new globalMgr.present_room_users_list_bo_class();
        roomsUsersListBO.play_constant = play_constant;
        roomsUsersListBO.state = state;
        
        this.roomsUsersList[userid] = roomsUsersListBO;
    }

    //删除 房间用户
    delRoomUserByUserid(userid) {
        this.roomsUsersList[userid] && delete this.roomsUsersList[userid];
    }


    //是否包含房间用户
    ishasRoomUserByUserid(userid){
        return this.roomsUsersList[userid];
    }

    /**
     * 获取房间缓存
     * 没有则 创建  有 返回
     */
    getRoomsCache(roomid,init_room_info){
        let roomInfoBO = new globalMgr.present_room_info_bo_class();
        roomInfoBO.roomid = roomid;


        if(init_room_info){
            if(init_room_info.rule_conf){
                roomInfoBO.setRuleConf(init_room_info.game_rules);
            } 

            if(init_room_info.max_people_num){
                roomInfoBO.max_people_num = init_room_info.max_people_num;
            } 

            if(init_room_info.max_inning){
                roomInfoBO.max_inning = init_room_info.max_inning;
            } 

            if(init_room_info.room_type){
                roomInfoBO.room_type = init_room_info.room_type;
            } 
            
        }
        
        this.roomsList[roomid] = this.roomsList[roomid] || roomInfoBO;
        return this.roomsList[roomid];
    }
    //清空房间
    emptyRoomByRoomid(roomid) {
        try {
            let roominfo = this.getRoomsInfoByRoomid(roomid);
            
            let seats = roominfo['seats'];                                          

            for (let i = 0; i < seats.length; i++) {
                const element = seats[i];
                this.roomsUsersList[element.user_id] && delete this.roomsUsersList[element.user_id];
            }

            this.roomsList[roomid] && delete this.roomsList[roomid];
            return true

        } catch (error) {
            throw error
        }

    }

    //设置房间用户 roomid
    setRoomsUsersRoomid(userid, roomid) {
        if (!this.roomsUsersList[userid]) throw systemBizCodeEnum.HOOM_USER_NOT_FIND;
        this.roomsUsersList[userid]['roomid'] = roomid;
        return this.roomsUsersList[userid]
    }

    //设置房间用户 座位号
    setRoomsUsersSeatsIndex(userid,seats_index){
        if (!this.roomsUsersList[userid]) throw systemBizCodeEnum.HOOM_USER_NOT_FIND;
        this.roomsUsersList[userid]['seats_index'] = seats_index;
        return this.roomsUsersList[userid]
    }

    //设置房间用户状态
    setRoomsUsersState(userid, state) {
        if (!this.roomsUsersList[userid]) throw systemBizCodeEnum.HOOM_USER_NOT_FIND;
        this.roomsUsersList[userid]['state'] = state;
        return this.roomsUsersList[userid]
    }
    //设置房间 所有用户状态
    setRoomsAllUsersStateByRoomid(roomid, state) {
        if (!this.roomsList[roomid]) throw systemBizCodeEnum.HOOM_NOT_FIND;

        let seats = this.roomsList[roomid]['seats'];                                          

        for (let i = 0; i < seats.length; i++) {
            const element = seats[i];

            if(this.roomsUsersList[element.user_id]['state']){
                this.roomsUsersList[element.user_id]['state'] = state;
            }
        }
        
    }
    //设置 房间 Logic
    setRoomsGamesLogic(roomid, game_logic) {
        if (!this.roomsList[roomid]) throw systemBizCodeEnum.HOOM_NOT_FIND;
        this.roomsList[roomid].game_logic = game_logic;
        return this.roomsList[roomid]
    }

    setRoomsCruentInning(roomid,cruent_inning){
        if (!this.roomsList[roomid]) throw systemBizCodeEnum.HOOM_NOT_FIND;
        this.roomsList[roomid].cruent_inning = cruent_inning;
        return this.roomsList[roomid]
    }
    //设置 房间状态
    setRoomsState(roomid, home_state) {
        if (!this.roomsList[roomid]) throw systemBizCodeEnum.HOOM_NOT_FIND;
        this.roomsList[roomid].home_state = home_state;
        return this.roomsList[roomid]
    }

    //添加房间 座位 并返回当前 新增座位信息
    addRoomsSeats(roomid, init_user_info) {
        if (!this.roomsList[roomid]) throw systemBizCodeEnum.HOOM_NOT_FIND;
        if (!init_user_info)return;
        if (this.getSeatsInfoByUseridAndRoomid(roomid,init_user_info.userid)) return;

        let roomSeatsInfoBO = new globalMgr.present_room_seats_info_bo_class();
        roomSeatsInfoBO.user_id     =   init_user_info.userid;
        roomSeatsInfoBO.user_name   =   init_user_info.user_name;
        roomSeatsInfoBO.user_icon   =   init_user_info.user_icon;
        roomSeatsInfoBO.user_ip     =   init_user_info.client_ip || null;
        roomSeatsInfoBO.seats_index =   this.roomsList[roomid].seats.length;
        roomSeatsInfoBO.imultiple   =   globalMgr.present_game_config.imultiple;

        this.roomsList[roomid].seats.push(roomSeatsInfoBO);

        return roomSeatsInfoBO
    }


    //设置 房间座位 状态
    setRoomsSeatsActionState(seats_index, roomid, action_state) {
        if (!this.roomsList[roomid]) throw systemBizCodeEnum.HOOM_NOT_FIND;
        if (!this.roomsList[roomid].seats[seats_index]) throw systemBizCodeEnum.HOOM_SEATS_NOT_FIND;
        this.roomsList[roomid].seats[seats_index].action_state = action_state;
        return this.roomsList[roomid].seats[seats_index]
    }

    //设置 房间座位 动画状态
    setRoomsSeatsAnimState(seats_index, roomid, anim_state) {
        if (!this.roomsList[roomid]) throw systemBizCodeEnum.HOOM_NOT_FIND;
        if (!this.roomsList[roomid].seats[seats_index]) throw systemBizCodeEnum.HOOM_SEATS_NOT_FIND;
        this.roomsList[roomid].seats[seats_index].anim_state = anim_state;
        return this.roomsList[roomid].seats[seats_index]
    }
    //设置 房间座位 是否为重连
    setRoomsSeatsisReconnection(seats_index, roomid, is_reconnection) {
        if (!this.roomsList[roomid]) throw systemBizCodeEnum.HOOM_NOT_FIND;
        if (!this.roomsList[roomid].seats[seats_index]) throw systemBizCodeEnum.HOOM_SEATS_NOT_FIND;
        this.roomsList[roomid].seats[seats_index].is_reconnection = is_reconnection;
        return this.roomsList[roomid].seats[seats_index]
    }
    //设置 房间座位 是否在线
    setRoomsSeatsOnline(seats_index, roomid, is_online) {
        if (!this.roomsList[roomid]) throw systemBizCodeEnum.HOOM_NOT_FIND;
        if (!this.roomsList[roomid].seats[seats_index]) throw systemBizCodeEnum.HOOM_SEATS_NOT_FIND;
        this.roomsList[roomid].seats[seats_index].is_online = is_online;
        return this.roomsList[roomid].seats[seats_index]
    }
    setRoomsSeatsIP(seats_index, roomid, user_ip) {
        if (!this.roomsList[roomid]) throw systemBizCodeEnum.HOOM_NOT_FIND;
        if (!this.roomsList[roomid].seats[seats_index]) throw systemBizCodeEnum.HOOM_SEATS_NOT_FIND;
        this.roomsList[roomid].seats[seats_index].user_ip = user_ip;
        return this.roomsList[roomid].seats[seats_index]
    }
    
    //获取房间用户信息
    getRoomsUsersByUserid(userid) {
        if (!this.roomsUsersList[userid]) throw systemBizCodeEnum.HOOM_USER_NOT_FIND;
        return this.roomsUsersList[userid]
    }

    // 获取房间信息
    getRoomsInfoByRoomid(roomid) {
        if (!this.roomsList[roomid]) throw systemBizCodeEnum.HOOM_NOT_FIND;
        return this.roomsList[roomid]
    }


     /**
     * 获取座位信息  通过 uid 和 roomid
     * @param {*} roomid 
     * @param {*} userid 
     */
    getSeatsInfoByUseridAndRoomid(roomid,userid){

        let roominfo = this.getRoomsInfoByRoomid(roomid);
                             
        let seats = roominfo['seats'];                                          

        for (let i = 0; i < seats.length; i++) {
            const element = seats[i];
            if(element.user_id == userid){
                return element;
            }
        }

        return null;
    }
    /**
     * 删除座位信息  通过 uid 和 roomid
     * @param {*} roomid 
     * @param {*} userid 
     */
    delSeatByUseridAndRoomid(roomid,userid){

        let roominfo = this.getRoomsInfoByRoomid(roomid);
                                
        let seats = roominfo['seats'];                                          

        for (let i = 0; i < seats.length; i++) {
            const element = seats[i];
            if(element.user_id == userid){
                this.roomsList[roomid]['seats'].splice(i,1);
                return element;
            }
        }

        return false;
    }
    delRoomByRoomid(roomid){
        log.warn("删除房间 roomid = "+roomid)
        this.roomsList[roomid] && delete this.roomsList[roomid]
    }
}

module.exports = WSRoomBaseMgr