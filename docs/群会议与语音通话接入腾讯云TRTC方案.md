# 群会议与语音通话接入腾讯云 TRTC 方案

生成日期：2026-07-07

## 一、目标

将当前 APP 的群视频会议和后续实时语音通话能力接入腾讯云 TRTC，提高多人音视频的稳定性、弱网表现、跨网络可用性，并为后续云端录制、后台回放管理打基础。

本方案不推翻现有社交和会议业务系统，只替换音视频媒体层：

- 现有 NestJS 后端继续负责登录鉴权、群权限、会议创建、积分扣除、成员管理、踢人、静音、结束会议、后台管理。
- 腾讯云 TRTC 负责音视频采集、进房、推流、订阅、弱网、NAT 穿透、多人成员媒体转发。
- 当前 Socket.IO 会议信令保留，但 TRTC 模式下不再转发 WebRTC 的 offer、answer、candidate，只用于业务控制事件。

## 二、当前现状

当前项目已有群会议业务基础：

- 后端会议业务：`server/src/chat/meeting.service.ts`
- 后端会议信令：`server/src/chat/meeting.gateway.ts`
- APP 群会议页面：`app/lib/features/chat/pages/meeting_page.dart`
- APP 聊天语音消息：`app/lib/features/chat/pages/chat_page.dart`
- 后台社交会议管理：`admin/src/views/social/SocialManage.vue`

当前群会议实际实现方式：

- APP 使用 `flutter_webrtc`。
- 后端 `/meeting` Socket.IO 只做信令转发。
- 信令包含 `meeting:signal`，用于转发 `offer / answer / candidate`。
- 会议控制事件包含加入、离开、踢人、结束、全员静音、成员麦克风/摄像头状态同步。

当前问题：

- P2P 多人会议不适合正式环境。
- 跨网络、弱网、运营商 NAT 下容易不稳定。
- 后端无法拿到完整媒体流，自动录制和回放不好做。
- 后续多人会议继续在 P2P 上堆功能，排查和维护成本会越来越高。

## 三、总体方案

采用腾讯云 TRTC 作为音视频媒体层。

推荐架构：

```text
Flutter APP
  |-- REST API：会议创建、加入、离开、结束、成员列表、媒体配置
  |-- Socket.IO：踢人、结束、静音、摄像头占用、成员刷新
  |-- TRTC SDK：音视频进房、推流、订阅、退出房间

NestJS 后端
  |-- 会议业务和权限
  |-- 积分扣除
  |-- TRTC UserSig 服务端生成
  |-- 云端录制任务管理
  |-- 录制回放地址写入 meeting.recording_url

腾讯云
  |-- TRTC：实时音视频
  |-- TRTC 云端录制：会议录制
  |-- COS 或 VOD：录制文件存储和播放
```

## 四、腾讯云准备

需要在腾讯云控制台准备：

1. 创建 TRTC 应用。
2. 获取 `SDKAppID`。
3. 获取 `SecretKey`。
4. 如需录制，开通 TRTC 云端录制。
5. 准备 COS 或 VOD，用于保存录制文件。

注意：

- `SecretKey` 只能放在后端，不能写进 APP。
- APP 不能本地生成 UserSig。
- 正式环境必须由后端校验用户身份后生成 UserSig。

参考文档：

- TRTC UserSig 鉴权：https://cloud.tencent.com/document/product/647/17275
- TRTC Flutter 支持说明：https://trtc.io/document/35078
- TRTC 云端录制：https://trtc.io/document/39080

## 五、后端改造

### 5.1 新增配置

建议新增环境变量或系统配置：

```text
TENCENT_TRTC_SDK_APP_ID=
TENCENT_TRTC_SECRET_KEY=
TENCENT_TRTC_USER_SIG_EXPIRE_SECONDS=86400
meeting_media_mode=trtc
meeting_recording_enabled=false
meeting_recording_auto=false
meeting_recording_storage=cos 或 vod
```

现有配置继续保留：

```text
meeting_media_mode
meeting_sfu_endpoint
meeting_turn_urls
meeting_turn_username
meeting_turn_credential
meeting_recording_enabled
meeting_recording_auto
meeting_start_cost
```

其中 `meeting_media_mode` 后续支持：

- `p2p`：当前 WebRTC P2P 兜底模式。
- `trtc`：腾讯云 TRTC 模式。
- `sfu`：历史预留，自建 SFU 暂不优先推进。

### 5.2 生成 TRTC UserSig

后端新增 UserSig 生成能力。

生成前必须校验：

- 用户已登录。
- 用户属于该群。
- 会议存在且未结束。
- 用户没有被踢出本次会议。
- 用户已经完成现有 `joinMeeting` 业务逻辑。

UserID 建议格式：

```text
u_{userId}
```

RoomID 建议：

```text
meeting.id
```

如果腾讯云 SDK 对 RoomID 类型有限制，则做一个稳定映射：

```text
roomId = meeting.id
strRoomId = meeting_{meeting.id}
```

以后以 SDK 实际 Flutter 接口要求为准。

