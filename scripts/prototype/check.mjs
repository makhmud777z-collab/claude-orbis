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
const routes = ["dashboard", "leads", "deals", "contacts", "crmsettings", "pipelines", "channels",
  "tasks", "projects", "taskreports", "documents", "deadlines", "calendar",
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

/* рабочий день из меню профиля: CSS поднимает подпись в верхний регистр */
await page.locator("[data-pop='profile']").first().click();
await page.waitForTimeout(100);
check(/рабочий день/i.test(await page.locator(".pop").innerText()), "в меню профиля нет рабочего дня");

/* тема переключается прямо оттуда и остаётся при переходе на другой экран */
await page.getByRole("button", { name: "Тёмная" }).click();
await page.waitForTimeout(120);
check(await page.evaluate(() => document.documentElement.dataset.theme) === "dark", "тёмная тема не включилась");
await page.evaluate(() => window.go("contacts"));
await page.waitForTimeout(120);
check(await page.evaluate(() => document.documentElement.dataset.theme) === "dark", "тема не пережила переход");
await page.evaluate(() => window.handle("theme", "light"));
await page.waitForTimeout(120);

/* счётчик рабочего дня идёт вживую */
await page.evaluate(() => { if (window.workOf(window.S.userId)) window.handle("work", "end"); window.handle("work", "start"); });
await page.waitForTimeout(2200);
const shown = await page.locator("[data-clock]").first().innerText();
check(/^\d+:\d{2}:\d{2}$/.test(shown.trim()), `счётчик показывает «${shown}» вместо Ч:ММ:СС`);
check(Number(shown.trim().split(":")[2]) >= 1, "счётчик рабочего дня стоит на месте");
await page.evaluate(() => window.handle("work", "end"));

/* умный фильтр сужает список и снимается крестиком на чипе */
await page.evaluate(() => window.go("contacts"));
await page.waitForTimeout(100);
const rowsAll = await page.locator("tbody tr").count();
await page.evaluate(() => window.handle("f.preset:contacts:enrolled", ""));
await page.waitForTimeout(120);
const rowsFiltered = await page.locator("tbody tr").count();
check(rowsFiltered < rowsAll, `пресет фильтра не сузил список: было ${rowsAll}, стало ${rowsFiltered}`);
check(await page.locator(".filter-bar .chip.on").count() > 0, "активное условие не показано чипом");
await page.locator(".filter-bar .chip-x").first().click();
await page.waitForTimeout(120);
check(await page.locator("tbody tr").count() === rowsAll, "снятие условия не вернуло записи");

/* календарь: день открывается по клику на число и рисует линию времени */
await page.evaluate(() => window.go("calendar"));
await page.waitForTimeout(120);
check(await page.locator(".cal-day.today").count() === 1, "сегодняшнее число не выделено");
await page.locator(".cal-day.today").click();
await page.waitForTimeout(150);
check(await page.locator(".now-line").count() === 1, "в дневном срезе нет красной линии текущего времени");

/* структура компании: дерево и панель подчинённых */
await page.evaluate(() => window.go("structure"));
await page.waitForTimeout(150);
check(await page.locator(".tree-node").count() > 1, "дерево структуры не построилось");
check(/подчинённые/i.test(await page.locator("#content").innerText()), "в структуре нет панели подчинённых");

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

console.log(fail.length ? "ПРОБЛЕМЫ ПРОТОТИПА:" : "Прототип работает: экраны, доска, дубли, фильтр, тема, календарь, структура, роли и язык");
fail.forEach((f) => console.log(" - " + f));
await browser.close();
process.exit(fail.length ? 1 : 0);
