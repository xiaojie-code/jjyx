var log = require('../../utils/log');
var mysqlMgr = require("../../mgr/MysqlMgr");
var dao = dao || {};

//房间用户关联表

function nop(a, b, c, d, e, f, g) {};
var tabel_name = "g_room_user";

var base_Column_List = `
id,
user_account_id,
user_total_score,
user_game_identity,
baseinfo,
roomid
`;

dao.deletebyUserid = function(user_account_id) {

    return new Promise((resolve,reject)=>{

        if(!user_account_id){
            log.error("parameter is err parameter is "+user_account_id)
            resolve(false);
            return
        }

        var sql = `DELETE FROM ${tabel_name} WHERE user_account_id=${user_account_id}`;
        console.log(sql);
        log.info(sql);

        mysqlMgr.query(sql, function(err, rows, fields) {
            if (err) {
                resolve(null);
                throw err;
            } else {
                if (rows.affectedRows > 0) {
                    resolve(true);
                    return
                }
                log.warn("dao.deletebyUserid  rows.affectedRows is 0   parameter = " + user_account_id)
                resolve(false);
            }
        });
    });
}


dao.deleteByRoomid = function(roomid){
    return new Promise((resolve,reject)=>{

      if(!roomid){
        log.error("parameter is err parameter is "+roomid)
        resolve(false);
        return
      }
      
      var sql = `DELETE FROM ${tabel_name} WHERE roomid =${roomid}`;
  
      console.log(sql);
      log.info(sql);
      mysqlMgr.query(sql, function(err, rows, fields) {
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


module.exports = dao