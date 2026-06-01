param(
	[ValidateSet('lan', 'public')]
	[string]$NetworkProfile,
	[string]$ApiHost,
	[int]$ServerPort = 0
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $RepoRoot 'server\.env'
$NetworkProfileScript = Join-Path $RepoRoot 'network-profile.ps1'
. $NetworkProfileScript

$env:JAVA_HOME = 'D:\myApp\Java\jdk-17.0.19+10'
$env:ANDROID_HOME = 'D:\myApp\Android\Sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;D:\myApp\flutter\flutter\bin;$env:Path"

$Endpoint = Resolve-JjyxNetworkEndpoint -NetworkProfile $NetworkProfile -ApiHost $ApiHost -ServerPort $ServerPort -EnvFile $EnvFile
Write-Host "Network profile: $($Endpoint.NetworkProfile)"
Write-Host "API_BASE_URL: $($Endpoint.ApiBaseUrl)"
Write-Host "WS_BASE_URL: $($Endpoint.WsBaseUrl)"

Set-Location (Join-Path $RepoRoot 'app')
& 'D:\myApp\flutter\flutter\bin\flutter.bat' --no-version-check build apk --debug --dart-define=API_BASE_URL=$($Endpoint.ApiBaseUrl) --dart-define=WS_BASE_URL=$($Endpoint.WsBaseUrl)
