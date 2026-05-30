$ErrorActionPreference = 'Stop'
$env:JAVA_HOME = 'D:\myApp\Java\jdk-17.0.19+10'
$env:ANDROID_HOME = 'D:\myApp\Android\Sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;D:\myApp\flutter\flutter\bin;$env:Path"
Set-Location 'd:\myApp\work_ycykj\jjyx\jjyx\app'
& 'D:\myApp\flutter\flutter\bin\flutter.bat' build apk --debug
