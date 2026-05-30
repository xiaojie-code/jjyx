# 编码规范

> 项目通用编码规范，所有代码修改都要遵守。

---

## 通用原则

- 改完代码必须编译验证，不能留编译错误
- 修改文件后用 `getDiagnostics` 检查，确认零错误再继续
- 不要引入新的依赖库，除非用户明确要求
- 保持现有代码风格，不要擅自重构不相关的代码
- 中文注释，英文变量名

---

## TypeScript / NestJS 后端

### 类型安全

- 所有从数据库读取的 ID 字段，在做比较或 Map 查找时必须用 `Number()` 包装
- 不要用 `===` 直接比较可能是 string 的数据库字段，用 `Number(a) === Number(b)`
- TypeORM entity 的 `bigint` 字段读出来是 string，必须注意

### 命名

- Service 方法用动词开头：`getXxx`、`createXxx`、`updateXxx`、`deleteXxx`
- Controller 路由用 RESTful 风格
- Entity 文件名用 kebab-case：`user-setting.entity.ts`

### 错误处理

- 用 NestJS 内置异常：`NotFoundException`、`BadRequestException`、`ForbiddenException`
- 错误消息用中文，面向用户

### WebSocket

- `onlineUsers` Map 的 key 必须是 `Number` 类型
- 所有 `notifyUser` 调用的 userId 参数必须用 `Number()` 包装
- 推送消息时包含 `senderNickname` 字段

---

## Dart / Flutter 前端

### 状态管理

- 使用 Riverpod（`ConsumerStatefulWidget` + `ref.read/watch`）
- Provider 单例用 `Provider<T>`，状态用 `StateNotifierProvider`
- Socket 相关逻辑集中在 `SocketService` 中

### 生命周期

- `initState` 中先注册 listener，再调用 `connect()`
- `dispose` 中必须移除所有 listener，用 try-catch 包裹
- 异步操作前后检查 `mounted`

### UI 更新

- 收到实时数据时，先本地 `setState` 更新 UI，再异步请求服务器确认
- 不要只依赖 API 刷新，网络延迟会导致 UI 卡顿感

### 命名

- 文件名用 snake_case：`chat_list_page.dart`
- 类名用 PascalCase：`ChatListPage`
- 私有方法用 `_` 前缀

---

## Vue / Admin 后台

- 使用 Composition API（`<script setup>`）
- 组件文件名用 PascalCase：`UserList.vue`
- API 请求统一走 `src/utils/request.ts`
