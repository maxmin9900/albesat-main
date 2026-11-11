import { writeFile, mkdir } from "fs/promises";

const UA = { "User-Agent": "CarpetSamir/1.0 (educational)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(term, n = 8) {
  await sleep(1600);
  const u =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: term,
      gsrnamespace: "6",
      gsrlimit: String(n),
      prop: "imageinfo",
      iiprop: "url|mime|size",
      iiurlwidth: "1000",
      format: "json",
      origin: "*",
    });
  try {
    const r = await fetch(u, { headers: UA });
    const d = await r.json();
    const pages = d?.query?.pages ? Object.values(d.query.pages) : [];
    return pages
      .map((p) => p.imageinfo?.[0])
      .filter(Boolean)
      .filter((i) => i.mime === "image/jpeg" || i.mime === "image/png")
      .filter((i) => (i.thumbwidth ?? i.width ?? 0) >= 500)
      .map((i) => i.thumburl || i.url);
  } catch (e) {
    console.log("  api err", term, e.message);
    return [];
  }
}

async function dl(url, dest) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(String(r.status));
  const b = Buffer.from(await r.arrayBuffer());
  await writeFile(dest, b);
  return b.length;
}

// grab up to `count` candidates for a key into folder/key-N.jpg
async function grab(folder, key, terms, count = 3) {
  await mkdir(folder, { recursive: true });
  const used = new Set();
  let got = 0;
  for (const t of terms) {
    if (got >= count) break;
    const urls = await search(t);
    for (const url of urls) {
      if (got >= count) break;
      if (used.has(url)) continue;
      try {
        const n = await dl(url, `${folder}/${key}-${got}.jpg`);
        if (n > 15000) {
          used.add(url);
          console.log(`  ✅ ${key}-${got} (${(n / 1024).toFixed(0)}KB) ← ${t}`);
          got++;
        }
      } catch {}
    }
  }
  if (!got) console.log(`  ❌ ${key}: nothing`);
}

const COSTUMES = {
  kashan: ["Abyaneh women", "Abyaneh village woman", "Abyaneh costume", "Abyaneh"],
  qom: ["Persian village woman traditional dress", "Iranian traditional dress woman", "Qom clothing"],
  tabriz: ["Azerbaijani national costume woman", "Azerbaijani traditional dress woman", "Azerbaijani woman costume"],
  isfahan: ["Persian traditional dress woman Isfahan", "Qajar woman dress", "Iranian traditional costume woman"],
  shiraz: ["Qashqai woman", "Qashqai women", "Qashqai nomad woman", "Qashqai costume"],
  sistan: ["Baluchi woman dress", "Baloch woman traditional dress", "Baluchi embroidery woman", "Sistan Baluchestan woman"],
};

const CARPETS = {
  shiraz: ["Qashqai rug", "Qashqai carpet", "Shiraz rug", "Gabbeh rug"],
  sistan: ["Baluch rug", "Baluchi carpet", "Baluch prayer rug", "Sistan carpet"],
};

async function main() {
  console.log("— costumes —");
  for (const [k, t] of Object.entries(COSTUMES)) {
    console.log(k);
    await grab("public/costumes", k, t, 3);
  }
  console.log("— carpets (shiraz, sistan) —");
  for (const [k, t] of Object.entries(CARPETS)) {
    console.log(k);
    await grab("public/carpets_new", k, t, 2);
  }
  console.log("done");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
