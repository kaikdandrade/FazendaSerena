$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

function Find-Python {
    if (Get-Command py -ErrorAction SilentlyContinue) { return @("py", "-3") }
    if (Get-Command python -ErrorAction SilentlyContinue) { return @("python") }
    throw "Python 3 não encontrado. Ele é usado somente para incorporar o ícone nos executáveis."
}

$python = Find-Python
$root = Split-Path $PSScriptRoot -Parent
$downloads = Join-Path $root "downloads"
New-Item -ItemType Directory -Force -Path $downloads | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot "payload") | Out-Null

function Invoke-PythonIcon([string]$exe) {
    if ($python.Count -eq 2) {
        & $python[0] $python[1] "embed_icon.py" $exe "favicon.ico"
    } else {
        & $python[0] "embed_icon.py" $exe "favicon.ico"
    }
    if ($LASTEXITCODE -ne 0) { throw "Falha ao incorporar ícone em $exe" }
}

Write-Host "[1/4] Launcher Windows x64"
$env:GOOS = "windows"
$env:GOARCH = "amd64"
go build -trimpath -ldflags="-H windowsgui -s -w" -o "payload/FazendaSerena.exe" "launcher.go"
if ($LASTEXITCODE -ne 0) { throw "Falha no build do launcher x64" }
Invoke-PythonIcon "payload/FazendaSerena.exe"

Write-Host "[2/4] Setup Windows x64"
go build -trimpath -ldflags="-H windowsgui -s -w" -o (Join-Path $downloads "FazendaSerena-Setup-x64.exe") "setup.go"
if ($LASTEXITCODE -ne 0) { throw "Falha no build do setup x64" }
Invoke-PythonIcon (Join-Path $downloads "FazendaSerena-Setup-x64.exe")

Write-Host "[3/4] Launcher Windows ARM64"
$env:GOARCH = "arm64"
go build -trimpath -ldflags="-H windowsgui -s -w" -o "payload/FazendaSerena.exe" "launcher.go"
if ($LASTEXITCODE -ne 0) { throw "Falha no build do launcher ARM64" }
Invoke-PythonIcon "payload/FazendaSerena.exe"

Write-Host "[4/4] Setup Windows ARM64"
go build -trimpath -ldflags="-H windowsgui -s -w" -o (Join-Path $downloads "FazendaSerena-Setup-arm64.exe") "setup.go"
if ($LASTEXITCODE -ne 0) { throw "Falha no build do setup ARM64" }
Invoke-PythonIcon (Join-Path $downloads "FazendaSerena-Setup-arm64.exe")

# Deixa o payload de desenvolvimento em x64 por padrão.
$env:GOARCH = "amd64"
go build -trimpath -ldflags="-H windowsgui -s -w" -o "payload/FazendaSerena.exe" "launcher.go"
Invoke-PythonIcon "payload/FazendaSerena.exe"

Remove-Item Env:GOOS -ErrorAction SilentlyContinue
Remove-Item Env:GOARCH -ErrorAction SilentlyContinue

Write-Host "Build concluído. Os instaladores já possuem o ícone incorporado no próprio .exe."
