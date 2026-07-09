var log = require('../../utils/log');
var tools = require('../../utils/tools');
var DBConstantMgr = require('../../mgr/DBConstantMgr');
var mysqlMgr = require("../../mgr/MysqlMgr");
var dao = dao || {};

//房间信息表

function nop(a, b, c, d, e, f, g) { };
var tabel_name = "g_room";

var base_Column_List = `
id,
roomid,
game_rules,
baseinfo,
game_constant,
cruent_inning,
max_inning,
max_people_num,
end_point,
money,
money_type,
room_consumption_type,
room_type,
homeowners_uid,
state,
createTime
`;

dao.insert = function (dbo) {

  return new Promise((resolve, reject) => {

    if (!dbo) {
      log.error("parameter is err parameter is " + dbo)
      resolve(false);
      return
    }

    var sql = `insert into ${tabel_name} (${base_Column_List})
        values (${dbo.id || ""},
          ${dbo.roomid || ""},
          ${dbo.game_rules || ""},
          ${dbo.baseinfo || ""},
          ${dbo.game_constant || ""},
          ${dbo.cruent_inning || ""},
          ${dbo.max_inning || ""},
          ${dbo.max_people_num || ""},
          ${dbo.end_point || ""},
          ${dbo.money || ""},
          ${dbo.money_type || ""},
          ${dbo.room_consumption_type || ""},
          ${dbo.room_type || ""},
          ${dbo.homeowners_uid || ""},
          ${dbo.state || ""},
          ${dbo.createTime || ""});`;

    console.log(sql);
    log.info(sql);
    mysqlMgr.query(sql, function (err, rows, fields) {
      if (err) {
        resolve(null);
        throw err;
      } else {
        if (rows.insertId) {
          resolve(rows.insertId);
          return
        }
        log.warn("dao.insert  rows.affectedRows is 0   parameter = " + dbo)
        resolve(null);
      }
    });
  });

}


dao.seleteByRoomid = function (roomid) {
  return new Promise((resolve, reject) => {
    if (!roomid) {
      resolve(null);
      return;
    }
    var sql = `SELECT ${base_Column_List} FROM ${tabel_name} WHERE roomid = '${roomid}'`;
    console.log(sql);
    log.info(sql);
    mysqlMgr.query(sql, function (err, rows, fields) {
      if (err) {
        resolve(null);
        throw err;
      } else {
        if (rows.length > 0) {
          resolve(rows[0]);
        } else {
          resolve(null);
        }
      }
    });
  });
}

dao.updateRoomStateByRoomid = function (roomid, db_constant_room_state) {
  return new Promise((resolve, reject) => {

    if (!db_constant_room_state || !tools.Arr.isHasObj(DBConstantMgr.ROOM_STATE_ALL, db_constant_room_state)) {
      log.error("parameter is err parameter is " + db_constant_room_state)
      resolve(false);
      return
    }

    var sql = `UPDATE ${tabel_name} SET state=${db_constant_room_state} where roomid = ${roomid}`;

    console.log(sql);
    log.info(sql);
    mysqlMgr.query(sql, function (err, rows, fields) {
      if (err) {
        resolve(null);
        throw err;
      } else {
        if (rows.affectedRows > 0) {
          resolve(true);
          return
        }
        log.warn("dao.updateRoomStateByRoomid  rows.affectedRows is 0   parameter = " + db_constant_room_state)
        resolve(false);
      }
    });
  });

}

dao.updateRoomHomeownersUidByRoomid = function (roomid, uid) {
  return new Promise((resolve, reject) => {


    var sql = `UPDATE ${tabel_name} SET homeowners_uid=${uid} where roomid = ${roomid}`;

    console.log(sql);
    log.info(sql);
    mysqlMgr.query(sql, function (err, rows, fields) {
      if (err) {
        resolve(null);
        throw err;
      } else {
        if (rows.affectedRows > 0) {
          resolve(true);
          return
        }
        log.warn("dao.updateRoomHomeownersUidByRoomid  rows.affectedRows is 0   parameter = " + db_constant_room_state)
        resolve(false);
      }
    });
  });

}

/**
 * 更新所有不为空的 属性
 * @param {*} dbo 
 * @returns 
 */
