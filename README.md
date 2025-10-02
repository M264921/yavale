# MontanaOpenAiTV 🎬🔥

Plataforma personal para reproducir enlaces AceStream desde iOS, navegador o cualquier dispositivo,
usando tu propia VPN (WireGuard) y un addon de Stremio personalizado.

## Funcionalidades

✅ Reproduce enlaces AceStream desde un input directo (`index.html` y `docs/index.html`)
✅ Usa tu propia VPN con WireGuard para acceso remoto seguro
✅ Añade catálogos personalizados con tu propio addon de Stremio
✅ Acceso multiplataforma (iPhone, Safari, VLC, Infuse...)
✅ Gestiona playlists AceStream dinámicas con botones para abrir, copiar o reproducir vía HTTP

## Estructura

- `app-ios/` → Proyecto HTML/WebView para compilar como app iOS
- `addon/` → Tu addon personalizado de Stremio (vacío por ahora)
- `wireguard/` → Configuraciones de cliente y servidor + guía
- `README.md` → Esta guía
- `.gitignore`, `LICENSE` → Añadir según tu preferencia
- `docs/` → Sitio estático publicado en GitHub Pages con la playlist dinámica

## Cómo empezar

1. Carga `app-ios/index.html` o `docs/index.html` (GitHub Pages) en tu navegador o compílalo como app con Xcode.
2. Configura la URL del motor (y token, si aplica) desde el formulario o pasando `?engine=` / `?token=` en la URL.
3. Añade tu ID AceStream o selecciona uno de la playlist y pulsa reproducir.
4. (Opcional) Conéctate a tu VPN antes con WireGuard (`wireguard/montana-client.conf`).
5. (Próximamente) Usa el addon de Stremio con tu catálogo personalizado.

## Playlist dinámica

El sitio en `docs/` y la versión para app iOS cargan la lista de enlaces desde `docs/data/acestream-links.json`.

1. Edita ese archivo y añade tus entradas en el arreglo `links` con el formato `{ "name": "Canal", "url": "acestream://ID" }`.
2. Los botones permiten abrir directamente el esquema `acestream://`, copiarlo al portapapeles o generar la URL HTTP del motor (`/ace/getstream?id=`) usando la configuración guardada.
3. Los parámetros `engine` y `token` se pueden pasar por querystring y se persistirán en `localStorage`.

---
Proyecto iniciado por @M264921 con ❤️ y ayudita de ChatGPT.

## Scripts AceStream

Los archivos `P2P_Search.min.acestream.js` y `Magic_Player.acestream.js` forman parte del proyecto **Ace Script** de AceStream. No se incluyen en este repositorio por cuestiones de licencia.

En `html/app_index.html` e `index.html` se enlazan a través del CDN público de AceStream:

```html
<script src="https://cdn.jsdelivr.net/gh/acestream/ace-script@latest/dist/P2P_Search.min.acestream.js"></script>
<script src="https://cdn.jsdelivr.net/gh/acestream/ace-script@latest/dist/Magic_Player.acestream.js"></script>
```

Si deseas utilizarlos en local, descárgalos desde [https://github.com/acestream/ace-script](https://github.com/acestream/ace-script) y colócalos junto a tus archivos HTML.
