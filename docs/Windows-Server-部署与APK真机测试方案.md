# Windows Server 部署与 APK 真机测试方案

适用环境：

- 服务器：Windows Server 2025 数据中心版 64 位 中文版
- 配置：8 核 / 16GiB / 10Mbps
- 项目：竞技游戏平台（Flutter App + NestJS 后端 + Vue 管理后台 + H5 游戏）
- 测试目标：把后端、后台、H5 游戏资源部署到服务器，并打包 Android APK 在手机上测试当前所有功能

---

## 1. 总体部署结构

服务器上部署：

| 服务 | 说明 | 端口 |
|------|------|------|
| MySQL 8.x | 业务数据库 | 3306，仅本机访问 |
| Redis | 缓存、业务依赖 | 6379，仅本机访问 |
| NestJS 后端 | API、Socket.IO、上传资源、H5 游戏静态资源 | 3001 |
| 管理后台 | Vue 管理端，建议用 Nginx/IIS 静态托管 | 80 |
| H5 游戏资源 | 放在 `server/uploads/games/`，由后端 `/uploads` 暴露 | 3001 |

手机 APK 访问：

```text
API_BASE_URL=http://服务器公网IP:3001
WS_BASE_URL=http://服务器公网IP:3001
```

测试阶段可以先用公网 IP + HTTP。正式交付建议改成域名 + HTTPS。

---

## 2. 服务器基础准备

### 2.1 安装软件

在 Windows Server 上安装：

1. Node.js 20 LTS
2. MySQL 8.x
3. Redis for Windows / Memurai / 兼容 Redis 的 Windows 版本
4. Nginx for Windows 或 IIS
5. Git，可选
6. PM2，用于守护后端进程

Node 安装后验证：

```powershell
node -v
npm -v
```

安装 PM2：

```powershell
npm.cmd install -g pm2
pm2 -v
```

### 2.2 创建部署目录

建议统一放在：

```text
D:\deploy\jjyx
```

最终目录示例：

```text
D:\deploy\jjyx
├─ app
├─ admin
├─ server
├─ docs
└─ ...
```

### 2.3 开放防火墙端口

Windows 防火墙入站规则放行：

| 端口 | 用途 |
|------|------|
| 3001/tcp | 后端 API、Socket.IO、uploads |
| 80/tcp | 管理后台或下载页 |
| 443/tcp | 后续 HTTPS |

不要开放：

| 端口 | 原因 |
|------|------|
| 3306 | MySQL 不应暴露公网 |
| 6379 | Redis 不应暴露公网 |

---

## 3. 数据库部署

### 3.1 创建数据库

登录 MySQL 后执行：

```sql
CREATE DATABASE IF NOT EXISTS competitive_game
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### 3.2 导入本地数据，可选

如果本地已有测试数据，在本地导出：

```powershell
mysqldump -uroot -p competitive_game > competitive_game.sql
```

上传 `competitive_game.sql` 到服务器后导入：

```powershell
mysql -uroot -p competitive_game < competitive_game.sql
```

### 3.3 检查基础数据

重点确认这些表存在且有必要数据：

- `users`
- `user_currencies`
- `games`
- `system_configs`
- `system_switches`
- `lottery_configs`
- `cdk_types`
- `cdks`

游戏表 `games.game_url` 建议使用相对路径：

```text
/uploads/games/snake/index.html
/uploads/games/fishing/index.html
```

不要写本机路径，也不要写 `localhost`。

---

## 4. Redis 部署

启动 Redis 后验证：

```powershell
redis-cli ping
```

正常返回：

```text
PONG
```

如果 Redis 安装目录不在环境变量中，需要进入 Redis 安装目录执行。

---

## 5. 后端部署

### 5.1 安装依赖

进入后端目录：

```powershell
cd D:\deploy\jjyx\server
npm install
```

### 5.2 配置环境变量

编辑：

```text
D:\deploy\jjyx\server\.env
```

参考配置：

```env
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=你的数据库密码
DB_DATABASE=competitive_game

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

JWT_SECRET=请替换成强随机字符串
JWT_EXPIRES_IN=24h

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

