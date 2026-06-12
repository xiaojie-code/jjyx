-- MySQL dump 10.13  Distrib 8.4.8, for Win64 (x86_64)
--
-- Host: localhost    Database: competitive_game
-- ------------------------------------------------------
-- Server version	8.4.8

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `agents`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `agents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `level` varchar(20) DEFAULT NULL,
  `remark` varchar(200) DEFAULT NULL,
  `points_earned` decimal(12,2) NOT NULL DEFAULT '0.00',
  `points_consumed` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_57ee94c84a8e570e362af59dce` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `app_versions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `app_versions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `platform` varchar(20) NOT NULL DEFAULT 'android',
  `version_name` varchar(50) NOT NULL,
  `version_code` int NOT NULL,
  `download_url` varchar(500) NOT NULL,
  `force_update` tinyint NOT NULL DEFAULT '0',
  `changelog` text,
  `file_size` bigint DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1 enabled, 0 disabled',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `file_md5` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_app_versions_platform_status_code` (`platform`,`status`,`version_code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `backpack_items`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `backpack_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `item_type` varchar(50) NOT NULL,
  `item_const_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_3b88dcb9bb0eb8bd7c0b8a9852` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cdk_types`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `cdk_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(200) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cdks`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `cdks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `cdk_type_id` int NOT NULL,
  `items_json` json DEFAULT NULL COMMENT '奖励物品配置 [{"item":"points","amount":100}]',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0未使用 1已使用',
  `used_by` int DEFAULT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_d1643a072723fba9b603604bc1` (`code`),
  KEY `IDX_75d7733dbe371848fc8ad5dc2a` (`cdk_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `conversation_members`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `conversation_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversation_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` tinyint NOT NULL DEFAULT '1' COMMENT '1普通成员 2管理员',
  `is_pinned` tinyint NOT NULL DEFAULT '0',
  `unread_count` int NOT NULL DEFAULT '0',
  `joined_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_muted` tinyint NOT NULL DEFAULT '0',
  `group_nickname` varchar(30) DEFAULT NULL COMMENT '我在本群的昵称',
  `is_hidden` tinyint NOT NULL DEFAULT '0' COMMENT '是否不显示该会话（不删除记录）',
  `cleared_at` datetime DEFAULT NULL COMMENT '该用户清空聊天记录的时间点，仅显示此时间之后的消息',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_5fa9076068b6f2a26fb793d243` (`conversation_id`,`user_id`),
  UNIQUE KEY `uk_conversation_user` (`conversation_id`,`user_id`),
  KEY `IDX_36340a1704b039608e34244511` (`conversation_id`),
  KEY `IDX_a46c76be8f62c4b00a835cdc37` (`user_id`),
  KEY `idx_conversation_members_conversation` (`conversation_id`),
  KEY `idx_conversation_members_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `conversations`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `conversations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` tinyint NOT NULL COMMENT '1单聊 2群聊',
  `name` varchar(50) DEFAULT NULL COMMENT '群聊名称（单聊为空）',
  `creator_id` int NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `announcement` text COMMENT '群公告',
  `avatar` varchar(255) DEFAULT NULL COMMENT '群头像URL',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '0待审核 1正常 2拒绝',
  `is_system` tinyint NOT NULL DEFAULT '0' COMMENT '是否系统群（不可解散）',
  PRIMARY KEY (`id`),
  KEY `idx_conversations_type` (`type`),
  KEY `idx_conversations_system` (`is_system`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `currency_logs`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `currency_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `sn` varchar(50) NOT NULL,
  `currency_type` varchar(20) NOT NULL COMMENT 'points/gold/silver/special/reward',
  `amount` decimal(18,6) NOT NULL COMMENT '变动数量（正为收入，负为支出）',
  `before_balance` decimal(18,6) NOT NULL COMMENT '变动前余额',
  `after_balance` decimal(18,6) NOT NULL COMMENT '变动后余额',
  `log_type` varchar(50) NOT NULL COMMENT 'game_earn/game_spend/admin_add/withdraw等',
  `description` varchar(200) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_302e04ade987e5d86fca9fc98f` (`sn`),
  KEY `IDX_a5188ef27916e9062e1d2dee9a` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=376 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `daily_deductions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `daily_deductions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `deduction_date` date NOT NULL COMMENT '扣除日期',
  `before_balance` decimal(12,2) NOT NULL COMMENT '扣除前余额',
  `deducted_amount` decimal(12,2) NOT NULL COMMENT '扣除金额',
  `deduction_rate` decimal(5,4) NOT NULL COMMENT '扣除比例',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_54ccaf2e653de79b1b48b2940c` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=151 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `direct_game_reward_records`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `direct_game_reward_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `turnover_id` bigint NOT NULL COMMENT '关联game_turnover_records.id',
  `source_user_id` int NOT NULL COMMENT '产生游戏流水的下级用户ID',
  `ancestor_user_id` int NOT NULL COMMENT '获得收益的上级/顶点用户ID',
  `generation` tinyint NOT NULL COMMENT 'source_user在ancestor_user树里的代数，ancestor为1代，直推为2代',
  `valid_direct_count` int NOT NULL COMMENT 'ancestor_user当时已激活直推人数快照',
  `max_generation` tinyint NOT NULL COMMENT '按有效直推人数计算出的最大可拿代数，最高20代',
  `turnover_amount` decimal(18,6) NOT NULL COMMENT '原始有效游戏流水金额',
  `reward_rate` decimal(10,6) NOT NULL COMMENT '收益比例，默认0.0015，即千分之1.5',
  `reward_amount` decimal(18,6) NOT NULL COMMENT '实际发放到普通积分points的收益',
  `currency_log_id` bigint DEFAULT NULL COMMENT '收益发放对应currency_logs.id',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1发放成功 2跳过 3失败',
  `remark` varchar(200) DEFAULT NULL COMMENT '发放说明或失败原因',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_c7f1b8e3892a89475caac84270` (`turnover_id`),
  KEY `IDX_03f3a167feb30d8d554961e43e` (`source_user_id`),
  KEY `IDX_6dac789edb3bbdc8622d22ece3` (`ancestor_user_id`),
  KEY `IDX_af2156f8efa3c42c3fbd7ec5bf` (`currency_log_id`),
  KEY `IDX_144fa2038b3ef23d2454b550a2` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fishing_saves`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `fishing_saves` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `game_id` int NOT NULL,
  `save_data` json NOT NULL,
  `last_daily_reward_date` varchar(10) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_fishing_saves_user_game` (`user_id`,`game_id`),
  KEY `IDX_93cd524b77fc5164eea8490535` (`user_id`),
  KEY `IDX_c8f1618fca2b34bc397b6ee73e` (`game_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `friend_requests`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `friend_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `from_user_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0待处理 1已同意 2已拒绝',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_5e9a1caaf3e22527e20256ef72` (`from_user_id`),
  KEY `IDX_8085211f8c9a14a68cc82ff134` (`to_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `friendships`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `friendships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `friend_id` int NOT NULL,
  `remark` varchar(50) DEFAULT NULL COMMENT '备注名（仅自己可见）',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_a8e4ede8e2df44f3f21f557d37` (`user_id`,`friend_id`),
  KEY `IDX_c73eec6c7e7d5d1f2b3ce8b900` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_records`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `game_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `game_id` int NOT NULL,
  `result` varchar(50) DEFAULT NULL,
  `points_earned` decimal(12,2) NOT NULL DEFAULT '0.00',
  `points_spent` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_549507342fe5762e30483381d2` (`user_id`),
  KEY `IDX_9373db25fd90c0dbe15659e5ba` (`game_id`)
) ENGINE=InnoDB AUTO_INCREMENT=135 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_turnover_records`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `game_turnover_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL COMMENT '产生有效游戏流水的用户ID',
  `game_id` int DEFAULT NULL COMMENT '游戏ID，可为空，如赛马旧接口未带gameId时为空',
  `source_type` varchar(50) NOT NULL COMMENT '有效流水类型：bet下注/revive复活/fish_sell卖鱼等',
  `turnover_amount` decimal(18,6) NOT NULL COMMENT '有效游戏流水金额，按正数记录',
  `currency_log_id` bigint DEFAULT NULL COMMENT '对应用户本人的积分变动日志ID，便于追账',
  `biz_id` varchar(100) DEFAULT NULL COMMENT '业务ID，如房间ID、对局ID、请求ID',
  `description` varchar(200) DEFAULT NULL COMMENT '流水说明',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `reward_status` tinyint NOT NULL DEFAULT '0' COMMENT '直推流水奖励处理状态：0未处理 1已处理 2开关关闭跳过',
  `reward_rate` decimal(10,6) DEFAULT NULL COMMENT '本笔流水使用的返利比例快照，如0.0015',
  `reward_count` int NOT NULL DEFAULT '0' COMMENT '本笔流水实际获得返利的上级人数',
  `total_reward_amount` decimal(18,6) NOT NULL DEFAULT '0.000000' COMMENT '本笔流水合计发放的普通积分返利',
  `reward_processed_at` datetime DEFAULT NULL COMMENT '直推流水奖励处理完成时间',
  PRIMARY KEY (`id`),
  KEY `IDX_1688871dc99e02182af4a38b46` (`user_id`),
  KEY `IDX_4b598fc778093589d4834ffddc` (`game_id`),
  KEY `IDX_8e086326ea40fda2d2b885aa6b` (`source_type`),
  KEY `IDX_c55484c24e0e213b18e0427962` (`currency_log_id`),
  KEY `IDX_a4e4b36e2e3e647490fd16157f` (`created_at`),
  KEY `IDX_7eb789450e7662afacbeb188e0` (`reward_status`),
  KEY `idx_game_turnover_reward_status` (`reward_status`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `games`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `games` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `icon` varchar(500) DEFAULT NULL,
  `description` varchar(200) DEFAULT NULL,
  `game_url` varchar(500) NOT NULL,
  `entry_cost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1正常 2维护',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `orientation` varchar(20) NOT NULL DEFAULT 'landscape' COMMENT 'portrait竖屏 landscape横屏',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `group_invitations`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `group_invitations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversation_id` int NOT NULL,
  `inviter_id` int NOT NULL,
  `invitee_id` int NOT NULL,
  `message_id` bigint DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0 pending, 1 accepted, 2 rejected',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `handled_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_group_invitation_invitee` (`invitee_id`,`status`),
  KEY `idx_group_invitation_conversation` (`conversation_id`),
  KEY `idx_group_invitation_pending` (`conversation_id`,`invitee_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `horse_bets`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `horse_bets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `user_id` int NOT NULL,
  `horse_number` int NOT NULL,
  `bet_amount` decimal(12,2) NOT NULL,
  `reward_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_c67d2f0ef9562fa9d9694d7a35` (`room_id`),
  KEY `IDX_254144ac6f7c1a284d7d66adbe` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `horse_race_matches`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `horse_race_matches` (
  `id` varchar(36) NOT NULL,
  `mode` varchar(20) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'matching',
  `player_count` int NOT NULL DEFAULT '0',
  `race_duration_ms` int NOT NULL DEFAULT '0',
  `winners_json` text,
  `standings_json` text,
  `started_at` datetime DEFAULT NULL,
  `ended_at` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_53dfe05f996e0cb9bd93344dbd` (`mode`),
  KEY `IDX_745847ad6ba4e92aec1284b86d` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `horse_race_players`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `horse_race_players` (
  `id` int NOT NULL AUTO_INCREMENT,
  `match_id` varchar(36) NOT NULL,
  `user_id` int DEFAULT NULL,
  `display_name` varchar(50) NOT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `horse_id` int NOT NULL,
  `horse_name` varchar(50) NOT NULL,
  `is_bot` tinyint NOT NULL DEFAULT '0',
  `confirmed` tinyint NOT NULL DEFAULT '0',
  `placement` int DEFAULT NULL,
  `finish_time_ms` int DEFAULT NULL,
  `is_winner` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_ee1e1410afa70feeadce996166` (`match_id`),
  KEY `IDX_18a5be8b2a8f305a5bb2255b8e` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `horse_rooms`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `horse_rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1等待中 2进行中 3已结算',
  `horse_count` int NOT NULL DEFAULT '6',
  `winner_horse` int DEFAULT NULL,
  `total_pool` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `settled_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invite_rewards`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `invite_rewards` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `inviter_id` int NOT NULL,
  `invitee_id` int NOT NULL,
  `reward_type` varchar(20) NOT NULL,
  `reward_amount` decimal(12,2) NOT NULL,
  `trigger_type` varchar(50) NOT NULL COMMENT 'invite_register/invitee_consume',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_dff1bcbe4b0fda115e1476f808` (`inviter_id`),
  KEY `IDX_fee4c52574f8b3d23caab16057` (`invitee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=152 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lottery_accounts`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `lottery_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `activation_chance_granted` tinyint NOT NULL DEFAULT '0',
  `team_chance_units` int NOT NULL DEFAULT '0',
  `used_chances` int NOT NULL DEFAULT '0',
  `total_draws` int NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_d0affbf2c1ff6a84d8c219882e` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=98 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lottery_config`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `lottery_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slot_index` int NOT NULL,
  `prize_name` varchar(50) NOT NULL,
  `prize_type` varchar(20) NOT NULL COMMENT 'points/gold/item等',
  `prize_amount` decimal(12,2) NOT NULL,
  `probability` decimal(5,4) NOT NULL COMMENT '中奖概率（0-1）',
  `cost_type` varchar(20) NOT NULL,
  `cost_amount` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lottery_draw_records`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `lottery_draw_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `draw_no` int NOT NULL,
  `prize_level` int NOT NULL,
  `prize_name` varchar(100) NOT NULL,
  `prize_type` varchar(30) NOT NULL,
  `prize_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `prize_payload` json DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_c3527163139b72fcccde2b69f8` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `matrices`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `matrices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL,
  `round` int NOT NULL DEFAULT '1',
  `status` tinyint NOT NULL DEFAULT '1',
  `filled_count` int NOT NULL DEFAULT '0',
  `claimable_income` decimal(16,8) NOT NULL DEFAULT '0.00000000',
  `next_round_fund` decimal(16,8) NOT NULL DEFAULT '0.00000000',
  `start_fund` decimal(16,8) NOT NULL DEFAULT '0.00000000',
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `matrix_incomes`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `matrix_incomes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL,
  `matrix_id` int NOT NULL,
  `slot_number` tinyint NOT NULL,
  `from_user_id` int NOT NULL,
  `amount` decimal(16,8) NOT NULL,
  `income_type` varchar(20) NOT NULL,
  `is_claimed` tinyint NOT NULL DEFAULT '0',
  `claimed_at` datetime DEFAULT NULL,
  `description` varchar(200) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `matrix_slots`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `matrix_slots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `matrix_id` int NOT NULL,
  `slot_number` tinyint NOT NULL,
  `user_id` int NOT NULL,
  `is_new_user` tinyint NOT NULL DEFAULT '1',
  `income_amount` decimal(16,8) NOT NULL DEFAULT '0.00000000',
  `income_type` varchar(20) NOT NULL DEFAULT 'none',
  `remaining_fund` decimal(16,8) NOT NULL DEFAULT '0.00000000',
  `reentry_count` int NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `is_direct` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `meeting_bans`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `meeting_bans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `meeting_id` int NOT NULL,
  `user_id` int NOT NULL,
  `banned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_a39ffed67c46f966691d153116` (`meeting_id`,`user_id`),
  KEY `IDX_afafbf6889920b9a46f9188846` (`meeting_id`),
  KEY `IDX_6346aff044828e5ffcd821fcdf` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `meeting_participants`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `meeting_participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `meeting_id` int NOT NULL,
  `user_id` int NOT NULL,
  `joined_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `left_at` datetime DEFAULT NULL,
  `is_kicked` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_1bb0b6aa22bca1e77bfcafb6c3` (`meeting_id`,`user_id`),
  KEY `IDX_4d2e803caeb25541cc89f2efa5` (`meeting_id`),
  KEY `IDX_4743681bb404d50f8000e2a822` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `meetings`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `meetings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `creator_id` int NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1进行中 2已结束',
  `started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at` datetime DEFAULT NULL,
  `recording_url` varchar(500) DEFAULT NULL,
  `title` varchar(200) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_b8d9171573c66a49ad9f648605` (`group_id`),
  KEY `IDX_6dc78980c5e143fa076c98b093` (`creator_id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `messages`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `conversation_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `content` text NOT NULL,
  `msg_type` tinyint NOT NULL COMMENT '1文字 2语音 3系统消息 4图片',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1已发送 2已读',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_3bc55a7c3f9ed54b520bb5cfe2` (`conversation_id`),
  KEY `IDX_22133395bd13b970ccd0c34ab2` (`sender_id`),
  KEY `idx_messages_conversation` (`conversation_id`),
  KEY `idx_messages_sender` (`sender_id`)
) ENGINE=InnoDB AUTO_INCREMENT=279 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `offline_messages`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `offline_messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `message_id` bigint NOT NULL,
  `is_pushed` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_3bf91dfce04944007751b71e82` (`user_id`),
  KEY `idx_offline_messages_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=373 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `password_reset_requests`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `password_reset_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `account` varchar(50) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0待处理 1已重置 2已拒绝',
  `new_password` varchar(50) DEFAULT NULL,
  `operator_id` int DEFAULT NULL,
  `handled_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_password_reset_status` (`status`),
  KEY `idx_password_reset_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `point_returns`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `point_returns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `week_start` date NOT NULL,
  `total_consumed` decimal(12,2) NOT NULL,
  `return_total` decimal(12,2) NOT NULL COMMENT '应返还总额（消耗×1.5）',
  `returned_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `daily_return` decimal(12,2) NOT NULL,
  `return_start_date` date NOT NULL COMMENT '返还开始日期（下周一）',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0进行中 1已完成',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_68455ffa667c68fd8826f47b03` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `point_synthesis`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `point_synthesis` (
  `id` int NOT NULL AUTO_INCREMENT,
  `consume_points` decimal(12,2) NOT NULL,
  `target_currency` varchar(20) NOT NULL,
  `target_amount` decimal(12,2) NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1启用 0禁用',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `push_devices`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `push_devices` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `platform` varchar(20) NOT NULL DEFAULT 'android',
  `vendor` varchar(32) NOT NULL,
  `device_token` varchar(512) NOT NULL,
  `device_id` varchar(128) DEFAULT NULL,
  `manufacturer` varchar(64) DEFAULT NULL,
  `model` varchar(128) DEFAULT NULL,
  `app_version` varchar(32) DEFAULT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `last_registered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_1115c6cce0db58dc332cbd0f5d` (`vendor`,`device_token`),
  UNIQUE KEY `uk_push_devices_vendor_token` (`vendor`,`device_token`),
  KEY `IDX_80fd9275e4f18bf43e5b7008a1` (`user_id`),
  KEY `IDX_841fe42a4994dc08005f7f9711` (`vendor`),
  KEY `idx_push_devices_user` (`user_id`),
  KEY `idx_push_devices_user_enabled` (`user_id`,`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `recharge_orders`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `recharge_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `real_name` varchar(50) NOT NULL COMMENT '付款人姓名',
  `phone` varchar(20) NOT NULL COMMENT '接收激活码的手机号',
  `amount` decimal(10,2) DEFAULT NULL COMMENT '充值金额（选填）',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0待核实 1已发码 2已驳回',
  `admin_remark` varchar(200) DEFAULT NULL COMMENT '管理员备注',
  `operator_id` int DEFAULT NULL COMMENT '处理的管理员ID',
  `handled_at` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `package_name` varchar(50) DEFAULT NULL COMMENT '套餐/档位（选填）',
  PRIMARY KEY (`id`),
  KEY `IDX_c7b0618f961adb2eabfb1cb4d2` (`user_id`),
  KEY `IDX_38d502013d32370535ad38de1c` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `service_notifications`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `service_notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recipient_id` int NOT NULL COMMENT '接收方用户ID（通常是管理员）',
  `type` varchar(30) NOT NULL COMMENT '类型：withdrawal/group/recharge 等',
  `title` varchar(100) NOT NULL COMMENT '通知标题',
  `content` text NOT NULL COMMENT '通知正文',
  `from_user_id` int DEFAULT NULL COMMENT '触发该通知的用户ID',
  `payload_json` text COMMENT '附带业务数据（JSON字符串）',
  `is_read` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_6c27445167f6f3c5fc7c22e02d` (`recipient_id`),
  KEY `idx_service_notifications_recipient` (`recipient_id`),
  KEY `idx_service_notifications_recipient_read` (`recipient_id`,`is_read`),
  KEY `idx_service_notifications_type` (`type`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `snake_saves`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `snake_saves` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `game_id` int NOT NULL,
  `save_data` json NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_snake_saves_user_game` (`user_id`,`game_id`),
  KEY `IDX_d28f715c89585ed017cf2e419b` (`user_id`),
  KEY `IDX_f92930a77bc33565931d2a6e96` (`game_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `system_configs`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `system_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_key` varchar(50) NOT NULL,
  `config_name` varchar(50) NOT NULL COMMENT '配置名称',
  `config_value` varchar(200) NOT NULL COMMENT '配置值',
  `description` varchar(200) NOT NULL DEFAULT '' COMMENT '配置说明',
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_8430d4ebdc1faef3d3eeef36e8` (`config_key`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `system_switches`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `system_switches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `feature_key` varchar(50) NOT NULL COMMENT 'login/register/game_battle/game_horse等',
  `feature_name` varchar(50) NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1正常 0禁用',
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_381fd6c5d0efa25f156bbb3ce1` (`feature_key`)
) ENGINE=InnoDB AUTO_INCREMENT=656 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_activities`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_activities` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` varchar(50) NOT NULL,
  `log_content` text NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_a283f37e08edf5e37d38b375ee` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_currencies`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_currencies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `points` decimal(18,6) NOT NULL DEFAULT '0.000000' COMMENT '普通积分余额，支持每周返还的小数积分',
  `gold` decimal(12,2) NOT NULL DEFAULT '0.00',
  `silver` decimal(12,2) NOT NULL DEFAULT '0.00',
  `special_points_tier1` decimal(12,2) NOT NULL DEFAULT '0.00',
  `special_points_tier2` decimal(12,2) NOT NULL DEFAULT '0.00',
  `special_points_tier3` decimal(12,2) NOT NULL DEFAULT '0.00',
  `special_points_count` tinyint NOT NULL DEFAULT '0' COMMENT '已发放特殊积分次数（最多3）',
  `reward_points` decimal(12,2) NOT NULL DEFAULT '0.00',
  `invite_points` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '邀请积分',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_ae28338bb1a6f774d5243d6d01` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_settings`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `notification_enabled` tinyint NOT NULL DEFAULT '1' COMMENT '消息提醒总开关',
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `notification_sound` tinyint NOT NULL DEFAULT '1' COMMENT '新消息声音提醒',
  `notification_popup` tinyint NOT NULL DEFAULT '1' COMMENT '新消息弹窗提醒（后台时）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_4ed056b9344e6f7d8d46ec4b30` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nickname` varchar(20) DEFAULT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1正常 2删除 3禁用',
  `user_type` tinyint NOT NULL DEFAULT '1' COMMENT '1普通 2运营',
  `invite_code` varchar(20) DEFAULT NULL,
  `invited_by` int DEFAULT NULL,
  `is_activated` tinyint NOT NULL DEFAULT '0',
  `shares` int NOT NULL DEFAULT '0',
  `remark` varchar(200) DEFAULT NULL,
  `register_ip` varchar(50) DEFAULT NULL,
  `login_ip` varchar(50) DEFAULT NULL,
  `register_time` datetime DEFAULT NULL,
  `login_time` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_dd44b05034165835d6dcc18d68` (`account`),
  UNIQUE KEY `IDX_a19e76921d5f8829d706a93102` (`invite_code`),
  KEY `IDX_d2dbc280ebc69071c0846c8701` (`invited_by`)
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `weekly_point_return_accounts`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `weekly_point_return_accounts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `period_id` bigint NOT NULL COMMENT '关联weekly_point_return_periods.id',
  `user_id` int NOT NULL COMMENT '用户ID，每个用户单独统计和返还',
  `eligible_consumed_points` decimal(18,6) NOT NULL DEFAULT '0.000000' COMMENT '本用户本周可返还的消费积分总额：普通积分负数流水取绝对值，排除指定log_type',
  `excluded_consumed_points` decimal(18,6) NOT NULL DEFAULT '0.000000' COMMENT '本用户本周被排除的消费积分总额：普通建群、普通群员发起视频会议等',
  `remaining_base_points` decimal(18,6) NOT NULL DEFAULT '0.000000' COMMENT '每日递减后的剩余返还基数，发一天就减去当天已返还积分',
  `total_returned_points` decimal(18,6) NOT NULL DEFAULT '0.000000' COMMENT '本周期已实际返还积分总额',
  `paid_days` tinyint NOT NULL DEFAULT '0' COMMENT '已发放天数，最多7天',
  `multiplier` decimal(10,6) NOT NULL COMMENT '本用户本周期使用的独立积分返还倍率快照',
  `daily_rate` decimal(10,6) NOT NULL COMMENT '本用户本周期使用的每日返还比例快照',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0返还中 1已返还7天 2无可返还消费/跳过',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_weekly_return_account_user` (`period_id`,`user_id`),
  KEY `idx_weekly_return_account_user` (`user_id`),
  KEY `idx_weekly_return_account_status` (`period_id`,`status`,`paid_days`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='每周积分返还用户汇总表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `weekly_point_return_daily_records`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `weekly_point_return_daily_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `period_id` bigint NOT NULL COMMENT '关联weekly_point_return_periods.id',
  `account_id` bigint NOT NULL COMMENT '关联weekly_point_return_accounts.id',
  `user_id` int NOT NULL COMMENT '用户ID',
  `return_date` date NOT NULL COMMENT '实际返还日期，周一到周日，每用户每天一条',
  `day_index` tinyint NOT NULL COMMENT '返还第几天，1周一，7周日',
  `base_before_return` decimal(18,6) NOT NULL COMMENT '当天返还前的剩余基数',
  `multiplier` decimal(10,6) NOT NULL COMMENT '当天使用的独立积分返还倍率',
  `daily_rate` decimal(10,6) NOT NULL COMMENT '当天使用的每日返还比例',
  `return_amount` decimal(18,6) NOT NULL COMMENT '当天返还积分=返还前剩余基数*返还倍率*每日返还比例',
  `base_after_return` decimal(18,6) NOT NULL COMMENT '当天返还后的剩余基数',
  `currency_log_id` bigint DEFAULT NULL COMMENT '对应currency_logs.id，便于追流水',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1发放成功 2跳过',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_weekly_return_daily_account_date` (`account_id`,`return_date`),
  KEY `idx_weekly_return_daily_user` (`user_id`,`return_date`),
  KEY `idx_weekly_return_daily_period` (`period_id`,`day_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='每周积分返还每日发放明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `weekly_point_return_periods`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `weekly_point_return_periods` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `week_start_date` date NOT NULL COMMENT '消费统计周开始日期，周一，统计从当天00:00:01开始',
  `week_end_date` date NOT NULL COMMENT '消费统计周结束日期，周日，统计到当天23:59:59结束',
  `week_start_at` datetime NOT NULL COMMENT '本周实际可返还消费统计开始时间，首个上线周可能为功能上线时间',
  `week_end_at` datetime NOT NULL COMMENT '本周可返还消费统计截止时间，周日23:59:59',
  `settlement_started_at` datetime NOT NULL COMMENT '周结算生成时间，正常为周日23:59:59',
  `multiplier` decimal(10,6) NOT NULL COMMENT '返还倍率，来自system_configs.weekly_point_return_multiplier，默认1.5',
  `daily_rate` decimal(10,6) NOT NULL DEFAULT '0.010000' COMMENT '每日返还比例，0.01表示1%',
  `excluded_log_types` varchar(255) NOT NULL COMMENT '排除的消费流水类型，逗号分隔，如group_create,meeting_start',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0返还中 1已完成 2已跳过',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_weekly_return_period_week_start` (`week_start_date`),
  KEY `idx_weekly_return_period_status` (`status`),
  KEY `idx_weekly_return_period_week_end` (`week_end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='每周积分返还结算周期表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `withdraw_securities`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `withdraw_securities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `phone` varchar(20) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_withdraw_security_user_id` (`user_id`),
  KEY `idx_withdraw_security_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `withdrawals`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `withdrawals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `content` text COMMENT '备注信息',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0待审核 1通过 2驳回',
  `review_time` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `payment_method` varchar(20) NOT NULL DEFAULT 'alipay' COMMENT 'alipay/bank',
  `account_name` varchar(50) DEFAULT NULL COMMENT '收款人姓名',
  `account_number` varchar(50) DEFAULT NULL COMMENT '收款账号（支付宝账号或银行卡号）',
  PRIMARY KEY (`id`),
  KEY `IDX_0bd35ddb3acfb323ae3e024d2f` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'competitive_game'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-13  1:56:29
