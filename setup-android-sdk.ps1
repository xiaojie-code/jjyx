$ErrorActionPreference = 'Stop'

$installRoot = 'D:\myApp'
$downloadDir = Join-Path $installRoot 'downloads'
$sdkRoot = Join-Path $installRoot 'Android\Sdk'
$javaRoot = Join-Path $installRoot 'Java'
New-Item -ItemType Directory -Force -Path $downloadDir, $sdkRoot, $javaRoot | Out-Null

$jdkZip = Join-Path $downloadDir 'temurin17-jdk.zip'
$cmdZip = Join-Path $downloadDir 'android-commandlinetools.zip'

if (-not (Test-Path $jdkZip)) {
  Write-Host 'Downloading JDK 17...'
  curl.exe -L --retry 3 --connect-timeout 30 -o $jdkZip 'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk'
}
if (-not (Test-Path $cmdZip)) {
  Write-Host 'Downloading Android command-line tools...'
  curl.exe -L --retry 3 --connect-timeout 30 -o $cmdZip 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip'
}

$jdkDir = Get-ChildItem -Path $javaRoot -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $jdkDir) {
  Write-Host 'Extracting JDK 17...'
  $jdkTemp = Join-Path $downloadDir 'jdk-extract'
  Remove-Item $jdkTemp -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path $jdkTemp | Out-Null
  Expand-Archive -Path $jdkZip -DestinationPath $jdkTemp -Force
  $extractedJdk = Get-ChildItem -Path $jdkTemp -Directory | Select-Object -First 1
  Move-Item -Path $extractedJdk.FullName -Destination (Join-Path $javaRoot $extractedJdk.Name) -Force
  $jdkDir = Get-Item (Join-Path $javaRoot $extractedJdk.Name)
}

$cmdToolsLatest = Join-Path $sdkRoot 'cmdline-tools\latest'
if (-not (Test-Path (Join-Path $cmdToolsLatest 'bin\sdkmanager.bat'))) {
  Write-Host 'Extracting Android command-line tools...'
  $cmdTemp = Join-Path $downloadDir 'cmdline-tools-extract'
  Remove-Item $cmdTemp -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path $cmdTemp | Out-Null
  Expand-Archive -Path $cmdZip -DestinationPath $cmdTemp -Force
  Remove-Item $cmdToolsLatest -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path (Split-Path $cmdToolsLatest -Parent) | Out-Null
  Move-Item -Path (Join-Path $cmdTemp 'cmdline-tools') -Destination $cmdToolsLatest -Force
}

$env:JAVA_HOME = $jdkDir.FullName
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:Path = "$($jdkDir.FullName)\bin;$cmdToolsLatest\bin;$sdkRoot\platform-tools;$env:Path"

$sdkManager = Join-Path $cmdToolsLatest 'bin\sdkmanager.bat'
Write-Host 'Installing Android SDK packages...'
& $sdkManager --sdk_root=$sdkRoot --install 'platform-tools' 'platforms;android-35' 'build-tools;35.0.0' 'cmdline-tools;latest'

Write-Host 'Accepting Android SDK licenses...'
$yes = "y`n" * 20
$yes | & $sdkManager --sdk_root=$sdkRoot --licenses

[Environment]::SetEnvironmentVariable('JAVA_HOME', $jdkDir.FullName, 'User')
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdkRoot, 'User')
[Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', $sdkRoot, 'User')
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$entries = @("$($jdkDir.FullName)\bin", "$cmdToolsLatest\bin", "$sdkRoot\platform-tools", 'D:\myApp\flutter\flutter\bin')
foreach ($entry in $entries) {
  if (($userPath -split ';') -notcontains $entry) {
    $userPath = if ([string]::IsNullOrWhiteSpace($userPath)) { $entry } else { "$userPath;$entry" }
  }
}
[Environment]::SetEnvironmentVariable('Path', $userPath, 'User')

Write-Host 'Configuring Flutter Android SDK path...'
& 'D:\myApp\flutter\flutter\bin\flutter.bat' config --android-sdk $sdkRoot

[pscustomobject]@{
  JAVA_HOME = $jdkDir.FullName
  ANDROID_HOME = $sdkRoot
  SdkManager = $sdkManager
} | Format-List
