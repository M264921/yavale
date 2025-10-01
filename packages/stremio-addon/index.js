const http = require("http");
const { addonBuilder } = require("stremio-addon-sdk");
const catalog = require("./catalog.json");

const ACESTREAM_BASE_URL = process.env.ACESTREAM_BASE_URL || "http://toninomontana.ddns.net:6878";
const STREAM_PATH = process.env.ACESTREAM_STREAM_PATH || "/ace/getstream?id=";
const LISTEN_PORT = Number(process.env.PORT || 7000);

const manifest = {
  "id": "org.montanatv.addon",
  "version": "1.1.0",
  "name": "MontanaTV",
  "description": "Addon personalizado con canales AceStream remotos y catalogo IPTV",
  "resources": ["stream", "catalog"],
  "types": ["movie"],
  "catalogs": [
    {
      "type": "movie",
      "id": "montanatv.catalog",
      "name": "MontanaTV IPTV"
    }
  ],
  "idPrefixes": ["acestream"]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(({ type, id }) => {
  console.log("CatalogHandler llamado con:", type, id);
  if (type === "movie" && id === "montanatv.catalog") {
    return Promise.resolve({ metas: catalog.metas });
  }
  return Promise.resolve({ metas: [] });
});

builder.defineStreamHandler(({ id }) => {
  if (id.startsWith("acestream:")) {
    const hash = id.split("acestream:")[1];
    return Promise.resolve({
      streams: [
        {
          title: "Ver en MontanaTV",
          url: `${ACESTREAM_BASE_URL}${STREAM_PATH}${hash}`
        }
      ]
    });
  }
  return Promise.resolve({ streams: [] });
});

const addonInterface = builder.getInterface();

http.createServer(addonInterface).listen(LISTEN_PORT, "0.0.0.0", () => {
  console.log(`MontanaTV addon disponible en http://localhost:${LISTEN_PORT}`);
  console.log(`Usando base AceStream: ${ACESTREAM_BASE_URL}`);
});
