// Rasterize share-card SVGs to PNG — iMessage, Facebook, and most X clients
// ignore SVG og:image. resvg cannot fetch fonts or remote images, so fonts are
// loaded from static assets and team logos are inlined as data URIs.
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";

const FONT_FILES = [
  "Inter-Regular.ttf",
  "Inter-SemiBold.ttf",
  "Inter-Bold.ttf",
  "Inter-ExtraBold.ttf",
];

let wasmReady = null;
let fontsReady = null;

function ensureWasm() {
  if (!wasmReady) wasmReady = initWasm(resvgWasm);
  return wasmReady;
}

function ensureFonts(env, origin) {
  if (!fontsReady) {
    fontsReady = Promise.all(
      FONT_FILES.map(async (f) => {
        const res = await env.ASSETS.fetch(new Request(`${origin}/fonts/${f}`));
        if (!res.ok) throw new Error(`font ${f} HTTP ${res.status}`);
        return new Uint8Array(await res.arrayBuffer());
      }),
    ).catch((e) => {
      fontsReady = null;
      throw e;
    });
  }
  return fontsReady;
}

function toBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/** Replace remote <image href> URLs with small inline PNGs; drop any that fail. */
async function inlineImages(svg) {
  const urls = [...new Set([...svg.matchAll(/href="(https:\/\/[^"]+)"/g)].map((m) => m[1]))];
  let out = svg;
  await Promise.all(
    urls.map(async (u) => {
      const raw = u.replace(/&amp;/g, "&");
      const small = raw.startsWith("https://a.espncdn.com/i/teamlogos/")
        ? `https://a.espncdn.com/combiner/i?img=${encodeURIComponent(raw.replace("https://a.espncdn.com", ""))}&w=96&h=96`
        : raw;
      try {
        const res = await fetch(small, { cf: { cacheTtl: 86400, cacheEverything: true } });
        if (!res.ok) throw new Error(String(res.status));
        const data = `data:image/png;base64,${toBase64(new Uint8Array(await res.arrayBuffer()))}`;
        out = out.split(`href="${u}"`).join(`href="${data}"`);
      } catch {
        out = out.replace(new RegExp(`<image[^>]*href="${u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*/>`, "g"), "");
      }
    }),
  );
  return out;
}

export async function svgToPng(svg, env, origin) {
  const [, fontBuffers, inlined] = await Promise.all([
    ensureWasm(),
    ensureFonts(env, origin),
    inlineImages(svg),
  ]);
  const resvg = new Resvg(inlined, {
    fitTo: { mode: "width", value: 1200 },
    font: { fontBuffers, defaultFontFamily: "Inter", loadSystemFonts: false },
  });
  const png = resvg.render().asPng();
  resvg.free();
  return png;
}
