/**
 * 数据库交互 公用 常量   请勿随意更改
 */
module.exports = {

    OPEN :  "0", //启用
    BAN  :  "1", //禁用
    ALL  :  "-1",//所有

    PLAY_GOLD   :   2,//金币场
    PLAY_JOY    :   1,//欢乐场


    /**
     * 账号源
     * 1:游客    2:微信   3:账号
     */
    SOURCE_VISITOR : 1, //游客
    SOURCE_WE_CHAT : 2, //微信
    SOURCE_ACCOUNT : 3, //账号

    /**
     *	 货币类型
     *  '1' ：欢乐豆,
     *  '2'：钻石 , 
     *  '3'：金币 ,
     *  '4'：兑换卷 , 
     *  '5'：RMB
     */
     MONEY_TYPE_BEANS 	            : 	"1",
     MONEY_TYPE_DIAMOND	            :	"2",
     MONEY_TYPE_GOLD		        :	"3",
     MONEY_TYPE_VOUCHER	            :	"4",
     MONEY_TYPE_RMB		            :	"5",
     MONEY_TYPE_ALL                 :   ["1","2","3","4","5"],
     
     
     /**
         用户房间身份 比如房主 因各个游戏规则不一样所以以程序逻辑使用为准
      */
     ROOM_IDENTITY_ROOT 		    : 	"1", //房主
     ROOM_IDENTITY_CIVILIAN	        :	"2", //平民
     
     ROOM_IDENTITY_ALL              :   ["1","2"],
     
     //房间身份 权限  降序   下标越小 权限 越大
     ROOM_IDENTITY_PERMISSIONS      :   ["1","2"],
     
     
     
     /**
         房间类型
      */
     ROOM_TYPE_ORDINARY		        : 	"1", //同城竞技
     ROOM_TYPE_QYQ			        : 	"2", //亲友圈
     ROOM_TYPE_DLM			        : 	"3", //大联盟
     ROOM_TYPE_MATCHING			    : 	"5", //匹配
     ROOM_TYPE_ALL                  :   ["1","2","3","5"],
     
     /**
         房间消费类型
      */
     ROOM_CONSUMPTION_TYPE_ROOT		: 	"1", //房主
     ROOM_CONSUMPTION_TYPE_AA		: 	"2", //AA
     ROOM_CONSUMPTION_TYPE_ALL      :   ["1","2"],
 
 
     
     /**
         房间状态
      */
     ROOM_STATE_INIT	: 	"0", //初始化中 此状态还不能进入游戏
     ROOM_STATE_AWAIT	: 	"1", //等待 未开始
     ROOM_STATE_PLAYING	: 	"2", //游戏中
     ROOM_STATE_OVER	: 	"3", //游戏结束
     ROOM_STATE_ALL     :   ["0","1","2","3"],

     
}