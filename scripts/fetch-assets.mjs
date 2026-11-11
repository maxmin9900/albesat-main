// Downloads real assets: Earth texture, per-city Persian carpet images
// (from Wikimedia Commons), and Iran GeoJSON. Run inside the web container:
//   docker compose exec web node scripts/fetch-assets.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const UA = "CarpetSamir/1.0 (educational project)";

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return buf.length;
}

async function ensureDir(p) {
  if (!existsSync(p)) await mkdir(p, { recursive: true });
}

// -- Earth texture (try several reliable mirrors) --
async function fetchEarth() {
  const urls = [
    "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
    "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg",
    "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg",
  ];
  const clouds =
    "https://unpkg.com/three-globe/example/img/earth-topology.png";
  for (const u of urls) {
    try {
      const n = await download(u, "public/textures/earth.jpg");
      console.log(`✅ earth.jpg (${(n / 1024).toFixed(0)} KB) ← ${u}`);
      try {
        await download(clouds, "public/textures/earth-bump.png");
        console.log("✅ earth-bump.png");
      } catch {}
      return true;
    } catch (e) {
      console.log(`… earth try failed: ${e.message}`);
    }
  }
  console.log("❌ earth texture failed");
  return false;
}

// -- Per-city carpet images from Wikimedia Commons --
const CITY_TERMS = {
  tabriz: ["Tabriz rug", "Tabriz carpet", "Tabriz Persian carpet"],
  kashan: ["Kashan rug", "Kashan carpet", "Kashan Persian carpet"],
  isfahan: ["Isfahan carpet", "Isfahan rug", "Esfahan carpet", "Isfahan Persian rug"],
  nain: ["Nain carpet", "Nain rug", "Naeen carpet", "Nain Persian rug"],
  qom: ["Qom carpet", "Qum carpet", "Qom silk carpet", "Ghom rug"],
  heriz: ["Heriz carpet", "Heriz rug", "Heris carpet", "Serapi carpet"],
};

const FALLBACK_TERMS = [
  "Persian carpet",
  "Persian rug",
  "Antique Persian carpet",
  "Oriental rug Iran",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function commonsSearch(term) {
  await sleep(2000); // throttle to avoid 429 rate limiting
  const api =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: term,
      gsrnamespace: "6",
      gsrlimit: "10",
      prop: "imageinfo",
      iiprop: "url|mime|size",
      iiurlwidth: "1200",
      format: "json",
      origin: "*",
    });
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`api ${res.status}`);
  const data = await res.json();
  const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
  // prefer wide jpg images
  const candidates = pages
    .map((p) => p.imageinfo?.[0])
    .filter(Boolean)
    .filter((i) => i.mime === "image/jpeg" || i.mime === "image/png")
    .filter((i) => (i.thumbwidth ?? i.width ?? 0) >= 600);
  return candidates.map((i) => i.thumburl || i.url);
}

async function tryDownloadFrom(urls, dest, usedUrls) {
  for (const u of urls) {
    if (usedUrls.has(u)) continue;
    try {
      const n = await download(u, dest);
      if (n > 8000) {
        usedUrls.add(u);
        return { ok: true, kb: (n / 1024).toFixed(0), url: u };
      }
    } catch {}
  }
  return { ok: false };
}

async function fetchCarpets() {
  const map = {};
  const usedUrls = new Set();
  const missing = [];

  for (const [key, terms] of Object.entries(CITY_TERMS)) {
    // skip cities already downloaded
    if (existsSync(`public/carpets/${key}.jpg`)) {
      map[key] = `/carpets/${key}.jpg`;
      console.log(`↷ ${key}.jpg already present, skipping`);
      continue;
    }
    let done = false;
    for (const term of terms) {
      let urls = [];
      try {
        urls = await commonsSearch(term);
      } catch (e) {
        console.log(`… ${key} "${term}" api failed: ${e.message}`);
        continue;
      }
      const r = await tryDownloadFrom(urls, `public/carpets/${key}.jpg`, usedUrls);
      if (r.ok) {
        console.log(`✅ ${key}.jpg (${r.kb} KB) ← ${term}`);
        map[key] = `/carpets/${key}.jpg`;
        done = true;
        break;
      }
    }
    if (!done) missing.push(key);
  }

  // Fallback: pull a pool of generic Persian-carpet images and assign
  // distinct ones to any city that didn't get a specific match.
  if (missing.length) {
    let pool = [];
    for (const term of FALLBACK_TERMS) {
      try {
        pool = pool.concat(await commonsSearch(term));
      } catch {}
    }
    for (const key of missing) {
      const r = await tryDownloadFrom(pool, `public/carpets/${key}.jpg`, usedUrls);
      if (r.ok) {
        console.log(`✅ ${key}.jpg (${r.kb} KB) ← fallback Persian carpet`);
        map[key] = `/carpets/${key}.jpg`;
      } else {
        console.log(`❌ ${key}: no image found`);
      }
    }
  }

  await writeFile("public/carpets/manifest.json", JSON.stringify(map, null, 2));
  return map;
}

// -- Iran GeoJSON --
async function fetchIranGeo() {
  const urls = [
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/IRN.geo.json",
    "https://raw.githubusercontent.com/georgique/world-geojson/develop/countries/iran.json",
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(String(res.status));
      const text = await res.text();
      JSON.parse(text); // validate
      await writeFile("scripts/iran.geo.json", text);
      console.log(`✅ iran.geo.json ← ${u}`);
      return true;
    } catch (e) {
      console.log(`… iran geo try failed: ${e.message}`);
    }
  }
  console.log("❌ iran geojson failed");
  return false;
}

async function main() {
  await ensureDir("public/textures");
  await ensureDir("public/carpets");
  await ensureDir("scripts");
  await fetchEarth();
  await fetchCarpets();
  await fetchIranGeo();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
