param(
    [ValidateSet('lan', 'public')]
    [string]$NetworkProfile,
    [string]$ApiHost,
    [int]$ServerPort = 0,
    [string]$TargetPlatform = 'android-arm64'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $RepoRoot 'server\.env'
$NetworkProfileScript = Join-Path $RepoRoot 'network-profile.ps1'
. $NetworkProfileScript

$ProjectGradleHome = Join-Path $RepoRoot 'app\android\.gradle-user-home'
if (-not $env:GRADLE_USER_HOME) {
    $env:GRADLE_USER_HOME = $ProjectGradleHome
}
if (-not (Test-Path -LiteralPath $env:GRADLE_USER_HOME)) {
    New-Item -ItemType Directory -Path $env:GRADLE_USER_HOME | Out-Null
}

$env:JAVA_HOME = 'D:\myApp\Java\jdk-17.0.19+10'
$env:ANDROID_HOME = 'D:\myApp\Android\Sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;D:\myApp\flutter\flutter\bin;$env:Path"

$Endpoint = Resolve-JjyxNetworkEndpoint -NetworkProfile $NetworkProfile -ApiHost $ApiHost -ServerPort $ServerPort -EnvFile $EnvFile
Write-Host "Network profile: $($Endpoint.NetworkProfile)"
Write-Host "API_BASE_URL: $($Endpoint.ApiBaseUrl)"
Write-Host "WS_BASE_URL: $($Endpoint.WsBaseUrl)"

function ConvertTo-DartDefineBase64([string]$Value) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
    return [Convert]::ToBase64String($bytes)
}

$DartDefines = @(
    ConvertTo-DartDefineBase64 "API_BASE_URL=$($Endpoint.ApiBaseUrl)"
    ConvertTo-DartDefineBase64 "WS_BASE_URL=$($Endpoint.WsBaseUrl)"
) -join ','

Set-Location (Join-Path $RepoRoot 'app\android')
$GradleArgs = @(
    '--offline',
    '--no-daemon',
    '--max-workers=2',
    '--stacktrace',
    '--info',
    "-Ptarget-platform=$TargetPlatform",
    '-Ptarget=lib\main.dart',
    '-Pbase-application-name=android.app.Application',
    "-Pdart-defines=$DartDefines",
    '-Pdart-obfuscation=false',
    '-Ptrack-widget-creation=true',
    '-Ptree-shake-icons=false',
    'assembleDebug'
)

& '.\gradlew.bat' @GradleArgs
