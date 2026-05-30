$ErrorActionPreference = 'Continue'
$env:JAVA_HOME = 'D:\myApp\Java\jdk-17.0.19+10'
$env:ANDROID_HOME = 'D:\myApp\Android\Sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;D:\myApp\flutter\flutter\bin;$env:Path"
$log = 'd:\myApp\work_ycykj\jjyx\jjyx\android-offline-short.log'
Remove-Item $log -Force -ErrorAction SilentlyContinue
Set-Location 'd:\myApp\work_ycykj\jjyx\jjyx\app\android'
& '.\gradlew.bat' assembleDebug --offline --stacktrace `
  '-Ptarget-platform=android-arm,android-arm64,android-x64' `
  '-Ptarget=lib\main.dart' `
  '-Pbase-application-name=android.app.Application' `
  '-Pdart-obfuscation=false' `
  '-Ptrack-widget-creation=true' `
  '-Ptree-shake-icons=false' *> $log
Write-Host "ExitCode=$LASTEXITCODE"
Write-Host "Log=$log"
