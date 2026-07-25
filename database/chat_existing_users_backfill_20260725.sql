-- 群聊及群会议旧用户补偿脚本（正式环境）
-- 执行前提：先更新后端代码并启动一次，确保聊天基础表已经存在。
-- 本脚本可重复执行，不会重复创建群成员或重复发放任何资产。

SET @database_name = DATABASE();

-- 兼容正式库未开启 TypeORM synchronize 的情况。
SET @add_all_muted_sql = IF(
  EXISTS(
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @database_name
      AND TABLE_NAME = 'conversations'
      AND COLUMN_NAME = 'all_muted'
  ),
  'SELECT 1',
  'ALTER TABLE conversations ADD COLUMN all_muted TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否开启全员禁言'''
);
PREPARE add_all_muted_stmt FROM @add_all_muted_sql;
EXECUTE add_all_muted_stmt;
DEALLOCATE PREPARE add_all_muted_stmt;

CREATE TABLE IF NOT EXISTS chat_schema_flags (
  flag_key VARCHAR(80) NOT NULL PRIMARY KEY,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @admin_id = (
  SELECT id
  FROM users
  WHERE LOWER(account) = 'admin' AND status = 1
  ORDER BY id ASC
  LIMIT 1
);

-- 正式库尚无系统总群时进行兜底创建。
INSERT INTO conversations
  (type, name, creator_id, status, is_system, all_muted, created_at, updated_at)
SELECT 2, '沧恒云芯', COALESCE(@admin_id, 0), 1, 1, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM conversations WHERE type = 2 AND is_system = 1
);

SET @system_group_id = (
  SELECT id
  FROM conversations
  WHERE type = 2 AND is_system = 1
  ORDER BY id ASC
  LIMIT 1
);

-- 只在首次补偿时设置系统总群默认全员禁言，后续不覆盖管理员手动设置。
INSERT IGNORE INTO chat_schema_flags (flag_key)
VALUES ('system_group_default_all_muted_v1');
SET @initialize_system_mute = ROW_COUNT();

UPDATE conversations
SET all_muted = 1
WHERE id = @system_group_id
  AND @initialize_system_mute = 1;

UPDATE conversations
SET creator_id = @admin_id
WHERE id = @system_group_id
  AND @admin_id IS NOT NULL;

-- 所有正常账号（包含上线前已经注册、激活的用户）补入系统总群。
INSERT IGNORE INTO conversation_members
  (conversation_id, user_id, role, is_hidden, joined_at)
SELECT @system_group_id,
       u.id,
       CASE WHEN u.id = @admin_id THEN 2 ELSE 1 END,
       0,
       NOW()
FROM users u
WHERE u.status = 1
  AND @system_group_id IS NOT NULL;

UPDATE conversation_members cm
INNER JOIN users u ON u.id = cm.user_id AND u.status = 1
SET cm.is_hidden = 0,
    cm.role = CASE WHEN cm.user_id = @admin_id THEN 2 ELSE cm.role END
WHERE cm.conversation_id = @system_group_id;

-- 将 admin 客服补入功能上线前已经审核通过的所有自建群。
INSERT IGNORE INTO conversation_members
  (conversation_id, user_id, role, is_hidden, joined_at)
SELECT c.id, @admin_id, 2, 0, NOW()
FROM conversations c
WHERE c.type = 2
  AND c.status = 1
  AND c.is_system = 0
  AND @admin_id IS NOT NULL;

UPDATE conversation_members cm
INNER JOIN conversations c ON c.id = cm.conversation_id
SET cm.role = 2,
    cm.is_hidden = 0
WHERE cm.user_id = @admin_id
  AND c.type = 2
  AND c.status = 1
  AND c.is_system = 0;

-- 执行结果核对。
SELECT
  @system_group_id AS system_group_id,
  @admin_id AS admin_user_id,
  (
    SELECT COUNT(*)
    FROM conversation_members
    WHERE conversation_id = @system_group_id
  ) AS system_group_member_count,
  (
    SELECT COUNT(*)
    FROM conversation_members cm
    INNER JOIN users u ON u.id = cm.user_id
    WHERE cm.conversation_id = @system_group_id
      AND u.status = 1
      AND u.is_activated = 1
  ) AS activated_user_member_count,
  (
    SELECT COUNT(*)
    FROM conversation_members cm
    INNER JOIN conversations c ON c.id = cm.conversation_id
    WHERE cm.user_id = @admin_id
      AND c.type = 2
      AND c.status = 1
      AND c.is_system = 0
  ) AS approved_groups_with_customer_service;
