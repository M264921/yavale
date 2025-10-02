# YaVale Monorepo

Monorepo personal para centralizar todo el ecosistema Montana/YaVale:

- **`packages/web-client`** - cliente web estatico (usable como app web o base para Safari/iOS).
- **`packages/ios-app`** - proyecto Xcode (WebView) para empaquetar el cliente en iPhone/iPad.
- **`packages/stremio-addon`** - addon Stremio con catalogo AceStream que apunta a tu servidor remoto.
- **`packages/vpn`** - plantillas y guias para WireGuard (configura tus claves antes de usarlas).
- **`docs/`** - sitio estatico listo para GitHub Pages con tu lista M3U8 renderizada.
- **`playlists/`** - copia rastreada de la playlist M3U8 que alimenta la pagina publica.

## Enlaces universales entre la app iOS y la web

Si publicas el sitio estatico (`docs/`) en GitHub Pages puedes hacer que los enlaces `https://montanaopenaitv.github.io/yavale/...`
abran directamente la app nativa en iPhone/iPad.

1. **Dominio asociado**
   - Xcode ya tiene activada la capacidad *Associated Domains* con el dominio `applinks:montanaopenaitv.github.io` dentro de `packages/ios-app/yavale/APP.entitlements`.
   - Si usas un dominio personalizado, sustituye la entrada por `applinks:tu-dominio.com` y vuelve a compilar.
2. **Fichero `apple-app-site-association`**
   - El repo incluye `docs/apple-app-site-association` y `docs/.well-known/apple-app-site-association` con la configuracion para el bundle `montanaAI.tv.yavale` (Team ID `2WULUBTL4D`).
   - Ajusta los campos `appID` y `paths` si cambias de identificador o si la web sirve los enlaces desde otra ruta.
   - En la app, actualiza `DeepLinkConfiguration.allowedHosts` en `ContentView.swift` para que coincida con el dominio que publiques.
3. **Sincroniza y despliega**
   - Sube los cambios a GitHub y espera a que GitHub Pages vuelva a publicar el sitio.
   - La carpeta `docs/` incluye `.nojekyll`, por lo que los JSON se sirven tal cual en cuanto el despliegue termine (suele tardar 1-2 minutos).
   - Verifica en un dispositivo real que al abrir `https://montanaopenaitv.github.io/yavale/` en Safari se ofrece abrir la app.

> El fichero `.nojekyll` dentro de `docs/` garantiza que GitHub Pages sirva los JSON tal cual.

## Requisitos

- Node.js 18+ (para el addon y los scripts CLI).
- npm o pnpm (instala dependencias dentro de cada paquete que lo requiera).
- Xcode (si vas a tocar `packages/ios-app`).

## Scripts utiles

En la raiz del repo:

```bash
# Servidor estatico del cliente web (sirve packages/web-client)
npm run dev:web

# Levanta el addon de Stremio en http://localhost:7000
npm run dev:addon

# Genera/actualiza GitHub Pages desde una playlist M3U8
npm run generate:playlist -- "C:\\Users\\anton\\Documents\\playlist.m3u8"
```

> El flag `--` permite pasar la ruta como primer argumento. Si omites la ruta, usara `playlists/playlist.m3u8`.

### Normalizar enlaces AceStream a tu motor remoto

- **`scripts/normalize-acestream.ps1`** recorre todo el repo y reemplaza cualquier `acestream://<HASH>` o URLs antiguas de `/ace/getstream`/`/ace/manifest.m3u8` para que apunten a tu engine remoto con token.
- Abre el script y ajusta las variables del bloque **CONFIG**:
  - `$RepoRoot`: ruta local del repositorio.
  - `$EngineHost`: base del engine (por ejemplo `http://80.39.151.195:6878`).
  - `$Token`: token actual del engine.
  - `$Extensions`: extensiones que quieres analizar.
- Ejecuta el script desde PowerShell 5.1+ o PowerShell Core:

  ```powershell
  pwsh -File scripts/normalize-acestream.ps1
  ```

- El script genera copias `.bak` de cada archivo modificado y muestra un resumen con el número de coincidencias para que puedas revisar los cambios antes de hacer commit.

Dentro de `packages/stremio-addon/` instala dependencias la primera vez:

```bash
cd packages/stremio-addon
npm install
```

Variables de entorno soportadas en el addon:

- `ACESTREAM_BASE_URL` - URL base de tu servidor AceStream (`http://mi-dominio:6878`).
- `ACESTREAM_STREAM_PATH` - ruta del endpoint (`/ace/getstream?id=` por defecto).
- `PORT` - puerto HTTP (7000 por defecto).

