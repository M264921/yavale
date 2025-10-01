# @yavale/stremio-addon

Addon Stremio que expone un catalogo de canales AceStream y genera streams apuntando a tu servidor remoto.

## Uso rapido

```bash
npm install
ACESTREAM_BASE_URL=http://toninomontana.ddns.net:6878 npm start
```

Variables soportadas:

- `ACESTREAM_BASE_URL` (obligatoria si cambias de host): URL base de tu engine AceStream.
- `ACESTREAM_STREAM_PATH` (opcional): ruta del endpoint (`/ace/getstream?id=` por defecto).
- `PORT`: puerto HTTP (7000 por defecto).

El addon responde a:

- `GET /manifest.json`
- `GET /catalog/movie/montanatv.catalog.json`
- `GET /stream/movie/<id>.json` (requiere IDs que comiencen por `acestream:`)

El catalogo de ejemplo vive en `catalog.json`. Actualizalo con los canales que quieras publicar.