### 5.3 改造 media-config

当前接口：

```text
GET /api/social/meetings/:id/media-config
```

后续在 `meeting_media_mode=trtc` 时返回：

```json
{
  "meetingId": 1,
  "mediaMode": "trtc",
  "trtc": {
    "sdkAppId": 123456,
    "roomId": 1,
    "strRoomId": "meeting_1",
    "userId": "u_10001",
    "userSig": "server_generated_user_sig",
    "expireAt": 1780000000
  },
  "recording": {
    "enabled": false,
    "autoRecord": false,
    "url": "",
    "replayAvailable": false
  }
}
```

P2P 模式继续返回当前结构：

```json
{
  "mediaMode": "p2p",
  "iceServers": [],
  "recording": {}
}
```

### 5.4 Socket.IO 职责调整

TRTC 模式下保留 `/meeting` Socket.IO，但职责变为业务控制：

- `meeting:join`
- `meeting:leave`
- `meeting:participant-refresh`
- `meeting:media-status`
- `meeting:media-control`
- `meeting:mute-all`
- `meeting:kicked`
- `meeting:ended`
- `meeting:camera-share-state`
- `meeting:camera-share-rejected`

TRTC 模式下不再依赖：

- `meeting:signal`
- `offer`
- `answer`
- `candidate`

但这些 P2P 信令先不要删除，继续作为 `meeting_media_mode=p2p` 的兜底方案。

### 5.5 云端录制

录制建议放到第二阶段或第三阶段，不要和第一版 TRTC 进房一起做复杂。

后端需要做：

- 会议开始时，根据 `meeting_recording_auto` 判断是否启动 TRTC 云端录制。
- 会议结束时停止录制。
- 接收腾讯云录制回调或主动查询录制结果。
- 将录制播放地址写入 `meetings.recording_url`。
- 后台继续复用当前会议回放播放入口。

## 六、APP 改造

### 6.1 保留 P2P，新增 TRTC

`meeting_page.dart` 当前是 P2P 会议页。

改造原则：

- 不直接删除 `flutter_webrtc` 逻辑。
- 新增 TRTC 分支。
- 根据后端 `mediaMode` 决定走 P2P 还是 TRTC。

伪流程：

```dart
await joinMeeting();
final config = await loadMediaConfig();

if (config.mediaMode == 'trtc') {
  await prepareTrtc(config.trtc);
} else {
  await prepareRtc();
  connectMeetingSocketForP2P();
}
```

### 6.2 TRTC 会议进入流程

TRTC 模式下：

1. 请求 `meetingJoin`。
2. 请求 `meetingMediaConfig`。
3. 获取 `sdkAppId / roomId / userId / userSig`。
4. 初始化 TRTC SDK。
5. 进入 TRTC 房间。
6. 连接 `/meeting` Socket，用于业务事件。
7. 默认麦克风关闭。
8. 默认摄像头关闭。

### 6.3 麦克风、摄像头按钮映射

当前 UI 可以继续复用。

按钮逻辑调整：

- 麦克风开启：TRTC 开启本地音频发布。
- 麦克风关闭：TRTC 停止或静音本地音频。
- 摄像头开启：先通过后端 Socket 判断是否已有摄像头占用，再打开本地预览并发布视频。
- 摄像头关闭：停止本地视频发布，并通知后端释放摄像头占用。
- 切换摄像头：调用 TRTC 摄像头切换能力。
- 离开会议：先退出 TRTC 房间，再调用现有 leave 接口。

### 6.4 远端用户显示

P2P 模式下远端画面来自 `RTCPeerConnection`。

TRTC 模式下远端画面来自 TRTC 回调：

- 远端用户进入房间。
- 远端用户离开房间。
- 远端用户音频可用。
- 远端用户视频可用。
- 远端用户视频关闭。

成员昵称、头像、角色仍从当前后端成员接口获取。

### 6.5 会议控制

现有控制逻辑继续保留：

- 主持人结束会议：后端结束会议并通过 Socket 推送 `meeting:ended`，APP 收到后退出 TRTC 房间并返回。
- 踢人：后端记录 ban，推送 `meeting:kicked`，被踢用户退出 TRTC 房间并返回。
- 全员静音：后端推送 `meeting:mute-all`，普通成员关闭麦克风按钮。
- 管理员关闭某成员麦克风/摄像头：后端推送 `meeting:media-control`，目标用户执行 TRTC 本地关闭。

## 七、实时语音通话方案

当前 APP 里的“语音”主要是语音消息：

- 录音。
- 上传。
- 聊天里播放。

这不是实时语音通话，不需要 TRTC。后续可以单独把语音文件迁移到 COS/CDN。

如果要做实时语音通话，建议复用 TRTC：

- 群语音通话：TRTC 音频房间。
- 单人语音通话：TRTC 双人音频房间。
- 不开启摄像头。
- 仍然由后端生成 UserSig。
- 仍然走现有登录、权限、Socket 控制链路。

建议新增字段或参数：

```text
callType=video_meeting
callType=audio_call
```

