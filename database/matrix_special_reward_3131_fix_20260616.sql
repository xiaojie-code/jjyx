-- 修正 3131 收益限制口径
-- 作用：
-- 1. 撤回之前对 3131 树普通推广矩阵收益的禁用标记。
-- 2. 不删除用户、不删除矩阵、不删除历史收益流水。
-- 3. 新口径由后端代码控制：3131 树只拦截特殊账号 333333 的 10%特殊收益，
--    普通矩阵 25%/35% 收益继续按原逻辑执行。

DROP TEMPORARY TABLE IF EXISTS tmp_3131_tree_fix;

CREATE TEMPORARY TABLE tmp_3131_tree_fix AS
WITH RECURSIVE tree AS (
  SELECT id, account, invited_by, 0 AS depth
  FROM users
  WHERE account = '3131'

  UNION ALL

  SELECT u.id, u.account, u.invited_by, tree.depth + 1
  FROM users u
  INNER JOIN tree ON u.invited_by = tree.id
)
SELECT id, account, invited_by, depth
FROM tree;

-- 先查看本次会修正哪些用户。
SELECT id, account, invited_by, depth
FROM tmp_3131_tree_fix
ORDER BY depth, id;

-- 清回之前误设置的普通矩阵收益禁用标记。
UPDATE users u
INNER JOIN tmp_3131_tree_fix t ON u.id = t.id
SET u.matrix_reward_disabled = 0
WHERE u.matrix_reward_disabled = 1;

-- 查看修正后的 3131 树标记情况，正常应全部为 0。
SELECT u.id, u.account, u.invited_by, u.matrix_reward_disabled, t.depth
FROM users u
INNER JOIN tmp_3131_tree_fix t ON u.id = t.id
ORDER BY t.depth, u.id;

DROP TEMPORARY TABLE IF EXISTS tmp_3131_tree_fix;
