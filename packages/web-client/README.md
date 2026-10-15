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


## Catálogo y reproductores del motor AceStream

La página incluye una copia de la playlist para poder abrirla sin un motor.
Para consultar el catálogo actual, abre **Configurar motor y catálogo**, introduce
la URL base de tu motor y pulsa **Sincronizar canales**. El token API es opcional
para los métodos públicos; si tu servidor lo exige, introdúcelo en ese navegador.
La URL y los tokens se guardan en los ajustes locales del navegador. No se añaden
a los archivos publicados ni se envían a Google o GitHub.

La sincronización consulta todas las páginas de `/search` (200 resultados por
petición). Para motores antiguos que respondan HTTP 404 a ese endpoint, utiliza
`/server/api?method=search`. Conserva todos los infohash distintos, incluso
si varios enlaces tienen el mismo nombre. No intenta adivinar equivalencias entre
nombres ni sustituye hashes a partir de capturas o títulos parecidos.
La búsqueda y el filtro de grupos actúan sobre el catálogo completo; la vista
muestra 100 enlaces cada vez y permite mostrar más.

Con **Usar catálogo del motor** activado se consulta de nuevo al abrir la página
y cada cinco minutos. **Sincronizar canales** permite hacerlo manualmente. Solo
se sustituye la lista después de completar todas las páginas. Un error, una
respuesta vacía, páginas repetidas o datos sin hash conservan la lista anterior
y muestran un aviso. La fecha del catálogo es la de la última consulta completa,
distinta de la fecha de la playlist incluida en el deployment.

**Reproducir con motor** genera un enlace HLS usando el `infohash` de cada resultado.
VLC, Infuse y Kodi reciben ese enlace remoto; **Copiar enlace** y **Compartir**
utilizan el magnet correspondiente sin incluir tokens. El selector consulta
`get_available_players` y envía `open_in_player` con el ID real del dispositivo
y el infohash de ese canal. Los dispositivos que aparecen son los que conoce
el motor configurado, no necesariamente los que están cerca del móvil o navegador.
Una respuesta de la API confirma el envío de la orden, no que la TV esté reproduciendo.

Los scripts P2P Search y Magic Player de Ace Script utilizan permisos especiales
de la extensión (`AWE_*` y `GM_*`). Esos permisos y los resultados que insertan
en Google no están disponibles para una página normal de GitHub Pages.
YaVale consulta directamente la API del motor; no carga esos scripts externos.
No se garantiza que dos motores tengan el mismo catálogo o los mismos dispositivos.

### Requisito para GitHub Pages

El motor (o un proxy bajo tu control) debe admitir **HTTPS** y permitir peticiones
desde el origen de tu web mediante **CORS**. Una dirección HTTP puede funcionar
al abrirla directamente y aun así quedar bloqueada desde Pages, que usa HTTPS.
El código muestra el error; no cambia las opciones de seguridad del navegador
ni expone automáticamente la API del motor a Internet.
La dirección `toninomontana.ddns.net:6878` que existe en el addon es una
configuración anterior; no se presupone que esté activa ni se usa automáticamente.

El cambio de catálogo es local a la sesión/navegador que lo consulta. No reescribe
la playlist M3U8 del repositorio ni sincroniza el catálogo del addon de Stremio.
Para publicar una nueva copia estática sigue usando `npm run generate:playlist`.
Después de cambiar recursos web ejecuta `npm run sync:webapp` para mantener
`docs/` y el bundle iOS iguales a `public/`.

Documentación de los contratos utilizados:
- https://docs.acestream.net/developers/search/
- https://docs.acestream.net/developers/api-reference/#get_available_players
- https://docs.acestream.net/developers/api-reference/#open_in_player