CORS_ORIGIN=*
```

说明：

- 测试阶段可以先用 `NODE_ENV=development`，TypeORM 会自动同步表结构。
- 正式环境不要长期依赖自动同步，应改数据库迁移。
- `JWT_SECRET` 必须换成强随机字符串。
- `.env` 里如有真实第三方 API Key，只保留在服务器本机，不要打包分发。

### 5.3 构建后端

```powershell
npm.cmd run build
```

构建成功后会生成：

```text
server/dist
```

### 5.4 临时启动验证

```powershell
npm.cmd run start:prod
```

浏览器访问：

```text
http://服务器公网IP:3001/api
```

能看到接口响应，说明后端启动成功。

### 5.5 使用 PM2 守护后端

停止临时启动后，执行：

```powershell
cd D:\deploy\jjyx\server
pm2 start dist/main.js --name jjyx-server
pm2 save
```

查看状态：

```powershell
pm2 list
pm2 logs jjyx-server
```

重启后端：

```powershell
pm2 restart jjyx-server
```

如果需要开机自启，可以后续使用 `pm2-windows-startup` 或 NSSM 配置 Windows 服务。

---

## 6. H5 游戏资源部署

### 6.1 确认资源目录

H5 游戏资源应放在：

```text
D:\deploy\jjyx\server\uploads\games
```

示例：

```text
D:\deploy\jjyx\server\uploads\games\snake\index.html
D:\deploy\jjyx\server\uploads\games\fishing\index.html
```

### 6.2 浏览器验证

在服务器浏览器或本地电脑访问：

```text
http://服务器公网IP:3001/uploads/games/snake/index.html
http://服务器公网IP:3001/uploads/games/fishing/index.html
```

如果打不开，检查：

1. 后端是否正在运行。
2. 服务器防火墙是否放行 `3001`。
3. `uploads` 是否位于 `server` 目录下。
4. H5 游戏资源路径大小写是否一致。
5. 游戏资源是否引用了本地绝对路径。

### 6.3 Unity/WebGL 或 Cocos 资源注意事项

当前后端静态资源服务已经处理了常见类型：

- `.js`
- `.json`
- `.css`
- `.png`
- `.jpg`
- `.wasm`
- `.js.gz`
- `.wasm.gz`
- `.data.gz`

如果 H5 游戏加载报资源 MIME 类型错误，优先检查 `server/src/main.ts` 的静态文件响应头配置。

---

## 7. 管理后台部署

### 7.1 安装依赖

```powershell
cd D:\deploy\jjyx\admin
npm install
```

### 7.2 构建后台

```powershell
npm.cmd run build
```

正常输出目录：

```text
D:\deploy\jjyx\admin\dist
```

如果在 Windows 下遇到 Vite/Rollup 路径类构建错误，可先用开发模式临时测试：

```powershell
npm.cmd run dev -- --host 0.0.0.0 --port 3100
```

访问：

```text
http://服务器公网IP:3100
```

### 7.3 使用 Nginx 托管后台

示例 Nginx 配置：

```nginx
server {
    listen 80;
    server_name _;

    root D:/deploy/jjyx/admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3001/uploads/;
    }
}
```

启动或重载 Nginx 后访问：

```text
http://服务器公网IP
```

### 7.4 后台验证

验证项目：

1. 后台登录。
2. 用户列表能加载。
3. 用户详情能打开。
4. CDK 列表能加载。
5. 提现列表能加载。
6. 社交管理能加载。
7. 系统配置能加载。

如果后台接口 404 或网络错误，重点检查：

- Nginx `/api/` 代理是否正确。
- 后端 `3001` 是否正常。
- 后台请求是否仍指向本地 `localhost`。

---

## 8. Android APK 打包

建议在本地开发电脑打包，不建议在服务器打包。

### 8.1 确认 App 接口地址

App 当前支持通过 `dart-define` 注入：

```text
API_BASE_URL
WS_BASE_URL
```

打包时必须指向服务器公网 IP：

```text
http://服务器公网IP:3001
```

### 8.2 Debug APK 打包

进入 App 目录：

```powershell
cd D:\myApp\work_ycykj\jjyx\jjyx\app
```

清理并安装依赖：

```powershell
flutter clean
flutter pub get
```

打 debug APK：

```powershell
flutter build apk --debug `
  --dart-define=API_BASE_URL=http://服务器公网IP:3001 `
  --dart-define=WS_BASE_URL=http://服务器公网IP:3001
