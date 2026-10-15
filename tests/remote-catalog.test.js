const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Engine = require("../packages/web-client/public/assets/js/remote-engine");
const hash = number => number.toString(16).padStart(40, "0");
const channel = number => ({ name: "Channel " + number, infohash: hash(number), categories: ["tv"] });
const response = data => ({ ok: true, status: 200, json: async () => data });
const queryOf = url => Object.fromEntries(url.split("?")[1].split("&").map(pair => pair.split("=").map(decodeURIComponent)));

test("catalog reads every page and retains variants with the same name", async () => {
  const calls = [];
  const client = Engine.createClient({ baseUrl: "https://engine.example/proxy/", fetch: async url => {
    calls.push(url);
    const page = +queryOf(url).page;
    const rows = Array.from({ length: page ? 5 : 200 }, (_, i) => channel(page * 200 + i));
    rows.forEach(item => { item.name = "Same channel"; });
    return response({ result: { total: 205, results: rows } });
  } });
  const entries = await client.catalog();
  assert.equal(calls.length, 2);
  assert.equal(entries.length, 205);
  assert.equal(entries[204].infohash, hash(204));
  assert.ok(calls.every(url => url.startsWith("https://engine.example/proxy/search?")));
  assert.equal(queryOf(calls[0]).page_size, "200");
  assert.equal(queryOf(calls[0]).query, "");
});

test("grouped search keeps every infohash and deduplicates across groups", async () => {
  const client = Engine.createClient({ baseUrl: "https://engine.example", fetch: async () =>
    response({ result: { total: 2, results: [
      { name: "Group", items: [channel(1), channel(2)] },
      { name: "Group", items: [channel(2), channel(3)] }
    ] } }) });
  const entries = await client.catalog();
  assert.deepEqual(entries.map(item => item.infohash), [hash(1), hash(2), hash(3)]);
});

test("search failures, malformed rows, repeated pages and truncation cannot return a partial catalog", async () => {
  const scenarios = [
    async () => response({ error: { code: 1 } }),
    async () => response({ result: { results: [{ name: "Missing hash" }] } }),
    async () => response({ result: { total: 400, results: [channel(1)] } }),
    async url => response({ result: { total: 400, results: +queryOf(url).page ? [] : [channel(1)] } })
  ];
  for (const fetch of scenarios) {
    await assert.rejects(Engine.createClient({ baseUrl: "https://engine.example", fetch }).catalog());
  }
  const bounded = Engine.createClient({ baseUrl: "https://engine.example", fetch: async () =>
    response({ result: { total: 400, results: [channel(1)] } }) });
  await assert.rejects(bounded.catalog({ maxPages: 1 }), /límite/);
});

test("legacy endpoint fallback happens only on 404, never on authentication failure", async () => {
  const calls = [];
  const client = Engine.createClient({ baseUrl: "https://engine.example", fetch: async url => {
    calls.push(url);
    return url.includes("/search?") ? { ok: false, status: 404 } :
      response({ result: { results: [channel(1)], total: 1 } });
  } });
  assert.equal((await client.catalog()).length, 1);
  assert.equal(queryOf(calls[1]).method, "search");
  let requests = 0;
  await assert.rejects(Engine.createClient({ baseUrl: "https://engine.example", fetch: async () => {
    requests++; return { ok: false, status: 401 };
  } }).catalog(), /401/);
  assert.equal(requests, 1);
});

test("public player methods need no token and preserve the API string response", async () => {
  const calls = [];
  const client = Engine.createClient({ baseUrl: "https://engine.example", fetch: async url => {
    calls.push(url);
    return response({ result: queryOf(url).method === "open_in_player" ? "ok" : { players: [] } });
  } });
  assert.deepEqual(await client.api({ method: "get_available_players", content_id: hash(1) }), { players: [] });
  assert.equal(await client.api({ method: "open_in_player", infohash: hash(2), player_id: "tv & cast" }), "ok");
  assert.equal(queryOf(calls[1]).api_version, "3");
  assert.equal(queryOf(calls[1]).infohash, hash(2));
  assert.equal(queryOf(calls[1]).player_id, "tv & cast");
  assert.ok(!calls[0].includes("token="));
});

