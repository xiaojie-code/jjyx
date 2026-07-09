param(
    [switch]$WithFlutterWeb,
    [switch]$WithNginx,
    [string]$ApiHost,
    [int]$ServerPort = 3001,
    [int]$WebPort = 3200
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$NetworkProfileScript = Join-Path $RepoRoot 'network-profile.ps1'
$EnvFile = Join-Path $RepoRoot 'server\.env'
$RedisExe = 'D:\myApp\redis\redis-server.exe'
$RedisConf = 'D:\myApp\redis\redis.windows.conf'
$PhpDir = 'D:\myApp\php'
$NginxExe = 'D:\myApp\nginx\nginx.exe'
$NginxRoot = 'D:\myApp\nginx'
$MahjongServerRoot = 'D:\myApp\work_ycykj\jjyx\哈灵棋牌\mj\clinet\Ragty-haling-client-\server\Ragty-haling-server-'

. $NetworkProfileScript

$Endpoint = Resolve-JjyxNetworkEndpoint `
    -NetworkProfile 'lan' `
    -ApiHost $ApiHost `
    -ServerPort $ServerPort `
    -EnvFile $EnvFile

function Test-LocalPort {
    param([int]$Port)

    $rows = netstat -ano | Select-String ":$Port\s"
    return [bool]$rows
}

function Start-HiddenPowerShell {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$Command
    )

    Write-Host "START $Name"
    Start-Process `
        -FilePath 'powershell.exe' `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $Command) `
        -WorkingDirectory $WorkingDirectory `
        -WindowStyle Hidden | Out-Null
}

function Start-RedisIfNeeded {
    if (Test-LocalPort 6379) {
        Write-Host 'PORT 6379 OK Redis'
        return
    }
    if (Test-Path $RedisExe) {
        Write-Host 'START Redis'
        Start-Process -FilePath $RedisExe -ArgumentList $RedisConf -WindowStyle Hidden | Out-Null
    } else {
        Write-Host "SKIP Redis not found: $RedisExe"
    }
}

function Start-MySqlIfNeeded {
    if (Test-LocalPort 3306) {
        Write-Host 'PORT 3306 OK MySQL'
        return
    }

    $service = Get-Service |
        Where-Object { $_.Name -match 'mysql|mariadb' -or $_.DisplayName -match 'mysql|mariadb' } |
        Select-Object -First 1
    if ($service) {
        Write-Host "START MySQL service $($service.Name)"
        Start-Service -Name $service.Name
    } else {
        Write-Host 'SKIP MySQL service not found'
    }
}

function Start-BackendIfNeeded {
    if (Test-LocalPort $ServerPort) {
        Write-Host "PORT $ServerPort OK backend"
        return
    }
    $serverRoot = Join-Path $RepoRoot 'server'
    Start-HiddenPowerShell `
        -Name 'backend' `
        -WorkingDirectory $serverRoot `
        -Command 'npm run start:dev'
}

function Start-AdminIfNeeded {
    if (Test-LocalPort 3100) {
        Write-Host 'PORT 3100 OK admin'
        return
    }
    $adminRoot = Join-Path $RepoRoot 'admin'
    Start-HiddenPowerShell `
        -Name 'admin' `
        -WorkingDirectory $adminRoot `
        -Command 'npm run dev -- --host 0.0.0.0'
}

function Start-KillerIfNeeded {
    if ((Test-LocalPort 7272) -and (Test-LocalPort 1236)) {
        Write-Host 'PORT 7272/1236 OK killer'
        return
    }
    $killerRoot = Join-Path $RepoRoot 'server\uploads\games\killer-server'
    $command = '$env:PATH="' + $PhpDir + ';" + $env:PATH; php windows.php'
    Start-HiddenPowerShell `
        -Name 'killer websocket' `
        -WorkingDirectory $killerRoot `
        -Command $command
}

function Start-MahjongHttpIfNeeded {
    if (Test-LocalPort 15103) {
        Write-Host 'PORT 15103 OK mahjong http'
        return
    }
    Start-HiddenPowerShell `
        -Name 'mahjong http mock' `
        -WorkingDirectory $MahjongServerRoot `
        -Command 'node .\mock_http_api.js'
}

function Start-MahjongWsIfNeeded {
    if (Test-LocalPort 42001) {
        Write-Host 'PORT 42001 OK mahjong websocket'
        return
    }
    Start-HiddenPowerShell `
        -Name 'mahjong websocket' `
        -WorkingDirectory $MahjongServerRoot `
        -Command 'pm2 start .\ecosystem.config.js --env dev --only mahjong_game_shqm_server'
}

function Start-FlutterWebIfNeeded {
    if (-not $WithFlutterWeb) {
        return
    }
    if (Test-LocalPort $WebPort) {
        Write-Host "PORT $WebPort OK flutter web"
        return
    }
    $command = 'powershell -NoProfile -ExecutionPolicy Bypass -File .\run-flutter-web.ps1 -NetworkProfile lan -ApiHost ' +
        $Endpoint.ApiHost + ' -ServerPort ' + $ServerPort + ' -WebPort ' + $WebPort
    Start-HiddenPowerShell `
        -Name 'flutter web' `
        -WorkingDirectory $RepoRoot `
        -Command $command
}

function Start-NginxIfNeeded {
    if (-not $WithNginx) {
        return
    }
    if (Test-LocalPort 80) {
        Write-Host 'PORT 80 OK nginx'
        return
    }
    if (Test-Path $NginxExe) {
        Write-Host 'START nginx'
        Start-Process -FilePath $NginxExe -WorkingDirectory $NginxRoot -WindowStyle Hidden | Out-Null
    } else {
        Write-Host "SKIP nginx not found: $NginxExe"
    }
}

Write-Host "LAN API: $($Endpoint.ApiBaseUrl)"
Write-Host 'Checking and starting services...'

Start-MySqlIfNeeded
Start-RedisIfNeeded
Start-BackendIfNeeded
Start-AdminIfNeeded
Start-KillerIfNeeded
Start-MahjongHttpIfNeeded
Start-MahjongWsIfNeeded
Start-FlutterWebIfNeeded
Start-NginxIfNeeded

Start-Sleep -Seconds 6

$ports = @(3306, 6379, $ServerPort, 3100, 7272, 1236, 15103, 42001)
if ($WithFlutterWeb) { $ports += $WebPort }
if ($WithNginx) { $ports += 80 }

foreach ($port in $ports) {
    if (Test-LocalPort $port) {
        Write-Host "PORT $port OK"
    } else {
        Write-Host "PORT $port NOT_FOUND"
    }
}

Write-Host "Admin: http://127.0.0.1:3100/admin/"
Write-Host "Backend: $($Endpoint.ApiBaseUrl)"
Write-Host "Mahjong HTTP: http://$($Endpoint.ApiHost):15103"
Write-Host "Mahjong WS: http://$($Endpoint.ApiHost):42001"
if ($WithFlutterWeb) {
    Write-Host "Flutter web: http://$($Endpoint.ApiHost):$WebPort"
}
