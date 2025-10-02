<script>
(function () {
  const Q = new URLSearchParams(location.search);
  const engineUrl = Q.get('engine') || localStorage.getItem('engineUrl') || 'http://127.0.0.1:6878';
  const accessToken = Q.get('token') || localStorage.getItem('accessToken') || '';

  if (Q.get('engine')) localStorage.setItem('engineUrl', engineUrl);
  if (Q.get('token')) {
    localStorage.setItem('accessToken', accessToken);
  } else if (!accessToken) {
    localStorage.removeItem('accessToken');
  }

  const mount = document.getElementById('acestream-list');
  if (!mount) {
    console.warn('[acestream] Falta #acestream-list en el HTML');
    return;
  }

  // Extrae id/infohash desde diversas formas: acestream://, magnet, query params o path.
  const extractInfoHash = (u) => {
    const url = (u || '').trim();
    if (!url) return '';

    const lower = url.toLowerCase();
    if (lower.startsWith('acestream://')) return url.slice('acestream://'.length);

    const magnetPrefix = 'magnet:?xt=urn:btih:';
    if (lower.startsWith(magnetPrefix)) {
      const rest = url.slice(magnetPrefix.length);
      const amp = rest.indexOf('&');
      return amp === -1 ? rest : rest.slice(amp + 0, amp);
    }

    // Intentar como URL normal
    try {
      const parsed = new URL(url);
      const params = ['id', 'content_id', 'contentId', 'infohash', 'infoHash', 'hash'];
      for (const k of params) {
        const v = parsed.searchParams.get(k);
        if (v) return v;
      }
      // /<hash> al final del path
      const m = parsed.pathname.match(/\/([A-Fa-f0-9]{32,})$/);
      if (m && m[1]) return m[1];
    } catch (e) {
      // puede no ser una URL estándar; seguimos abajo
    }

    // Fallback por regex en cadena
    const rx = /[?&](?:id|content_id|contentId|infohash|infoHash|hash)=([^&#]+)/;
    const fm = url.match(rx);
    if (fm && fm[1]) {
      try { return decodeURIComponent(fm[1]); } catch { return fm[1]; }
    }
    return '';
  };

  const normalizeBase = (base) => (base || '').replace(/\/+$/, '');
  const httpUrl = (id) => {
    if (!id) return '#';
    const cleanId = encodeURIComponent(id);
    const base = normalizeBase(engineUrl || 'http://127.0.0.1:6878');
    const tokenParam = accessToken ? `&token=${encodeURIComponent(accessToken)}` : '';
    return `${base}/ace/getstream?id=${cleanId}${tokenParam}`;
  };

  // Exponer utilidades mínimas para depuración externa
  window.__aceEngineConfig = { engineUrl, accessToken, httpUrl };

  function createButton(label, className) {
    const btn = document.createElement('button');
    btn.className = className;
    btn.type = 'button';
    btn.textContent = label;
    return btn;
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  function renderItem(item) {
    const id = extractInfoHash(item.url);
    const li = document.createElement('li');
    li.className = 'acestream-item';

    li.innerHTML = `
      <div class="link-name">${item.name || 'Sin título'}</div>
      <div class="link-url"><a href="${item.url}" target="_blank" rel="noopener">${item.url}</a></div>
      <div class="link-actions"></div>
    `;

    const actions = li.querySelector('.link-actions');

    const openBtn = createButton('Abrir', 'btn open-ace');
    openBtn.addEventListener('click', () => {
      if (item.url) location.href = item.url;
    });

    const copyBtn = createButton('Copiar', 'btn copy-ace');
    copyBtn.addEventListener('click', async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(item.url);
        } else {
          fallbackCopy(item.url);
        }
        alert('Enlace copiado');
      } catch (err) {
        console.error('[acestream] clipboard error', err);
        fallbackCopy(item.url);
        alert('Enlace copiado');
      }
    });

    const altLink = document.createElement('a');
    altLink.className = 'btn alt-ace';
    altLink.target = '_blank';
    altLink.rel = 'noopener';
    altLink.textContent = 'Abrir vía HTTP';
    altLink.href = httpUrl(id);
    if (!id) {
      altLink.setAttribute('aria-disabled', 'true');
      altLink.addEventListener('click', (e) => e.preventDefault());
    }

    actions.appendChild(openBtn);
    actions.appendChild(copyBtn);
    actions.appendChild(altLink);

    return li;
  }

  // Permitir pasar la ruta del JSON via atributo data-acestream-src en el <script>
  const scriptTag = document.currentScript || document.querySelector('script[data-acestream-src]');
  const dataPath = (scriptTag && scriptTag.getAttribute('data-acestream-src')) || './data/acestream-links.json';

  fetch(dataPath, { cache: 'no-store' })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      const ul = document.createElement('ul');
      ul.className = 'acestream-list';
      (data.links || []).forEach((it) => {
        ul.appendChild(renderItem(it));
      });
      mount.innerHTML = '';
      mount.appendChild(ul);
    })
    .catch((err) => {
      mount.textContent = 'No se pudo cargar la lista (revisa JSON/URL).';
      console.error('[acestream] fetch error', err);
    });
})();
</script>