test("playback uses infohash instead of content_id, and settings reject embedded credentials", () => {
  const url = Engine.streamUrl("https://engine.example/prefix/", hash(12));
  assert.equal(url, "https://engine.example/prefix/ace/manifest.m3u8?infohash=" + hash(12));
  assert.equal(Engine.infohash("magnet:?xt=urn:btih:" + hash(12)), hash(12));
  assert.equal(Engine.infohash("acestream:?infohash=" + hash(12)), hash(12));
  assert.equal(Engine.infohash("acestream://" + hash(12)), hash(12));
  assert.equal(Engine.infohash("acestream://invalid"), null);
  assert.deepEqual(Engine.reference("acestream://" + hash(12)), { hash: hash(12), type: "content_id" });
  assert.deepEqual(Engine.reference("magnet:?xt=urn:btih:" + hash(12)), { hash: hash(12), type: "infohash" });
  assert.equal(Engine.streamUrl("https://engine.example", hash(12), "content_id"),
    "https://engine.example/ace/manifest.m3u8?content_id=" + hash(12));
  for (const base of ["javascript:alert(1)", "https://user:password@engine.example", "https://engine.example?token=secret"]) {
    assert.throws(() => Engine.normalizeBaseUrl(base));
  }
});

test("timeouts also cover a response body that never completes", async () => {
  const client = Engine.createClient({ baseUrl: "https://engine.example", timeoutMs: 5,
    fetch: async () => ({ ok: true, json: () => new Promise(() => {}) }) });
  await assert.rejects(client.catalog(), /tiempo/);
});

class Element {
  constructor(tag = "") { this.tagName = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.value = ""; }
  set innerHTML(value) { this.children = []; }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return this.text || this.children.map(child => child.textContent).join(""); }
  get options() { return this.children; }
  appendChild(child) { this.children.push(child); return child; }
  removeChild(child) { this.children.splice(this.children.indexOf(child), 1); }
  remove(index) { this.children.splice(index, 1); }
  contains(child) { return this.children.includes(child) || this.children.some(node => node.contains(child)); }
  setAttribute(key, value) { this[key] = value; }
  addEventListener(name, listener) { (this.listeners[name] ||= []).push(listener); }
  dispatch(type) { for (const listener of this.listeners[type] || []) listener({ type, preventDefault() {} }); }
}
function descendants(element) { return [element, ...element.children.flatMap(descendants)]; }
async function settle() { for (let i = 0; i < 50; i++) await Promise.resolve(); }
function pageHarness(fetcher, initial = {}) {
  const ids = ["playlist", "search", "group", "acestream-form", "acestream-save", "acestream-fetch",
    "acestream-refresh", "acestream-status", "catalog-refresh", "catalog-summary", "catalog-more"];
  const nodes = Object.fromEntries(ids.map(id => [id, new Element()]));
  nodes.group.appendChild(new Element("option"));
  const form = nodes["acestream-form"];
  form.elements = Object.fromEntries(["baseUrl", "accessToken", "webUiToken", "remoteCatalog"].map(name => [name, new Element("input")]));
  const storage = new Map([["yavale_acestream_settings", JSON.stringify({
    baseUrl: "https://engine.example", remoteCatalog: true, ...initial
  })]]);
  const window = { location: { protocol: "https:" }, YaValeEngine: { ...Engine,
    createClient: options => Engine.createClient({ ...options, fetch: fetcher }) },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    setTimeout: () => 1, clearTimeout() {} };
  const document = { hidden: false, getElementById: id => nodes[id], createElement: tag => new Element(tag) };
  class FormData {
    constructor(form) { this.form = form; }
    get(name) { return this.form.elements[name].value; }
    has(name) { return Boolean(this.form.elements[name].checked); }
  }
  class Controller {
    constructor() { this.signal = { aborted: false, addEventListener() {}, removeEventListener() {} }; }
    abort() { this.signal.aborted = true; }
  }
  const copied = [];
  const html = fs.readFileSync(path.join(__dirname, "../packages/web-client/public/index.html"), "utf8");
  const inline = html.match(/<script>\r?\n([\s\S]*?)<\/script>/)[1];
  new Function("window", "document", "FormData", "navigator", "AbortController", "clearTimeout", inline)(
    window, document, FormData, { clipboard: { writeText: async value => { copied.push(value); } } }, Controller, () => {});
  return { window, nodes, copied };
}

