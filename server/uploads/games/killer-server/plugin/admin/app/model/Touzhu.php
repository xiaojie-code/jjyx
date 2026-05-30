<?php

namespace plugin\admin\app\model;

use plugin\admin\app\model\Base;

/**
 * @property integer $id 主键(主键)
 * @property integer $uid 用户ID
 * @property string $expect 期号
 * @property integer $tzid 投注ID(小房间号)
 * @property string $tzname 投注名称
 * @property integer $coin 投注金额
 * @property string $addtime 时间
 * @property integer $resultid 杀手去了哪个房间ID
 * @property string $resultname 杀手去了房间的名字
 * @property integer $status 状态0未开；1中奖；2未中奖
 * @property integer $rewards 奖金数量
 * @property integer $roomid 房间号
 * @property integer $isrobot 是否机器人投注0否；1是
 * @property integer $ifyouxiao 是否有效：1有效；0换房间撤单
 */
class Touzhu extends Base
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'wa_touzhu';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'id';
    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = false;

    
    
}