## Como publicar la playlist en GitHub Pages

1. Exporta o actualiza tu lista en `C:\Users\anton\Documents\playlist.m3u8` (o la ruta que prefieras).
2. Ejecuta `npm run generate:playlist -- "ruta/a/tu/playlist.m3u8"`.
   - El script copia el fichero a `playlists/playlist.m3u8`.
   - Renderiza `docs/index.html` + `docs/playlist.json` con un grid filtrable de canales.
3. Haz commit y push. En GitHub, configura **Settings -> Pages -> Source: `main` / carpeta `/docs`**.
4. Tu pagina quedara disponible en `https://<tu-usuario>.github.io/<repo>/` con un buscador y botones de copia.

> Cada vez que edites la M3U8, repite el script y vuelve a subir los cambios para mantener la pagina sincronizada.

### Personalizar la lista de reproductores

- Edita `playlists/player-presets.json` para reflejar los dispositivos y apps reales que tienes instalados.
- Cada preset acepta los campos:
  - `id`: identificador unico (sin espacios) para referencias internas.
  - `label`: el texto que veras en el desplegable.
  - `type`: actualmente `acestream` (usa el enlace tal cual / convierte magnet a hash) o `template`.
  - `template`: (solo si `type` es `template`) URL con placeholders disponibles:
    - `{{url}}` / `{{url_raw}}` - enlace completo codificado / sin codificar.
    - `{{infohash}}` / `{{infohash_encoded}}` - hash AceStream si el enlace lo incluye.
    - `{{title}}` / `{{title_encoded}}` - titulo del canal.
  - `icon` (opcional): ruta o URL a un icono de 18x18px para mostrar junto al nombre.
- Usa el bloque `availability` para mostrar cada reproductor solo cuando tenga sentido:
  - `platforms`: lista de etiquetas admitidas (`windows`, `mac`, `linux`, `ios`, `android`, `webos`, `smart-tv`, `desktop`, `mobile`, `tablet`, `safari`, `chrome`, `firefox`, etc.). Si ninguna coincide con tu dispositivo actual, ese reproductor se oculta.
  - `excludePlatforms`: etiquetas que deben ocultar el reproductor si el navegador pertenece a ellas.
  - `hostnames`: restringe a dominios concretos (útil si solo quieres que aparezca cuando entras desde una URL interna como `playlist.casita.local`).
  - `http`: lista de URLs (string o `{ url, method, timeout, mode, expectStatus }`) que el navegador intentará consultar. Solo si al menos una responde, el reproductor se mostrará. Esto permite detectar dispositivos en tu misma red (por ejemplo, `http://192.168.1.80:3000/ping`).
- Opcional: crea otros presets en un fichero alternativo y ejecútalo con `PLAYER_PRESETS=mi-archivo.json npm run generate:playlist`.
- Cuando uses la variable `PLAYER_PRESETS`, la ruta se resuelve respecto a la raiz del repo (puedes pasar rutas absolutas si lo prefieres).
- El script de PowerShell `scripts/update-playlist.ps1` acepta `-PlayerPresetPath "ruta\a\mis-presets.json"` para automatizar este override.
- Si el archivo contiene errores o campos faltantes, el generador volvera a los valores por defecto y avisara en consola.

## Estructura resumida

```
packages/
  ios-app/             # Proyecto Xcode (App WebView)
  stremio-addon/       # Addon Stremio (Node.js)
  web-client/          # HTML/JS estatico del reproductor web
  vpn/                 # Plantillas y guias WireGuard
scripts/
  dev-server.js        # Servidor estatico para el cliente web
  generate-playlist-page.js
  normalize-acestream.ps1 # Normaliza enlaces AceStream al motor remoto
playlists/
  playlist.m3u8        # Ultima copia versionada de tu lista
  player-presets.json  # Ejemplo de configuracion para el selector de reproductor
docs/
  index.html           # Pagina publica (GitHub Pages)
  playlist.json        # Datos parseados (util para APIs/automatizaciones)
```

## Proximos pasos recomendados

- Anadir scripts npm que ejecuten `npm install` recursivo (workspaces) si el monorepo crece.
- Automatizar la actualizacion de la playlist con GitHub Actions (subida cada vez que hagas push).
- Integrar autenticacion o proteccion en el addon si lo expones publicamente.

---
Proyecto iniciado por @M264921 y adoptado como monorepo YaVale. Disfruta tus streams.
