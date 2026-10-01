/**
 * Tasarım incelemesi için görsel tur: birkaç görevi (her mikro oyunu) arayüz
 * üzerinden otomatik oynar ve her durumun ekran görüntüsünü masaüstü ve
 * telefon genişliğinde alır.
 * Demo araçları gerekir: SIDEQUEST_DEMO=1 npm start (ya da npm run dev), sonra
 *   BASE_URL=http://localhost:3000 node e2e/tour.mjs
 * Ekran görüntüleri e2e/output/tour/ klasörüne gider.
 */
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = new URL("./output/tour/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? "msedge" });
const errors = [];
let n = 0;

async function session(viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
  const shot = async (name) => {
    await page.waitForTimeout(1100);
    await page.screenshot({ path: fileURLToPath(new URL(`${String(++n).padStart(2, "0")}-${label}-${name}.png`, OUT)), fullPage: true });
  };
  return { context, page, shot };
}

const ACTIONS = [
  "Göster", "Başla — cihaz kenara", "Başla", "Sonraki tur", "Bitir", "Sıra bu", "Değişen bu", "Planı kilitle", "Yine de kilitle",
  "Yeniden planla", "Kilitle", "Doğru", "Bunu geç", "Sonraki bölüm", "Döndüm", "Seç", "Devam",
];

/** Adımı cevaplanabilir hâle getirir, sonra ilk uygun ileri düğmesine basar. */
async function advance(page) {
  const radios = page.locator("fieldset");
  for (let i = 0; i < (await radios.count()); i++) {
    const group = radios.nth(i);
    if ((await group.locator("input[type=radio]:checked").count()) === 0 && (await group.locator("input[type=radio]").count()) > 0) {
      await group.locator("input[type=radio]").first().check();
    }
  }
  for (const input of await page.locator("ol input:not([type]), ol input[type=text]").all()) if (!(await input.inputValue())) await input.fill("Fark ettiğim bir ayrıntı");
  const palette = page.locator("[aria-label='Sıradakini ekle'] button:not([disabled])");
  while (await palette.count()) await palette.first().click();
  const cell = page.locator("button[data-selectable]");
  if ((await cell.count()) && !(await page.locator("button[data-selectable][aria-pressed=true]").count())) await cell.first().click();
  const field = page.locator("[aria-label^='Tur '] button");
  if (await field.count()) for (let i = 0; i < 6; i++) await field.nth(i * 3).click();
  if (await page.getByText("Kural", { exact: true }).or(page.getByText("Kural değişti", { exact: true })).count()) {
    await page.keyboard.press(Math.random() < 0.5 ? "ArrowLeft" : "ArrowRight");
    await page.waitForTimeout(420);
    return "rule";
  }
  for (const name of ACTIONS) {
    const b = page.getByRole("button", { name, exact: false }).and(page.locator(":not([disabled])"));
    if (await b.count()) {
      await b.first().click();
      return name;
    }
  }
  return null;
}

async function play(page, shot, slug) {
  await page.goto(`${BASE}/quest/${slug}`);
  await page.getByRole("button", { name: "Görevi kabul et" }).click();
  await page.waitForURL("**/play");
  let lastShot = "";
  for (let i = 0; i < 160; i++) {
    if (await page.getByText("İşte gösterdikleri.").count()) break;
    const heading = (await page.locator("main h1, main h2, main legend, main p.t-label").first().innerText().catch(() => "")).slice(0, 30);
    if (heading && heading !== lastShot && !heading.startsWith("KURAL")) {
      await shot(`${slug}-${i}`);
      lastShot = heading;
    }
    const did = await advance(page);
    if (!did) await page.waitForTimeout(500);
  }
  await page.waitForTimeout(2200);
  await shot(`${slug}-reveal`);
  await page.getByRole("button", { name: "Şehre dön" }).click();
  await page.waitForURL(`${BASE}/`);
}

const NEXT_EACH = "Her kampanyada sıradaki görevi tamamla";

try {
  const desk = await session({ width: 1366, height: 900 }, "desk");
  const { page, shot } = desk;
  await page.goto(`${BASE}/dev`);
  await page.getByRole("button", { name: "Tanıtımı atla" }).click();
  await page.goto(BASE);
  await shot("world-fresh");
  await page.goto(`${BASE}/quest`);
  await shot("context-form");
  await page.goto(`${BASE}/codex`);
  await shot("codex-empty");

  await play(page, shot, "ikinci-bakis");
  await shot("world-after-first");
  await play(page, shot, "ters-el");

  await page.goto(`${BASE}/dev`);
  for (let i = 0; i < 2; i++) await page.getByRole("button", { name: NEXT_EACH }).click();
  await play(page, shot, "ayak-isleri-plani");
  await page.goto(`${BASE}/dev`);
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: NEXT_EACH }).click();
  await play(page, shot, "haritasiz-sokak");
  await play(page, shot, "numara");
  await page.goto(BASE);
  await page.waitForTimeout(3000);
  await shot("world-progressed");
  await page.getByRole("button", { name: /^İstasyon/ }).click();
  await shot("world-location");
  await page.goto(`${BASE}/journey`);
  await shot("journey");
  await page.goto(`${BASE}/codex`);
  await shot("codex");
  await page.goto(`${BASE}/quest?mystery=1`);
  await page.getByRole("button", { name: "Bana bir görev ver" }).click();
  await shot("mystery");
  await page.goto(`${BASE}/oyun-alani`);
  await shot("playground");
  await page.getByRole("button", { name: /Sinyal Avı/ }).click();
  for (let i = 0; i < 30 && !(await page.getByText("Bu tur").count()); i++) {
    if (!(await advance(page))) await page.waitForTimeout(400);
  }
  await shot("playground-result");

  const state = await page.evaluate(() => localStorage.getItem("sidequest.player.v1"));
  const phone = await session({ width: 390, height: 844 }, "phone");
  await phone.page.goto(BASE);
  await phone.page.evaluate((s) => localStorage.setItem("sidequest.player.v1", s), state);
  await phone.page.goto(BASE);
  await phone.shot("world");
  await phone.page.goto(`${BASE}/quest`);
  await phone.page.getByRole("button", { name: "Bana bir görev ver" }).click();
  await phone.shot("dossier");
  await play(phone.page, phone.shot, "durust-saat");
  await phone.page.goto(`${BASE}/journey`);
  await phone.shot("journey");
  await phone.page.goto(`${BASE}/oyun-alani`);
  await phone.shot("playground");
  await phone.page.goto(`${BASE}/codex`);
  await phone.shot("codex");
  const overflow = await phone.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) errors.push("phone: /codex sayfasında yatay taşma");

  console.log(errors.length ? `Hatalar:\n${errors.join("\n")}` : "Tur tamamlandı, sayfa hatası yok.");
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
