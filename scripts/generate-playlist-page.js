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
    if (!line) {
      continue;
    }

    if (line.startsWith("#EXTINF")) {
      pending = parseExtInf(line);
      continue;
    }

    if (line.startsWith("#")) {
      continue;
    }

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
  if (!match) {
    return info;
  }

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

const DEFAULT_PLAYER_PRESETS = [
  {
    id: "acestream-engine",
    label: "Ace Stream (motor local)",
    type: "acestream"
  },
  {
    id: "vlc",
    label: "VLC (iOS/macOS)",
    type: "template",
    template: "vlc-x-callback://x-callback-url/stream?url={{url}}"
  },
  {
    id: "infuse",
    label: "Infuse",
    type: "template",
    template: "infuse://x-callback-url/play?url={{url}}"
  },
  {
    id: "kodi",
    label: "Kodi",
    type: "template",
    template: "kodi://play?item={{url}}"
  },
  {
    id: "ace-player-hd",
    label: "Ace Player HD",
    type: "template",
    template: "acestream://{{infohash}}"
  },
  {
    id: "acecast",
    label: "AceCast (seleccionar dispositivo)",
    type: "template",
    template:
      "acecast://play?method=fromHash&infohash={{infohash}}&name={{title_encoded}}"
  },
  {
    id: "windows-media-player",
    label: "Reproductor de Windows Media",
    type: "template",
    template: "wmplayer.exe?{{url_raw}}"
  }
];

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
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function loadPlayerPresets() {
  const presetPath = resolvePlayerPresetPath();
  if (!presetPath) {
    return DEFAULT_PLAYER_PRESETS;
  }

  try {
    const raw = fs.readFileSync(presetPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(
        `[generate-playlist] ${presetPath} no contiene un array, usando valores por defecto.`
      );
      return DEFAULT_PLAYER_PRESETS;
    }

    const sanitized = parsed
      .map((entry, index) => sanitizePlayerPreset(entry, index, presetPath))
      .filter(Boolean);

    if (!sanitized.length) {
      console.warn(
        `[generate-playlist] No se encontraron presets válidos en ${presetPath}, usando valores por defecto.`
      );
      return DEFAULT_PLAYER_PRESETS;
    }

    return sanitized;
  } catch (error) {
    console.warn(
      `[generate-playlist] No se pudo leer ${presetPath}, usando valores por defecto.`,
      error
    );
    return DEFAULT_PLAYER_PRESETS;
  }
}

function sanitizePlayerPreset(entry, index, presetPath) {
  if (!entry || typeof entry !== "object") {
    console.warn(
      `[generate-playlist] Preset inválido en ${presetPath} (posición ${index}).`
    );
    return null;
  }

  const id = typeof entry.id === "string" && entry.id.trim();
  const label = typeof entry.label === "string" && entry.label.trim();
  const type = typeof entry.type === "string" && entry.type.trim();

  if (!id || !label || !type) {
    console.warn(
      `[generate-playlist] Preset omitido en ${presetPath} (posición ${index}) por campos requeridos faltantes.`
    );
    return null;
  }

  const preset = { id, label, type };

  if (type === "template") {
    const template =
      typeof entry.template === "string" && entry.template.trim().length
        ? entry.template
        : null;
    if (!template) {
      console.warn(
        `[generate-playlist] Preset ${id} omitido: falta template para tipo template.`
      );
      return null;
    }
    preset.template = template;
  }

  if (entry.icon) {
    preset.icon = entry.icon;
  }

  return preset;
}

