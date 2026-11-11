import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

const UA = "CarpetSamir/1.0 (educational project)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function commonsSearch(term) {
  await sleep(1800);
  const api =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: term,
      gsrnamespace: "6",
      gsrlimit: "12",
      prop: "imageinfo",
      iiprop: "url|mime|size",
      iiurlwidth: "1600",
      format: "json",
      origin: "*",
    });
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error("api " + res.status);
  const data = await res.json();
  const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
  return pages
    .map((p) => p.imageinfo?.[0])
    .filter(Boolean)
    .filter((i) => i.mime === "image/jpeg" || i.mime === "image/png")
    .filter((i) => (i.thumbwidth ?? i.width ?? 0) >= 800)
    .map((i) => i.thumburl || i.url);
}

async function download(url, dest) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(String(r.status));
  const b = Buffer.from(await r.arrayBuffer());
  await writeFile(dest, b);
  return b.length;
}

// per-city preferred terms, then shared fallback
const CITY_TERMS = {
  tabriz: ["Tabriz carpet weaving", "carpet weaving East Azerbaijan"],
  kashan: ["Kashan carpet weaving", "Kashan carpet loom"],
  isfahan: ["Isfahan carpet weaving", "carpet weaving Isfahan"],
  nain: ["Nain carpet weaving", "carpet weaving Yazd"],
  qom: ["Qom carpet weaving", "silk carpet weaving Iran"],
  heriz: ["Heriz carpet weaving", "carpet weaving village Iran"],
};
const FALLBACK = [
  "Persian carpet weaving woman",
  "Iranian carpet weaver",
  "carpet weaving loom Iran",
  "Persian carpet loom",
  "woman weaving carpet Iran",
];

async function main() {
  await mkdir("public/weavers", { recursive: true });
  const used = new Set();
  const map = {};
  const missing = [];

  for (const [key, terms] of Object.entries(CITY_TERMS)) {
    if (existsSync(`public/weavers/${key}.jpg`)) {
      map[key] = `/weavers/${key}.jpg`;
      console.log("↷", key, "present");
      continue;
    }
    let done = false;
    for (const t of terms) {
      let urls = [];
      try {
        urls = await commonsSearch(t);
      } catch (e) {
        console.log("…", key, t, e.message);
        continue;
      }
      for (const u of urls) {
        if (used.has(u)) continue;
        try {
          const n = await download(u, `public/weavers/${key}.jpg`);
          if (n > 12000) {
            used.add(u);
            map[key] = `/weavers/${key}.jpg`;
            console.log("✅", key, (n / 1024).toFixed(0) + "KB ←", t);
            done = true;
            break;
          }
        } catch {}
      }
      if (done) break;
    }
    if (!done) missing.push(key);
  }

  if (missing.length) {
    let pool = [];
    for (const t of FALLBACK) {
      try {
        pool = pool.concat(await commonsSearch(t));
      } catch {}
    }
    for (const key of missing) {
      for (const u of pool) {
        if (used.has(u)) continue;
        try {
          const n = await download(u, `public/weavers/${key}.jpg`);
          if (n > 12000) {
            used.add(u);
            map[key] = `/weavers/${key}.jpg`;
            console.log("✅", key, (n / 1024).toFixed(0) + "KB ← fallback");
            break;
          }
        } catch {}
      }
      if (!map[key]) console.log("❌", key, "no image");
    }
  }

  await writeFile("public/weavers/manifest.json", JSON.stringify(map, null, 2));
  console.log("done", map);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
