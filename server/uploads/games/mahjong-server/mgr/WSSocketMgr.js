exports.send = function(socket, event, systemBizCodeEnum, data) {

    var res_data = {};
    res_data.code = systemBizCodeEnum['code']
    res_data.msg = systemBizCodeEnum['msg']
    res_data.data = data || null

    console.log("ws send  event = "+event + " code = "+systemBizCodeEnum['code'] +"  msg = "+systemBizCodeEnum['msg'])
    socket.emit(event, res_data);
};