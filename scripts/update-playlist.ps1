param(
  [string]$PlaylistPath = "C:\\Users\\anton\\Documents\\playlist.m3u8",
  [switch]$AutoCommit,
  [string]$CommitMessage = "chore: update playlist",
  [switch]$Push
)

$repoRoot = (Resolve-Path "$PSScriptRoot/..\").Path
Set-Location $repoRoot

if (-not (Test-Path $PlaylistPath)) {
  Write-Host "[update-playlist] No se encontro el archivo:" $PlaylistPath -ForegroundColor Red
  exit 1
}

Write-Host "[update-playlist] Generando pagina desde:" $PlaylistPath -ForegroundColor Cyan

npm run generate:playlist -- "$PlaylistPath"
if ($LASTEXITCODE -ne 0) {
  Write-Host "[update-playlist] npm run fallo (codigo $LASTEXITCODE)." -ForegroundColor Red
  exit $LASTEXITCODE
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
