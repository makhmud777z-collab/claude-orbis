import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addCookies([{ name: "orbis_tenant", value: "seoulway", domain: "localhost", path: "/" }]);
const page = await ctx.newPage();
const fail = [];
const check = (ok, msg) => { if (!ok) fail.push(msg); };

// 1. Шорт-лист изолирован по студентам
await page.goto("http://localhost:3000/universities", { waitUntil: "networkidle" });
await page.selectOption("select", "s_002");
await page.waitForTimeout(400);
let btn = page.getByRole("button", { name: "В шорт-лист", exact: true }).first();
const uniName = await btn.locator("xpath=ancestor::div[contains(@class,'card')][1]").locator("span").first().textContent();
await btn.click(); await page.waitForTimeout(900);
const s002count = await page.getByRole("button", { name: "В шорт-листе", exact: true }).count();
check(s002count === 1, `шорт-лист s_002: ожидалась 1 отметка, получено ${s002count}`);

await page.selectOption("select", "s_003");
await page.waitForTimeout(900);
const s003count = await page.getByRole("button", { name: "В шорт-листе", exact: true }).count();
check(s003count === 0, `шорт-лист s_003 должен быть пуст, получено ${s003count} (утечка между студентами)`);

// 2. Сравнение без студента
await page.goto("http://localhost:3000/universities/compare", { waitUntil: "networkidle" });
const emptyTxt = await page.locator("body").innerText();
check(/Шорт-лист пуст|Сравнение вузов/.test(emptyTxt), "страница сравнения без студента не отрисовалась");

// 3. Сравнение со студентом s_002 показывает добавленный вуз
await page.goto("http://localhost:3000/universities/compare?student=s_002", { waitUntil: "networkidle" });
const cmp = await page.locator("body").innerText();
check(cmp.includes(uniName?.trim() ?? "###"), `в сравнении s_002 нет добавленного вуза «${uniName?.trim()}»`);
check(/Вердикт подбора/.test(cmp), "нет строки вердикта при выбранном студенте");

// 4. Фильтры каталога реально сокращают выдачу
await page.goto("http://localhost:3000/universities", { waitUntil: "networkidle" });
const before = Number((await page.locator("text=/Найдено \\d+/").first().textContent())?.match(/\d+/)?.[0]);
await page.getByRole("button", { name: "Медицина", exact: true }).click();
await page.waitForTimeout(300);
const after = Number((await page.locator("text=/Найдено \\d+/").first().textContent())?.match(/\d+/)?.[0]);
check(after < before && after > 0, `фильтр «Медицина»: было ${before}, стало ${after}`);

// 5. Поиск в базе студентов
await page.goto("http://localhost:3000/students", { waitUntil: "networkidle" });
const rowsBefore = await page.locator("tbody tr").count();
await page.getByPlaceholder("Поиск по базе").fill("Малика");
await page.waitForTimeout(300);
const rowsAfter = await page.locator("tbody tr").count();
check(rowsAfter === 1 && rowsBefore > 1, `поиск студентов: было ${rowsBefore}, стало ${rowsAfter}`);

// 6. Фильтр «Только мои» на задачах
await page.goto("http://localhost:3000/tasks", { waitUntil: "networkidle" });
const tasksAll = await page.locator("article").count();
await page.getByText("Только мои").click();
await page.waitForTimeout(300);
const tasksMine = await page.locator("article").count();
check(tasksMine < tasksAll, `фильтр «Только мои»: было ${tasksAll}, стало ${tasksMine}`);

// 7. Переключение языка сохраняется между страницами
await page.goto("http://localhost:3000/students", { waitUntil: "networkidle" });
await page.getByTitle("O‘zbekcha").first().click();
await page.waitForTimeout(900);
await page.goto("http://localhost:3000/tasks", { waitUntil: "networkidle" });
const uzTasks = await page.locator("aside").first().innerText();
check(uzTasks.includes("Vazifalar"), "язык не сохранился при переходе между страницами");

// 8. Срезы из бокового меню действительно переключают фильтр
await page.goto("http://localhost:3000/students", { waitUntil: "networkidle" });
const allRows = await page.locator("tbody tr").count();
await page.goto("http://localhost:3000/students?status=lead", { waitUntil: "networkidle" });
await page.waitForTimeout(300);
const leadRows = await page.locator("tbody tr").count();
check(leadRows > 0 && leadRows < allRows, `срез «Лиды»: всего ${allRows}, в срезе ${leadRows}`);

await page.goto("http://localhost:3000/applications?stage=visa", { waitUntil: "networkidle" });
await page.waitForTimeout(300);
const columns = await page.locator("section > div.mb-3").count();
check(columns === 1, `срез «На визе» должен оставить одну колонку, получено ${columns}`);

// 9. Лента событий не показывает чужую активность роли «только свои»
const own = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await own.addCookies([
  { name: "orbis_tenant", value: "seoulway", domain: "localhost", path: "/" },
  { name: "orbis_user", value: "u_kamila", domain: "localhost", path: "/" },
]);
const ownPage = await own.newPage();
await ownPage.goto("http://localhost:3000/", { waitUntil: "networkidle" });
const feed = await ownPage.locator("body").innerText();
check(!feed.includes("Рустам Эргашев"), "менеджер видит в ленте события чужих сотрудников");
await own.close();

console.log(fail.length ? "ПРОБЛЕМЫ В СЦЕНАРИЯХ:" : "Все сценарии прошли");
fail.forEach((f) => console.log(" - " + f));
await browser.close();
process.exit(fail.length ? 1 : 0);