test("web loads all channels, filters beyond the first page, copies the updated hash and uses real remote player IDs", async () => {
  const calls = [];
  const page = pageHarness(async url => {
    calls.push(url);
    const q = queryOf(url);
    if (q.method === "get_available_players") return response({ result: {
      players: [{ name: "Remote TV", id: "real-device-id", type: "aircast", protocol: "chromecast" }]
    } });
    if (q.method === "open_in_player") return response({ result: "ok" });
    const p = +q.page;
    return response({ result: { total: 205, results: Array.from({ length: p ? 5 : 200 }, (_, i) => channel(p * 200 + i)) } });
  });
  await settle();
  assert.equal(page.window.Window_DATA.playlist.length, 205);
  assert.equal(page.nodes.playlist.children.length, 100);
  page.nodes["catalog-more"].dispatch("click");
  assert.equal(page.nodes.playlist.children.length, 200);
  page.nodes.search.value = "Channel 204";
  page.nodes.search.dispatch("input");
  assert.equal(page.nodes.playlist.children.length, 1);
  let elements = descendants(page.nodes.playlist);
  const play = elements.find(node => node.className === "play");
  assert.equal(play.href, "https://engine.example/ace/manifest.m3u8?infohash=" + hash(204));
  elements.find(node => node.className === "copy").dispatch("click");
  await settle();
  assert.deepEqual(page.copied, ["magnet:?xt=urn:btih:" + hash(204)]);
  const picker = elements.find(node => node.className === "player-picker");
  picker.open = true; picker.dispatch("toggle");
  await settle();
  elements = descendants(picker);
  const device = elements.find(node => node.dataset.kind === "dynamic");
  assert.equal(device.textContent, "Remote TV (chromecast)");
  device.dispatch("click");
  await settle();
  const open = calls.find(url => queryOf(url).method === "open_in_player");
  assert.equal(queryOf(open).player_id, "real-device-id");
  assert.equal(queryOf(open).infohash, hash(204));
  assert.ok(!calls.some(url => url.includes("/remote-control")));
});

test("a failed later refresh keeps the complete previous list", async () => {
  let broken = false;
  const page = pageHarness(async url => {
    const p = +queryOf(url).page;
    if (broken && p === 1) return { ok: false, status: 503 };
    return response({ result: { total: broken ? 400 : 1,
      results: broken ? Array.from({ length: 200 }, (_, i) => channel(1000 + i)) : [channel(1)] } });
  });
  await settle();
  broken = true;
  page.nodes["catalog-refresh"].dispatch("click");
  await settle();
  assert.equal(page.window.Window_DATA.playlist.length, 1);
  assert.equal(page.window.Window_DATA.playlist[0].infohash, hash(1));
  assert.ok(page.nodes["catalog-summary"].textContent.includes("se conserva"));
  assert.equal(page.nodes["catalog-refresh"].disabled, false);
});

test("changing engines ignores late responses from the previous engine and updates all links", async () => {
  let resolveFirst;
  const page = pageHarness(url => {
    if (url.startsWith("https://engine.example/")) return new Promise(resolve => { resolveFirst = resolve; });
    return Promise.resolve(response({ result: { total: 1, results: [channel(2)] } }));
  });
  page.nodes["acestream-form"].elements.baseUrl.value = "https://new-engine.example";
  page.nodes["acestream-save"].dispatch("click");
  await settle();
  resolveFirst(response({ result: { total: 1, results: [channel(1)] } }));
  await settle();
  assert.equal(page.window.Window_DATA.playlist[0].infohash, hash(2));
  const play = descendants(page.nodes.playlist).find(node => node.className === "play");
  assert.ok(play.href.startsWith("https://new-engine.example/"));
});

test("playlist regeneration preserves remote integration and synchronizes Pages and iOS", () => {
  const os = require("node:os");
  const { spawnSync } = require("node:child_process");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "yavale-catalog-test-"));
  const repo = path.resolve(__dirname, "..");
  try {
    for (const file of ["scripts/generate-playlist-page.js", "scripts/sync-webapp.js",
      "packages/web-client/public/assets/js/remote-engine.js"]) {
      const target = path.join(root, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(repo, file), target);
    }
    fs.mkdirSync(path.join(root, "playlists"), { recursive: true });
    fs.writeFileSync(path.join(root, "playlists/playlist.m3u8"),
      "#EXTM3U\n#EXTINF:-1 group-title=\"tv\",Fixture\nmagnet:?xt=urn:btih:" + hash(1) + "\n");
    const result = spawnSync(process.execPath, [path.join(root, "scripts/generate-playlist-page.js")],
      { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const html = fs.readFileSync(path.join(root, "packages/web-client/public/index.html"), "utf8");
    assert.ok(html.includes('id="catalog-refresh"'));
    assert.ok(html.includes('./assets/js/remote-engine.js'));
    new Function(html.match(/<script>\r?\n([\s\S]*?)<\/script>/)[1]);
    for (const target of ["docs", "packages/ios-app/WebBundle"]) {
      assert.equal(fs.readFileSync(path.join(root, target, "index.html"), "utf8"), html);
      assert.equal(fs.readFileSync(path.join(root, target, "assets/js/remote-engine.js"), "utf8"),
        fs.readFileSync(path.join(repo, "packages/web-client/public/assets/js/remote-engine.js"), "utf8"));
      assert.equal(JSON.parse(fs.readFileSync(path.join(root, target, "playlist.json"), "utf8")).length, 1);
    }
  } finally {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("yavale-catalog-test-"));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
