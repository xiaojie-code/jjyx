param(
    [switch]$WithFlutterWeb,
    [switch]$SkipFlutterWeb,
    [switch]$WithNginx,
    [string]$ApiHost,
    [int]$ServerPort = 3001,
    [int]$WebPort = 3200,
    [int]$SaimaPort = 8080,
    [string]$SaimaServerRoot = 'D:\myApp\work_ycykj\jjyx\saima\saima-server'
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$NetworkProfileScript = Join-Path $RepoRoot 'network-profile.ps1'
$EnvFile = Join-Path $RepoRoot 'server\.env'
$RedisExe = 'D:\myApp\redis\redis-server.exe'
$RedisCli = 'D:\myApp\redis\redis-cli.exe'
$RedisConf = 'D:\myApp\redis\redis.windows.conf'
$PhpDir = 'D:\myApp\php'
$PhpExe = Join-Path $PhpDir 'php.exe'
$NginxExe = 'D:\myApp\nginx\nginx.exe'
$NginxRoot = 'D:\myApp\nginx'
$MahjongServerRoot = Join-Path $RepoRoot 'server\uploads\games\mahjong-server'
$Pm2Home = Join-Path $RepoRoot 'pm2-home'
$RunLogDir = Join-Path $RepoRoot '.codex\run-logs'

if (-not $SkipFlutterWeb) {
    $WithFlutterWeb = $true
}

if (-not (Test-Path $RunLogDir)) {
    New-Item -ItemType Directory -Path $RunLogDir -Force | Out-Null
}

. $NetworkProfileScript

$Endpoint = Resolve-JjyxNetworkEndpoint `
    -NetworkProfile 'lan' `
    -ApiHost $ApiHost `
    -ServerPort $ServerPort `
    -EnvFile $EnvFile

function Test-LocalPort {
    param([int]$Port)

    $rows = netstat -ano -p tcp |
        Select-String "^\s*TCP\s+\S+:$Port\s+\S+\s+LISTENING\s+\d+\s*$"
    return [bool]$rows
}

function Test-LanPort {
    param([int]$Port)

    $rows = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalAddress -ne '127.0.0.1' -and $_.LocalAddress -ne '::1' }
    return [bool]$rows
}

function Start-HiddenPowerShell {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$Command
    )

    Write-Host "START $Name"
    $safeName = ($Name -replace '[^a-zA-Z0-9_-]', '-').Trim('-')
    if (-not $safeName) { $safeName = 'service' }
    $outLog = Join-Path $RunLogDir "$safeName.out.log"
    $errLog = Join-Path $RunLogDir "$safeName.err.log"
    $runner = Join-Path $RunLogDir "start-$safeName.ps1"
    $runnerContent = @"
`$ErrorActionPreference = 'Continue'
Set-Location -LiteralPath '$WorkingDirectory'
"[`$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] start $Name" | Out-File -LiteralPath '$outLog' -Append -Encoding utf8
"cwd=$WorkingDirectory" | Out-File -LiteralPath '$outLog' -Append -Encoding utf8
& {
$Command
} >> '$outLog' 2>> '$errLog'
"[`$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] exited code=`$LASTEXITCODE" | Out-File -LiteralPath '$outLog' -Append -Encoding utf8
Start-Sleep -Seconds 10
"@
    Set-Content -LiteralPath $runner -Value $runnerContent -Encoding utf8
    Start-Process `
        -FilePath 'powershell.exe' `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $runner) `
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

function Repair-RedisWriteProtection {
    if (-not (Test-Path $RedisCli)) {
        return
    }

    for ($attempt = 1; $attempt -le 10; $attempt++) {
        if (Test-LocalPort 6379) {
            break
        }
        Start-Sleep -Milliseconds 500
    }
    if (-not (Test-LocalPort 6379)) {
        return
    }

    # This Redis instance is only the local cache/session service. On the
    # Windows Redis port an RDB background-save failure can otherwise turn it
    # read-only after startup and make the game sockets return 503.
    & $RedisCli CONFIG SET stop-writes-on-bgsave-error no | Out-Null

    $probeKey = 'jjyx:startup:write-probe'
    $probe = (& $RedisCli SET $probeKey 1 EX 10 2>&1 | Out-String).Trim()
    if ($probe -ne 'OK') {
        Write-Host "WARN Redis write probe failed: $probe"
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
        try {
            Start-Service -Name $service.Name
        } catch {
            Write-Host "WARN MySQL service start failed: $($_.Exception.Message)"
        }
    } else {
        Write-Host 'SKIP MySQL service not found'
    }
}

function Start-BackendIfNeeded {
    # Cocos tooling may bind 127.0.0.1:3001. That listener is not the Nest
    # backend and cannot be reached by phones or the LAN-targeted admin proxy.
    if (Test-LanPort $ServerPort) {
        Write-Host "PORT $ServerPort OK backend"
        return
    }
    $serverRoot = Join-Path $RepoRoot 'server'
    Start-HiddenPowerShell `
        -Name 'backend' `
        -WorkingDirectory $serverRoot `
        -Command 'npm run build; if ($LASTEXITCODE -eq 0) { for ($attempt = 1; $attempt -le 3; $attempt++) { npm run start:prod; if ($LASTEXITCODE -eq 0) { break }; Start-Sleep -Seconds 3 } }'
}

