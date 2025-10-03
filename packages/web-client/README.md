# YaVale Web Client

Cliente estatico que actua como fuente unica de verdad para la aplicacion web (GitHub Pages) y la app nativa de iOS.

## Estructura

```
public/
  index.html                 # Pagina principal (playlist + herramientas AceStream)
  assets/                    # Scripts y estilos auxiliares
  data/                      # JSON con enlaces rapidos
  playlist.json              # Salida parseada de la playlist M3U8
  .nojekyll                  # Evita que GitHub Pages aplique Jekyll
  apple-app-site-association # Dominio asociado para iOS
  .well-known/               # Copia adicional del fichero anterior
```

Trabaja sobre `public/` y ejecuta los scripts desde la raiz del repo para propagar los cambios.

## Desarrollo local

```bash
npm run dev:web
```

Levanta un servidor estatico sobre `packages/web-client/public` para previsualizar la pagina en `http://localhost:5173`.

## Sincronizacion

Desde la raiz del repo ejecuta:

```bash
npm run sync:webapp
```

Esto copia el contenido de `public/` a:

- `docs/` (deploy de GitHub Pages)
- `packages/ios-app/WebBundle/` (recursos embebidos en la app SwiftUI)

El comando `npm run generate:playlist -- <ruta.m3u8>` genera `index.html` y `playlist.json` dentro de `public/` y lanza la sincronizacion automaticamente.
