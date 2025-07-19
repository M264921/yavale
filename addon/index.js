const { addonBuilder } = require("stremio-addon-sdk");
const manifest = require("./manifest.json");
const catalog = require("./catalog.json");
const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(() => Promise.resolve({ metas: catalog.metas }));
builder.defineStreamHandler(args => Promise.resolve({ streams: [{ title: "ACStream", url: `acestream://${args.id}` }] }));

module.exports = builder.getInterface();
