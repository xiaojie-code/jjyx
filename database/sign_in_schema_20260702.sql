CREATE TABLE IF NOT EXISTS user_sign_in_records (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '签到用户ID',
  sign_date DATE NOT NULL COMMENT '签到日期',
  week_day TINYINT NOT NULL COMMENT '1周一 7周日',
  points_reward DECIMAL(18, 6) NOT NULL DEFAULT 0 COMMENT '本次签到发放积分',
  copper_reward DECIMAL(12, 2) NOT NULL DEFAULT 0 COMMENT '本次签到发放铜币',
  is_full_week_reward TINYINT NOT NULL DEFAULT 0 COMMENT '是否满足周一到周日连续签到奖励',
  points_log_id BIGINT NULL COMMENT '积分流水ID',
  copper_log_id BIGINT NULL COMMENT '铜币流水ID',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_sign_in_date (user_id, sign_date),
  INDEX idx_user_sign_in_user_week (user_id, sign_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户每日签到记录';
