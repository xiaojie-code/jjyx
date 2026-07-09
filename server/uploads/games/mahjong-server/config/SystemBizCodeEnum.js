module.exports = {
    SUCCESS: { 'code': 200, 'msg': '成功！' },

    //300~399 系统内部错误
    MYSQL_KEY_REPEAT : {'code': 300, 'msg': 'mysql 字段为 UNIQUE 插入值 有重复~！' },
    MYSQL_DELETE_HOOM_USER_CLOSE : {'code': 301, 'msg': '删除房间用户失败' },
    MYSQL_DELETE_HOOM_CLOSE : {'code': 302, 'msg': '删除房间失败' },

    // # 400~499
    NOT_LOGIN: { 'code': 401, 'msg': '未登录！' },
    PARAMETER_INCORRECT: { 'code': 403, 'msg': '参数为空或错误！' },
    USER_IS_NOT_NULL: { 'code': 404, 'msg': '用户已存在！' },
    // # 500~599
    ERROR: { 'code': 500, 'msg': '系统错误，请联系客服处理！' },
    SQL_DATA_ERROR: { 'code': 502, 'msg': '数据错误，联系客服！' },
    SYS_ERROR: { 'code': 503, 'msg': '系统内部错误，请及时处理！' },

    //600 ~ 655  房间 / 匹配
    HOOM_NOT_FIND: { 'code': 600, 'msg': '房间不存在~！' },
    MATCH_USER_NOT_FIND: { 'code': 602, 'msg': '匹配的用户不存在~！' },
    HOOM_EXIST: { 'code': 603, 'msg': '房间已存在~！' },
    HOOM_SEATS_NOT_FIND: { 'code': 604, 'msg': '房间座位不存在~！' },
    
    HOME_GAME_OVER: { 'code': 605, 'msg': '此房间游戏已结束'},
    CREATE_HOOM_LOSE: { 'code': 606, 'msg': '创建房间失败'},
    HOOM_USER_NUM_MAX: { 'code': 607, 'msg': '房间人数已满'},
    HOOM_NOT_DISSOLUTION: { 'code': 609, 'msg': '此房间无法解散'},
    HOOM_DISSOLUTION: { 'code': 610, 'msg': '此房已经解散'},
    HOOM_DISSOLUTION_CLOSE: { 'code': 611, 'msg': '解散房间失败'},

    //660 ~ 699  用户
    HOOM_USER_NOT_FIND: { 'code': 660, 'msg': '房间用户不存在~！' },
    MATCH_USER_EXIST: { 'code': 661, 'msg': '您已经在匹配中', 'showClient': true },
    USER_HAS_GAMES: { 'code': 662, 'msg': '用户正在游戏中~!' },
    HOOM_HAS_USER: { 'code': 663, 'msg': '用户已经在房间中', 'showClient': true },

    //700 ~ 750 游戏
    NOT_PLAYING: { 'code': 700, 'msg': '当前还不轮你出牌', 'showClient': true  },
    CURRENT_CARD_SMALL: {'code': 701, 'msg': '您选择得牌小于上家得牌'},
    CURRENT_CARD_NOT_RULES: {'code': 702, 'msg': '您选择得牌不符合规则'},
}