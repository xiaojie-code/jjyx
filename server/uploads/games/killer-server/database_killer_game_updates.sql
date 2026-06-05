-- 大逃杀规则升级字段。
-- 如果当前 MySQL 支持 ADD COLUMN IF NOT EXISTS，可以直接执行这一段。
ALTER TABLE `wa_touzhu`
  ADD COLUMN IF NOT EXISTS `mode` varchar(16) NOT NULL DEFAULT 'ai' AFTER `isrobot`,
  ADD COLUMN IF NOT EXISTS `rewards` int(11) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `resultid` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `resultname` varchar(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `ifyouxiao` tinyint(1) NOT NULL DEFAULT 1;

-- 如果数据库版本较旧，不支持 IF NOT EXISTS，就分别确认字段不存在后执行：
-- ALTER TABLE `wa_touzhu` ADD COLUMN `mode` varchar(16) NOT NULL DEFAULT 'ai' AFTER `isrobot`;
-- ALTER TABLE `wa_touzhu` ADD COLUMN `rewards` int(11) NOT NULL DEFAULT 0;
-- ALTER TABLE `wa_touzhu` ADD COLUMN `resultid` int(11) DEFAULT NULL;
-- ALTER TABLE `wa_touzhu` ADD COLUMN `resultname` varchar(64) DEFAULT NULL;
-- ALTER TABLE `wa_touzhu` ADD COLUMN `ifyouxiao` tinyint(1) NOT NULL DEFAULT 1;
