// Downloads one carpet photograph per weaving city for the illustrated map:
// the medallion disc and the end-of-journey weave both need a real rug for
// every origin, and five of the eleven had none.
//
// Source is Wikimedia Commons (freely licensed). Attribution for each file is
// appended to public/carpets/manifest.json.
//
//   node scripts/fetch-map-carpets.mjs
import { writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const UA = "CarpetSamir/1.0 (educational project)";
const OUT = "public/carpets";

// key -> search terms, best first
const WANTED = {
  "tehran-1": ["Tehran carpet", "Persian carpet Tehran", "Iranian carpet museum Tehran"],
  "turkaman-1": ["Turkmen carpet", "Turkoman rug", "Turkmen rug gul", "Yomut carpet"],
  "nain-1": ["Nain carpet", "Nain rug", "Naein Persian carpet", "Nain Persian rug"],
  "esfahan-1": ["Isfahan carpet", "Esfahan carpet", "Isfahan Persian rug", "Isfahan rug"],
  "kerman-1": ["Kerman carpet", "Kirman rug", "Kerman Persian carpet", "Lavar Kerman rug"],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function commonsSearch(term) {
  await sleep(1500); // throttle — Commons rate-limits hard
  const api =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: term,
      gsrnamespace: "6",
      gsrlimit: "12",
      prop: "imageinfo",
      iiprop: "url|mime|size|extmetadata",
      iiurlwidth: "1400",
      format: "json",
    });
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`api ${res.status}`);
  const data = await res.json();
  const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
  return pages
    .map((p) => ({ title: p.title, info: p.imageinfo?.[0] }))
    .filter((c) => c.info)
    .filter((c) => c.info.mime === "image/jpeg" || c.info.mime === "image/png")
    .filter((c) => (c.info.thumbwidth ?? c.info.width ?? 0) >= 700);
}

async function main() {
  const credits = {};

  for (const [name, terms] of Object.entries(WANTED)) {
    const dest = `${OUT}/${name}.jpg`;
    if (existsSync(dest)) {
      console.log(`↷ ${name}.jpg already present, skipping`);
      continue;
    }

    let done = false;
    for (const term of terms) {
      let candidates = [];
      try {
        candidates = await commonsSearch(term);
      } catch (e) {
        console.log(`… ${name} "${term}" search failed: ${e.message}`);
        continue;
      }
      for (const c of candidates) {
        const url = c.info.thumburl || c.info.url;
        try {
          const res = await fetch(url, { headers: { "User-Agent": UA } });
          if (!res.ok) continue;
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length < 20000) continue; // too small to be a usable photo
          await writeFile(dest, buf);
          const meta = c.info.extmetadata ?? {};
          credits[name] = {
            file: c.title,
            license: meta.LicenseShortName?.value ?? "see Commons",
            author: (meta.Artist?.value ?? "").replace(/<[^>]*>/g, "").trim(),
            source: c.info.descriptionurl ?? url,
          };
          console.log(`✅ ${name}.jpg (${(buf.length / 1024) | 0} KB) ← "${term}"`);
          done = true;
          break;
        } catch {
          /* try the next candidate */
        }
      }
      if (done) break;
    }
    if (!done) console.log(`❌ ${name}.jpg — nothing usable found`);
  }

  if (Object.keys(credits).length) {
    let manifest = {};
    try {
      manifest = JSON.parse(await readFile(`${OUT}/manifest.json`, "utf8"));
    } catch {
      /* first run */
    }
    manifest.mapCarpetCredits = { ...(manifest.mapCarpetCredits ?? {}), ...credits };
    await writeFile(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
    console.log("\n📝 attribution written to manifest.json");
  }
}

main();
