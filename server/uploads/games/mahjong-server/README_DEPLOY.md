# Mahjong Server Deploy

This directory contains the Mahjong HTTP mock service and the Mahjong websocket service.

## Required local secret file

Copy `config/local.secrets.example.js` to `config/local.secrets.js` on the server, then fill the real MySQL and Redis values.

`config/local.secrets.js` is ignored by git.

## Start

```powershell
cd E:\jjyx\server\uploads\games\mahjong-server
npm install
pm2 start .\ecosystem.config.js --env production
pm2 save
```

## Check

```powershell
pm2 list
netstat -ano | findstr ":15103"
netstat -ano | findstr ":42001"
```
