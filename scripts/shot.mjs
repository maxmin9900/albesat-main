import { chromium } from "playwright";
import { mkdir } from "fs/promises";

await mkdir("shots", { recursive: true });

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});

const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
page.on("console", (m) => {
  if (m.type() === "error") console.log("PAGE ERR:", m.text());
});

await page.goto("http://localhost:3000", {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForTimeout(3500);

const VH = 900;
const trackScroll = 2.4 * VH;

// 1) globe zoomed onto Iran
await page.evaluate((y) => window.scrollTo(0, y), trackScroll);
await page.waitForTimeout(2200);
await page.screenshot({ path: "shots/hero-iran.png" });
console.log("shot hero-iran");

// 2) drag the globe to rotate it
const cx = 720;
const cy = 450;
await page.mouse.move(cx, cy);
await page.mouse.down();
for (let i = 1; i <= 10; i++) {
  await page.mouse.move(cx + i * 22, cy - i * 4);
  await page.waitForTimeout(30);
}
await page.mouse.up();
await page.waitForTimeout(1500);
await page.screenshot({ path: "shots/hero-drag.png" });
console.log("shot hero-drag");

// 3) interactive Iran map + hover a carpet city
await page.evaluate(() =>
  document.querySelector("#cities")?.scrollIntoView()
);
await page.waitForTimeout(1200);
const tabriz = page.locator('button[aria-label="Tabriz"]');
if (await tabriz.count()) await tabriz.first().hover();
await page.waitForTimeout(800);
await page.screenshot({ path: "shots/map.png" });
console.log("shot map");

// 4) weaver section (default Kashan)
await page.evaluate(() =>
  document.querySelector("#weaver")?.scrollIntoView()
);
await page.waitForTimeout(1200);
await page.screenshot({ path: "shots/weaver.png" });
console.log("shot weaver");

// 5) select Isfahan → tint + carpet change
const isf = page.locator("#weaver button", { hasText: "Isfahan" });
if (await isf.count()) await isf.first().click();
await page.waitForTimeout(1600);
await page.screenshot({ path: "shots/weaver-isfahan.png" });
console.log("shot weaver-isfahan");

await browser.close();
console.log("done");
