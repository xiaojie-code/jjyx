var mysql=require("mysql");
var crypto = require('../utils/crypto');
var configMgr = require("../mgr/ConfigMgr");
var pool = null;

var sqlClient = {};

sqlClient.query = function(sql,callback){
    console.log(sql);
    pool.getConnection(function(err,conn){
        if(err){
            callback(err,null,null);
        }else{
            conn.query(sql,function(qerr,vals,fields){
                //释放连接
                conn.release();
                //事件驱动回调
                callback(qerr,vals,fields);
            });
        }
    });
};

sqlClient.init = function(config){
    pool = mysql.createPool({
        host: config.mysql_host,
        user: config.mysql_user,
        password: config.mysql_passwd,
        database: config.mysql_db,
        port: config.mysql_port,
    });

    

}(configMgr.getRunConfig);


//批量插入
sqlClient.bulkInsert = function (sql,dataArr,callback) {
    pool.getConnection(function (err,conn) {
        if(err){
            callback(err,null,null);
        }else{
            conn.query(sql,dataArr,function (qerr,vals,fields) {
                conn.release();
                callback(qerr,vals,fields);
            })
        }
    })
}

module.exports = sqlClient;