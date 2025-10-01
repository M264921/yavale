(function () {
  const $ = selector => document.querySelector(selector);
  const container = $('#openWith');
  const input = document.querySelector('#streamUrl');

  function openIn(app, url) {
    if (!url) {
      alert('Primero escribe una URL de stream');
      return;
    }
    const map = window.__OPEN_WITH__;
    if (!map || !map[app]) {
      alert('App no configurada: ' + app);
      return;
    }

    const target = map[app](url);

    if (app === 'safari') {
      window.open(target, '_blank', 'noopener');
      return;
    }

    // Esquemas personalizados (vlc://, infuse://, kodi://...)
    // En iOS con WKWebView lo ideal es interceptarlos en la app nativa (Swift)
    window.location.href = target;
  }

  container.addEventListener('click', (event) => {
    if (event.target.matches('button[data-app]')) {
      openIn(event.target.dataset.app, input.value.trim());
    }
  });
})();
