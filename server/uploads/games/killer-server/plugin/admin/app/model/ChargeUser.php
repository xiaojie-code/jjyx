<?php

namespace plugin\admin\app\model;

use plugin\admin\app\model\Base;

/**
 * @property integer $id 主键(主键)
 * @property integer $uid 用户ID
 * @property string $money 充值金额
 * @property integer $coin 购买金币
 * @property integer $give 赠送金币
 * @property string $orderno 订单号
 * @property string $payno 三方订单号
 * @property integer $paytype 支付方式
 * @property integer $status 状态
 * @property string $addtime 时间
 */
class ChargeUser extends Base
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'wa_charge_user';

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
