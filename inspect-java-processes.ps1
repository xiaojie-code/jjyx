$ErrorActionPreference = 'SilentlyContinue'
Get-CimInstance Win32_Process -Filter "name='java.exe'" |
  Select-Object ProcessId,ParentProcessId,CommandLine |
  Format-List
