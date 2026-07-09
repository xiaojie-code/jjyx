var http = require('http');
var https = require('https');
var qs = require('querystring');
var log = require('../utils/log');

exports.post = function(host, port, path, data, callback) {

    var content = qs.stringify(data);
    var options = {
        hostname: host,
        port: port,
        path: path + '?' + content,
        method: 'POST'
    };

    var req = http.request(options, function(res) {
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            //console.log('BODY: ' + chunk);
            callback && callback(chunk);
        });
    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });

    req.end();
};

exports.get2 = function(url, data, callback, safe) {
    var content = qs.stringify(data);
    var url = url + '?' + content;

    var proto = http;
    if (safe) {
        proto = https;
    }

    var req = proto.get(url, function(res) {
        //console.log('STATUS: ' + res.statusCode);  
        //console.log('HEADERS: ' + JSON.stringify(res.headers));  
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            //console.log('BODY: ' + chunk);
            var json = JSON.parse(chunk);
            callback && callback(true, json);
        });
    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        callback && callback(false, e);
    });

    req.end();
};

exports.get = function(host, port, path, data, callback, safe) {
    var content = qs.stringify(data);
    var options = {
        hostname: host,
        path: path + '?' + content,
        method: 'GET'
    };
    if (port) {
        options.port = port;
    }
    var proto = http;
    if (safe) {
        proto = https;
    }
    var req = proto.request(options, function(res) {
        //console.log('STATUS: ' + res.statusCode);  
        //console.log('HEADERS: ' + JSON.stringify(res.headers));  
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            //console.log('BODY: ' + chunk);
            try {
                var json = JSON.parse(chunk);
                callback && callback(true, json);
            } catch (error) {
                log.error(error.message);
                //console.log(error.message);
            }

        });
    });

    req.on('error', function(e) {
        log.error('problem with request: ' + e.message);
        console.log('problem with request: ' + e.message);
        callback && callback(false, e);
    });

    req.end();
};

exports.send = function(res, systemBizCodeEnum, data) {

    var res_data = {};
    res_data.code = systemBizCodeEnum['code']
    res_data.msg = systemBizCodeEnum['msg']
    res_data.data = data || null
    res.send(JSON.stringify(res_data));

};