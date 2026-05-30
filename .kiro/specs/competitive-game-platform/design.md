# 竞技游戏平台 - 技术设计文档

## 一、系统架构

```
┌─────────────────────────────────────────────┐
│                  客户端 (Flutter)              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│  │ 消息  │ │联系人│ │ 游戏  │ │ 我的  │       │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘       │
│     │        │     ┌──┴───┐    │            │
│     │        │     │WebView│    │            │
│     │        │     │(H5游戏)│    │            │
│     │        │     └──┬───┘    │            │
└─────┼────────┼────────┼────────┼────────────┘
      │REST    │REST    │JSBridge│REST
      │WebSocket│       │        │
┌─────┴────────┴────────┴────────┴────────────┐
│              后端服务 (NestJS)                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│  │用户服务│ │IM服务│ │游戏服务│ │经济服务│       │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘       │
│     │        │        │        │            │
│  ┌──┴────────┴────────┴────────┴───┐        │
│  │         MySQL + Redis            │        │
│  └─────────────────────────────────┘        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│           管理端 (Vue3 + Element Plus)        │
│  用户管理 │ 经济管理 │ 游戏管理 │ 分销管理     │
└─────────────────────────────────────────────┘
```

## 二、技术栈详情

| 层 | 技术 | 版本 | 说明 |
|---|---|---|---|
| App端 | Flutter | 3.x | 一套代码出安卓+iOS |
| 后端 | NestJS | 10.x | TypeScript，模块化架构 |
| ORM | TypeORM | 0.3.x | MySQL数据库操作 |
| 缓存 | Redis | 7.x | 会话、在线状态、消息队列 |
| 数据库 | MySQL | 8.x | 主数据存储 |
| 管理端 | Vue3 + Element Plus | 3.x | 后台管理系统 |
| 实时通信 | Socket.IO | 4.x | WebSocket长连接（聊天） |
| 游戏端 | Cocos Creator | 现有 | H5游戏换皮 |
| 文件存储 | OSS/本地 | - | 头像、图片资源 |

## 三、数据库核心表设计

### 用户相关

**users - 用户表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| account | VARCHAR(50) UNIQUE | 账号 |
| password_hash | VARCHAR(255) | 密码哈希 |
| nickname | VARCHAR(20) | 昵称（2-10字） |
| avatar | VARCHAR(500) | 头像URL |
| status | TINYINT | 1正常 2删除 3禁用 |
| user_type | TINYINT | 1普通 2运营 |
| invite_code | VARCHAR(20) UNIQUE | 自己的邀请码 |
| invited_by | INT | 邀请者用户ID |
| is_activated | BOOLEAN | 是否已激活游戏 |
| shares | INT DEFAULT 0 | 持股数 |
| remark | VARCHAR(200) | 后台备注 |
| register_ip | VARCHAR(50) | 注册IP |
| login_ip | VARCHAR(50) | 最近登录IP |
| register_time | DATETIME | 注册时间 |
| login_time | DATETIME | 最近登录时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**user_currencies - 用户货币表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| user_id | INT UNIQUE | 用户ID |
| points | DECIMAL(12,2) DEFAULT 0 | 积分 |
| gold | DECIMAL(12,2) DEFAULT 0 | 金币 |
| silver | DECIMAL(12,2) DEFAULT 0 | 银币 |
| special_points_tier1 | DECIMAL(12,2) DEFAULT 0 | 特殊积分第一档 |
| special_points_tier2 | DECIMAL(12,2) DEFAULT 0 | 特殊积分第二档 |
| special_points_tier3 | DECIMAL(12,2) DEFAULT 0 | 特殊积分第三档 |
| special_points_count | TINYINT DEFAULT 0 | 已发放特殊积分次数（最多3） |
| reward_points | DECIMAL(12,2) DEFAULT 0 | 奖励积分 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**currency_logs - 货币流水表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT | 主键 |
| user_id | INT | 用户ID |
| sn | VARCHAR(50) UNIQUE | 流水号 |
| currency_type | VARCHAR(20) | 货币类型（points/gold/silver/special/reward） |
| amount | DECIMAL(12,2) | 变动数量（正为收入，负为支出） |
| before_balance | DECIMAL(12,2) | 操作前余额 |
| after_balance | DECIMAL(12,2) | 操作后余额 |
| log_type | VARCHAR(50) | 操作类型（game_earn/game_spend/admin_add/withdraw等） |
| description | VARCHAR(200) | 描述 |
| created_at | DATETIME | 创建时间 |

