-- 资产包模块表结构
-- 只创建表，不删除、不清空任何已有数据。

CREATE TABLE IF NOT EXISTS asset_accounts (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  principal_balance DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '资产包本金余额',
  interest_balance DECIMAL(18,6) NOT NULL DEFAULT 0 COMMENT '资产包利息余额',
  total_recharged DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '累计审核通过充值本金',
  total_withdrawn DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '累计提现申请金额，含手续费',
  total_interest DECIMAL(18,6) NOT NULL DEFAULT 0 COMMENT '累计生成利息',
  last_interest_date DATE NULL COMMENT '最后一次计息日期',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_asset_accounts_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资产包账户表';

CREATE TABLE IF NOT EXISTS asset_recharge_orders (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  real_name VARCHAR(50) NOT NULL COMMENT '付款姓名',
  phone VARCHAR(20) NOT NULL COMMENT '联系电话',
  amount DECIMAL(18,2) NOT NULL COMMENT '用户填写的充值金额',
  confirmed_amount DECIMAL(18,2) NULL COMMENT '管理员确认到账金额',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0待审核 1已确认 2已驳回',
  admin_remark VARCHAR(200) NULL COMMENT '管理员备注',
  operator_id INT NULL COMMENT '操作管理员ID',
  handled_at DATETIME NULL COMMENT '处理时间',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_asset_recharge_user (user_id),
  INDEX idx_asset_recharge_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资产包充值订单表';

CREATE TABLE IF NOT EXISTS asset_withdrawals (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(18,2) NOT NULL COMMENT '提现申请金额，含手续费',
  fee DECIMAL(18,2) NOT NULL COMMENT '手续费，默认20%',
  actual_amount DECIMAL(18,2) NOT NULL COMMENT '实际到账金额',
  payment_method VARCHAR(20) NOT NULL DEFAULT 'alipay' COMMENT '提现方式：alipay/bank',
  account_name VARCHAR(50) NOT NULL COMMENT '收款人姓名',
  account_number VARCHAR(80) NOT NULL COMMENT '收款账号',
  interest_deducted DECIMAL(18,6) NOT NULL DEFAULT 0 COMMENT '审核通过时扣除的利息金额',
  principal_deducted DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '审核通过时扣除的本金金额',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0待审核 1已通过 2已驳回',
  admin_remark VARCHAR(200) NULL COMMENT '管理员备注',
  operator_id INT NULL COMMENT '操作管理员ID',
  handled_at DATETIME NULL COMMENT '处理时间',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_asset_withdraw_user (user_id),
  INDEX idx_asset_withdraw_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资产包提现表';

CREATE TABLE IF NOT EXISTS asset_interest_records (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  interest_date DATE NOT NULL COMMENT '计息日期',
  base_principal DECIMAL(18,2) NOT NULL COMMENT '当日计息本金',
  annual_rate DECIMAL(10,6) NOT NULL COMMENT '年化利率，默认0.65',
  interest_amount DECIMAL(18,6) NOT NULL COMMENT '当日生成利息',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_asset_interest_user_date (user_id, interest_date),
  INDEX idx_asset_interest_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资产包每日利息明细表';
