/**
 * Config de “Abrir con…”.
 * NO asumimos esquemas exactos: pon aquí los que tú confirmes en tu iPhone.
 * Ejemplos (a validar en tu dispositivo):
 * - Safari: usar https normal (window.open)
 * - VLC iOS: (placeholder) "vlc-x-callback://x-callback-url/stream?url="
 * - Infuse iOS: (placeholder) "infuse://x-callback-url/play?url="
 * - Kodi (si tienes manejador de esquema): (placeholder) "kodi://play?url="
 */
const OPEN_WITH = {
  safari: url => url, // abrir tal cual en una pestaña/ventana
  vlc:    url => `<<PON_AQUI_ESQUEMA_VLC_COMPROBADO>>${encodeURIComponent(url)}`,
  infuse: url => `<<PON_AQUI_ESQUEMA_INFUSE_COMPROBADO>>${encodeURIComponent(url)}`,
  kodi:   url => `<<PON_AQUI_ESQUEMA_KODI_COMPROBADO>>${encodeURIComponent(url)}`
};

window.__OPEN_WITH__ = OPEN_WITH;
