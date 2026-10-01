/**
 * End-to-end check of the minimum playable loop, in a real browser:
 * new user → onboarding → first quest → prime → act → I'm back → reflection
 * → reveal → discovery → world change → Journey → Codex → next quest.
 *
 * Usage: start the app (npm run build && npm start, or npm run dev), then
 *   BASE_URL=http://localhost:3000 npm run e2e
 * Uses an installed Edge or Chrome (BROWSER_CHANNEL=msedge|chrome). Screenshots go to e2e/output/.
 */
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CHANNEL = process.env.BROWSER_CHANNEL ?? "msedge";
const OUT = new URL("./output/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: CHANNEL });
const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

let n = 0;
// Let entrance animations settle so screenshots show the resting state.
const shot = async (name) => (await page.waitForTimeout(1200), page).screenshot({ path: fileURLToPath(new URL(`${String(++n).padStart(2, "0")}-${name}.png`, OUT)), fullPage: true });
const step = (label) => console.log(`✓ ${label}`);
const choose = (name) => page.getByRole("radio", { name, exact: true }).check();
const expectText = async (text) => {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: 10_000 });
};

try {
  await page.goto(BASE);
  await page.waitForURL("**/begin");
  await expectText("Dünya bir süredir otomatik pilotta.");
  await shot("onboarding-1");
  await page.getByRole("button", { name: "Devam" }).click();
  await expectText("Hadi onu bölelim.");
  await page.getByRole("button", { name: "Başla" }).click();
  await choose("Ev");
  await page.getByRole("button", { name: "Devam" }).click();
  await choose("5 dk");
  await page.getByRole("button", { name: "Devam" }).click();
  await choose("Evet");
  await shot("onboarding-5");
  await page.getByRole("button", { name: "Devam" }).click();
  step("onboarding");

  await expectText("İlk görevin");
  const title = await page.locator("article h1").first().innerText();
  await shot("first-quest");
  step(`first quest offered: ${title}`);
  if (title !== "Üç Dakika") throw new Error(`Ev/5 dk için Üç Dakika bekleniyordu, gelen: ${title}`);

  await page.getByRole("button", { name: "Görevi kabul et" }).click();
  await page.waitForURL("**/play");
  await page.getByRole("button", { name: "Başla" }).click();
  await expectText("Saniye sayma");
  await shot("prime");
  await page.getByRole("button", { name: "Devam" }).click();
  await page.getByRole("button", { name: "Başla — cihaz kenara" }).waitFor();
  await shot("mission");
  step("prime");

  await page.getByRole("button", { name: "Başla — cihaz kenara" }).click();
  await expectText("Cihazı bırak.");
  if (await page.getByRole("navigation", { name: "Ana menü" }).count()) throw new Error("Navigation visible during ACT");
  await shot("act");
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "Döndüm" }).click();
  step("act → I'm back");

  await expectText("Beklerken ne yaptın?");
  await shot("reflection");
  await choose("Çoğunlukla bekledim");
  await page.getByRole("button", { name: "Devam" }).click();
  step("reflection");

  await expectText("İşte gösterdikleri.");
  await expectText("Keşif bulundu");
  await expectText("İleriye ve Geriye Dönük Zaman");
  await expectText("Yeni bir yer beliriyor: İstasyon.");
  await page.waitForTimeout(2500);
  await shot("reveal");
  step("reveal + discovery + world change");

  await page.getByRole("button", { name: "Şehre dön" }).click();
  await page.waitForURL(BASE + "/");
  await expectText("Şehir değişti");
  await page.waitForTimeout(2800);
  await shot("world-after");
  step("world changed");

  await page.getByRole("link", { name: "Yolculuk", exact: true }).click();
  await expectText("Saatsiz üç dakika");
  await shot("journey");
  step("journey updated");

  await page.getByRole("link", { name: "Kodeks", exact: true }).click();
  await expectText("16 kayıttan 1 tanesi yazıldı.");
  await expectText("Sende nasıl göründü");
  await shot("codex");
  step("codex updated");

  await page.getByRole("link", { name: "Görev", exact: true }).click();
  await page.getByRole("button", { name: "Bana bir görev ver" }).click();
  await expectText("uygun görev");
  await shot("next-quest");
  step("next quest offered");

  await page.getByRole("link", { name: "Oyun Alanı", exact: true }).click();
  await page.getByRole("button", { name: /İç Saat/ }).click();
  await page.getByRole("button", { name: "Başla" }).click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Dur" }).click();
  await expectText("Bu tur");
  await shot("playground");
  step("playground game played");

  await page.goto(BASE + "/quest");
  await page.reload();
  await page.getByRole("button", { name: "Bana bir görev ver" }).waitFor();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("sidequest.player.v1")).attempts);
  if (Object.values(saved).length !== 1 || Object.values(saved)[0].state !== "COMPLETED") throw new Error("Progress did not persist");
  step("progress persisted across reload");

  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log("\nTam döngü çalışıyor.");
} catch (e) {
  await shot("failure").catch(() => {});
  console.error(`\n✗ ${e.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
