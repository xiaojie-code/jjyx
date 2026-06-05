param(
	[ValidateSet('lan', 'public')]
	[string]$NetworkProfile,
	[string]$ApiHost,
	[int]$ServerPort = 0,
	[string]$TargetPlatform = '',
	[switch]$VerboseBuild
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

Set-Location (Join-Path $RepoRoot 'app')
$FlutterArgs = @(
	'--no-version-check',
	'build',
	'apk',
	'--debug',
	"--dart-define=API_BASE_URL=$($Endpoint.ApiBaseUrl)",
	"--dart-define=WS_BASE_URL=$($Endpoint.WsBaseUrl)"
)
if ($TargetPlatform) {
	$FlutterArgs += @('--target-platform', $TargetPlatform)
}
if ($VerboseBuild) {
	$FlutterArgs += '-v'
}

& 'D:\myApp\flutter\flutter\bin\flutter.bat' @FlutterArgs
