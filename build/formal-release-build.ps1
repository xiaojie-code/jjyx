$ErrorActionPreference = 'Stop'

$repoRoot = 'D:\myApp\work_ycykj\jjyx\jjyx'
$env:GRADLE_USER_HOME = Join-Path $repoRoot 'app\android\.gradle-user-home'
$env:JAVA_HOME = 'D:\myApp\Java\jdk-17.0.19+10'
$env:ANDROID_HOME = 'D:\myApp\Android\Sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;D:\myApp\flutter\flutter\bin;$env:Path"

Set-Location (Join-Path $repoRoot 'app\android')

$gradleArgs = @(
    '--offline'
    '--no-daemon'
    '--max-workers=2'
    '--console=plain'
    '-Ptarget-platform=android-arm64'
    '-Ptarget=lib/main.dart'
    '-Pbase-application-name=android.app.Application'
    '-Pdart-defines=QVBJX0JBU0VfVVJMPWh0dHA6Ly8xMDEuMzIuMjUyLjc5,V1NfQkFTRV9VUkw9aHR0cDovLzEwMS4zMi4yNTIuNzk=,RE9XTkxPQURfQkFTRV9VUkw9aHR0cHM6Ly9kb3dubG9hZC54bi0tOWtxcjY0YjRyYmx1ZzFzajJydWdwbGZqZC5jbg=='
    '-Pdart-obfuscation=false'
    '-Ptrack-widget-creation=false'
    '-Ptree-shake-icons=false'
    'assembleRelease'
)

& '.\gradlew.bat' @gradleArgs
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

$apkDir = Join-Path $repoRoot 'app\build\app\outputs\flutter-apk'
$sourceApk = Join-Path $apkDir 'app-release.apk'
$localProperties = Join-Path $repoRoot 'app\android\local.properties'
$versionNameLine = Get-Content -LiteralPath $localProperties |
    Where-Object { $_ -match '^flutter\.versionName=' } |
    Select-Object -First 1
$versionName = if ($versionNameLine) {
    ($versionNameLine -split '=', 2)[1].Trim()
} else {
    ''
}
if (-not $versionName) {
    throw "flutter.versionName not found in $localProperties"
}
$targetApk = Join-Path $apkDir "yunai-$versionName.apk"
Copy-Item -LiteralPath $sourceApk -Destination $targetApk -Force
Write-Output "FORMAL_APK=$targetApk"
