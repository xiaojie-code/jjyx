param(
    [string]$DeviceId,
    [string]$ApiHost,
    [int]$ServerPort = 3001
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppRoot = Join-Path $RepoRoot 'app'
$Flutter = 'D:\myApp\flutter\flutter\bin\flutter.bat'
$Adb = 'D:\myApp\Android\Sdk\platform-tools\adb.exe'

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

if (-not $ApiHost) {
    $ApiHost = Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object {
            $_.IPAddress -notlike '127.*' -and
            $_.IPAddress -notlike '169.254.*' -and
            $_.InterfaceAlias -notmatch 'Loopback|Docker|VMware|VirtualBox|vEthernet'
        } |
        Sort-Object InterfaceMetric |
        Select-Object -First 1 -ExpandProperty IPAddress
}

if (-not $ApiHost) {
    throw 'Could not detect a LAN IPv4 address. Pass one manually, for example: -ApiHost 192.168.31.75'
}

$ApiBaseUrl = "http://${ApiHost}:$ServerPort"
$WsBaseUrl = "http://${ApiHost}:$ServerPort"

Write-Host "Device: $DeviceId"
Write-Host "API_BASE_URL: $ApiBaseUrl"
Write-Host "WS_BASE_URL: $WsBaseUrl"

Set-Location $AppRoot
& $Flutter run -d $DeviceId --dart-define=API_BASE_URL=$ApiBaseUrl --dart-define=WS_BASE_URL=$WsBaseUrl
