/**
 * Configuracion de "Abrir con".
 * Estas URL-scheme funcionan en iOS/macOS con las apps instaladas.
 * Si alguna app usa un esquema diferente, ajustalo aqui.
 */
const OPEN_WITH = {
  safari: url => url,
  vlc:    url => `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(url)}`,
  infuse: url => `infuse://x-callback-url/play?url=${encodeURIComponent(url)}`,
  kodi:   url => `kodi://play?item=${encodeURIComponent(url)}`
};

window.__OPEN_WITH__ = OPEN_WITH;
