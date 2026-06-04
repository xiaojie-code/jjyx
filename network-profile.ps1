$ErrorActionPreference = 'Stop'

function Read-JjyxEnvFile {
    param([string]$Path)

    $values = @{}
    if (-not (Test-Path $Path)) {
        return $values
    }

    foreach ($line in Get-Content $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#')) {
            continue
        }
        $index = $trimmed.IndexOf('=')
        if ($index -lt 1) {
            continue
        }
        $key = $trimmed.Substring(0, $index).Trim()
        $value = $trimmed.Substring($index + 1).Trim().Trim('"').Trim("'")
        $values[$key] = $value
    }

    return $values
}

function Get-JjyxLanIpv4 {
    $ip = Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object {
            $_.IPAddress -notlike '127.*' -and
            $_.IPAddress -notlike '169.254.*' -and
            $_.InterfaceAlias -notmatch 'Loopback|Docker|VMware|VirtualBox|vEthernet'
        } |
        Sort-Object InterfaceMetric |
        Select-Object -First 1 -ExpandProperty IPAddress

    return $ip
}

function Resolve-JjyxNetworkEndpoint {
    param(
        [ValidateSet('lan', 'public')]
        [string]$NetworkProfile,
        [string]$ApiHost,
        [int]$ServerPort = 0,
        [string]$EnvFile
    )

    $envValues = Read-JjyxEnvFile -Path $EnvFile

    if (-not $NetworkProfile) {
        $NetworkProfile = $envValues['DEV_NETWORK_PROFILE']
    }
    if (-not $NetworkProfile) {
        $NetworkProfile = 'lan'
    }

    if ($ServerPort -le 0) {
        $configuredPort = $envValues['DEV_SERVER_PORT']
        if (-not $configuredPort) { $configuredPort = $envValues['PORT'] }
        if (-not [int]::TryParse([string]$configuredPort, [ref]$ServerPort)) {
            $ServerPort = 3001
        }
    }

    $scheme = 'http'
    if ($NetworkProfile -eq 'lan') {
        if (-not $ApiHost) { $ApiHost = $envValues['LAN_API_HOST'] }
        if (-not $ApiHost -or $ApiHost -eq 'auto') { $ApiHost = Get-JjyxLanIpv4 }
        if ($envValues['LAN_API_SCHEME']) { $scheme = $envValues['LAN_API_SCHEME'] }
    } else {
        if (-not $ApiHost) { $ApiHost = $envValues['PUBLIC_API_HOST'] }
        if ($envValues['PUBLIC_API_SCHEME']) { $scheme = $envValues['PUBLIC_API_SCHEME'] }
    }

    if (-not $ApiHost) {
        throw "Could not resolve API host for profile '$NetworkProfile'. Set LAN_API_HOST/PUBLIC_API_HOST in server/.env or pass -ApiHost."
    }

    $apiBaseUrl = "${scheme}://${ApiHost}:$ServerPort"

    return [pscustomobject]@{
        NetworkProfile = $NetworkProfile
        ApiHost = $ApiHost
        ServerPort = $ServerPort
        ApiBaseUrl = $apiBaseUrl
        WsBaseUrl = $apiBaseUrl
    }
}