```

APK 输出位置：

```text
app\build\app\outputs\flutter-apk\app-debug.apk
```

### 8.3 Release APK 打包

测试稳定后再打 release：

```powershell
flutter build apk --release `
  --dart-define=API_BASE_URL=http://服务器公网IP:3001 `
  --dart-define=WS_BASE_URL=http://服务器公网IP:3001
```

APK 输出位置：

```text
app\build\app\outputs\flutter-apk\app-release.apk
```

### 8.4 Android 权限检查

打包前检查：

```text
app/android/app/src/main/AndroidManifest.xml
```

需要确认：

- 网络权限
- 明文 HTTP 访问：`android:usesCleartextTraffic="true"`
- 摄像头权限
- 麦克风权限
- 图片选择 / 文件访问相关权限

如果后续改 HTTPS，可以逐步移除明文 HTTP 依赖。

---

## 9. APK 安装与基础连通测试

### 9.1 安装 APK

把 APK 发到手机后安装。

如果手机提示禁止安装未知来源应用，需要在系统设置中允许当前文件管理器或浏览器安装应用。

### 9.2 手机浏览器先测服务器

安装 APK 前，先用手机浏览器访问：

```text
http://服务器公网IP:3001/api
http://服务器公网IP:3001/uploads/games/snake/index.html
```

如果手机浏览器都打不开，APK 也一定打不开。先排查服务器、防火墙、公网 IP、运营商安全组。

### 9.3 APK 启动后检查

1. App 是否能启动。
2. 登录页是否正常显示。
3. 登录是否能请求到服务器。
4. 登录后是否能进入主页面。
5. 退出登录后是否能重新登录。

---

## 10. 手机完整功能测试清单

建议按下面顺序测试，不要一开始就测试会议或 H5 深链路。

### 10.1 用户系统

- 注册新账号。
- 使用邀请码注册。
- 登录。
- 退出登录。
- 获取个人资料。
- 修改昵称。
- 上传头像。
- 输入 CDK 激活。
- 未激活账号点击功能是否提示“请激活游戏”。
- 已激活账号是否可以进入功能。

### 10.2 我的与货币

- 我的页面货币是否显示。
- 积分、金币、银币、特殊积分、奖励积分、持股数是否正确。
- 货币明细是否能打开。
- 积分合成是否可用。
- 提现申请是否可提交。
- 提现记录是否显示。
- 后台审核提现后，App 是否刷新状态。

### 10.3 好友系统

准备两个账号。

- 搜索用户。
- 发送好友申请。
- 收到好友申请红点。
- 同意好友申请。
- 拒绝好友申请。
- 联系人列表显示好友。
- 修改备注。
- 删除好友。

### 10.4 单聊

准备两台手机，或一台手机加另一个测试端。

- 发送文字消息。
- 接收实时消息。
- 未读角标变化。
- 消息发送失败重试。
- 离线后重新上线收到消息。
- 图片消息发送。
- 语音消息录制。
- 语音消息播放。
- 消息编辑、删除、撤回，如当前页面支持。

### 10.5 群聊

- 创建群。
- 后台审核群。
- 群列表显示。
- 群成员发送消息。
- 添加成员。
- 移除成员。
- 设置管理员。
- 禁言。
- 解除禁言。
- 修改群名称。
- 群公告。
- 我在本群昵称。
- 退出群。
- 解散群。

### 10.6 群会议

当前会议是 P2P WebRTC 模式，优先在同一 Wi-Fi 下测试。

基础测试：

- 群内发起会议。
- 第二个账号加入会议。
- 本地摄像头是否打开。
- 本地麦克风是否打开。
- 对方是否能看到画面。
- 对方是否能听到声音。
- 关闭麦克风。
- 打开麦克风。
- 关闭摄像头。
- 打开摄像头。
- 切换前后摄像头。
- 离开会议。
- 结束会议。

管理测试：

- 群主或管理员踢人。
- 被踢用户不能再次加入同一场会议。
- 全员静音。
- 后台强制结束会议。
- 后台填写或修改回放地址。

网络测试：

- 两台手机同一 Wi-Fi。
- 一台 Wi-Fi，一台移动网络。
- App 切后台再返回。
- 锁屏后恢复。
- 弱网或短暂断网后恢复。

说明：

- 如果同 Wi-Fi 能通，跨网络失败，大概率是 P2P NAT 穿透问题。
- 后续需要 TURN 服务或 SFU 服务。
- 当前 10Mbps 服务器带宽不适合承载大量 TURN/SFU 音视频流量。

### 10.7 游戏大厅与 H5 游戏

- 游戏列表是否加载。
- 游戏卡片名称和描述是否正确。
- 未激活账号点击游戏是否被拦截。
- 已激活账号点击游戏是否能进入。
- 下注弹窗是否显示当前积分。
- 积分不足的下注项是否不可选。
- 占位游戏是否提示“测试中，敬请期待”。
- H5 游戏是否在 WebView 中打开。
- 横屏游戏是否自动横屏。
- 退出游戏后是否恢复竖屏。
- H5 游戏资源是否加载完整。
- 游戏退出是否返回游戏大厅。

### 10.8 JSBridge

重点测试 App 与 H5 通信。

- H5 是否收到 App 的 `init` 消息。
- `init` 里是否包含 token、userId、nickname、avatar、points。
- H5 调用 `getBalance` 后，App 是否返回余额。
- H5 调用 `gameSettle` 后，后端是否写入游戏记录。
- 结算奖励积分是否到账。
- 结算奖励物品是否进入背包。
- H5 调用 `exitGame` 是否能退出 WebView。
- H5 调用 `deductPoints` 是否能扣积分。
- H5 调用 `buySkin` 是否能买皮肤。

当前注意：

- App 侧 JSBridge 已经有 `deductPoints` 和 `buySkin` 逻辑。
- 后端当前需要补齐或对齐正式消费接口，否则游戏内扣积分、买皮肤可能失败。

### 10.9 转盘与赛马

转盘：

- 转盘配置是否从后端加载。
- 抽奖是否扣除对应货币。
- 抽奖结果是否符合配置。
- 奖励是否到账。

赛马：

- 创建房间。
- 投注。
- 结算。
- 胜方返还本金和奖励。
- 败方扣除积分。
- 流水记录是否正确。

### 10.10 背包

- 背包列表是否加载。
- 物品数量是否正确。
- 物品详情是否显示。
- 游戏结算后物品数量是否增加。

### 10.11 矩阵推广

- 邀请码展示。
- 新用户填写邀请码注册。
- 激活后是否进入上级矩阵。
- 直推用户列表是否显示。
- 矩阵坑位是否正确。
- 收益明细是否正确。
- 当前轮次是否正确。
- 历史轮次是否正确。
- 后台推广管理是否能看到对应数据。

### 10.12 管理后台

- 后台登录。
- 用户列表搜索。
- 用户状态修改。
- 添加货币。
- 用户流水查看。
- 用户动态查看。
- 用户背包查看。
- 功能开关修改。
- 转盘配置修改。
- CDK 类型创建。
- CDK 批量生成。
- CDK 使用状态查看。
- 提现审核。
- 分销管理。
- 邀请关系查看。
- 矩阵管理。
- 社交消息查看。
- 会议列表查看。
- 强制结束会议。
- 清理过期社交数据。
- 系统配置修改。

---

## 11. 常见问题排查

### 11.1 手机无法登录

检查：

1. APK 打包是否使用服务器公网 IP。
2. 手机浏览器能否打开 `http://服务器公网IP:3001/api`。
3. 后端 PM2 是否运行。
4. Windows 防火墙是否放行 `3001`。
5. App 是否允许明文 HTTP。

