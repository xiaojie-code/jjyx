$ErrorActionPreference = 'Stop'
$env:JAVA_HOME = 'D:\myApp\Java\jdk-17.0.19+10'
$env:ANDROID_HOME = 'D:\myApp\Android\Sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:Path"
& 'D:\myApp\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat' --sdk_root='D:\myApp\Android\Sdk' 'platforms;android-36' 'build-tools;36.0.0'
