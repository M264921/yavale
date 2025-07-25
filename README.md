# MontanaOpenAiTV 🎬🔥

Plataforma personal para reproducir enlaces AceStream desde iOS, navegador o cualquier dispositivo,
usando tu propia VPN (WireGuard) y un addon de Stremio personalizado.

## Funcionalidades

✅ Reproduce enlaces AceStream desde un input directo (`index.html`)  
✅ Usa tu propia VPN con WireGuard para acceso remoto seguro  
✅ Añade catálogos personalizados con tu propio addon de Stremio  
✅ Acceso multiplataforma (iPhone, Safari, VLC, Infuse...)

## Estructura

- `app-ios/` → Proyecto HTML/WebView para compilar como app iOS
- `addon/` → Tu addon personalizado de Stremio (vacío por ahora)
- `wireguard/` → Configuraciones de cliente y servidor + guía
- `README.md` → Esta guía
- `.gitignore`, `LICENSE` → Añadir según tu preferencia

## Cómo empezar

1. Carga `app-ios/index.html` en Safari o compílalo como app con Xcode.
2. Añade tu ID AceStream y pulsa reproducir.
3. (Opcional) Conéctate a tu VPN antes con WireGuard (`wireguard/montana-client.conf`)
4. (Próximamente) Usa el addon de Stremio con tu catálogo personalizado.

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