**user_activities - 用户动态表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT | 主键 |
| user_id | INT | 用户ID |
| type | VARCHAR(50) | 动态类型 |
| log_content | TEXT | 动态日志内容 |
| created_at | DATETIME | 创建时间 |

### 社交相关

**friend_requests - 好友申请表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| from_user_id | INT | 申请者ID |
| to_user_id | INT | 被申请者ID |
| status | TINYINT | 0待处理 1已同意 2已拒绝 |
| created_at | DATETIME | 创建时间 |

**friendships - 好友关系表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| user_id | INT | 用户ID |
| friend_id | INT | 好友ID |
| remark | VARCHAR(50) | 备注名（仅自己可见） |
| created_at | DATETIME | 创建时间 |

**conversations - 会话表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| type | TINYINT | 1单聊 2群聊 |
| name | VARCHAR(50) | 群聊名称（单聊为空） |
| creator_id | INT | 创建者ID |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**conversation_members - 会话成员表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| conversation_id | INT | 会话ID |
| user_id | INT | 用户ID |
| role | TINYINT | 1普通成员 2管理员 |
| is_pinned | BOOLEAN DEFAULT FALSE | 是否置顶 |
| unread_count | INT DEFAULT 0 | 未读消息数 |
| joined_at | DATETIME | 加入时间 |

**messages - 消息表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT | 主键 |
| conversation_id | INT | 会话ID |
| sender_id | INT | 发送者ID |
| content | TEXT | 消息内容 |
| msg_type | TINYINT | 1文字 2语音 3系统消息 |
| status | TINYINT | 1已发送 2已读 |
| created_at | DATETIME | 创建时间 |

**offline_messages - 离线消息表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT | 主键 |
| user_id | INT | 接收者ID |
| message_id | BIGINT | 消息ID |
| is_pushed | BOOLEAN DEFAULT FALSE | 是否已推送 |
| created_at | DATETIME | 创建时间 |

### 游戏相关

**games - 游戏表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| name | VARCHAR(50) | 游戏名称 |
| icon | VARCHAR(500) | 游戏图标URL |
| description | VARCHAR(200) | 简短介绍 |
| game_url | VARCHAR(500) | H5游戏地址 |
| entry_cost | DECIMAL(12,2) DEFAULT 0 | 入场消耗积分 |
| status | TINYINT | 1正常 2维护 |
| sort_order | INT DEFAULT 0 | 排序 |
| created_at | DATETIME | 创建时间 |

**game_records - 游戏记录表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT | 主键 |
| user_id | INT | 用户ID |
| game_id | INT | 游戏ID |
| result | VARCHAR(50) | 游戏结果 |
| points_earned | DECIMAL(12,2) DEFAULT 0 | 获得积分 |
| points_spent | DECIMAL(12,2) DEFAULT 0 | 消耗积分 |
| created_at | DATETIME | 创建时间 |

**horse_rooms - 赛马房间表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| status | TINYINT | 1等待中 2进行中 3已结算 |
| horse_count | INT DEFAULT 6 | 马匹数量 |
| winner_horse | INT | 获胜马号 |
| total_pool | DECIMAL(12,2) DEFAULT 0 | 总奖池 |
| created_at | DATETIME | 创建时间 |
| settled_at | DATETIME | 结算时间 |

**horse_bets - 赛马投注表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| room_id | INT | 房间ID |
| user_id | INT | 用户ID |
| horse_number | INT | 投注马号 |
| bet_amount | DECIMAL(12,2) | 投注金额 |
| reward_amount | DECIMAL(12,2) DEFAULT 0 | 奖励金额 |
| created_at | DATETIME | 创建时间 |

### 经济相关

**withdrawals - 提现申请表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| user_id | INT | 用户ID |
| amount | DECIMAL(12,2) | 提现积分数额 |
| content | TEXT | 提现文本内容 |
| status | TINYINT | 0待审核 1通过 2驳回 |
| review_time | DATETIME | 审核时间 |
| created_at | DATETIME | 申请时间 |

**point_returns - 积分返还表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| user_id | INT | 用户ID |
| week_start | DATE | 消耗所在周 |
| total_consumed | DECIMAL(12,2) | 当周总消耗积分 |
| return_total | DECIMAL(12,2) | 应返还总额（消耗×1.5） |
| returned_amount | DECIMAL(12,2) DEFAULT 0 | 已返还金额 |
| daily_return | DECIMAL(12,2) | 每天返还金额 |
| return_start_date | DATE | 返还开始日期（下周一） |
| status | TINYINT | 0进行中 1已完成 |
| created_at | DATETIME | 创建时间 |