也可以在会议记录里增加媒体类型：

```text
media_type: video | audio
provider: p2p | trtc
```

## 八、后台管理改造

后台当前已有会议管理和回放入口，后续补充：

- 系统配置页增加 TRTC 相关配置。
- 会议列表显示媒体模式：P2P / TRTC。
- 会议列表显示录制状态：未录制 / 录制中 / 已完成 / 失败。
- 会议详情显示 TRTC 房间号。
- 支持查看参会成员明细。
- 支持手动维护或刷新录制回放地址。
- 支持管理员强制结束会议时同步停止 TRTC 录制。

## 九、数据库建议

第一阶段可以不新增表，只复用当前：

- `meetings`
- `meeting_participants`
- `meeting_bans`

后续为了录制和排查问题，建议扩展字段或新增表。

建议 `meetings` 后续增加：

```text
media_provider: p2p | trtc
media_room_id
media_str_room_id
recording_status
recording_task_id
recording_started_at
recording_ended_at
```

也可新增 `meeting_recordings` 表：

```text
id
meeting_id
provider
task_id
status
file_url
duration_seconds
file_size
created_at
updated_at
```

第一版不强制，录制阶段再做。

## 十、实施阶段

### 第一阶段：TRTC 基础进房

目标：两台 Android 真机能进入同一个群会议，完成实时音频通话。

任务：

- 后端接入腾讯云 UserSig 生成。
- `media-config` 支持 `mediaMode=trtc`。
- APP 新增 TRTC SDK。
- APP 在 TRTC 模式下进入房间。
- 默认麦克风和摄像头关闭。
- 支持打开/关闭麦克风。
- 保留 P2P 兜底。

### 第二阶段：视频会议完整控制

目标：视频会议完整可用。

任务：

- 支持打开/关闭摄像头。
- 支持切换前后摄像头。
- 支持远端用户视频画面显示。
- 保留当前“只允许一人共享摄像头画面”的业务限制。
- 接入踢人、结束、全员静音、管理员关闭成员麦克风/摄像头。

### 第三阶段：实时语音通话

目标：实现音频-only 通话。

任务：

- 新增音频通话入口。
- 复用 TRTC UserSig 和房间逻辑。
- 只发布音频，不发布视频。
- 支持接听、挂断、超时、被叫提示。

### 第四阶段：云端录制和后台回放

目标：会议结束后后台可查看回放。

任务：

- 接入 TRTC 云端录制。
- 录制文件保存到 COS 或 VOD。
- 后端接收回调或查询录制结果。
- 自动写入 `meeting.recording_url`。
- 后台播放回放。
- 后台清理过期录制。

### 第五阶段：灰度和正式切换

目标：正式上线。

任务：

- 默认先对测试账号开启 `meeting_media_mode=trtc`。
- 测试稳定后全量切换。
- 出问题可立即切回 `meeting_media_mode=p2p`。
- 观察腾讯云用量和费用。

## 十一、测试清单

真机测试：

- 两台 Android 真机同一 Wi-Fi 下进入会议。
- 两台 Android 真机不同网络下进入会议。
- 普通用户发起会议积分扣除正常。
- 群主/管理员发起会议免费。
- 积分不足不能发起会议。
- 麦克风默认关闭。
- 摄像头默认关闭。
- 打开麦克风后对方可听见。
- 打开摄像头后对方可看见。
- 切换摄像头正常。
- 离开会议释放资源。
- 被踢出后退出房间，不能再次加入本次会议。
- 后台强制结束会议后 APP 自动退出会议。
- 全员静音后普通用户不能打开麦克风。
- 断网、切后台、锁屏、恢复后状态可控。

后台测试：

- 会议列表正常显示。
- 会议成员明细正常。
- 强制结束会议正常。
- 回放地址可维护。
- 云端录制接入后回放地址自动写入。

兼容测试：

- `meeting_media_mode=p2p` 时旧 P2P 方案仍可运行。
- `meeting_media_mode=trtc` 时不再使用 P2P offer/answer/candidate。

## 十二、验收标准

第一版验收：

- 后端不暴露腾讯云 `SecretKey`。
- APP 能通过后端拿到 TRTC 入房参数。
- 两台真机能进入同一会议房间。
- 麦克风可正常打开、关闭。
- 会议离开、结束、踢人链路正常。
- `meeting_media_mode` 可切换 P2P 和 TRTC。

完整验收：

- 群视频会议多人可用。
- 实时语音通话可用。
- 后台能强制结束会议。
- 后台能查看会议记录和成员。
- 云端录制可生成回放并写入后台。
- 弱网和跨网络下比原 P2P 更稳定。

## 十三、执行原则

- 不删除当前 P2P 代码，先保留兜底。
- 不把腾讯云 `SecretKey` 放进 APP。
- 不把录制和 TRTC 基础进房混在第一步一次性做完。
- 先跑通音频，再跑通视频，再做控制，再做录制。
- 后续所有改动都以 `meeting_media_mode` 配置做灰度开关。