function Start-AdminIfNeeded {
    if (Test-LocalPort 3100) {
        Write-Host 'PORT 3100 OK admin'
        return
    }
    $adminRoot = Join-Path $RepoRoot 'admin'
    $adminApiTarget = 'http://' + $Endpoint.ApiHost + ':' + $ServerPort
    Start-HiddenPowerShell `
        -Name 'admin' `
        -WorkingDirectory $adminRoot `
        -Command ("`$env:VITE_API_PROXY_TARGET = '$adminApiTarget'; npm run dev -- --host 0.0.0.0")
}

function Start-KillerIfNeeded {
    if ((Test-LocalPort 7272) -and (Test-LocalPort 1236)) {
        Write-Host 'PORT 7272/1236 OK killer'
        return
    }
    $killerRoot = Join-Path $RepoRoot 'server\uploads\games\killer-server'
    # Keep the PHP path quoted in the generated runner. Unquoted drive paths
    # are parsed as commands by PowerShell, which prevents the worker from
    # starting after a restart.
    $command = "`$env:PATH = '$PhpDir;' + `$env:PATH; & '$PhpExe' '.\windows.php'"
    Start-HiddenPowerShell `
        -Name 'killer websocket' `
        -WorkingDirectory $killerRoot `
        -Command $command
}

function Start-SaimaIfNeeded {
    if (Test-LocalPort $SaimaPort) {
        Write-Host "PORT $SaimaPort OK saima websocket"
        return
    }
    if (-not (Test-Path $SaimaServerRoot)) {
        Write-Host "SKIP saima server not found: $SaimaServerRoot"
        return
    }
    Start-HiddenPowerShell `
        -Name 'saima websocket' `
        -WorkingDirectory $SaimaServerRoot `
        -Command ('$env:PORT=' + $SaimaPort + '; node .\dist\index.js')
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
    $mahjongWsRoot = Join-Path $MahjongServerRoot 'ws_server\mahjong_game_shqm_server'
    Start-HiddenPowerShell `
        -Name 'mahjong websocket' `
        -WorkingDirectory $mahjongWsRoot `
        -Command ('$env:PM2_HOME="' + $Pm2Home + '"; $env:WS_PORT="42001"; $env:H_NODE_ENV="dev"; $env:name="mahjong_game_shqm_server"; node .\App.js')
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
Repair-RedisWriteProtection
Start-BackendIfNeeded
Start-AdminIfNeeded
Start-KillerIfNeeded
Start-SaimaIfNeeded
Start-MahjongHttpIfNeeded
Start-MahjongWsIfNeeded
Start-FlutterWebIfNeeded
Start-NginxIfNeeded

Start-Sleep -Seconds 12

$ports = @(3306, 6379, $ServerPort, 3100, 7272, 1236, $SaimaPort, 15103, 42001)
if ($WithFlutterWeb) { $ports += $WebPort }
if ($WithNginx) { $ports += 80 }

foreach ($port in $ports) {
    $listening = if ($port -eq $ServerPort) { Test-LanPort $port } else { Test-LocalPort $port }
    if ($listening) {
        Write-Host "PORT $port OK"
    } else {
        Write-Host "PORT $port NOT_FOUND"
    }
}

Write-Host "Admin: http://127.0.0.1:3100/admin/"
Write-Host "Backend: $($Endpoint.ApiBaseUrl)"
Write-Host "Saima WS: ws://$($Endpoint.ApiHost):$SaimaPort"
Write-Host "Mahjong HTTP: http://$($Endpoint.ApiHost):15103"
Write-Host "Mahjong WS: http://$($Endpoint.ApiHost):42001"
if ($WithFlutterWeb) {
    Write-Host "Flutter web: http://$($Endpoint.ApiHost):$WebPort"
}