**point_synthesis - 积分合成配置表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| consume_points | DECIMAL(12,2) | 消耗积分数量 |
| target_currency | VARCHAR(20) | 目标货币类型 |
| target_amount | DECIMAL(12,2) | 获得数量 |
| status | TINYINT | 1启用 0禁用 |

### 运营相关

**cdk_types - CDK类型表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| name | VARCHAR(50) | 类型名称 |
| description | VARCHAR(200) | 类型描述 |
| created_at | DATETIME | 创建时间 |

**cdks - CDK表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| code | VARCHAR(50) UNIQUE | 兑换码 |
| cdk_type_id | INT | CDK类型ID |
| items_json | JSON | 奖励物品配置 [{"item":"points","amount":100}] |
| status | TINYINT | 0未使用 1已使用 |
| used_by | INT | 使用者用户ID |
| used_at | DATETIME | 使用时间 |
| created_at | DATETIME | 创建时间 |

**lottery_config - 转盘配置表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| slot_index | INT | 格子序号 |
| prize_name | VARCHAR(50) | 奖品名称 |
| prize_type | VARCHAR(20) | 奖品类型（points/gold/item等） |
| prize_amount | DECIMAL(12,2) | 奖品数量 |
| probability | DECIMAL(5,4) | 中奖概率（0-1） |
| cost_type | VARCHAR(20) | 消耗货币类型 |
| cost_amount | DECIMAL(12,2) | 消耗数量 |

**backpack_items - 背包物品表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| user_id | INT | 用户ID |
| item_type | VARCHAR(50) | 物品类型 |
| item_const_id | INT | 物品常量ID |
| quantity | INT DEFAULT 1 | 物品数量 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**item_configs - 物品配置表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| name | VARCHAR(50) | 物品名称 |
| type | VARCHAR(50) | 物品类型 |
| description | VARCHAR(200) | 物品描述 |
| icon | VARCHAR(500) | 物品图标URL |

**system_switches - 功能开关表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| feature_key | VARCHAR(50) UNIQUE | 功能标识（login/register/game_battle/game_horse等） |
| feature_name | VARCHAR(50) | 功能名称 |
| status | TINYINT | 1正常 0禁用 |
| updated_at | DATETIME | 更新时间 |

### 分销相关

**agents - 代理表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| user_id | INT UNIQUE | 用户ID |
| phone | VARCHAR(20) | 手机号 |
| level | VARCHAR(20) | 阶级 |
| remark | VARCHAR(200) | 备注 |
| points_earned | DECIMAL(12,2) DEFAULT 0 | 积分收益 |
| points_consumed | DECIMAL(12,2) DEFAULT 0 | 积分消耗 |
| created_at | DATETIME | 创建时间 |

**invite_rewards - 邀请奖励记录表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT | 主键 |
| inviter_id | INT | 邀请者ID |
| invitee_id | INT | 被邀请者ID |
| reward_type | VARCHAR(20) | 奖励类型 |
| reward_amount | DECIMAL(12,2) | 奖励数量 |
| trigger_type | VARCHAR(50) | 触发类型（invite_register/invitee_consume） |
| created_at | DATETIME | 创建时间 |

## 四、核心接口设计

### 用户服务 /api/auth
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /register | 注册（account, password, invite_code?） |
| POST | /login | 登录（account, password） |
| PUT | /profile/avatar | 更换头像（multipart/form-data） |
| PUT | /profile/nickname | 修改昵称（nickname） |
| POST | /activate | CDK激活（code） |
| GET | /me | 获取当前用户信息 |

### 货币服务 /api/currency
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /balance | 获取货币余额 |
| GET | /logs | 货币明细（currency_type, page, size） |
| POST | /synthesize | 积分合成 |
| POST | /withdraw | 提现申请（amount, content） |

### 社交服务 /api/social
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /contacts | 联系人列表 |
| POST | /contacts/request | 发送好友申请 |
| PUT | /contacts/request/:id | 处理好友申请（accept/reject） |
| PUT | /contacts/:id/remark | 修改备注 |
| DELETE | /contacts/:id | 删除联系人 |
| GET | /contacts/search | 搜索联系人（keyword） |
| POST | /groups | 创建群聊 |
| PUT | /groups/:id | 编辑群聊 |
| DELETE | /groups/:id | 解散群聊 |
| GET | /groups/:id/members | 获取群成员列表 |
| POST | /groups/:id/members | 添加群成员 |
| DELETE | /groups/:id/members/:uid | 移除群成员 |
| GET | /conversations | 会话列表 |
| GET | /conversations/:id/messages | 历史消息（分页） |
| DELETE | /messages/:id | 删除单条消息 |
| DELETE | /conversations/:id/messages | 清空会话消息 |
| GET | /messages/search | 搜索聊天记录（keyword） |

