# =======================
#  CONFIG (ajusta aquí)
# =======================
$RepoRoot   = "C:\\Users\\Public\\RepoComparison\\yavale"   # Raíz del repo
$EngineHost = "http://80.39.151.195:6878"               # Base del engine
$Token      = "qdfEbt9IzPwB"                            # Token del engine
# Extensiones a procesar (añade/quita según tu repo)
$Extensions = @("*.html","*.htm","*.md","*.json","*.js","*.ts","*.txt","*.m3u","*.m3u8")

# =======================
#  NO TOCAR DESDE AQUÍ
# =======================
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (!(Test-Path $RepoRoot)) { throw "No existe la ruta: $RepoRoot" }

# Normaliza base engine (sin / al final)
$EngineBase = $EngineHost -replace "/+$",""

# Regex para IDs AceStream (40 hex) y detección de esquemas
$reAceID   = '(?<id>[A-Fa-f0-9]{40})'
$reProto   = "acestream://$reAceID"
$reOldGet  = '/ace/getstream\?id=(?<id>[A-Fa-f0-9]{40})(?:&[^""\s<>]*)?'
$reOldHls  = '/ace/manifest\.m3u8\?id=(?<id>[A-Fa-f0-9]{40})(?:&[^""\s<>]*)?'

# Función que, dado un ID, devuelve la URL HLS final con token
function New-HlsUrl([string]$id) {

  $t = [System.Web.HttpUtility]::UrlEncode($Token)
  return "$EngineBase/ace/manifest.m3u8?id=$id" + ($(if($Token){ "&token=$t" } else { "" }))


  $t = [System.Web.HttpUtility]::UrlEncode($Token)
  return "$EngineBase/ace/manifest.m3u8?id=$id" + ($(if($Token){ "&token=$t" } else { "" }))

  $tokenPart = if ([string]::IsNullOrEmpty($Token)) { "" } else { "&token=" + [System.Uri]::EscapeDataString($Token) }
  return "$EngineBase/ace/manifest.m3u8?id=$id$tokenPart"


}

# Recorre archivos por extensión
$files = foreach ($pat in $Extensions) {
  Get-ChildItem -Path $RepoRoot -Recurse -File -Include $pat -ErrorAction SilentlyContinue
}

if (-not $files) {
  Write-Host "No se encontraron archivos con las extensiones dadas." -ForegroundColor Yellow
  return
}

$TotalChecked   = 0
$TotalChanged   = 0
$ChangesByFile  = @{}

foreach ($f in $files) {
  $TotalChecked++
  $orig = Get-Content -Raw -LiteralPath $f.FullName

  $changed = $orig

  # 1) Reemplaza cualquier manifest/getstream existentes para apuntar a la base correcta y token nuevo
  #    (unifica todo a HLS)
  $changed = [regex]::Replace($changed, $reOldHls,  { param($m) New-HlsUrl $m.Groups['id'].Value })
  $changed = [regex]::Replace($changed, $reOldGet,  { param($m) New-HlsUrl $m.Groups['id'].Value })

  # 2) Reemplaza enlaces acestream://<ID> por HLS completo
  $changed = [regex]::Replace($changed, $reProto,   { param($m) New-HlsUrl $m.Groups['id'].Value })

  if ($changed -ne $orig) {
    # Backup .bak una sola vez por archivo
    $bak = "$($f.FullName).bak"
    if (!(Test-Path $bak)) {
      Copy-Item -LiteralPath $f.FullName -Destination $bak
    }

    # Guarda cambios
    Set-Content -LiteralPath $f.FullName -Value $changed -NoNewline
    $TotalChanged++

    # Registra cambios por archivo
    $ChangesByFile[$f.FullName] = $true
  }
}

# Informe final
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host " Archivos revisados : $TotalChecked"
Write-Host " Archivos modificados: $TotalChanged"
Write-Host " Engine base         : $EngineBase"
Write-Host " Token aplicado      : $Token"
Write-Host "====================================" -ForegroundColor Cyan

if ($TotalChanged -gt 0) {
  Write-Host "`nSe hicieron copias '.bak' de los archivos modificados." -ForegroundColor Yellow
  Write-Host "Ejemplo de commit:" -ForegroundColor Green
  Write-Host @"
cd "$RepoRoot"
git add .
git commit -m "chore: normalizar enlaces AceStream a HLS remoto ($EngineBase) con token"
git push origin main
"@
} else {
  Write-Host "No se detectaron enlaces a cambiar." -ForegroundColor Yellow
}

# TIP opcional: validar que no quedan esquemas antiguos
Write-Host "`nComprobando restos de 'acestream://', '/ace/getstream' y '/ace/manifest.m3u8' sin token..." -ForegroundColor Cyan
$leftA = Select-String -Path $files.FullName -Pattern 'acestream://[A-Fa-f0-9]{40}' -SimpleMatch:$false
$leftG = Select-String -Path $files.FullName -Pattern '/ace/getstream\?id=[A-Fa-f0-9]{40}(?![^""\s<>\r\n]*token=)' -SimpleMatch:$false
$leftH = Select-String -Path $files.FullName -Pattern '/ace/manifest\.m3u8\?id=[A-Fa-f0-9]{40}(?![^""\s<>\r\n]*token=)' -SimpleMatch:$false

if ($leftA -or $leftG -or $leftH) {
  Write-Host "¡Ojo! Quedan posibles restos por revisar manualmente:" -ForegroundColor Yellow
  if ($leftA){ Write-Host "  - acestream://  -> $($leftA | Select-Object -First 3 | ForEach-Object { $_.Path + ':' + $_.LineNumber })" }
  if ($leftG){ Write-Host "  - /ace/getstream (sin token) -> $($leftG | Select-Object -First 3 | ForEach-Object { $_.Path + ':' + $_.LineNumber })" }
  if ($leftH){ Write-Host "  - /ace/manifest.m3u8 (sin token) -> $($leftH | Select-Object -First 3 | ForEach-Object { $_.Path + ':' + $_.LineNumber })" }
} else {
  Write-Host "OK: no se encontraron patrones antiguos residuales." -ForegroundColor Green
}
