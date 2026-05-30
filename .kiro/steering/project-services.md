---
inclusion: manual
---

# 项目服务启动指南

本项目包含以下服务，启动顺序建议：Redis → 后端 → 前端 → App

## 1. Redis

- 路径：`D:\myApp\redis\redis-server.exe`
- 端口：6379
- 启动命令：`D:\myApp\redis\redis-server.exe`

## 2. 后端服务 (NestJS)

- 路径：`d:\myApp\work_ycykj\jjyx\jjyx\server`
- 端口：3001
- 启动命令：`npm run start:dev`

## 3. 前端管理后台 (Vue 3 + Vite)

- 路径：`d:\myApp\work_ycykj\jjyx\jjyx\admin`
- 端口：3100
- 启动命令：`npm run dev`

## 4. Flutter App (Web)

- 路径：`d:\myApp\work_ycykj\jjyx\jjyx\app`
- 端口：3200
- Flutter SDK：`D:\myApp\flutter\flutter\bin\flutter.bat`
- 启动命令（电脑Web调试）：`D:\myApp\flutter\flutter\bin\flutter.bat run -d web-server --web-port=3200`
- 启动命令（手机真机调试）：`D:\myApp\flutter\flutter\bin\flutter.bat run --dart-define=API_BASE_URL=http://192.168.31.75:3001 --dart-define=WS_BASE_URL=http://192.168.31.75:3001`
- 说明：使用 web-server 模式，不会自动打开浏览器，用户自行在浏览器访问 localhost:3200
- 重启时不要杀 Edge 进程，直接 stop 旧进程再重新启动即可
- **重要**：手机端调试时必须用电脑局域网 IP（当前为 192.168.31.75），不能用 localhost

## 快速启动全部服务

当用户说"启动服务"或"启动前后端"时，按上述顺序依次启动所有服务。

## 重要提醒

- 修改后端代码后：NestJS 有 watch 模式会自动重编译，无需手动重启。
- 修改 Flutter app 代码后：必须重启 Flutter 进程（stop + 重新 run）。直接 stop 旧进程再启动新的，不要杀 Edge 浏览器进程。
- 修改 admin 前端代码后：Vite 有 HMR，通常无需重启。
- 总之：改了代码就顺带把对应的服务重启了，不要等用户来问。不要关闭用户的浏览器。
