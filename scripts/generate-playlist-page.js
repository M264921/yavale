const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const playlistsDir = path.join(projectRoot, "playlists");
const docsDir = path.join(projectRoot, "docs");

function resolveSourcePath(argv) {
  const cliArgs = argv.slice(2);
  let candidate = process.env.PLAYLIST_SOURCE || "";

  const inputFlagIndex = cliArgs.indexOf("--input");
  if (inputFlagIndex !== -1 && cliArgs[inputFlagIndex + 1]) {
    candidate = cliArgs[inputFlagIndex + 1];
  }

  if (!candidate && cliArgs.length > 0) {
    candidate = cliArgs[0];
  }

  if (!candidate) {
    candidate = path.join(playlistsDir, "playlist.m3u8");
  }

  return path.resolve(candidate);
}

function ensureDirs() {
  if (!fs.existsSync(playlistsDir)) {
    fs.mkdirSync(playlistsDir, { recursive: true });
  }
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
}

function copyPlaylist(sourcePath, targetPath) {
  if (sourcePath !== targetPath) {
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function parseM3U8(content) {
  const lines = content.split(/\r?\n/);
  const entries = [];
  let pending = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF")) {
      pending = parseExtInf(line);
      continue;
    }

    if (line.startsWith("#")) continue;

    if (pending) {
      pending.url = line;
      entries.push(pending);
      pending = null;
    }
  }

  return entries;
}

function parseExtInf(line) {
  const info = { title: "", attributes: {}, duration: null };
  const match = line.match(/^#EXTINF:([^,]*),(.*)$/);
  if (!match) return info;

  const durationPart = match[1].trim();
  const durationTokens = durationPart ? durationPart.split(/\s+/) : [];
  const durationValue = durationTokens[0];
  if (durationValue && !Number.isNaN(Number(durationValue))) {
    info.duration = Number(durationValue);
  }

  const attributeSection = durationTokens.slice(1).join(" ");
  if (attributeSection) {
    const attrRegex = /([\w-]+)=\"([^\"]*)\"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attributeSection)) !== null) {
      info.attributes[attrMatch[1]] = attrMatch[2];
    }
  }

  info.title = match[2].trim();
  if (!info.title && info.attributes["tvg-name"]) {
    info.title = info.attributes["tvg-name"];
  }

  return info;
}

/* =========================
   Player presets por defecto
   ========================= */
const DEFAULT_PLAYER_PRESETS = [
  { id: "acestream-engine", label: "Ace Stream (motor local)", type: "acestream", isDefault: true },
  { id: "vlc", label: "VLC (iOS/macOS)", type: "template", template: "vlc-x-callback://x-callback-url/stream?url={{url}}" },
  { id: "infuse", label: "Infuse", type: "template", template: "infuse://x-callback-url/play?url={{url}}" },
  { id: "kodi", label: "Kodi", type: "template", template: "kodi://play?item={{url}}" },
  { id: "ace-player-hd", label: "Ace Player HD", type: "template", template: "acestream://{{infohash}}" },
  { id: "acecast", label: "AceCast (seleccionar dispositivo)", type: "template", template: "acecast://play?method=fromHash&infohash={{infohash}}&name={{title_encoded}}" },
  { id: "windows-media-player", label: "Reproductor de Windows Media", type: "template", template: "wmplayer.exe?{{url_raw}}" }
];

/* Normaliza el bloque availability de los presets */
function sanitizeAvailability(entry, presetId, presetPath) {
  if (!entry || typeof entry !== "object") return null;

  const availability = {};

  if (Array.isArray(entry.platforms)) {
    const platforms = entry.platforms
      .map(v => (typeof v === "string" ? v.trim().toLowerCase() : ""))
      .filter(Boolean);
    if (platforms.length) availability.platforms = platforms;
  }

  if (Array.isArray(entry.excludePlatforms)) {
    const excludePlatforms = entry.excludePlatforms
      .map(v => (typeof v === "string" ? v.trim().toLowerCase() : ""))
      .filter(Boolean);
    if (excludePlatforms.length) availability.excludePlatforms = excludePlatforms;
  }

  if (Array.isArray(entry.hostnames)) {
    const hostnames = entry.hostnames
      .map(v => (typeof v === "string" ? v.trim().toLowerCase() : ""))
      .filter(Boolean);
    if (hostnames.length) availability.hostnames = hostnames;
  }

  if (Array.isArray(entry.http)) {
    const http = entry.http
      .map((candidate, index) => {
        if (typeof candidate === "string") {
          const trimmed = candidate.trim();
          return trimmed
            ? { url: trimmed, method: "HEAD", timeout: 2500, mode: "no-cors" }
            : null;
        }
        if (!candidate || typeof candidate !== "object") {
          console.warn(
            `[generate-playlist] Punto de disponibilidad HTTP inválido en ${presetPath} (preset ${presetId}, posición ${index}).`
          );
          return null;
        }

        const url = typeof candidate.url === "string" ? candidate.url.trim() : "";
        if (!url) {
          console.warn(
            `[generate-playlist] Se ignoró un endpoint HTTP sin URL en ${presetPath} (preset ${presetId}, posición ${index}).`
          );
          return null;
        }

        const endpoint = {
          url,
          method:
            typeof candidate.method === "string" && candidate.method.trim().length
              ? candidate.method.trim().toUpperCase()
              : "HEAD",
          timeout:
            typeof candidate.timeout === "number" && Number.isFinite(candidate.timeout)
              ? Math.max(500, candidate.timeout)
              : 2500,
          mode:
            typeof candidate.mode === "string" && candidate.mode.trim().length
              ? candidate.mode.trim()
              : "no-cors"
        };

        if (Array.isArray(candidate.expectStatus)) {
          const expectStatus = candidate.expectStatus
            .map(v => Number.parseInt(v, 10))
            .filter(v => Number.isInteger(v) && v >= 100 && v <= 599);
          if (expectStatus.length) endpoint.expectStatus = expectStatus;
        }

        return endpoint;
      })
      .filter(Boolean);

    if (http.length) availability.http = http;
  }

  return Object.keys(availability).length ? availability : null;
}

