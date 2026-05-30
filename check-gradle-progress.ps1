$ErrorActionPreference = 'SilentlyContinue'
$cutoff = (Get-Date).AddMinutes(-5)
Write-Host '=== Java processes ==='
Get-Process java | Select-Object Name,Id,CPU,WorkingSet,StartTime,Path | Format-Table -AutoSize
Write-Host '=== Recent Gradle cache files ==='
$paths = @("$env:USERPROFILE\.gradle\caches\modules-2\files-2.1", "$env:USERPROFILE\.gradle\caches\modules-2\metadata-2.101")
Get-ChildItem -Path $paths -Recurse -Force |
  Where-Object { $_.LastWriteTime -gt $cutoff -and -not $_.PSIsContainer } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 30 FullName,Length,LastWriteTime |
  Format-Table -AutoSize