### WebSocket事件协议
| 事件 | 方向 | 数据 | 说明 |
|------|------|------|------|
| message:send | C→S | {conversationId, content, msgType} | 发送消息 |
| message:receive | S→C | {id, conversationId, senderId, content, msgType, createdAt} | 接收消息 |
| message:read | C→S | {conversationId, messageId} | 标记已读 |
| message:status | S→C | {messageId, status} | 消息状态更新（已读） |
| user:online | S→C | {userId} | 用户上线通知 |
| user:offline | S→C | {userId} | 用户离线通知 |
| typing:start | C→S | {conversationId} | 正在输入 |
| typing:stop | C→S | {conversationId} | 停止输入 |

### 游戏服务 /api/game
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /list | 游戏列表 |
| GET | /:id | 游戏详情 |
| POST | /:id/start | 启动游戏（检查激活+扣入场费） |
| POST | /:id/settle | 游戏结算回调（发积分+物品） |
| POST | /horse/room/create | 创建赛马房间 |
| POST | /horse/room/join | 加入赛马房间 |
| POST | /horse/bet | 赛马投注 |
| POST | /horse/start | 开始赛马 |
| POST | /horse/settle | 赛马结算 |
| GET | /horse/room/:id | 赛马房间详情 |
| POST | /lottery/spin | 转盘抽奖 |
| GET | /lottery/config | 获取转盘配置 |

### 背包服务 /api/backpack
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /items | 背包物品列表 |
| GET | /items/:id | 物品详情 |

### 管理端 /api/admin

**用户管理**
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /users | 用户列表（搜索、分页） |
| GET | /users/:id | 用户详情 |
| PUT | /users/:id | 编辑用户 |
| PUT | /users/:id/status | 启用/封禁 |
| POST | /users/:id/currency | 添加货币 |
| GET | /users/:id/logs | 用户流水 |
| GET | /users/:id/activities | 用户动态 |
| GET | /users/:id/backpack | 用户背包 |

**功能管理**
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /switches | 功能开关列表 |
| PUT | /switches/:id | 修改功能状态 |

**转盘管理**
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /lottery | 转盘配置列表 |
| POST | /lottery | 新增转盘格子 |
| PUT | /lottery/:id | 编辑转盘格子 |
| DELETE | /lottery/:id | 删除转盘格子 |

**CDK管理**
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /cdk/generate | 批量生成CDK |
| GET | /cdk/list | CDK列表（状态/时间筛选） |
| GET | /cdk/types | CDK类型列表 |
| POST | /cdk/types | 新增CDK类型 |
| PUT | /cdk/types/:id | 编辑CDK类型 |

**提现管理**
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /withdrawals | 提现列表（日期查询） |
| PUT | /withdrawals/:id | 审核提现（approve/reject） |

**分销管理**
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /agents | 代理列表 |
| GET | /agents/:id | 代理详情 |
| GET | /agents/:id/users | 代理旗下用户 |
| GET | /agents/users | 普通用户列表 |

## 五、JSBridge通信协议

App与H5游戏之间通过JSBridge通信，统一协议格式：

### App → H5

```json
// 初始化用户信息（进入游戏时调用）
{
  "action": "init",
  "data": {
    "token": "jwt_token",
    "userId": 123,
    "nickname": "用户XXX",
    "avatar": "https://xxx/avatar.jpg",
    "points": 5000
  }
}

// 扣除积分结果
{
  "action": "deductPointsResult",
  "data": { "success": true, "balance": 4900 }
}

// 购买皮肤结果
{
  "action": "buySkinResult",
  "data": { "success": true, "skinId": "skin_001" }
}
```

### H5 → App

```json
// 请求扣除积分
{
  "action": "deductPoints",
  "data": { "amount": 100, "reason": "购买道具" }
}

// 游戏结算
{
  "action": "gameSettle",
  "data": {
    "gameId": "snake",
    "rank": 1,
    "pointsEarned": 200,
    "items": [{ "itemConstId": 101, "quantity": 1 }]
  }
}

// 购买皮肤
{
  "action": "buySkin",
  "data": { "skinId": "skin_001", "cost": 50 }
}

// 退出游戏
{ "action": "exitGame" }

// 获取最新积分
{ "action": "getBalance" }
```