function buildHtml(entries, playerPresets) {
  const playlistJson = JSON.stringify(entries).replace(/</g, "\\u003C");
  const playersJson = JSON.stringify(playerPresets).replace(/</g, "\\u003C");
  const generatedAt = new Date().toISOString();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Playlist AceStream</title>
  <style>
    :root {
      color-scheme: dark light;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      margin: 0;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1.5rem;
    }
    header {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    h1 {
      margin: 0;
      font-size: clamp(1.5rem, 3vw, 2.3rem);
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }
    input[type="search"] {
      flex: 1 1 250px;
      padding: 0.65rem 0.9rem;
      border-radius: 0.75rem;
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(15, 23, 42, 0.65);
      color: inherit;
    }
    select {
      padding: 0.65rem 0.9rem;
      border-radius: 0.75rem;
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(15, 23, 42, 0.65);
      color: inherit;
    }
    main {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1.25rem;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 1rem;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.25);
      box-shadow: 0 15px 25px rgba(15, 23, 42, 0.25);
      transition: transform 120ms ease, box-shadow 120ms ease;
    }
    .card:hover {
      transform: translateY(-3px);
      box-shadow: 0 18px 28px rgba(15, 23, 42, 0.3);
    }
    .card h2 {
      margin: 0;
      font-size: 1.05rem;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .meta span {
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.15);
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .actions a,
    .actions button {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      gap: 0.35rem;
      padding: 0.6rem 0.9rem;
      border-radius: 0.75rem;
      border: none;
      cursor: pointer;
      font-weight: 600;
      text-decoration: none;
      color: #0f172a;
      background: #38bdf8;
    }
    .actions button.copy,
    .actions button.share {
      background: rgba(148, 163, 184, 0.15);
      color: inherit;
    }
    .player-dropdown {
      position: relative;
      width: 100%;
    }
    .player-dropdown__toggle {
      width: 100%;
      justify-content: space-between;
    }
    .player-dropdown__arrow {
      display: inline-block;
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid currentColor;
      transition: transform 120ms ease;
    }
    .player-dropdown.is-open .player-dropdown__arrow {
      transform: rotate(180deg);
    }
    .player-dropdown__menu {
      position: absolute;
      top: calc(100% + 0.35rem);
      left: 0;
      right: 0;
      display: none;
      flex-direction: column;
      gap: 0.4rem;
      margin: 0;
      padding: 0.6rem;
      list-style: none;
      border-radius: 0.9rem;
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(15, 23, 42, 0.95);
      box-shadow: 0 18px 28px rgba(15, 23, 42, 0.45);
      z-index: 10;
    }
    .player-dropdown.is-open .player-dropdown__menu {
      display: flex;
    }
    .player-dropdown__menu li a {
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.45rem;
      padding: 0.55rem 0.7rem;
      border-radius: 0.6rem;
      text-decoration: none;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      transition: background 120ms ease, color 120ms ease;
    }
    .player-dropdown__menu li a img {
      width: 18px;
      height: 18px;
      object-fit: contain;
      filter: drop-shadow(0 0 2px rgba(15, 23, 42, 0.6));
    }
    .player-dropdown__menu li a span {
      flex: 1;
    }
    .player-dropdown__menu li a:hover,
    .player-dropdown__menu li a:focus-visible {
      background: rgba(56, 189, 248, 0.2);
      color: #f0f9ff;
    }
    footer {
      font-size: 0.8rem;
      color: #64748b;
      text-align: center;
      margin-top: auto;
    }
    @media (prefers-color-scheme: light) {
      body {
        background: #f8fafc;
        color: #0f172a;
      }
      .card {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.45);
        box-shadow: 0 15px 25px rgba(100, 116, 139, 0.15);
      }
      .actions a,
      .actions button {
        color: white;
        background: #2563eb;
      }
      .actions button.copy,
      .actions button.share {
        background: rgba(148, 163, 184, 0.2);
        color: inherit;
      }
      .player-dropdown__menu {
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(148, 163, 184, 0.45);
        box-shadow: 0 18px 28px rgba(148, 163, 184, 0.25);
      }
      .player-dropdown__menu li a {
        color: #2563eb;
        background: rgba(37, 99, 235, 0.12);
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>Playlist AceStream</h1>
    <p>Actualizada: ${generatedAt}</p>
    <div class="toolbar">
      <input id="search" type="search" placeholder="Buscar por nombre, grupo o ID" />
      <select id="group">
        <option value="">Todos los grupos</option>
      </select>
    </div>
  </header>
  <main id="playlist" role="list">
  </main>
  <footer>Generado desde playlist.m3u8 - Proyecto YaVale</footer>
  <script>
    const playlist = ${playlistJson};
    const players = ${playersJson};
    const playlistContainer = document.getElementById("playlist");
    const searchInput = document.getElementById("search");
    const groupFilter = document.getElementById("group");

    const groups = Array.from(new Set(playlist.map(item => item.attributes["group-title"]).filter(Boolean))).sort();
    for (const group of groups) {
      const option = document.createElement("option");
      option.value = group;
      option.textContent = group;
      groupFilter.appendChild(option);
    }

    function extractInfoHash(url) {
      if (!url) {
        return "";
      }

      if (url.startsWith("acestream://")) {
        return url.slice("acestream://".length);
      }

      const magnetPrefix = "magnet:?xt=urn:btih:";
      if (url.startsWith(magnetPrefix)) {
        const hashSection = url.slice(magnetPrefix.length);
        const endIndex = hashSection.indexOf("&");
        return endIndex === -1
          ? hashSection
          : hashSection.slice(0, endIndex);
      }

      return "";
    }

    function buildPlayerUrl(player, item) {
      const url = item.url;
      const infohash = extractInfoHash(url);
      const title = item.title || "";

      if (player.type === "acestream") {
        if (url.startsWith("acestream://")) {
          return url;
        }
        if (url.startsWith("magnet:?xt=urn:btih:")) {
          return infohash ? "acestream://" + infohash : url;
        }
        return url;
      }

      if (player.type === "template" && player.template) {
        const encoded = encodeURIComponent(url);
        const encodedTitle = encodeURIComponent(title);
        const encodedInfoHash = encodeURIComponent(infohash);
        let result = player.template;
        result = result.split("{{url}}").join(encoded);
        result = result.split("{{url_raw}}").join(url);
        result = result.split("{{infohash}}").join(infohash);
        result = result.split("{{infohash_encoded}}").join(encodedInfoHash);
        result = result.split("{{title}}").join(title);
        result = result.split("{{title_encoded}}").join(encodedTitle);
        return result;
      }

      return url;
    }

    let activeDropdown = null;

    function closeActiveDropdown() {
      if (!activeDropdown) {
        return;
      }
      const toggle = activeDropdown.querySelector(".player-dropdown__toggle");
      if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
      }
      activeDropdown.classList.remove("is-open");
      activeDropdown = null;
    }

    document.addEventListener("click", (event) => {
      if (!activeDropdown) {
        return;
      }
      if (activeDropdown.contains(event.target)) {
        return;
      }
      closeActiveDropdown();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeActiveDropdown();
      }
    });

    function createPlayerDropdown(item, index) {
      const dropdown = document.createElement("div");
      dropdown.className = "player-dropdown";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "player-dropdown__toggle play";
      toggle.textContent = "Reproducir";
      toggle.setAttribute("aria-haspopup", "true");
      const arrow = document.createElement("span");
      arrow.className = "player-dropdown__arrow";
      toggle.appendChild(arrow);

      const menu = document.createElement("ul");
      menu.className = "player-dropdown__menu";
      const menuId = "player-menu-" + index;
      menu.id = menuId;
      menu.setAttribute("role", "menu");
      toggle.setAttribute("aria-controls", menuId);
      toggle.setAttribute("aria-expanded", "false");

      toggle.addEventListener("click", () => {
        const isOpen = dropdown.classList.contains("is-open");
        if (isOpen) {
          dropdown.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
          if (activeDropdown === dropdown) {
            activeDropdown = null;
          }
          return;
        }
        closeActiveDropdown();
        dropdown.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        activeDropdown = dropdown;
      });

      for (const player of players) {
        const li = document.createElement("li");
        const link = document.createElement("a");
        link.href = buildPlayerUrl(player, item);
        link.target = "_blank";
        link.rel = "noreferrer";
        link.setAttribute("role", "menuitem");

        if (player.icon) {
          const icon = document.createElement("img");
          icon.src = player.icon;
          icon.alt = "";
          icon.width = 18;
          icon.height = 18;
          icon.setAttribute("aria-hidden", "true");
          link.appendChild(icon);
        }

        const labelSpan = document.createElement("span");
        labelSpan.textContent = player.label;
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

    function render(list) {
      closeActiveDropdown();
      playlistContainer.innerHTML = "";
      if (!list.length) {
        const empty = document.createElement("p");
        empty.textContent = "No hay canales que coincidan con el filtro.";
        playlistContainer.appendChild(empty);
        return;
      }

      list.forEach((item, index) => {
        const card = document.createElement("article");
        card.className = "card";
        card.setAttribute("role", "listitem");

        const title = document.createElement("h2");
        title.textContent = item.title || "Canal sin nombre";
        card.appendChild(title);

        const meta = document.createElement("div");
        meta.className = "meta";
        if (item.attributes["group-title"]) {
          const badge = document.createElement("span");
          badge.textContent = item.attributes["group-title"];
          meta.appendChild(badge);
        }
        if (item.attributes["tvg-id"]) {
          const badge = document.createElement("span");
          badge.textContent = "ID: " + item.attributes["tvg-id"];
          meta.appendChild(badge);
        }
        card.appendChild(meta);

        const actions = document.createElement("div");
        actions.className = "actions";

        if (players.length) {
          actions.appendChild(createPlayerDropdown(item, index));
        } else {
          const fallbackLink = document.createElement("a");
          fallbackLink.className = "play";
          fallbackLink.href = item.url;
          fallbackLink.textContent = "Reproducir";
          fallbackLink.target = "_blank";
          fallbackLink.rel = "noreferrer";
          actions.appendChild(fallbackLink);
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
          const shareData = {
            title: item.title || "Canal AceStream",
            text: item.title || "Canal AceStream",
            url: item.url
          };
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
      const group = groupFilter.value;
      const filtered = playlist.filter(item => {
        const matchTerm = term
          ? (item.title && item.title.toLowerCase().includes(term)) ||
            (item.attributes && JSON.stringify(item.attributes).toLowerCase().includes(term))
          : true;
        const matchGroup = group ? item.attributes["group-title"] === group : true;
        return matchTerm && matchGroup;
      });
      render(filtered);
    }

    searchInput.addEventListener("input", applyFilters);
    groupFilter.addEventListener("change", applyFilters);

    render(playlist);
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

