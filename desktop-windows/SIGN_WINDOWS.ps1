$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# O nome do editor exibido pelo aviso de segurança do Windows vem da assinatura
# Authenticode, não de um texto solto no instalador. Este script pressupõe que
# você já possui um certificado de assinatura de código confiável em .pfx.
$pfx = $env:FAZENDA_SIGN_PFX
$password = $env:FAZENDA_SIGN_PASSWORD
if (-not $pfx -or -not (Test-Path $pfx)) { throw "Defina FAZENDA_SIGN_PFX com o caminho do certificado Authenticode (.pfx)." }
if (-not $password) { throw "Defina FAZENDA_SIGN_PASSWORD com a senha do certificado." }
$timestampUrl = if ($env:FAZENDA_TIMESTAMP_URL) { $env:FAZENDA_TIMESTAMP_URL } else { "http://timestamp.digicert.com" }
$signtool = Get-Command signtool.exe -ErrorAction SilentlyContinue
if (-not $signtool) { throw "signtool.exe não encontrado. Instale o Windows SDK." }
$root = Split-Path $PSScriptRoot -Parent
$files = @((Join-Path $root "downloads\FazendaSerena-Setup-x64.exe"),(Join-Path $root "downloads\FazendaSerena-Setup-arm64.exe"),(Join-Path $PSScriptRoot "payload\FazendaSerena.exe")) | Where-Object { Test-Path $_ }
foreach ($file in $files) {
  Write-Host "Assinando $file"
  & $signtool.Source sign /fd SHA256 /f $pfx /p $password /tr $timestampUrl /td SHA256 $file
  if ($LASTEXITCODE -ne 0) { throw "Falha ao assinar $file" }
  & $signtool.Source verify /pa /v $file
  if ($LASTEXITCODE -ne 0) { throw "A assinatura não foi validada em $file" }
}
Write-Host "Assinatura concluída e verificada."
