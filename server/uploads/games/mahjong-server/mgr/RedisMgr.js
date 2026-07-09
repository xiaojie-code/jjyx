

    // configMgr.getRunConfig.redis_port,
    // configMgr.getRunConfig.redis_host,
    // configMgr.getRunConfig.redis_password,
    // configMgr.getRunConfig.redis_db

var redis = require('redis');
var configMgr = require('../mgr/ConfigMgr');

client = redis.createClient({
    host:configMgr.getRunConfig.redis_host,
    port:configMgr.getRunConfig.redis_port,
    password:configMgr.getRunConfig.redis_password,
    db:configMgr.getRunConfig.redis_db
});


client.on('ready',function(res){
    console.log('redis ready');
});

client.on('end',function(err){
    console.log('redis end');
});

client.on('error', function (err) {
    console.log(err);
});

client.on('connect',function(){
    console.log('redis connect success!');
});



module.exports = client;