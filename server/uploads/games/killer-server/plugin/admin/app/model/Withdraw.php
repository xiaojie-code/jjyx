<?php

namespace plugin\admin\app\model;

use plugin\admin\app\model\Base;

/**
 * @property integer $id 主键(主键)
 * @property integer $uid 用户ID
 * @property string $money 提现金额
 * @property integer $coin 兑换金币
 * @property string $commission 扣除手续费
 * @property string $alino 支付宝账号
 * @property string $aliname 支付宝姓名
 * @property integer $status 状态
 * @property string $addtime 提现时间
 * @property string $real_money 实际到账
 */
class Withdraw extends Base
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'wa_withdraw';

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
