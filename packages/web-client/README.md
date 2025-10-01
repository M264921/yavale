# YaVale Web Client

Plantilla HTML/JS para reproducir streams AceStream (via reproductor externo) o HLS directamente en el navegador.

## Desarrollo

```bash
npm run dev:web
```

- Abre `http://localhost:5173/index.html`.
- Introduce la URL (m3u8, mp4, ace:// via addon externo) y pulsa "Reproducir aqui".
- Configura los botones "Abrir con" en `js/config.js` con los esquemas propios de tus apps.

## Deploy

El contenido es estatico, de modo que puedes subir la carpeta tal cual a cualquier hosting o integrarlo en `packages/ios-app`.
