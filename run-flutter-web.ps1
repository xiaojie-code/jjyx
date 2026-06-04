param(
    [ValidateSet('lan', 'public')]
    [string]$NetworkProfile,
    [string]$ApiHost,
    [int]$ServerPort = 0,
    [int]$WebPort = 3200,
    [string]$WebHostname = '0.0.0.0'
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppRoot = Join-Path $RepoRoot 'app'
$EnvFile = Join-Path $RepoRoot 'server\.env'
$NetworkProfileScript = Join-Path $RepoRoot 'network-profile.ps1'
$Flutter = 'D:\myApp\flutter\flutter\bin\flutter.bat'

. $NetworkProfileScript

if (-not (Test-Path $Flutter)) {
    throw "Flutter not found: $Flutter"
}

$Endpoint = Resolve-JjyxNetworkEndpoint -NetworkProfile $NetworkProfile -ApiHost $ApiHost -ServerPort $ServerPort -EnvFile $EnvFile

Write-Host "Network profile: $($Endpoint.NetworkProfile)"
Write-Host "API_BASE_URL: $($Endpoint.ApiBaseUrl)"
Write-Host "WS_BASE_URL: $($Endpoint.WsBaseUrl)"
Write-Host "Flutter web: http://$($Endpoint.ApiHost):$WebPort"

Set-Location $AppRoot
& $Flutter --no-version-check run -d web-server --web-hostname=$WebHostname --web-port=$WebPort --dart-define=API_BASE_URL=$($Endpoint.ApiBaseUrl) --dart-define=WS_BASE_URL=$($Endpoint.WsBaseUrl)