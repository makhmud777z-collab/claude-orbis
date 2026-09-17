/**
 * Прогон прототипа браузером: ловит ошибки JS и проверяет, что экраны
 * действительно рисуются, а доска и дедупликация работают.
 */
import { chromium } from "playwright";
import { resolve } from "node:path";

const file = "file://" + resolve("scripts/prototype/build/prototype.html");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1500, height: 940 } });
const fail = [];
page.on("pageerror", (e) => fail.push("PAGEERROR " + String(e).slice(0, 200)));
// Шрифт Google в песочнице не загружается — это не поломка прототипа.
page.on("console", (m) => {
  const text = m.text();
  if (m.type() === "error" && !/ERR_CERT|fonts\.googleapis|fonts\.gstatic/.test(text)) {
    fail.push("CONSOLE " + text.slice(0, 200));
  }
});

await page.goto(file, { waitUntil: "load" });
const check = (ok, msg) => { if (!ok) fail.push(msg); };

/* каждый раздел меню открывается и что-то показывает */
const routes = ["dashboard", "leads", "deals", "contacts", "pipelines", "channels",
  "tasks", "projects", "taskreports", "templates", "documents", "deadlines",
  "universities", "compare", "finance", "team", "structure", "staffreports",
  "users", "permissions", "settings"];
for (const route of routes) {
  await page.evaluate((r) => window.go(r), route);
  await page.waitForTimeout(60);
  const text = await page.locator("#content").innerText();
  check(text.trim().length > 40, `экран ${route} пустой`);
  check(!/undefined|NaN|\[object Object\]/.test(text), `экран ${route}: ${text.match(/.{0,40}(undefined|NaN|\[object Object\]).{0,40}/)?.[0]?.replace(/\n/g, " ")}`);
}

/* карточки открываются */
await page.evaluate(() => window.go("deals"));
await page.waitForTimeout(80);
await page.locator(".kan-card").first().click();
await page.waitForTimeout(120);
check(/История/.test(await page.locator("#content").innerText()), "в карточке сделки нет истории");

/* перетаскивание меняет стадию и пишет в историю */
await page.evaluate(() => window.go("deals"));
await page.waitForTimeout(80);
const first = page.locator(".kan-col").nth(0).locator(".kan-card").first();
const before = await page.locator(".kan-col").nth(0).locator(".kan-card").count();
await first.dragTo(page.locator(".kan-col").nth(2));
await page.waitForTimeout(200);
const after = await page.locator(".kan-col").nth(0).locator(".kan-card").count();
check(after === before - 1, `перенос карточки не сработал: было ${before}, стало ${after}`);

/* дубль лида не даёт сохранить */
await page.evaluate(() => window.go("leads"));
await page.waitForTimeout(80);
await page.getByRole("button", { name: "Новый лид" }).first().click();
await page.waitForTimeout(100);
await page.locator("#lead-name").fill("Проверка дубля");
await page.locator("#lead-phone").fill("+998 90 111-22-33");
await page.getByText("Проверить дубль").click();
await page.waitForTimeout(150);
check(/Найден дубль/.test(await page.locator(".modal").innerText()), "дубль по телефону не найден");
await page.keyboard.press("Escape");

/* рабочий день из меню профиля */
await page.locator("[data-pop='profile']").click();
await page.waitForTimeout(100);
check(/Рабочий день/.test(await page.locator(".pop").innerText()), "в меню профиля нет рабочего дня");

/* переключение роли перестраивает меню */
await page.evaluate(() => window.handle("user", "u_partner1"));
await page.waitForTimeout(150);
const rail = await page.locator("#rail").innerText();
check(!/Финансы/.test(rail), "агент-партнёр видит «Финансы»");
await page.evaluate(() => window.handle("user", "u_aziz"));
await page.waitForTimeout(150);

/* узбекский язык */
await page.evaluate(() => window.handle("locale", "uz"));
await page.waitForTimeout(150);
check(/Bitimlar|Lidlar/.test(await page.locator("#rail").innerText()), "меню не переключилось на узбекский");

console.log(fail.length ? "ПРОБЛЕМЫ ПРОТОТИПА:" : "Прототип работает: экраны, доска, дубли, роли и язык");
fail.forEach((f) => console.log(" - " + f));
await browser.close();
process.exit(fail.length ? 1 : 0);
