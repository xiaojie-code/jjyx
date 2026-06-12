-- MySQL dump 10.13  Distrib 8.4.8, for Win64 (x86_64)
--
-- Host: localhost    Database: killer_game
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
-- Table structure for table `wa_admin_roles`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `wa_admin_roles` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键',
  `role_id` int NOT NULL COMMENT '角色id',
  `admin_id` int NOT NULL COMMENT '管理员id',
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_admin_id` (`role_id`,`admin_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='管理员角色表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wa_admins`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `wa_admins` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `username` varchar(32) NOT NULL COMMENT '用户名',
  `nickname` varchar(40) NOT NULL COMMENT '昵称',
  `password` varchar(255) NOT NULL COMMENT '密码',
  `avatar` varchar(255) DEFAULT '/app/admin/avatar.png' COMMENT '头像',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `mobile` varchar(16) DEFAULT NULL COMMENT '手机',
  `created_at` datetime DEFAULT NULL COMMENT '创建时间',
  `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
  `login_at` datetime DEFAULT NULL COMMENT '登录时间',
  `status` tinyint DEFAULT NULL COMMENT '禁用',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='管理员表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wa_charge_rules`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `wa_charge_rules` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键',
  `money` decimal(10,2) DEFAULT NULL COMMENT '金额',
  `score` int DEFAULT NULL COMMENT '金币',
  `give` int DEFAULT NULL COMMENT '赠送金币',
  `status` int DEFAULT NULL COMMENT '开关',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='充值规则';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wa_charge_user`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `wa_charge_user` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键',
  `uid` int DEFAULT NULL COMMENT '用户ID',
  `money` decimal(10,2) DEFAULT NULL COMMENT '充值金额',
  `coin` int DEFAULT NULL COMMENT '购买金币',
  `give` int DEFAULT NULL COMMENT '赠送金币',
  `orderno` varchar(200) DEFAULT NULL COMMENT '订单号',
  `payno` varchar(200) DEFAULT NULL COMMENT '三方订单号',
  `paytype` int DEFAULT NULL COMMENT '支付方式',
  `status` int DEFAULT NULL COMMENT '状态',
  `addtime` datetime DEFAULT NULL COMMENT '时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户充值';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wa_killer_record`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `wa_killer_record` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键',
  `samllroomid` int DEFAULT NULL COMMENT '杀手前往小房间ID',
  `roomname` varchar(200) DEFAULT NULL COMMENT '房间名称',
  `expect` varchar(100) DEFAULT NULL COMMENT '期号',
  `addtime` datetime DEFAULT NULL COMMENT '时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4996 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='杀手记录';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wa_options`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `wa_options` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT '键',
  `value` longtext NOT NULL COMMENT '值',
  `created_at` datetime NOT NULL DEFAULT '2022-08-15 00:00:00' COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT '2022-08-15 00:00:00' COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='选项表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wa_roles`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `wa_roles` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` varchar(80) NOT NULL COMMENT '角色组',
  `rules` text COMMENT '权限',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  `pid` int unsigned DEFAULT NULL COMMENT '父级',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='管理员角色';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wa_rooms`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `wa_rooms` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键',
  `roomname` varchar(200) NOT NULL COMMENT '房间名称',
  `minprice` varchar(10) NOT NULL DEFAULT '0' COMMENT '最低金币进入限制',
  `status` int NOT NULL DEFAULT '0' COMMENT '开启状态',
  `maxuser` int DEFAULT '0' COMMENT '最大人数',
  `robotuser` int DEFAULT NULL COMMENT '机器人数量',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='房间管理';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wa_rules`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `wa_rules` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `title` varchar(255) NOT NULL COMMENT '标题',
  `icon` varchar(255) DEFAULT NULL COMMENT '图标',
  `key` varchar(255) NOT NULL COMMENT '标识',
  `pid` int unsigned DEFAULT '0' COMMENT '上级菜单',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  `href` varchar(255) DEFAULT NULL COMMENT 'url',
  `type` int NOT NULL DEFAULT '1' COMMENT '类型',
  `weight` int DEFAULT '0' COMMENT '排序',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=159 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='权限规则';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wa_touzhu`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `wa_touzhu` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键',
  `uid` int NOT NULL COMMENT '用户ID',
  `expect` varchar(100) NOT NULL COMMENT '期号',
  `tzid` int NOT NULL COMMENT '投注ID(小房间号)',
  `tzname` varchar(255) NOT NULL COMMENT '投注名称',
  `coin` int NOT NULL COMMENT '投注金额',
  `addtime` datetime NOT NULL COMMENT '时间',
  `resultid` int NOT NULL DEFAULT '0' COMMENT '杀手去了哪个房间ID',
  `resultname` varchar(100) DEFAULT NULL COMMENT '杀手去了房间的名字',
  `status` int NOT NULL COMMENT '状态0未开；1中奖；2未中奖',
  `rewards` int NOT NULL DEFAULT '0' COMMENT '奖金数量',
  `roomid` int DEFAULT NULL COMMENT '房间号',
  `isrobot` int NOT NULL DEFAULT '0' COMMENT '是否机器人投注0否；1是',
  `mode` varchar(16) NOT NULL DEFAULT 'ai',
  `ifyouxiao` int NOT NULL DEFAULT '1' COMMENT '是否有效：1有效；0换房间撤单',
  PRIMARY KEY (`id`),
  KEY `期号` (`expect`),
  KEY `用户id` (`uid`),
  KEY `idx_killer_active_bet_lookup` (`expect`,`mode`,`roomid`,`uid`,`status`,`ifyouxiao`)
) ENGINE=InnoDB AUTO_INCREMENT=173079 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户投注';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wa_uploads`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `wa_uploads` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` varchar(128) NOT NULL COMMENT '名称',
  `url` varchar(255) NOT NULL COMMENT '文件',
  `admin_id` int DEFAULT NULL COMMENT '管理员',
  `file_size` int NOT NULL COMMENT '文件大小',
  `mime_type` varchar(255) NOT NULL COMMENT 'mime类型',
  `image_width` int DEFAULT NULL COMMENT '图片宽度',
  `image_height` int DEFAULT NULL COMMENT '图片高度',
  `ext` varchar(128) NOT NULL COMMENT '扩展名',
  `storage` varchar(255) NOT NULL DEFAULT 'local' COMMENT '存储位置',
  `created_at` date DEFAULT NULL COMMENT '上传时间',
  `category` varchar(128) DEFAULT NULL COMMENT '类别',
  `updated_at` date DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `category` (`category`),
  KEY `admin_id` (`admin_id`),
  KEY `name` (`name`),
  KEY `ext` (`ext`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='附件';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wa_usercoin_record`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `wa_usercoin_record` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键',
  `uid` int NOT NULL COMMENT '用户ID',
  `coin` int NOT NULL COMMENT '金币数量',
  `type` int NOT NULL DEFAULT '0' COMMENT '0支出/1收入',
  `remark` varchar(255) NOT NULL COMMENT '备注',
  `addtime` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=656 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='金币记录';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wa_users`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `wa_users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `username` varchar(32) NOT NULL COMMENT '用户名',
  `nickname` varchar(40) NOT NULL COMMENT '昵称',
  `password` varchar(255) NOT NULL COMMENT '密码',
  `sex` enum('0','1') NOT NULL DEFAULT '1' COMMENT '性别',
  `avatar` varchar(255) DEFAULT NULL COMMENT '头像',
  `email` varchar(128) DEFAULT NULL COMMENT '邮箱',
  `mobile` varchar(16) DEFAULT NULL COMMENT '手机',
  `level` tinyint NOT NULL DEFAULT '0' COMMENT '等级',
  `birthday` date DEFAULT NULL COMMENT '生日',
  `money` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '余额(元)',
  `score` int NOT NULL DEFAULT '0' COMMENT '积分',
  `last_time` datetime DEFAULT NULL COMMENT '登录时间',
  `last_ip` varchar(50) DEFAULT NULL COMMENT '登录ip',
  `join_time` datetime DEFAULT NULL COMMENT '注册时间',
  `join_ip` varchar(50) DEFAULT NULL COMMENT '注册ip',
  `token` varchar(50) DEFAULT NULL COMMENT 'token',
  `created_at` datetime DEFAULT NULL COMMENT '创建时间',
  `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
  `role` int NOT NULL DEFAULT '1' COMMENT '角色',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '禁用',
  `roomid` int DEFAULT '0' COMMENT '所在房间',
  `isrobot` int DEFAULT '0' COMMENT '是否机器人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `join_time` (`join_time`),
  KEY `mobile` (`mobile`),
  KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wa_withdraw`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `wa_withdraw` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键',
  `uid` int NOT NULL COMMENT '用户ID',
  `money` decimal(10,2) NOT NULL COMMENT '提现金额',
  `coin` int NOT NULL COMMENT '兑换金币',
  `commission` decimal(10,2) NOT NULL COMMENT '扣除手续费',
  `alino` varchar(50) NOT NULL COMMENT '支付宝账号',
  `aliname` varchar(30) NOT NULL COMMENT '支付宝姓名',
  `status` int NOT NULL DEFAULT '0' COMMENT '状态',
  `addtime` datetime DEFAULT NULL COMMENT '提现时间',
  `real_money` decimal(10,2) DEFAULT NULL COMMENT '实际到账',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='提现列表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'killer_game'
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
