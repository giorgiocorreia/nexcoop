# NexCoop — ambiente local de preview (sem deploy)
# Uso: .\scripts\start-local-preview.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Set-Location $Root

if (-not (Test-Path ".env.local")) {
  Write-Host "ERRO: .env.local nao encontrado." -ForegroundColor Red
  Write-Host "Copie de C:\Users\Lenovo\Documents\nexcoop\.env.local"
  exit 1
}

if (-not (Test-Path "node_modules")) {
  Write-Host "Instalando dependencias..."
  npm install
}

if (Test-Path ".vercel") {
  Write-Host "Removendo link Vercel desta pasta (protecao contra deploy acidental)..."
  Remove-Item ".vercel" -Recurse -Force
}

$branch = git branch --show-current 2>$null
Write-Host ""
Write-Host "  NexCoop — Preview Local" -ForegroundColor Cyan
Write-Host "  Branch:  $branch"
Write-Host "  URL:     http://localhost:3001"
Write-Host "  Deploy:  BLOQUEADO nesta pasta"
Write-Host ""

npm run dev:preview