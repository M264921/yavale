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

## Configuración inicial

1. Asegúrate de tener **Node.js** y **npm** instalados en tu sistema.
2. Ejecuta `./setup.sh` para instalar las dependencias necesarias y mostrar el contenido de la carpeta `html/`.
3. Si vas a usar la VPN, consulta la guía `vpn/how-to-connect.md` y carga `vpn/montana-client.conf` en tu aplicación WireGuard.

## Uso

1. Abre `index.html` o la aplicación iOS generada.
2. Introduce tu identificador AceStream y pulsa reproducir.
3. Con la VPN activa podrás acceder a tu servidor AceStream como si estuvieras en tu red local.

---
Proyecto iniciado por @M264921 con ❤️ y ayudita de ChatGPT.
