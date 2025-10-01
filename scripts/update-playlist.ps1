param(
  [string]$PlaylistPath = "C:\\Users\\anton\\Documents\\playlist.m3u8",
  [switch]$AutoCommit,
  [string]$CommitMessage = "chore: update playlist",
  [switch]$Push,
  [string]$PlayerPresetPath
)

$repoRoot = (Resolve-Path "$PSScriptRoot/..\").Path
Set-Location $repoRoot

if (-not (Test-Path $PlaylistPath)) {
  Write-Host "[update-playlist] No se encontro el archivo:" $PlaylistPath -ForegroundColor Red
  exit 1
}

Write-Host "[update-playlist] Generando pagina desde:" $PlaylistPath -ForegroundColor Cyan

if ($PlayerPresetPath) {
  Write-Host "[update-playlist] Usando presets personalizados:" $PlayerPresetPath -ForegroundColor Cyan
  $env:PLAYER_PRESETS = $PlayerPresetPath
}

npm run generate:playlist -- "$PlaylistPath"
$exitCode = $LASTEXITCODE

if ($PlayerPresetPath) {
  Remove-Item Env:PLAYER_PRESETS -ErrorAction SilentlyContinue
}

if ($exitCode -ne 0) {
  Write-Host "[update-playlist] npm run fallo (codigo $exitCode)." -ForegroundColor Red
  exit $exitCode
}

if ($AutoCommit) {
  Write-Host "[update-playlist] Preparando commit..." -ForegroundColor Cyan
  git add docs/index.html docs/playlist.json playlists/playlist.m3u8
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  git commit -m $CommitMessage
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  if ($Push) {
    Write-Host "[update-playlist] Pushing a remoto..." -ForegroundColor Cyan
    git push
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
}

Write-Host "[update-playlist] Finalizado." -ForegroundColor Green
