module.exports = {
    message_type_banner: "on_sys_message_type_banner", //用于客户端提示展示  类型
    sysError: "on_sys_error", // C / S  错误
    start_matching: "on_start_matching", //开始匹配
    update_matching_all: "on_update_matching_all", //匹配中
    matching_win_all: "on_matching_win_all", //匹配成功 通知该房间所有人
    exit_matching: "on_exit_matching", //退出匹配

    update_hand_holds: "on_update_hand_holds", //更新用户持有手牌
    update_hand_holds_single : "on_update_hand_holds_single",//更新单个用户手牌
    
    update_room_info_all: "on_update_room_info_all", //更新房间信息
    update_countdown_all: "on_update_countdown_all", //更新 倒计时
    on_update_chat_message_data_all: "on_update_chat_message_data_all", //更新聊天消息
}