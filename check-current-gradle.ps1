$ErrorActionPreference = 'SilentlyContinue'
$process = Get-Process -Id 19668
if ($process) {
  Write-Host '=== Gradle daemon ==='
  $process | Select-Object Id,CPU,WorkingSet,StartTime | Format-List
}
Write-Host '=== Remote connections ==='
Get-NetTCPConnection -State Established -OwningProcess 19668 |
  Group-Object RemoteAddress |
  Select-Object Name,Count |
  Sort-Object Count -Descending |
  Format-Table -AutoSize