### 11.2 后台打不开

检查：

1. Nginx 是否启动。
2. `admin/dist` 是否存在。
3. Nginx root 路径是否正确。
4. 服务器防火墙是否放行 `80`。

### 11.3 后台能打开但接口失败

检查：

1. `/api/` 是否正确代理到 `127.0.0.1:3001/api/`。
2. 后端是否运行。
3. 浏览器控制台请求地址是否正确。
4. 登录 token 是否过期。

### 11.4 H5 游戏打不开

检查：

1. `server/uploads/games/xxx/index.html` 是否存在。
2. 浏览器能否直接打开 H5 地址。
3. H5 资源路径是否大小写一致。
4. H5 是否引用了本地绝对路径。
5. `.wasm`、`.gz`、`.data` 响应头是否正确。

### 11.5 Socket 消息收不到

检查：

1. `WS_BASE_URL` 是否指向服务器公网 IP。
2. 后端 `/chat` namespace 是否正常。
3. token 是否正确传给 Socket。
4. 服务器防火墙是否放行 `3001`。
5. 多设备登录时是否都能建立连接。

### 11.6 会议同 Wi-Fi 能用，跨网络不能用

这是 WebRTC P2P 常见问题。

处理方向：

1. 配置 STUN。
2. 配置 TURN。
3. 后续接入 SFU，例如 mediasoup 或 Janus。

