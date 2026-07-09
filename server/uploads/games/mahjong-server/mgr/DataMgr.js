var dataMgr = dataMgr || {};

/**
 * 判断Data是否null
 * @param {*节点} data
 */
dataMgr.isData_UnNull = function(data) {
    if((!data && typeof(data) !==  "boolean") || (typeof(data) ===  "string" && data == "") || data == null || typeof (data) == undefined || data == "undefined"){
        if(data == 0 && typeof (data) == "number"){
            return true;
        }
        return false
    }
    return true;
}

module.exports = dataMgr;