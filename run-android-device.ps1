param(
    [string]$DeviceId,
    [string]$ApiHost,
    [ValidateSet('lan', 'public')]
    [string]$NetworkProfile,
    [int]$ServerPort = 0
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppRoot = Join-Path $RepoRoot 'app'
$EnvFile = Join-Path $RepoRoot 'server\.env'
$NetworkProfileScript = Join-Path $RepoRoot 'network-profile.ps1'
$Flutter = 'D:\myApp\flutter\flutter\bin\flutter.bat'
$Adb = 'D:\myApp\Android\Sdk\platform-tools\adb.exe'

. $NetworkProfileScript

if (-not (Test-Path $Flutter)) {
    throw "Flutter not found: $Flutter"
}

if (-not (Test-Path $Adb)) {
    throw "ADB not found: $Adb"
}

$AuthorizedDevices = & $Adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\tdevice$" }

if (-not $DeviceId) {
    if (-not $AuthorizedDevices -or $AuthorizedDevices.Count -eq 0) {
        & $Adb devices
        throw 'No authorized Android device found. Connect your phone, enable USB debugging, and allow the RSA prompt on the phone.'
    }

    $DeviceId = (($AuthorizedDevices | Select-Object -First 1) -split '\s+')[0]
}

$Endpoint = Resolve-JjyxNetworkEndpoint -NetworkProfile $NetworkProfile -ApiHost $ApiHost -ServerPort $ServerPort -EnvFile $EnvFile

Write-Host "Device: $DeviceId"
Write-Host "Network profile: $($Endpoint.NetworkProfile)"
Write-Host "API_BASE_URL: $($Endpoint.ApiBaseUrl)"
Write-Host "WS_BASE_URL: $($Endpoint.WsBaseUrl)"

Set-Location $AppRoot
& $Flutter --no-version-check run -d $DeviceId --dart-define=API_BASE_URL=$($Endpoint.ApiBaseUrl) --dart-define=WS_BASE_URL=$($Endpoint.WsBaseUrl)