function resolvePlayerPresetPath() {
  const envPath = process.env.PLAYER_PRESETS
    ? path.resolve(projectRoot, process.env.PLAYER_PRESETS)
    : null;

  const candidates = [
    envPath,
    path.join(playlistsDir, "players.json"),
    path.join(playlistsDir, "player-presets.json")
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

function loadPlayerPresets() {
  const presetPath = resolvePlayerPresetPath();
  if (!presetPath) return DEFAULT_PLAYER_PRESETS;

  try {
    const raw = fs.readFileSync(presetPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`[generate-playlist] ${presetPath} no contiene un array, usando valores por defecto.`);
      return DEFAULT_PLAYER_PRESETS;
    }

    const sanitized = parsed
      .map((entry, index) => sanitizePlayerPreset(entry, index, presetPath))
      .filter(Boolean);

    if (!sanitized.length) {
      console.warn(`[generate-playlist] No se encontraron presets válidos en ${presetPath}, usando valores por defecto.`);
      return DEFAULT_PLAYER_PRESETS;
    }

    return sanitized;
  } catch (error) {
    console.warn(`[generate-playlist] No se pudo leer ${presetPath}, usando valores por defecto.`, error);
    return DEFAULT_PLAYER_PRESETS;
  }
}

function sanitizePlayerPreset(entry, index, presetPath) {
  if (!entry || typeof entry !== "object") {
    console.warn(`[generate-playlist] Preset inválido en ${presetPath} (posición ${index}).`);
    return null;
  }

  const id = typeof entry.id === "string" && entry.id.trim();
  const label = typeof entry.label === "string" && entry.label.trim();
  const type = typeof entry.type === "string" && entry.type.trim();

  if (!id || !label || !type) {
    console.warn(`[generate-playlist] Preset omitido en ${presetPath} (posición ${index}) por campos requeridos faltantes.`);
    return null;
  }

  const preset = {
    id,
    label,
    type,
    isDefault: Boolean(entry.isDefault)
  };

  if (type === "template") {
    const template =
      typeof entry.template === "string" && entry.template.trim().length
        ? entry.template
        : null;
    if (!template) {
      console.warn(`[generate-playlist] Preset ${id} omitido: falta template para tipo template.`);
      return null;
    }
    preset.template = template;
  }

  if (entry.icon) preset.icon = entry.icon;

  if (entry.availability) {
    const availability = sanitizeAvailability(entry.availability, id, presetPath);
    if (availability) preset.availability = availability;
  }

  return preset;
}


function buildHtml(entries, playerPresets) {
  const playlistJson = JSON.stringify(entries).replace(/</g, "\u003C");
  const playersJson = JSON.stringify(playerPresets).replace(/</g, "\u003C");
  const generatedAt = new Date().toISOString();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Playlist AceStream</title>
  <style>
    :root { color-scheme: dark light; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body {
      margin: 0; background: #0f172a; color: #e2e8f0; min-height: 100vh;
      display: flex; flex-direction: column; gap: 1.5rem; padding: 1.5rem;
    }
    header { display: flex; flex-direction: column; gap: 0.75rem; }
    h1 { margin: 0; font-size: clamp(1.5rem, 3vw, 2.3rem); }
    .toolbar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
    .toolbar__actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    input[type="search"], .settings input[type="url"], .settings input[type="text"] {
      flex: 1 1 250px; padding: 0.65rem 0.9rem; border-radius: 0.75rem;
      border: 1px solid rgba(148,163,184,0.35); background: rgba(15,23,42,0.65); color: inherit;
    }
    select {
      padding: 0.65rem 0.9rem; border-radius: 0.75rem;
      border: 1px solid rgba(148,163,184,0.35); background: rgba(15,23,42,0.65); color: inherit;
    }
    .toolbar button, .settings button {
      padding: 0.6rem 0.9rem; border-radius: 0.75rem; border: 1px solid rgba(148,163,184,0.35);
      background: rgba(148,163,184,0.15); color: inherit; cursor: pointer; font-weight: 600;
      transition: background 120ms ease, border-color 120ms ease, transform 120ms ease;
    }
    .toolbar button:hover, .settings button:hover {
      background: rgba(148,163,184,0.25);
      border-color: rgba(148,163,184,0.45);
    }
    .settings {
      display: grid; gap: 0.75rem; padding: 1rem; border-radius: 0.9rem;
      background: rgba(15,23,42,0.45); border: 1px solid rgba(148,163,184,0.25);
    }
    .settings[hidden] { display: none; }
    .settings .field { display: flex; flex-direction: column; gap: 0.35rem; }
    .settings label { font-weight: 600; font-size: 0.85rem; color: #cbd5f5; }
    .settings__actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .settings__hint { margin: 0; font-size: 0.75rem; color: #94a3b8; }
    .status { font-size: 0.85rem; color: #94a3b8; }
    .status[hidden] { display: none; }
    .status[data-variant="success"] { color: #4ade80; }
    .status[data-variant="error"] { color: #f87171; }
    .status[data-variant="info"] { color: #38bdf8; }
    .status[data-variant="loading"] { color: #fbbf24; }
    main { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px,1fr)); gap: 1.25rem; }
    .card {
      display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; border-radius: 1rem;
      background: rgba(15,23,42,0.6); border: 1px solid rgba(148,163,184,0.25);
      box-shadow: 0 15px 25px rgba(15,23,42,0.25); transition: transform 120ms ease, box-shadow 120ms ease;
    }
    .card:hover { transform: translateY(-3px); box-shadow: 0 18px 28px rgba(15,23,42,0.3); }
    .card h2 { margin: 0; font-size: 1.05rem; }
    .meta { display: flex; flex-wrap: wrap; gap: 0.4rem; font-size: 0.8rem; color: #94a3b8; }
    .meta span { padding: 0.15rem 0.45rem; border-radius: 999px; background: rgba(148,163,184,0.15); }
    .actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 0.5rem; align-items: stretch; }
    .actions a, .actions button {
      display: inline-flex; justify-content: center; align-items: center; gap: 0.35rem;
      padding: 0.6rem 0.9rem; border-radius: 0.75rem; border: none; cursor: pointer; font-weight: 600;
      text-decoration: none; transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
    }
    .actions a.play { color: #0f172a; background: #38bdf8; box-shadow: 0 10px 18px rgba(56,189,248,0.35); }
    .actions a.play:hover { transform: translateY(-1px); box-shadow: 0 12px 20px rgba(56,189,248,0.4); }
    .actions button.secondary, .actions button.copy, .actions button.share { background: rgba(148,163,184,0.15); color: inherit; }
    .actions button.secondary:hover, .actions button.copy:hover, .actions button.share:hover { background: rgba(148,163,184,0.25); }

    .player-dropdown { position: relative; width: 100%; }
    .player-dropdown__toggle { width: 100%; justify-content: space-between; }
    .player-dropdown__arrow {
      display: inline-block; width: 0; height: 0;
      border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid currentColor;
      transition: transform 120ms ease;
    }
    .player-dropdown.is-open .player-dropdown__arrow { transform: rotate(180deg); }
    .player-dropdown__menu {
      position: absolute; top: calc(100% + 0.35rem); left: 0; right: 0;
      display: none; flex-direction: column; gap: 0.4rem; margin: 0; padding: 0.6rem; list-style: none;
      border-radius: 0.9rem; border: 1px solid rgba(148,163,184,0.35); background: rgba(15,23,42,0.95);
      box-shadow: 0 18px 28px rgba(15,23,42,0.45); z-index: 10;
    }
    .player-dropdown.is-open .player-dropdown__menu { display: flex; }
    .player-dropdown__menu li a {
      display: inline-flex; align-items: center; justify-content: space-between;
      gap: 0.45rem; padding: 0.55rem 0.7rem; border-radius: 0.6rem; text-decoration: none;
      color: #38bdf8; background: rgba(56,189,248,0.12); transition: background 120ms ease, color 120ms ease;
    }
    .player-dropdown__menu li a img { width: 18px; height: 18px; object-fit: contain; filter: drop-shadow(0 0 2px rgba(15,23,42,0.6)); }
    .player-dropdown__menu li a span { flex: 1; }
    .player-dropdown__menu li a:hover, .player-dropdown__menu li a:focus-visible {
      background: rgba(56,189,248,0.2); color: #f0f9ff;
    }
    footer { font-size: 0.8rem; color: #64748b; text-align: center; margin-top: auto; }

    @media (prefers-color-scheme: light) {
      body { background: #f8fafc; color: #0f172a; }
      .settings { background: rgba(255,255,255,0.9); border: 1px solid rgba(148,163,184,0.4); }
      .settings label { color: #0f172a; }
      .settings__hint { color: #475569; }
      .status { color: #475569; }
      .card { background: rgba(255,255,255,0.9); border: 1px solid rgba(148,163,184,0.45); box-shadow: 0 15px 25px rgba(100,116,139,0.15); }
      .actions a.play { color: white; background: #2563eb; box-shadow: 0 12px 20px rgba(37,99,235,0.35); }
      .actions button.secondary, .actions button.copy, .actions button.share { background: rgba(148,163,184,0.2); color: inherit; }
      .player-dropdown__menu { background: rgba(255,255,255,0.95); border: 1px solid rgba(148,163,184,0.45); box-shadow: 0 18px 28px rgba(148,163,184,0.25); }
      .player-dropdown__menu li a { color: #2563eb; background: rgba(37,99,235,0.12); }
    }
  </style>
</head>
<body>
  <header>
    <h1>Playlist AceStream</h1>
    <p>Actualizada: ${generatedAt}</p>
    <div class="toolbar">
      <input id="search" type="search" placeholder="Buscar por nombre, grupo o ID" />
      <select id="group"><option value="">Todos los grupos</option></select>
      <div class="toolbar__actions">
        <button id="toggleSettings" type="button" aria-expanded="false">Ajustes</button>
        <button id="refreshPlayers" type="button">Detectar reproductores</button>
      </div>
    </div>
    <form id="settingsForm" class="settings" hidden>
      <div class="field">
        <label for="engineUrl">URL del motor AceStream</label>
        <input id="engineUrl" name="engineUrl" type="url" placeholder="http://127.0.0.1:6878" autocomplete="off" />
      </div>
      <div class="field">
        <label for="accessToken">Access token</label>
        <input id="accessToken" name="accessToken" type="text" autocomplete="off" />
      </div>
      <div class="settings__actions">
        <button type="submit">Guardar ajustes</button>
        <button type="button" id="resetSettings">Restablecer</button>
      </div>
      <p class="settings__hint">Introduce la URL del motor AceStream (por ejemplo, <code>http://127.0.0.1:6878</code>) y su access token para consultar <code>get_available_players</code>.</p>
    </form>
    <div id="playerStatus" class="status" role="status" aria-live="polite" hidden></div>
  </header>
  <main id="playlist" role="list"></main>
  <footer>Generado desde playlist.m3u8 - Proyecto YaVale</footer>
  <script>
    const playlist = ${playlistJson};
    const players = ${playersJson};

    const staticPlayers = Array.isArray(players) ? players : [];
    let dynamicPlayers = [];

    let availablePlayers = [];
    let defaultPlayer = null;

    const state = { settings: loadSettings(), engineBusy: false };

    const playlistContainer = document.getElementById("playlist");
    const searchInput = document.getElementById("search");
    const groupFilter = document.getElementById("group");
    const settingsForm = document.getElementById("settingsForm");
    const settingsToggle = document.getElementById("toggleSettings");
    const refreshPlayersBtn = document.getElementById("refreshPlayers");
    const resetSettingsBtn = document.getElementById("resetSettings");
    const statusBox = document.getElementById("playerStatus");

    function defaultSettings() {
      return { engineUrl: "", accessToken: "" };
    }

    function loadSettings() {
      try {
        if (typeof localStorage === "undefined") return defaultSettings();
        const raw = localStorage.getItem("yavale.settings.v1");
        if (!raw) return defaultSettings();
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return defaultSettings();
        return {
          engineUrl: typeof parsed.engineUrl === "string" ? parsed.engineUrl : "",
          accessToken: typeof parsed.accessToken === "string" ? parsed.accessToken : ""
        };
      } catch (error) {
        console.warn("No se pudieron cargar los ajustes almacenados", error);
        return defaultSettings();
      }
    }

    function saveSettings(settings) {
      try {
        if (typeof localStorage === "undefined") return;
        localStorage.setItem("yavale.settings.v1", JSON.stringify(settings));
      } catch (error) {
        console.warn("No se pudieron guardar los ajustes", error);
      }
    }

    function populateSettingsForm() {
      if (!settingsForm) return;
      const engineInput = settingsForm.querySelector('[name="engineUrl"]');
      const tokenInput = settingsForm.querySelector('[name="accessToken"]');
      if (engineInput) engineInput.value = state.settings.engineUrl || "";
      if (tokenInput) tokenInput.value = state.settings.accessToken || "";
    }

    function setStatus(message, variant) {
      if (!statusBox) return;
      if (!message) {
        statusBox.textContent = "";
        statusBox.setAttribute("hidden", "true");
        statusBox.removeAttribute("data-variant");
        return;
      }
      statusBox.textContent = message;
      statusBox.dataset.variant = variant || "info";
      statusBox.removeAttribute("hidden");
    }

    function getAttributes(item) {
      return item && typeof item === "object" && item.attributes && typeof item.attributes === "object" ? item.attributes : {};
    }

    function getAllPlayers() {
      const map = new Map();
      for (const player of staticPlayers) {
        if (!player || typeof player !== "object") continue;
        const key = player.id || "static-" + map.size;
        if (!map.has(key)) map.set(key, player);
      }
      for (const player of dynamicPlayers) {
        if (!player || typeof player !== "object") continue;
        const key = player.id || "dynamic-" + map.size;
        if (!map.has(key)) map.set(key, player);
      }
      return Array.from(map.values());
    }

    function updateAvailablePlayersState(candidateList) {
      const list = Array.isArray(candidateList) ? candidateList.filter(Boolean) : [];
      if (list.length) {
        availablePlayers = list;
      } else {
        availablePlayers = getAllPlayers();
      }
      defaultPlayer = availablePlayers.find(player => player.isDefault) || availablePlayers[0] || null;
    }

    const groups = Array.from(new Set(playlist.map(item => getAttributes(item)["group-title"]).filter(Boolean))).sort();
    for (const group of groups) {
      const opt = document.createElement("option");
      opt.value = group;
      opt.textContent = group;
      groupFilter.appendChild(opt);
    }

    function extractInfoHash(url) {
      if (!url) return "";
      const trimmed = url.trim();
      if (!trimmed) return "";

      const lower = trimmed.toLowerCase();
      if (lower.indexOf("acestream://") === 0) {
        return trimmed.slice("acestream://".length);
      }

      const magnetPrefix = "magnet:?xt=urn:btih:";
      if (lower.indexOf(magnetPrefix) === 0) {
        const hashSection = trimmed.slice(magnetPrefix.length);
        const endIndex = hashSection.indexOf("&");
        return endIndex === -1 ? hashSection : hashSection.slice(0, endIndex);
      }

      const candidateParams = ["id", "content_id", "contentId", "infohash", "infoHash", "hash"];
      try {
        const parsed = new URL(trimmed);
        for (const key of candidateParams) {
          const value = parsed.searchParams.get(key);
          if (value) return value;
        }
        const pathMatch = parsed.pathname.match(/\\/([A-Fa-f0-9]{32,})$/);
        if (pathMatch && pathMatch[1]) {
          return pathMatch[1];
        }
      } catch (error) {
        // Ignored: the URL might be a custom scheme we handle below.
      }

      const fallbackMatch = trimmed.match(/[?&](?:id|content_id|contentId|infohash|infoHash|hash)=([^&#]+)/);
      if (fallbackMatch && fallbackMatch[1]) {
        try {
          return decodeURIComponent(fallbackMatch[1]);
        } catch (error) {
          return fallbackMatch[1];
        }
      }

      return "";
    }

    function buildPlayerUrl(player, item) {
      const url = item.url;
      const infohash = extractInfoHash(url);
      const title = item.title || "";

      if (player.type === "acestream") {
        const engineUrl = state.settings && state.settings.engineUrl ? state.settings.engineUrl.trim() : "";
        if (engineUrl && infohash) {
          const sanitizedBase = engineUrl.replace(/\\\/+$, "");
          return sanitizedBase + "/ace/getstream?id=" + encodeURIComponent(infohash);
        }
        if (url.indexOf("acestream://") === 0) return url;
        if (url.indexOf("magnet:?xt=urn:btih:") === 0) return infohash ? "acestream://" + infohash : url;
        if (engineUrl) {
          const sanitizedBase = engineUrl.replace(/\\\/+$, "");
          const encodedUrl = encodeURIComponent(url);
          return sanitizedBase + "/ace/getstream?id=" + encodedUrl;
        }
        return url;
      }

      if (player.type === "template" && player.template) {
        const encoded = encodeURIComponent(url);
        const encodedTitle = encodeURIComponent(title);
        const encodedInfoHash = encodeURIComponent(infohash);
        return player.template
          .split("{{url}}").join(encoded)
          .split("{{url_raw}}").join(url)
          .split("{{infohash}}").join(infohash)
          .split("{{infohash_encoded}}").join(encodedInfoHash)
          .split("{{title}}").join(title)
          .split("{{title_encoded}}").join(encodedTitle);
      }
      return url;
    }

    let activeDropdown = null;
    function closeActiveDropdown() {
      if (!activeDropdown) return;
      const toggle = activeDropdown.querySelector(".player-dropdown__toggle");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
      activeDropdown.classList.remove("is-open");
      activeDropdown = null;
    }
    document.addEventListener("click", event => {
      if (activeDropdown && !activeDropdown.contains(event.target)) closeActiveDropdown();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeActiveDropdown();
    });

    function createPlayerDropdown(item) {
      const dropdown = document.createElement("div");
      dropdown.className = "player-dropdown";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "player-dropdown__toggle secondary";
      toggle.textContent = "Seleccionar reproductor";
      toggle.setAttribute("aria-haspopup", "true");

      const arrow = document.createElement("span");
      arrow.className = "player-dropdown__arrow";
      toggle.appendChild(arrow);

      const menu = document.createElement("ul");
      menu.className = "player-dropdown__menu";

      toggle.addEventListener("click", () => {
        const isOpen = dropdown.classList.toggle("is-open");
        if (isOpen) {
          if (activeDropdown && activeDropdown !== dropdown) closeActiveDropdown();
          activeDropdown = dropdown;
          toggle.setAttribute("aria-expanded", "true");
        } else {
          toggle.setAttribute("aria-expanded", "false");
          if (activeDropdown === dropdown) activeDropdown = null;
        }
      });

      const playersToRender = availablePlayers.length ? availablePlayers : getAllPlayers();
      for (const player of playersToRender) {
        const li = document.createElement("li");
        const link = document.createElement("a");
        link.href = buildPlayerUrl(player, item);
        link.target = "_blank";
        link.rel = "noreferrer";

        if (player.icon) {
          const icon = document.createElement("img");
          icon.src = player.icon;
          icon.alt = "";
          icon.width = 18;
          icon.height = 18;
          link.appendChild(icon);
        }

        const labelSpan = document.createElement("span");
        labelSpan.textContent = player.label || player.id || "Reproductor";
        link.appendChild(labelSpan);

        link.addEventListener("click", () => {
          closeActiveDropdown();
        });

        li.appendChild(link);
        menu.appendChild(li);
      }

      dropdown.appendChild(toggle);
      dropdown.appendChild(menu);
      return dropdown;
    }

    function render(items) {
      closeActiveDropdown();
      playlistContainer.innerHTML = "";
      if (!items.length) {
        const empty = document.createElement("p");
        empty.textContent = "No hay canales que coincidan con el filtro.";
        playlistContainer.appendChild(empty);
        return;
      }

      const playersToRender = availablePlayers.length ? availablePlayers : getAllPlayers();

      items.forEach(item => {
        const card = document.createElement("article");
        card.className = "card";
        card.setAttribute("role", "listitem");

        const title = document.createElement("h2");
        title.textContent = item.title || "Canal sin nombre";
        card.appendChild(title);

        const meta = document.createElement("div");
        meta.className = "meta";
        const attrs = getAttributes(item);
        if (attrs["group-title"]) {
          const badge = document.createElement("span");
          badge.textContent = attrs["group-title"];
          meta.appendChild(badge);
        }
        if (attrs["tvg-id"]) {
          const badge = document.createElement("span");
          badge.textContent = "ID: " + attrs["tvg-id"];
          meta.appendChild(badge);
        }
        card.appendChild(meta);

        const actions = document.createElement("div");
        actions.className = "actions";

        const selectedDefault =
          defaultPlayer && playersToRender.includes(defaultPlayer)
            ? defaultPlayer
            : playersToRender.find(player => player.isDefault) || playersToRender[0] || null;

        if (selectedDefault) {
          const playLink = document.createElement("a");
          playLink.className = "play";
          playLink.href = buildPlayerUrl(selectedDefault, item);
          playLink.textContent = "Reproducir";
          playLink.target = "_blank";
          playLink.rel = "noreferrer";
          actions.appendChild(playLink);
        } else {
          const fallback = document.createElement("a");
          fallback.className = "play";
          fallback.href = item.url;
          fallback.textContent = "Reproducir";
          fallback.target = "_blank";
          fallback.rel = "noreferrer";
          actions.appendChild(fallback);
        }

        if (playersToRender.length > 1) {
          actions.appendChild(createPlayerDropdown(item));
        }

        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "copy";
        copyBtn.textContent = "Copiar enlace";
        copyBtn.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(item.url);
            copyBtn.textContent = "Copiado";
            setTimeout(() => {
              copyBtn.textContent = "Copiar enlace";
            }, 1500);
          } catch (error) {
            console.warn("No se pudo copiar al portapapeles", error);
            copyBtn.textContent = "Error";
            setTimeout(() => {
              copyBtn.textContent = "Copiar enlace";
            }, 1500);
          }
        });
        actions.appendChild(copyBtn);

        const shareBtn = document.createElement("button");
        shareBtn.type = "button";
        shareBtn.className = "share";
        shareBtn.textContent = "Compartir";
        shareBtn.addEventListener("click", async () => {
          const shareData = { title: item.title || "Canal AceStream", text: item.title || "Canal AceStream", url: item.url };
          if (navigator.share) {
            try {
              await navigator.share(shareData);
              return;
            } catch (error) {
              console.warn("Share cancelado", error);
            }
          }
          try {
            await navigator.clipboard.writeText(item.url);
            shareBtn.textContent = "Copiado";
            setTimeout(() => {
              shareBtn.textContent = "Compartir";
            }, 1500);
          } catch (error) {
            alert("No se pudo compartir ni copiar este enlace");
          }
        });
        actions.appendChild(shareBtn);

        card.appendChild(actions);
        playlistContainer.appendChild(card);
      });
    }

    function applyFilters() {
      const term = searchInput.value.toLowerCase();
      const selectedGroup = groupFilter.value;
      const filtered = playlist.filter(item => {
        const attrs = getAttributes(item);
        const matchesTerm = term
          ? (item.title && item.title.toLowerCase().includes(term)) || JSON.stringify(attrs).toLowerCase().includes(term)
          : true;
        const matchesGroup = selectedGroup ? attrs["group-title"] === selectedGroup : true;
        return matchesTerm && matchesGroup;
      });
      render(filtered);
    }

    searchInput.addEventListener("input", applyFilters);
    groupFilter.addEventListener("change", applyFilters);

    populateSettingsForm();
    updateAvailablePlayersState(getAllPlayers());
    render(playlist);

    if (settingsToggle && settingsForm) {
      settingsToggle.addEventListener("click", () => {
        const isHidden = settingsForm.hasAttribute("hidden");
        if (isHidden) {
          populateSettingsForm();
          settingsForm.removeAttribute("hidden");
          settingsToggle.setAttribute("aria-expanded", "true");
        } else {
          settingsForm.setAttribute("hidden", "true");
          settingsToggle.setAttribute("aria-expanded", "false");
        }
      });
    }

    if (settingsForm) {
      settingsForm.addEventListener("submit", event => {
        event.preventDefault();
        const formData = new FormData(settingsForm);
        state.settings = {
          engineUrl: String(formData.get("engineUrl") || "").trim(),
          accessToken: String(formData.get("accessToken") || "").trim()
        };
        saveSettings(state.settings);
        setStatus('Ajustes guardados. Pulsa "Detectar reproductores" para actualizar la lista.', "success");
        settingsForm.setAttribute("hidden", "true");
        if (settingsToggle) settingsToggle.setAttribute("aria-expanded", "false");
        applyFilters();
        resolveAvailablePlayers();
      });
    }

    if (resetSettingsBtn) {
      resetSettingsBtn.addEventListener("click", () => {
        state.settings = defaultSettings();
        populateSettingsForm();
        saveSettings(state.settings);
        dynamicPlayers = [];
        setStatus("Ajustes restablecidos.", "info");
        resolveAvailablePlayers();
      });
    }

    if (refreshPlayersBtn) {
      refreshPlayersBtn.addEventListener("click", () => {
        refreshEnginePlayers();
      });
    }

    const platformTags = (() => {
      const tags = new Set();
      const ua = (navigator.userAgent || "").toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        tags.add("ios");
        tags.add("mobile");
      }
      if (/android/.test(ua)) {
        tags.add("android");
        tags.add(/tablet/.test(ua) ? "tablet" : "mobile");
      }
      if (/windows nt/.test(ua)) {
        tags.add("windows");
        tags.add("desktop");
      }
      if (/macintosh|mac os x/.test(ua)) {
        tags.add("mac");
        tags.add("desktop");
      }
      if (/linux/.test(ua) && !tags.has("android")) {
        tags.add("linux");
      }
      if (/smart-tv|smarttv|hbbtv/.test(ua)) {
        tags.add("smart-tv");
      }
      if (/web0s|webos|lgtv/.test(ua)) {
        tags.add("webos");
        tags.add("smart-tv");
      }
      if (/crkey/.test(ua)) {
        tags.add("chromecast");
      }
      if (!tags.has("desktop") && !tags.has("mobile")) {
        tags.add(/mobile|iphone|android/.test(ua) ? "mobile" : "desktop");
      }
      if (/safari/.test(ua) && !/chrome|crios|crmo/.test(ua)) {
        tags.add("safari");
      }
      if (/chrome|crios|crmo/.test(ua)) {
        tags.add("chrome");
      }
      if (/firefox|fxios/.test(ua)) {
        tags.add("firefox");
      }
      return tags;
    })();

    function matchesPlatforms(availability) {
      if (!availability) return true;
      const platforms = Array.isArray(availability.platforms) ? availability.platforms : [];
      const excluded = Array.isArray(availability.excludePlatforms) ? availability.excludePlatforms : [];
      for (const name of excluded) {
        if (platformTags.has(name)) return false;
      }
      if (platforms.length) {
        for (const name of platforms) {
          if (platformTags.has(name)) return true;
        }
        return false;
      }
      return true;
    }

    function matchesHostname(availability) {
      if (!availability || !Array.isArray(availability.hostnames) || !availability.hostnames.length) {
        return true;
      }
      const hostname = (location.hostname || "").toLowerCase();
      return availability.hostnames.some(candidate => candidate === hostname);
    }

    async function probeHttpEndpoint(endpoint) {
      if (!endpoint || !endpoint.url) return false;
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      let timeoutId = null;
      if (controller) {
        timeoutId = setTimeout(() => {
          try {
            controller.abort();
          } catch (error) {}
        }, endpoint.timeout || 2500);
      }

      try {
        const response = await fetch(endpoint.url, {
          method: endpoint.method || "HEAD",
          mode: endpoint.mode || "no-cors",
          cache: "no-store",
          signal: controller ? controller.signal : undefined
        });
        if (timeoutId) clearTimeout(timeoutId);
        if (response.type === "opaque") return true;
        if (Array.isArray(endpoint.expectStatus) && endpoint.expectStatus.length) {
          return endpoint.expectStatus.includes(response.status);
        }
        return response.ok;
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        return false;
      }
    }

    async function matchesHttpAvailability(availability) {
      if (!availability || !Array.isArray(availability.http) || !availability.http.length) {
        return true;
      }
      for (const endpoint of availability.http) {
        try {
          if (await probeHttpEndpoint(endpoint)) return true;
        } catch (error) {
          console.warn("Fallo al comprobar endpoint", endpoint, error);
        }
      }
      return false;
    }

    async function resolveAvailablePlayers() {
      const all = getAllPlayers();
      const available = [];
      for (const player of all) {
        const availability = player && typeof player === "object" ? player.availability : null;
        if (!matchesPlatforms(availability)) continue;
        if (!matchesHostname(availability)) continue;
        if (await matchesHttpAvailability(availability)) available.push(player);
      }
      updateAvailablePlayersState(available);
      applyFilters();
    }

    function normalizeDynamicAvailability(entry) {
      if (!entry || typeof entry !== "object") return null;
      const availability = {};

      if (Array.isArray(entry.platforms)) {
        const platforms = entry.platforms
          .map(value => (typeof value === "string" ? value.trim().toLowerCase() : ""))
          .filter(Boolean);
        if (platforms.length) availability.platforms = platforms;
      }

      if (Array.isArray(entry.excludePlatforms)) {
        const excluded = entry.excludePlatforms
          .map(value => (typeof value === "string" ? value.trim().toLowerCase() : ""))
          .filter(Boolean);
        if (excluded.length) availability.excludePlatforms = excluded;
      }

      if (Array.isArray(entry.hostnames)) {
        const hostnames = entry.hostnames
          .map(value => (typeof value === "string" ? value.trim().toLowerCase() : ""))
          .filter(Boolean);
        if (hostnames.length) availability.hostnames = hostnames;
      }

      if (Array.isArray(entry.http)) {
        const http = [];
        for (const candidate of entry.http) {
          if (typeof candidate === "string") {
            const trimmed = candidate.trim();
            if (trimmed) {
              http.push({ url: trimmed, method: "HEAD", timeout: 2500, mode: "no-cors" });
            }
            continue;
          }
          if (!candidate || typeof candidate !== "object") continue;
          const endpointUrl = typeof candidate.url === "string" ? candidate.url.trim() : "";
          if (!endpointUrl) continue;
          const endpoint = {
            url: endpointUrl,
            method: typeof candidate.method === "string" && candidate.method.trim().length ? candidate.method.trim().toUpperCase() : "HEAD",
            timeout:
              typeof candidate.timeout === "number" && Number.isFinite(candidate.timeout)
                ? Math.max(500, candidate.timeout)
                : 2500,
            mode: typeof candidate.mode === "string" && candidate.mode.trim().length ? candidate.mode.trim() : "no-cors"
          };
          if (Array.isArray(candidate.expectStatus)) {
            const expectStatus = candidate.expectStatus
              .map(value => parseInt(value, 10))
              .filter(value => Number.isInteger(value) && value >= 100 && value <= 599);
            if (expectStatus.length) endpoint.expectStatus = expectStatus;
          }
          http.push(endpoint);
        }
        if (http.length) availability.http = http;
      }

      return Object.keys(availability).length ? availability : null;
    }

    function normalizeEngineTemplate(template) {
      let normalized = String(template);
      const replacements = [
        [/\%\((?:content_id|infohash)\)s/gi, "{{infohash}}"],
        [/\%\((?:escaped_content_id|escaped_infohash)\)s/gi, "{{infohash_encoded}}"],
        [/\%\((?:title)\)s/gi, "{{title}}"],
        [/\%\((?:escaped_title)\)s/gi, "{{title_encoded}}"],
        [/\%\((?:url)\)s/gi, "{{url}}"],
        [/\%\((?:escaped_url)\)s/gi, "{{url}}"],
        [/\%(?:content_id|infohash)s/gi, "{{infohash}}"],
        [/\%(?:escaped_content_id|escaped_infohash)s/gi, "{{infohash_encoded}}"],
        [/\%(?:title)s/gi, "{{title}}"],
        [/\%(?:escaped_title)s/gi, "{{title_encoded}}"],
        [/\%(?:url)s/gi, "{{url}}"],
        [/\%(?:escaped_url)s/gi, "{{url}}"],
        [/\{(?:content_id|infohash)\}/gi, "{{infohash}}"],
        [/\{(?:escaped_content_id|escaped_infohash)\}/gi, "{{infohash_encoded}}"],
        [/\{(?:title)\}/gi, "{{title}}"],
        [/\{(?:escaped_title)\}/gi, "{{title_encoded}}"],
        [/\{(?:url|escaped_url)\}/gi, "{{url}}"]
      ];
      for (const replacement of replacements) {
        normalized = normalized.replace(replacement[0], replacement[1]);
      }
      return normalized;
    }

    function normalizeEnginePlayers(raw) {
      const output = [];
      const seen = new Set();
      let counter = 0;
      const stack = new Set();

      function ensureId(candidate, origin) {
        if (candidate && typeof candidate === "string" && candidate.trim()) return candidate.trim();
        return "engine-player-" + (origin ? origin + "-" : "") + (++counter);
      }

      function createPreset(entry, originKey) {
        if (!entry || typeof entry !== "object") return null;

        let template = entry.template || entry.url_template || entry.play_url_tpl || entry.play_url || entry.launch_url || entry.href || entry.url;
        if (!template && entry.cmdline) {
          template = entry.cmdline;
        }
        if (!template) {
          const handler = typeof entry.handler === "string" ? entry.handler.toLowerCase() : "";
          const type = typeof entry.type === "string" ? entry.type.toLowerCase() : "";
          const deviceId = entry.device_id || entry.deviceId || entry.uuid || entry.id || entry.name || entry.title || entry.label;
          if (deviceId && (handler.indexOf("acecast") !== -1 || handler.indexOf("chromecast") !== -1 || handler.indexOf("airplay") !== -1 || handler.indexOf("dlna") !== -1 || type.indexOf("acecast") !== -1 || type.indexOf("chromecast") !== -1 || type.indexOf("airplay") !== -1 || type.indexOf("dlna") !== -1)) {
            template = "acecast://device/" + encodeURIComponent(deviceId) + "/play?infohash={{infohash}}&title={{title_encoded}}";
          }
        }
        if (!template || typeof template !== "string") return null;

        template = normalizeEngineTemplate(template);

        const id = ensureId(entry.id || entry.device_id || entry.uuid || entry.name, originKey);
        if (seen.has(id)) return null;
        seen.add(id);

        const labelSource = entry.label || entry.title || entry.display_name || entry.name || entry.device_name || entry.friendly_name || entry.description || id;
        const label = typeof labelSource === "string" && labelSource.trim() ? labelSource.trim() : id;

        const preset = {
          id,
          label,
          type: "template",
          template
        };

        const iconCandidate = entry.icon || entry.logo || entry.image;
        if (typeof iconCandidate === "string" && iconCandidate.trim()) {
          preset.icon = iconCandidate.trim();
        }

        if (entry.is_default || entry.default) {
          preset.isDefault = Boolean(entry.is_default || entry.default);
        }

        const availability = normalizeDynamicAvailability(entry.availability || entry.requirements || null);
        if (availability) {
          preset.availability = availability;
        }

        return preset;
      }

      function visit(value, originKey) {
        if (!value || typeof value !== "object") return;
        if (stack.has(value)) return;
        stack.add(value);

        if (Array.isArray(value)) {
          for (const entry of value) {
            const preset = createPreset(entry, originKey);
            if (preset) output.push(preset);
          }
          stack.delete(value);
          return;
        }

        const keys = Object.keys(value);
        const looksLikeEntry = keys.some(key =>
          key === "id" || key === "name" || key === "label" || key === "title" || key === "url" ||
          key === "template" || key === "play_url" || key === "play_url_tpl" || key === "launch_url" || key === "href"
        );

        if (looksLikeEntry) {
          const preset = createPreset(value, originKey);
          if (preset) output.push(preset);
          stack.delete(value);
          return;
        }

        for (const key of keys) {
          visit(value[key], key);
        }

        stack.delete(value);
      }

      visit(raw, "");

      return output;
    }

    async function fetchEnginePlayers(settings) {
      const base = String(settings.engineUrl || "").trim();
      if (!base) return [];
      const cleanBase = base.replace(/\\\/+$, "");
      const params = new URLSearchParams();
      params.set("method", "get_available_players");
      params.set("format", "json");
      if (settings.accessToken) params.set("token", settings.accessToken);

      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeoutId = controller
        ? setTimeout(() => {
            try {
              controller.abort();
            } catch (error) {}
          }, 8000)
        : null;

      try {
        const response = await fetch(cleanBase + "/server/api/?" + params.toString(), {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          signal: controller ? controller.signal : undefined
        });
        if (!response.ok) {
          throw new Error("HTTP " + response.status + " al consultar el motor AceStream.");
        }
        const text = await response.text();
        let payload = {};
        if (text) {
          try {
            payload = JSON.parse(text);
          } catch (error) {
            throw new Error("Respuesta no válida del motor AceStream (se esperaba JSON).");
          }
        }
        if (payload && payload.error) {
          if (typeof payload.error === "string") throw new Error(payload.error);
          if (payload.error && payload.error.message) throw new Error(payload.error.message);
          throw new Error("El motor AceStream devolvió un error.");
        }
        const root = payload && typeof payload === "object"
          ? (payload.result !== undefined ? payload.result : payload.data !== undefined ? payload.data : payload)
          : {};
        return normalizeEnginePlayers(root);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }

    async function refreshEnginePlayers() {
      const settings = state.settings || defaultSettings();
      if (!settings.engineUrl) {
        setStatus("Configura la URL del motor AceStream en Ajustes para detectar reproductores.", "info");
        dynamicPlayers = [];
        resolveAvailablePlayers();
        return;
      }
      if (!settings.accessToken) {
        setStatus("Introduce el access token del motor AceStream y guarda los ajustes.", "info");
        dynamicPlayers = [];
        resolveAvailablePlayers();
        return;
      }
      if (state.engineBusy) return;
      state.engineBusy = true;
      setStatus("Consultando motor AceStream...", "loading");
      try {
        const fetched = await fetchEnginePlayers(settings);
        dynamicPlayers = fetched;
        if (fetched.length) {
          setStatus("Se detectaron " + fetched.length + " reproductores disponibles.", "success");
        } else {
          setStatus("No se detectaron reproductores disponibles.", "info");
        }
      } catch (error) {
        console.warn("Error al obtener reproductores disponibles", error);
        dynamicPlayers = [];
        const message = error && error.message ? error.message : "No se pudieron obtener los reproductores disponibles.";
        setStatus(message, "error");
      } finally {
        state.engineBusy = false;
      }
      resolveAvailablePlayers();
    }

    resolveAvailablePlayers().catch(error => {
      console.warn("No se pudo evaluar disponibilidad de reproductores", error);
      updateAvailablePlayersState(getAllPlayers());
      applyFilters();
    });

    if (!state.settings.engineUrl) {
      setStatus("Configura la URL del motor AceStream para detectar reproductores.", "info");
    } else if (!state.settings.accessToken) {
      setStatus("Introduce el access token del motor AceStream y guarda los ajustes.", "info");
    } else {
      refreshEnginePlayers();
    }
  </script>
</body>
</html>`;
}



function main() {
  ensureDirs();
  const sourcePath = resolveSourcePath(process.argv);
  const targetPlaylistPath = path.join(playlistsDir, "playlist.m3u8");

  if (!fs.existsSync(sourcePath)) {
    console.error(`No se encontro la playlist en: ${sourcePath}`);
    process.exitCode = 1;
    return;
  }

  copyPlaylist(sourcePath, targetPlaylistPath);

  const playlistContent = fs.readFileSync(targetPlaylistPath, "utf8");
  const entries = parseM3U8(playlistContent);
  const playerPresets = loadPlayerPresets();
  const html = buildHtml(entries, playerPresets);

  fs.writeFileSync(path.join(docsDir, "index.html"), html, "utf8");
  fs.writeFileSync(path.join(docsDir, "playlist.json"), JSON.stringify(entries, null, 2), "utf8");

  console.log(`Playlist procesada (${entries.length} entradas).`);
  console.log(`- Copia en ${targetPlaylistPath}`);
  console.log(`- Pagina generada en ${path.join(docsDir, "index.html")}`);
}

main();