## 六、赛马联机结算算法

```
输入：
  - winner_horse: 获胜马号
  - bets: 所有投注记录 [{user_id, horse_number, bet_amount}]

处理：
  1. winner_bets = 筛选投注winner_horse的记录
  2. loser_bets = 筛选投注非winner_horse的记录
  3. loser_total = sum(loser_bets.bet_amount)  // 败方总投入
  4. winner_total = sum(winner_bets.bet_amount)  // 胜方总投入

  对每个胜方玩家：
    ratio = player.bet_amount / winner_total
    reward = loser_total * ratio  // 按投入比例分配败方总积分
    final = player.bet_amount + reward  // 返还本金 + 奖励

  对每个败方玩家：
    扣除 bet_amount（已在投注时扣除）
```

## 七、定时任务

| 任务 | Cron表达式 | 说明 |
|------|-----------|------|
| 奖励积分每日产出 | 0 0 0 * * * | 每天0:00，按三档位公式计算并发放到reward_points |
| 积分返还 | 0 0 1 * * * | 每天1:00，检查进行中的返还记录，发放当日份额 |
| 离线消息清理 | 0 0 3 * * * | 每天3:00，清理已推送超过7天的离线消息 |
| 在线状态同步 | */30 * * * * * | 每30秒，清理超时未心跳的在线用户 |

### 奖励积分产出公式
```
每天每档位产出 = (档位积分 × 30%) / 365

示例：
  tier1 = 1000, tier2 = 100, tier3 = 200
  每天产出 = (1000×0.3/365) + (100×0.3/365) + (200×0.3/365)
           = 0.822 + 0.082 + 0.164
           = 1.068 奖励积分/天
```

### 积分返还逻辑
```
每周日统计当周总消耗积分
返还总额 = 当周总消耗 × 1.5
从下周一开始，每天返还 = 返还总额 / 7
连续返还7天完成
```

## 八、安全设计

1. 密码存储使用 bcrypt 哈希，不存明文
2. 所有API使用JWT认证，token有效期24小时，支持刷新
3. 管理端API单独鉴权，区分管理员角色
4. 货币操作全部使用数据库事务 + 乐观锁，防止并发问题
5. 赛马结算使用Redis分布式锁，防止重复结算
6. 游戏结算回调需验证签名，防止伪造请求
7. CDK生成使用 UUID + 随机码，数据库唯一索引防重复
8. 敏感词过滤采用双层方案：
   - 第一层：本地 `mint-filter`（npm包）+ 自定义词库，用于聊天消息等高频场景（毫秒级响应）
   - 第二层：百度内容审核API（免费5万次/天），用于昵称修改等低频场景（深度检测）
   - 词库存数据库，可通过后台管理维护更新

9. 接口限流：登录接口5次/分钟，普通接口60次/分钟
10. 所有用户输入做XSS过滤和SQL注入防护

## 九、部署架构

```
┌──────────────┐     ┌──────────────┐
│   Nginx       │────│  静态资源/OSS  │
│  (反向代理)    │     │  (头像/图片)   │
└──────┬───────┘     └──────────────┘
       │
┌──────┴───────┐
│  NestJS 服务  │──── Redis (缓存/会话/消息队列)
│  (API+WS)    │
└──────┬───────┘
       │
┌──────┴───────┐
│    MySQL      │
│  (主数据库)    │
└──────────────┘

┌──────────────┐
│  Vue3 管理端   │──── 同一Nginx托管
│  (静态部署)    │
└──────────────┘

┌──────────────┐
│  H5游戏资源    │──── CDN/Nginx托管
│  (Cocos打包)  │
└──────────────┘
```

## 十、关键技术要点总结

1. Flutter使用 `flutter_inappwebview` 加载H5游戏，通过 `evaluateJavascript` 和 `addJavaScriptHandler` 实现JSBridge
2. NestJS使用 `@nestjs/websockets` + Socket.IO 实现IM长连接
3. WebSocket连接使用Redis Pub/Sub，支持后续多实例水平扩展
4. 图片上传支持本地存储和OSS两种模式，通过配置切换
5. 所有货币变动操作封装为统一的 CurrencyService，内部保证事务一致性和流水记录
6. 游戏结算回调使用HMAC签名验证，密钥在App和H5游戏间共享
7. 定时任务使用 `@nestjs/schedule` 的Cron装饰器实现
8. 前端状态管理Flutter用Riverpod，管理端Vue用Pinia
