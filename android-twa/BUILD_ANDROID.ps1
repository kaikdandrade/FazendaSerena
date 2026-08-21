$ErrorActionPreference = "Stop"
Write-Host "Fazenda Serena - gerador do aplicativo Android" -ForegroundColor Green
Write-Host ""
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js nao foi encontrado. Instale o Node.js antes de continuar."
}
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$generated = Join-Path $here "generated"
$manifestUrl = "https://fazenda-serena.web.app/manifest.webmanifest"

if (-not (Test-Path $generated)) {
  Write-Host "Primeira configuracao do wrapper Android." -ForegroundColor Cyan
  Write-Host "Quando o Bubblewrap perguntar o Package ID, use: com.fazendaserena.game"
  Write-Host "Guarde a chave de assinatura e as senhas. Elas identificam o aplicativo para sempre."
  npx -y @bubblewrap/cli init --manifest=$manifestUrl --directory=$generated
}

Push-Location $generated
try {
  Write-Host "Gerando APK e AAB..." -ForegroundColor Cyan
  npx -y @bubblewrap/cli build
  $apk = Join-Path $generated "app-release-signed.apk"
  $aab = Join-Path $generated "app-release-bundle.aab"
  $project = Resolve-Path (Join-Path $here "..")
  $downloads = Join-Path $project "downloads"
  New-Item -ItemType Directory -Force -Path $downloads | Out-Null
  if (Test-Path $apk) { Copy-Item $apk (Join-Path $downloads "FazendaSerena-Android.apk") -Force }
  if (Test-Path $aab) { Copy-Item $aab (Join-Path $downloads "FazendaSerena-Android.aab") -Force }

  Write-Host "Gerando Digital Asset Links..." -ForegroundColor Cyan
  $assetLinks = Join-Path $project ".well-known\assetlinks.json"
  New-Item -ItemType Directory -Force -Path (Split-Path $assetLinks -Parent) | Out-Null
  npx -y @bubblewrap/cli fingerprint generateAssetLinks --output=$assetLinks

  Write-Host "" 
  Write-Host "APK gerado em downloads/FazendaSerena-Android.apk" -ForegroundColor Green
  Write-Host "assetlinks.json gerado em .well-known/assetlinks.json" -ForegroundColor Green
  Write-Host "Agora publique o Hosting: firebase deploy --only hosting" -ForegroundColor Yellow
} finally {
  Pop-Location
}
