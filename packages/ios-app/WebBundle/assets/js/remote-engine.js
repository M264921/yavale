(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.YaValeEngine = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const HASH = /^[a-f0-9]{40}$/i;
  function normalizeBaseUrl(input) {
    let base = String(input || "").trim();
    if (base && !base.includes("://")) base = "http://" + base;
    const match = base.match(/^https?:\/\/(\[[a-f0-9:.]+\]|[a-z0-9.-]+)(?::(\d{1,5}))?(\/[^?#\s]*)?$/i);
    if (!match || (match[2] && (+match[2] < 1 || +match[2] > 65535))) {
      throw new Error("Indica una URL HTTP o HTTPS del motor, sin usuario, contraseña ni parámetros.");
    }
    return base.replace(/\/+$/, "");
  }
  function isLoopback(base) {
    return /^https?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?(?:\/|$)/i.test(base);
  }
  function infohash(url) {
    const text = String(url || "");
    const match = text.match(/^acestream:\/\/([a-f0-9]{40})\/?$/i) ||
      text.match(/(?:[?&]infohash=|xt=urn:btih:)([a-f0-9]{40})(?:[&#]|$)/i);
    return match ? match[1].toLowerCase() : null;
  }
  function reference(url) {
    const hash = infohash(url);
    return hash ? { hash, type: /^acestream:\/\//i.test(String(url)) ? "content_id" : "infohash" } : null;
  }
  function streamUrl(base, hash, parameter = "infohash") {
    if (!["infohash", "content_id"].includes(parameter)) throw new Error("Tipo de identificador no válido.");
    if (!HASH.test(hash || "")) throw new Error("Infohash no válido.");
    // Search results carry infohash, which must not be sent as content_id/id.
    return normalizeBaseUrl(base) + "/ace/manifest.m3u8?" + parameter + "=" + hash.toLowerCase();
  }
  function readPage(payload) {
    if (!payload || typeof payload !== "object" || payload.error) {
      throw new Error("AceStream rechazó la consulta del catálogo.");
    }
    const result = Object.prototype.hasOwnProperty.call(payload, "result") ? payload.result : payload;
    if (!result || !Array.isArray(result.results)) {
      throw new Error("El motor devolvió un catálogo con formato desconocido.");
    }
    const entries = [];
    let invalid = 0;
    function add(item, parent) {
      if (!item || typeof item !== "object") { invalid++; return; }
      if (Array.isArray(item.items)) { item.items.forEach(child => add(child, item)); return; }
      const hash = String(item.infohash || "").toLowerCase();
      if (!HASH.test(hash)) { invalid++; return; }
      const name = String(item.name || (parent && parent.name) || "Canal sin nombre");
      const categories = Array.isArray(item.categories) ? item.categories :
        (parent && Array.isArray(parent.categories) ? parent.categories : []);
      entries.push({
        title: name,
        attributes: { "group-title": categories.map(String).join(" / "), "tvg-id": String(item.channel_id || "") },
        duration: -1,
        url: "magnet:?xt=urn:btih:" + hash,
        infohash: hash,
        status: Number.isFinite(item.status) ? item.status : null
      });
    }
    result.results.forEach(item => add(item, null));
    // Do not silently replace a working catalog with incomplete/malformed data.
    if (invalid) throw new Error("El catálogo contiene entradas sin un infohash válido.");
    const total = Number.isInteger(result.total) && result.total >= 0 ? result.total : null;
    return { entries, rawCount: result.results.length, total };
  }
  function createClient(options) {
    const base = normalizeBaseUrl(options.baseUrl);
    const token = String(options.accessToken || "").trim();
    const fetcher = options.fetch || (typeof fetch === "function" ? fetch : null);
    if (!fetcher) throw new Error("Este navegador no permite consultar el motor.");
    const timeoutMs = options.timeoutMs || 15000;
    async function request(endpoint, params, signal) {
      const query = Object.assign({}, params);
      if (token) query.token = token;
      const suffix = Object.keys(query).filter(key => query[key] !== undefined && query[key] !== null)
        .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(query[key])).join("&");
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      let timer;
      const abort = () => { if (controller) controller.abort(); };
      if (signal && signal.aborted) throw new Error("Consulta cancelada.");
      if (signal) signal.addEventListener("abort", abort, { once: true });
      try {
        return await Promise.race([
          (async function () {
            const response = await fetcher(base + "/" + endpoint + "?" + suffix, {
              method: "GET", mode: "cors", credentials: "omit", cache: "no-store",
              signal: controller ? controller.signal : signal,
              ...(isLoopback(base) ? { targetAddressSpace: "loopback" } : {})
            });
            if (!response.ok) {
              const error = new Error("El motor respondió HTTP " + response.status + ".");
              error.status = response.status;
              throw error;
            }
            const payload = await response.json();
            if (signal && signal.aborted) throw new Error("Consulta cancelada.");
            if (!payload || typeof payload !== "object" || payload.error) {
              throw new Error("AceStream rechazó la solicitud. Comprueba el acceso y el token del motor.");
            }
            return payload;
          })(),
          new Promise((resolve, reject) => {
            timer = setTimeout(() => { abort(); reject(new Error("El motor no respondió a tiempo.")); }, timeoutMs);
          })
        ]);
      } catch (error) {
        if (error && error.name === "TypeError") {
          throw new Error(isLoopback(base) ?
            "No se pudo contactar con AceStream de este PC. Comprueba que esté abierto, el permiso de acceso local del navegador y CORS." :
            "No se pudo contactar con el motor. Comprueba la dirección, HTTPS y el acceso desde esta web (CORS).");
        }
        throw error;
      } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener("abort", abort);
      }
    }
    async function api(params, signal) {
      const payload = await request("server/api", Object.assign({ api_version: 3 }, params), signal);
      if (!Object.prototype.hasOwnProperty.call(payload, "result")) {
        throw new Error("El motor devolvió una respuesta API desconocida.");
      }
      return payload.result;
    }
    async function catalog(options) {
      const settings = options || {};
      const pageSize = 200;
      const maxPages = settings.maxPages || 500;
      const entries = new Map();
      const seenPages = new Set();
      let received = 0, endpoint = "search";
      for (let page = 0; page < maxPages; page++) {
        const params = { query: settings.query || "", page, page_size: pageSize, group_by_channels: 0, show_epg: 0 };
        if (settings.category) params.category = settings.category;
        if (endpoint === "server/api") Object.assign(params, { method: "search", api_version: 3 });
        let payload;
        try { payload = await request(endpoint, params, settings.signal); }
        catch (error) {
          // Older engines expose search via the main API. Never retry an auth/network failure there.
          if (page !== 0 || endpoint !== "search" || error.status !== 404) throw error;
          endpoint = "server/api";
          payload = await request(endpoint, Object.assign(params, { method: "search", api_version: 3 }), settings.signal);
        }
        const data = readPage(payload);
        if (!data.rawCount) {
          if (data.total !== null && received < data.total) throw new Error("El motor devolvió un catálogo incompleto.");
          return Array.from(entries.values());
        }
        const signature = JSON.stringify(data.entries.map(item => item.infohash));
        if (seenPages.has(signature)) throw new Error("El motor repite páginas; no se puede confirmar el catálogo completo.");
        seenPages.add(signature);
        data.entries.forEach(item => { if (!entries.has(item.infohash)) entries.set(item.infohash, item); });
        received += data.rawCount;
        if (settings.onProgress) settings.onProgress(entries.size);
        if (data.total !== null ? received >= data.total : data.rawCount < pageSize) {
          return Array.from(entries.values());
        }
      }
      throw new Error("El catálogo supera el límite de páginas. Se conserva la lista anterior.");
    }
    return { api, catalog, streamUrl: (hash, parameter) => streamUrl(base, hash, parameter) };
  }
  return { normalizeBaseUrl, isLoopback, infohash, reference, streamUrl, readPage, createClient };
});