dao.updateAllDontEmptyByRoomid = function (dbo) {
  return new Promise((resolve, reject) => {

    if (!dbo) {
      log.error("parameter is err parameter is " + db_constant_room_state)
      resolve(false);
      return
    }
    let sets = "";
    if (dbo.roomid) {
      sets += " room = " + dbo.roomid;
    }
    if (dbo.game_rules) {

      try {
        sets += " game_rules = " + dbo.game_rules;
      } catch (error) {
        log.error("Str 转换 JSON 失败 game_rules = " + dbo.game_rules)
      }

    }
    if (dbo.baseinfo) {
      try {
        sets += " baseinfo = " + dbo.baseinfo;
      } catch (error) {
        log.error("Str 转换 JSON 失败 baseinfo = " + dbo.baseinfo)
      }

    }
    if (dbo.game_constant) {
      sets += " game_constant = " + dbo.game_constant;
    }
    if (dbo.cruent_inning) {
      sets += " cruent_inning = " + dbo.cruent_inning;
    }
    if (dbo.max_inning) {
      sets += " max_inning = " + dbo.max_inning;
    }
    if (dbo.max_people_num) {
      sets += " max_people_num = " + dbo.max_people_num;
    }
    if (dbo.end_point) {
      sets += " end_point = " + dbo.end_point;
    }
    if (dbo.money) {
      sets += " money = " + dbo.money;
    }
    if (dbo.money_type && tools.Arr.isHasObj(DBConstantMgr.MONEY_TYPE_ALL, dbo.money_type)) {
      sets += " money_type = " + dbo.money_type;
    }
    if (dbo.room_consumption_type && tools.Arr.isHasObj(DBConstantMgr.ROOM_CONSUMPTION_TYPE_ALL, dbo.room_consumption_type)) {
      sets += " room_consumption_type = " + dbo.room_consumption_type;
    }
    if (dbo.room_type && tools.Arr.isHasObj(DBConstantMgr.ROOM_TYPE_ALL, dbo.room_type)) {
      sets += " room_type = " + dbo.room_type;
    }
    if (dbo.homeowners_uid) {
      sets += " homeowners_uid = " + dbo.homeowners_uid;
    }
    if (dbo.state && tools.Arr.isHasObj(DBConstantMgr.ROOM_STATE_ALL, dbo.state)) {
      sets += " state = " + dbo.state;
    }
    if (dbo.createTime) {
      sets += " createTime = " + dbo.createTime;
    }
    var sql = `UPDATE ${tabel_name} SET ${sets}`;

    console.log(sql);
    log.info(sql);
    mysqlMgr.query(sql, function (err, rows, fields) {
      if (err) {
        resolve(null);
        throw err;
      } else {
        if (rows.affectedRows > 0) {
          resolve(true);
          return
        }
        log.warn("dao.updateAllDontEmptyByRoomid  rows.affectedRows is 0   parameter = " + db_constant_room_state)
        resolve(false);
      }
    });
  });

}

dao.deleteByRoomid = function (roomid) {
  return new Promise((resolve, reject) => {

    if (!roomid) {
      log.error("parameter is err parameter is " + roomid)
      resolve(false);
      return
    }

    var sql = `DELETE FROM ${tabel_name} WHERE roomid =${roomid}`;

    console.log(sql);
    log.info(sql);
    mysqlMgr.query(sql, function (err, rows, fields) {
      if (err) {
        resolve(null);
        throw err;
      } else {
        if (rows.affectedRows > 0) {
          resolve(true);
          return
        }
        log.warn("dao.deleteByRoomid  rows.affectedRows is 0   parameter = " + roomid)
        resolve(false);
      }
    });
  });

}

/**
 * 删除该房间 而且房间用户 为空
 * @param {*} roomid 
 * @returns 
 */
dao.deleteByRoomidAndRoomUserisNull = function (roomid) {
  return new Promise((resolve, reject) => {

    if (!roomid) {
      log.error("parameter is err parameter is " + roomid)
      resolve(false);
      return
    }

    var sql = `delete from ${tabel_name} WHERE (select COUNT(id) FROM g_room_user WHERE roomid = ${roomid}) <1 AND roomid = ${roomid}`;

    console.log(sql);
    log.info(sql);
    mysqlMgr.query(sql, function (err, rows, fields) {
      if (err) {
        resolve(null);
        throw err;
      } else {
        if (rows.affectedRows > 0) {
          resolve(true);
          return
        }
        log.warn("dao.deleteByRoomidAndRoomUserisNull  rows.affectedRows is 0   parameter = " + roomid)
        resolve(false);
      }
    });
  });

}

module.exports = dao