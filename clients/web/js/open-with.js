(function () {
  const $ = s => document.querySelector(s);
  const container = $('#openWith');
  const input = document.querySelector('#streamUrl');

  function openIn(app, url) {
    if (!url) return alert('Primero escribe una URL de stream');
    const map = window.__OPEN_WITH__;
    if (!map || !map[app]) return alert('App no configurada: ' + app);

    const target = map[app](url);

    // Safari/web: abrir http/https en nueva pestaña
    if (app === 'safari') {
      window.open(target, '_blank', 'noopener');
      return;
    }

    // Para esquemas personalizados (vlc://, infuse://, kodi://…)
    // En iOS WKWebView lo ideal es interceptarlos en la app nativa (Swift)
    // y abrirlos con UIApplication.shared.open(_:).
    window.location.href = target;
  }

  container.addEventListener('click', (ev) => {
    if (ev.target.matches('button[data-app]')) {
      openIn(ev.target.dataset.app, input.value.trim());
    }
  });
})();