测试阶段优先确认同 Wi-Fi 可用，再处理跨网络。

### 11.7 游戏内扣积分失败

当前重点检查：

1. H5 是否正确调用 `gameMessage`。
2. App 是否收到 `deductPoints`。
3. App 当前调用的后端接口是否存在。
4. 后端是否有正式游戏消费接口。
5. 用户积分是否足够。

建议补齐统一接口：

```text
POST /api/game/:id/spend
```

或：

```text
POST /api/currency/spend
```

---

## 12. 建议执行顺序

按下面顺序推进最稳：

1. 服务器安装 MySQL、Redis、Node.js、Nginx。
2. 创建数据库 `competitive_game`。
3. 上传项目到 `D:\deploy\jjyx`。
4. 导入本地测试数据库，或让后端 development 模式自动建表。
5. 配置 `server/.env`。
6. 启动 Redis。
7. 后端执行 `npm install`。
8. 后端执行 `npm.cmd run build`。
9. 用 PM2 启动后端。
10. 浏览器验证 `http://服务器公网IP:3001/api`。
11. 浏览器验证 H5 游戏资源地址。
12. 后台执行 `npm install`。
13. 后台执行 `npm.cmd run build`。
14. 用 Nginx 托管后台。
15. 浏览器验证后台登录和接口。
16. 本地电脑打 debug APK，写入服务器公网 IP。
17. 手机浏览器验证服务器地址。
18. 手机安装 APK。
19. 按测试清单逐项测试。
20. 记录问题并按模块分类修复。

---

## 13. 测试记录模板

每次测试建议按下面格式记录：

```markdown
## 测试记录 - YYYY-MM-DD

服务器地址：
APK 版本：
测试手机型号：
网络环境：

### 已通过
- [ ] 登录
- [ ] 注册
- [ ] 聊天
- [ ] 群聊
- [ ] 游戏大厅

### 问题列表
| 编号 | 模块 | 问题 | 复现步骤 | 期望 | 实际 | 日志/截图 | 优先级 |
|------|------|------|----------|------|------|-----------|--------|
| 1 | 登录 |  |  |  |  |  | 高 |

### 待回归
- [ ] 
```

---

## 14. 部署前最终检查

- [ ] MySQL 正常运行。
- [ ] Redis 正常运行。
- [ ] 后端 `npm.cmd run build` 通过。
- [ ] 后端 PM2 状态为 online。
- [ ] `http://服务器公网IP:3001/api` 可访问。
- [ ] `/uploads/games/.../index.html` 可访问。
- [ ] 后台可访问。
- [ ] 后台可登录。
- [ ] APK 使用服务器公网 IP 打包。
- [ ] 手机浏览器能访问服务器 API。
- [ ] 手机已安装 APK。
- [ ] 登录、聊天、游戏、后台基础功能完成首轮验证。

