# Prepara o Windows para o WSL2 em networkingMode=mirrored.
#
# Rode UMA VEZ, no PowerShell COMO ADMINISTRADOR:
#   powershell -ExecutionPolicy Bypass -File \\wsl$\Ubuntu\home\flavio\gabi\gabi_project_mobile\scripts\wsl-net-setup.ps1
#
# Depois rode 'wsl --shutdown' e reabra o terminal.

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal] `
  [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  Write-Host "Precisa de PowerShell como ADMINISTRADOR." -ForegroundColor Red
  Write-Host "Menu Iniciar -> 'PowerShell' -> botao direito -> Executar como administrador."
  exit 1
}

Write-Host "Removendo o portproxy do modo NAT..."
foreach ($port in 8081, 3000) {
  netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 2>$null | Out-Null
  Get-NetFirewallRule -DisplayName "WSL porta $port" -ErrorAction SilentlyContinue |
    Remove-NetFirewallRule -ErrorAction SilentlyContinue
  Write-Host "  porta $port limpa"
}

Write-Host ""
Write-Host "Liberando entrada da LAN para o WSL (firewall Hyper-V)..."
try {
  Set-NetFirewallHyperVVMSetting -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' `
    -DefaultInboundAction Allow
  Write-Host "  liberado"
} catch {
  Write-Host "  nao foi possivel: $($_.Exception.Message)" -ForegroundColor Yellow
  Write-Host "  (se o iPhone nao alcancar o Metro depois, e aqui que mexe)"
}

Write-Host ""
Write-Host "Conferindo que o portproxy ficou vazio:"
netsh interface portproxy show v4tov4

Write-Host ""
Write-Host "Agora rode:  wsl --shutdown"
Write-Host "e reabra o terminal do WSL."
