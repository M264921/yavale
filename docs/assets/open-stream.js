(function (root) {
  function buildStreamUrl(input, engine) {
    const hash = String(input).trim().replace(/^acestream:\/\//i, '');
    if (!/^[a-f0-9]{40}$/i.test(hash)) throw new Error('Introduce un hash AceStream de 40 caracteres hexadecimales.');
    const base = new URL(engine);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('El motor debe ser una URL HTTP o HTTPS sin credenciales.');
    const url = new URL('/ace/getstream', base);
    url.searchParams.set('id', hash.toLowerCase());
    return url.href;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { buildStreamUrl };
  else root.buildStreamUrl = buildStreamUrl;
})(typeof globalThis !== 'undefined' ? globalThis : this);
