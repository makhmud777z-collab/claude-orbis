import { chromium } from "playwright";

/**
 * Доски портала: лиды, сделки, задачи, проекты, дедлайны.
 *
 * Проверяем то, что ломается молча: колонки разъезжаются по ширине и
 * зазорам (каждая доска норовит обзавестись своей раскладкой), карточка не
 * двигается (доске забыли дать перетаскивание), и место вставки не видно —
 * подсветка колонки говорит «сюда», но не говорит «куда именно».
 *
 * Перетаскивание ведём мышью по координатам, снятым прямо перед захватом:
 * dragTo прокручивает страницу до нажатия, вёрстка съезжает, и курсор
 * оказывается над соседней карточкой.
 */
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
await ctx.addCookies([
  { name: "orbis_tenant", value: "seoulway", domain: "localhost", path: "/" },
  { name: "orbis_locale", value: "ru", domain: "localhost", path: "/" },
]);
const page = await ctx.newPage();
const fail = [];
page.on("pageerror", (e) => fail.push("ошибка в браузере: " + e.message));

const open = async (url) => {
  await page.goto(BASE + url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
};

const geometry = () =>
  page.evaluate(() => {
    const cols = [...document.querySelectorAll("main section.kan-col")].map((c) =>
      c.getBoundingClientRect(),
    );
    const gaps = [];
    for (let i = 1; i < cols.length; i += 1) gaps.push(Math.round(cols[i].left - cols[i - 1].right));
    return {
      count: cols.length,
      widths: [...new Set(cols.map((c) => Math.round(c.width)))],
      gaps: [...new Set(gaps)],
    };
  });

/**
 * Берём карточку из первой непустой колонки и подносим к соседней, не
 * отпуская. Колонки выбираются по факту, а не по номеру: содержимое досок
 * меняется от прогона к прогону, и жёсткий индекс однажды укажет на ту же
 * колонку, из которой карточку взяли, — проверка тогда ловит собственную
 * ошибку, а не ошибку портала.
 */
const hold = async (cardSel) => {
  const cols = page.locator("main section.kan-col");
  const total = await cols.count();
  let source = -1;
  for (let i = 0; i < total; i += 1) {
    if (await cols.nth(i).locator(cardSel).count()) { source = i; break; }
  }
  if (source < 0) return { ok: false, why: "на доске нет карточек" };
  const target = source === 0 ? 1 : 0;

  const card = cols.nth(source).locator(cardSel).first();
  const from = await card.boundingBox();
  const to = await cols.nth(target).boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + 16);
  await page.mouse.down();
  // Сначала короткий сдвиг на месте: браузер начинает перенос, и только
  // после этого имеет смысл ехать к цели. Точку внутри колонки берём по её
  // настоящей высоте — пустая колонка ниже курсора на 90 пикселей.
  await page.mouse.move(from.x + from.width / 2 + 30, from.y + 40, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + Math.min(90, to.height / 2), { steps: 12 });
  await page.waitForTimeout(200);
  return { ok: true };
};

const BOARDS = [
  { name: "сделки", url: "/crm/deals", card: "a.card", movable: true },
  { name: "лиды", url: "/crm/leads", card: "a.card", movable: true },
  { name: "задачи", url: "/tasks", card: "article.card", movable: true },
  { name: "проекты", url: "/tasks/projects", card: "article.card", movable: true },
  { name: "дедлайны", url: "/deadlines", card: "a.card", movable: false },
];

const sizes = [];
for (const board of BOARDS) {
  await open(board.url);
  const geo = await geometry();
  sizes.push(`${board.name}: ${geo.count} колонок по ${geo.widths.join("/")}px, зазор ${geo.gaps.join("/")}px`);

  if (!geo.count) fail.push(`${board.name}: доска не нарисовалась`);
  if (geo.widths.length !== 1) fail.push(`${board.name}: колонки разной ширины ${JSON.stringify(geo.widths)}`);
  if (geo.gaps.length > 1) fail.push(`${board.name}: зазоры между колонками разные ${JSON.stringify(geo.gaps)}`);
  if (geo.widths[0] !== 280) fail.push(`${board.name}: ширина колонки ${geo.widths[0]}px вместо 280px`);

  if (!board.movable) continue;

  const held = await hold(board.card);
  if (!held.ok) { fail.push(`${board.name}: ${held.why}`); continue; }
  const live = await page.evaluate(() => ({
    slots: document.querySelectorAll(".kan-slot").length,
    rings: document.querySelectorAll(".kan-drop-ring").length,
    lifted: document.querySelectorAll(".kan-lifted").length,
  }));
  if (live.lifted !== 1) fail.push(`${board.name}: взятая карточка не отходит на задний план`);
  if (live.rings !== 1) fail.push(`${board.name}: колонка под курсором не подсвечена`);
  if (live.slots !== 1) fail.push(`${board.name}: не видно, куда встанет карточка`);
  await page.mouse.up();
  await page.waitForTimeout(900);
  if (await page.locator(".kan-slot").count()) fail.push(`${board.name}: черта осталась после отпускания`);
}

// Зазор и ширина обязаны совпадать у всех досок, а не только внутри одной.
const shapes = new Set(sizes.map((s) => s.replace(/^[^:]+: \d+ колонок /, "")));
if (shapes.size > 1) fail.push(`доски разной раскладки: ${[...shapes].join(" | ")}`);

await browser.close();
if (fail.length) {
  console.log("ПРОБЛЕМЫ С ДОСКАМИ:");
  for (const f of fail) console.log(" - " + f);
  process.exit(1);
}
console.log("Доски в порядке:");
for (const s of sizes) console.log("  " + s);
