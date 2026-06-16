-- 3131 推广矩阵百分比收益禁用脚本
-- 作用：
-- 1. 给 users 增加 matrix_reward_disabled 标记字段（存在则跳过）。
-- 2. 将账号 3131 本人及其所有直推、间推标记为禁用推广矩阵百分比收益。
-- 3. 不删除历史收益，不扣回历史收益，只影响后续代码计算。

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'matrix_reward_disabled'
);
SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE users ADD COLUMN matrix_reward_disabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否禁用推广矩阵百分比收益：1禁用，0正常'' AFTER activated_cdk_id',
  'SELECT ''matrix_reward_disabled column already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND INDEX_NAME = 'idx_users_matrix_reward_disabled'
);
SET @sql := IF(
  @index_exists = 0,
  'ALTER TABLE users ADD INDEX idx_users_matrix_reward_disabled (matrix_reward_disabled)',
  'SELECT ''idx_users_matrix_reward_disabled already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DROP TEMPORARY TABLE IF EXISTS tmp_matrix_reward_disabled_3131;
CREATE TEMPORARY TABLE tmp_matrix_reward_disabled_3131 AS
WITH RECURSIVE blocked_tree AS (
  SELECT id, account, invited_by, 0 AS depth
  FROM users
  WHERE account = '3131'

  UNION ALL

  SELECT u.id, u.account, u.invited_by, bt.depth + 1
  FROM users u
  INNER JOIN blocked_tree bt ON u.invited_by = bt.id
)
SELECT id, account, invited_by, depth
FROM blocked_tree;

-- 执行后先看这份结果，确认 3131 树人数是否符合预期。
SELECT id, account, invited_by, depth
FROM tmp_matrix_reward_disabled_3131
ORDER BY depth, id;

UPDATE users u
INNER JOIN tmp_matrix_reward_disabled_3131 t ON u.id = t.id
SET u.matrix_reward_disabled = 1;

SELECT COUNT(*) AS disabled_user_count
FROM users
WHERE matrix_reward_disabled = 1;

DROP TEMPORARY TABLE IF EXISTS tmp_matrix_reward_disabled_3131;
