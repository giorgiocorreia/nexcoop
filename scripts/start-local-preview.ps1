# NexCoop — ambiente local de preview (sem deploy)
# Uso: .\scripts\start-local-preview.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Set-Location $Root

function Sync-SupabaseEnv {
  $envPath = Join-Path $Root ".env.local"
  $needsSync = $true
  if (Test-Path $envPath) {
    $content = Get-Content $envPath -Raw
    if ($content -match 'NEXT_PUBLIC_SUPABASE_URL=\S+' -and $content -match 'NEXT_PUBLIC_SUPABASE_ANON_KEY=\S+') {
      $needsSync = $false
    }
  }
  if (-not $needsSync) { return }

  Write-Host "Buscando credenciais Supabase via CLI..."
  $keys = supabase projects api-keys --project-ref cufovlntqfobutwvfcea 2>$null | Out-String
  if ($keys -notmatch 'anon\s+\|\s+(\S+)') {
    Write-Host "ERRO: nao foi possivel obter chaves Supabase. Rode: supabase login" -ForegroundColor Red
    exit 1
  }
  $anon = $Matches[1]
  $service = ''
  if ($keys -match 'service_role\s+\|\s+(\S+)') { $service = $Matches[1] }

  $map = [ordered]@{}
  if (Test-Path $envPath) {
    foreach ($line in Get-Content $envPath) {
      if ($line -match '^([^#=]+)=(.*)$') { $map[$matches[1].Trim()] = $matches[2] }
    }
  }
  $map['NEXT_PUBLIC_SUPABASE_URL'] = 'https://cufovlntqfobutwvfcea.supabase.co'
  $map['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = $anon
  if ($service) { $map['SUPABASE_SERVICE_ROLE_KEY'] = $service }
  Set-Content -Path $envPath -Value ($map.Keys | ForEach-Object { "$_=$($map[$_])" }) -Encoding UTF8
  Write-Host "Credenciais Supabase gravadas em .env.local" -ForegroundColor Green
}

Sync-SupabaseEnv

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