(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var storedEngine = localStorage.getItem('engineUrl');
  var storedToken = localStorage.getItem('accessToken');
  var engineUrl = (params.get('engine') || storedEngine || 'http://127.0.0.1:6878').replace(/\/+$/, '');
  var accessToken = params.get('token') || storedToken || '';

  if (params.has('engine')) {
    localStorage.setItem('engineUrl', engineUrl);
  }
  if (params.has('token')) {
    localStorage.setItem('accessToken', accessToken);
  }

  var mount = document.getElementById('acestream-list');
  if (!mount) {
    console.warn('[acestream] Missing #acestream-list mount point');
    return;
  }

  mount.textContent = 'Cargando…';

  function getId(aceUrl) {
    if (!aceUrl) {
      return '';
    }
    var parts = aceUrl.split('://');
    return parts.length > 1 ? parts[1] : parts[0];
  }

  function buildEngineUrl(path) {
    if (!path) {
      return '#';
    }
    var suffix = path.startsWith('/') ? path : '/' + path;
    var url = engineUrl + suffix;
    if (accessToken) {
      url += (suffix.indexOf('?') === -1 ? '?' : '&') + 'token=' + encodeURIComponent(accessToken);
    }
    return url;
  }

  function renderItem(item) {
    var li = document.createElement('li');
    li.className = 'acestream-item';
    var aceId = getId(item && item.url);
    var httpUrl = aceId ? buildEngineUrl('/ace/getstream?id=' + encodeURIComponent(aceId)) : '#';
    var hlsUrl = aceId ? buildEngineUrl('/ace/manifest.m3u8?id=' + encodeURIComponent(aceId)) : '#';

    li.innerHTML = '' +
      '<div class="link-name">' + (item && item.name ? item.name : 'Canal sin nombre') + '</div>' +
      '<div class="link-url"><a href="' + (item && item.url ? item.url : '#') + '" target="_blank" rel="noopener">' +
      (item && item.url ? item.url : 'N/A') + '</a></div>' +
      '<div class="link-actions">' +
      '  <button class="btn open-ace" type="button">Abrir</button>' +
      '  <button class="btn copy-ace" type="button">Copiar</button>' +
      '  <a class="btn alt-ace" target="_blank" rel="noopener" href="' + httpUrl + '">Abrir vía HTTP</a>' +
      '  <a class="btn alt-ace" target="_blank" rel="noopener" href="' + hlsUrl + '">Abrir vía HLS</a>' +
      '</div>';

    var openButton = li.querySelector('.open-ace');
    if (openButton) {
      openButton.addEventListener('click', function () {
        window.location.href = item.url;
      });
    }

    var copyButton = li.querySelector('.copy-ace');
    if (copyButton) {
      copyButton.addEventListener('click', function () {
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          window.prompt('Copia el enlace manualmente:', item.url);
          return;
        }
        navigator.clipboard.writeText(item.url).then(function () {
          window.alert('Enlace copiado');
        }).catch(function (error) {
          console.error('[acestream] clipboard error', error);
          window.prompt('No se pudo copiar automáticamente. Copia manualmente:', item.url);
        });
      });
    }

    return li;
  }

  fetch('./data/acestream-links.json', { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.json();
    })
    .then(function (data) {
      var list = document.createElement('ul');
      list.className = 'acestream-list';
      var links = (data && Array.isArray(data.links)) ? data.links : [];
      if (!links.length) {
        mount.textContent = 'No hay enlaces configurados.';
        return;
      }
      links.forEach(function (item) {
        list.appendChild(renderItem(item));
      });
      mount.innerHTML = '';
      mount.appendChild(list);
    })
    .catch(function (error) {
      console.error('[acestream] fetch error', error);
      mount.textContent = 'No se pudo cargar la lista (revisa JSON/URL).';
    });

  window.testAceEngine = async function () {
    try {
      var response = await fetch(buildEngineUrl('/webui/api/service?method=get_version'));
      var text = await response.text();
      window.alert('Motor respondió:\n' + text.slice(0, 400));
    } catch (error) {
      window.alert('No se pudo contactar con el engine.\n' + error);
    }
  };
})();
