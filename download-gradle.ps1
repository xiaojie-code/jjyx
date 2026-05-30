$ErrorActionPreference = 'Stop'
$dest = 'D:\myApp\gradle\gradle-7.6.3-all.zip'
New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
$urls = @(
  'https://mirrors.cloud.tencent.com/gradle/gradle-7.6.3-all.zip',
  'https://mirrors.aliyun.com/macports/distfiles/gradle/gradle-7.6.3-all.zip',
  'https://mirrors.huaweicloud.com/gradle/gradle-7.6.3-all.zip',
  'https://services.gradle.org/distributions/gradle-7.6.3-all.zip'
)
foreach ($url in $urls) {
  Write-Host "Trying $url"
  Remove-Item $dest -Force -ErrorAction SilentlyContinue
  curl.exe -L --retry 2 --connect-timeout 20 --max-time 240 -o $dest $url
  if ((Test-Path $dest) -and ((Get-Item $dest).Length -gt 100MB)) {
    Write-Host "Downloaded $dest"
    Get-Item $dest | Select-Object FullName,Length | Format-List
    exit 0
  }
}
throw 'Gradle distribution download failed'
