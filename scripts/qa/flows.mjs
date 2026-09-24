import { chromium } from "playwright";
import { signSession } from "./_sign.mjs";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
await ctx.addCookies([{ name: "orbis_tenant", value: "seoulway", domain: "localhost", path: "/" }, { name: "orbis_admin", value: "t_seoulway", domain: "localhost", path: "/" }]);
const page = await ctx.newPage();
const fail = [];
const check = (ok, msg) => { if (!ok) fail.push(msg); };

/**
 * Собственный выпадающий список вместо нативного <select>:
 * открыть кнопку и выбрать вариант по подписи.
 */
async function pick(scope, index, optionLabel) {
  await scope.locator("button[data-select]").nth(index).click();
  await page.getByRole("option", { name: optionLabel, exact: false }).first().click();
  await page.waitForTimeout(400);
}

/* 1. Шорт-лист изолирован по студентам */
await page.goto(`${BASE}/universities`, { waitUntil: "networkidle" });
await pick(page, 0, "Санжар Умаров");
let btn = page.getByRole("button", { name: "В шорт-лист", exact: true }).first();
const uniName = await btn.locator("xpath=ancestor::div[contains(@class,'card')][1]").locator("span").first().textContent();
await btn.click();
await page.waitForTimeout(900);
const s002count = await page.getByRole("button", { name: "В шорт-листе", exact: true }).count();
check(s002count === 1, `шорт-лист s_002: ожидалась 1 отметка, получено ${s002count}`);

await pick(page, 0, "Малика");
const s003count = await page.getByRole("button", { name: "В шорт-листе", exact: true }).count();
check(s003count === 0, `шорт-лист другого студента должен быть пуст, получено ${s003count} (утечка)`);

/* 2. Сравнение со студентом показывает добавленный вуз */
await page.goto(`${BASE}/universities/compare?student=s_002`, { waitUntil: "networkidle" });
const cmp = await page.locator("body").innerText();
check(cmp.includes(uniName?.trim() ?? "###"), `в сравнении нет добавленного вуза «${uniName?.trim()}»`);

/* 3. Умный фильтр каталога сокращает выдачу */
await page.goto(`${BASE}/universities`, { waitUntil: "networkidle" });
const before = Number((await page.locator("text=/Найдено \\d+/").first().textContent())?.match(/\d+/)?.[0]);
await page.getByText("Фильтр + поиск").click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Медицина", exact: true }).click();
await page.getByRole("button", { name: "Найти", exact: true }).click();
await page.waitForURL(/f_fields=/, { timeout: 8000 });
await page.waitForTimeout(400);
const after = Number((await page.locator("text=/Найдено \\d+/").first().textContent())?.match(/\d+/)?.[0]);
check(after < before && after > 0, `фильтр «Медицина»: было ${before}, стало ${after}`);

/* 4. Умный фильтр: поиск сужает выдачу и живёт в адресе страницы */
await page.goto(`${BASE}/crm/contacts`, { waitUntil: "networkidle" });
const rowsBefore = await page.locator("tbody tr").count();
await page.getByText("Фильтр + поиск").click();
await page.waitForTimeout(300);
await page.locator('[role="dialog"], .card-raised').first().locator("input").first().fill("Малика");
await page.getByRole("button", { name: "Найти", exact: true }).click();
await page.waitForURL(/q=/, { timeout: 8000 });
await page.waitForTimeout(400);
const rowsAfter = await page.locator("tbody tr").count();
check(rowsAfter === 1 && rowsBefore > 1, `поиск контактов: было ${rowsBefore}, стало ${rowsAfter}`);

/* 5. Готовый срез из левой колонки фильтра */
await page.goto(`${BASE}/crm/contacts`, { waitUntil: "networkidle" });
const allRows = await page.locator("tbody tr").count();
await page.getByText("Фильтр + поиск").click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Зачислены", exact: true }).click();
await page.waitForURL(/f_status=enrolled/, { timeout: 8000 });
await page.waitForTimeout(400);
const enrolledRows = await page.locator("tbody tr").count();
check(
  enrolledRows > 0 && enrolledRows < allRows,
  `срез «Зачислены»: всего ${allRows}, в срезе ${enrolledRows}`,
);

/* 5b. Условие снимается чипом под строкой поиска */
await page.locator("button.chip-active").first().click();
await page.waitForTimeout(600);
check(
  !page.url().includes("f_status=enrolled"),
  `условие не снялось: ${page.url()}`,
);

/*
 * 6. Канбан: карточка переносится на другую стадию и это попадает в историю.
 * Целевую колонку выбираем от текущей, а не по номеру: карточка уже могла
 * переехать на прошлом прогоне, и перетаскивание «на месте» ничего не докажет.
 */
await page.goto(`${BASE}/crm/deals`, { waitUntil: "networkidle" });
const card = page.locator('a[href="/crm/deals/d_005"]');
check((await card.count()) === 1, "карточка сделки d_005 не найдена на доске");

const columns = page.locator("section");
const columnCount = await columns.count();
let fromIndex = -1;
for (let i = 0; i < columnCount; i += 1) {
  if (await columns.nth(i).locator('a[href="/crm/deals/d_005"]').count()) fromIndex = i;
}
check(fromIndex >= 0, "не удалось определить колонку карточки");
const toIndex = (fromIndex + 1) % Math.min(columnCount, 5);
const fromColumn = (await columns.nth(fromIndex).locator("header").innerText()).split("\n")[0];

await columns.nth(toIndex).scrollIntoViewIfNeeded();
await card.dragTo(columns.nth(toIndex).locator("header"));
await page.waitForTimeout(1800);

const toColumn = (
  await page
    .locator('a[href="/crm/deals/d_005"]')
    .locator("xpath=ancestor::section[1]")
    .locator("header")
    .innerText()
).split("\n")[0];
check(
  fromColumn !== toColumn,
  `перенос карточки не сработал: была «${fromColumn}», стала «${toColumn}»`,
);

await page.goto(`${BASE}/crm/deals/d_005`, { waitUntil: "networkidle" });
const dealBody = await page.locator("body").innerText();
check(/Стадия изменена/.test(dealBody), "перенос карточки не записан в историю сделки");

/* 7. История карточки принимает комментарий */
await page.getByPlaceholder("Что нужно сделать").fill("Проверка истории из QA");
await page.getByRole("button", { name: "Комментарий", exact: true }).click();
await page.getByRole("button", { name: "Добавить", exact: true }).click();
await page.waitForTimeout(1200);
check(
  (await page.locator("body").innerText()).includes("Проверка истории из QA"),
  "комментарий не появился в истории карточки",
);

/* 8. Дубль лида: второй раз тот же номер завести нельзя */
await page.goto(`${BASE}/crm/leads`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Новый лид", exact: true }).click();
await page.waitForTimeout(300);
await page.locator('input[name="name"]').fill("Проверка дубля");
await page.locator('input[name="phone"]').fill("+998 90 111-22-33");
await page.getByRole("button", { name: "Проверить дубль", exact: true }).click();
await page.waitForTimeout(1200);
const dupText = await page.locator('[role="dialog"]').innerText();
check(/Найден дубль/.test(dupText), "дубль по номеру телефона не найден");
check(/Азиза Нурматова/.test(dupText), "в предупреждении о дубле нет существующего контакта");
const saveDisabled = await page.locator('button[form="new-lead"]').isDisabled();
check(saveDisabled, "кнопку сохранения дубля не заблокировали");
await page.keyboard.press("Escape");

/*
 * 9. Новый лид и его конвертация.
 * Лид создаём здесь же, со свободным номером: сценарий должен проходить
 * столько раз подряд, сколько понадобится, а не один раз на свежих данных.
 */
const fresh = `Проверка конвертации ${Date.now() % 100000}`;
const freshPhone = `+998 90 ${String(Date.now() % 1000000).padStart(6, "0")}`;
await page.getByRole("button", { name: "Новый лид", exact: true }).click();
await page.waitForTimeout(300);
await page.locator('input[name="name"]').fill(fresh);
await page.locator('input[name="phone"]').fill(freshPhone);
await page.locator('textarea[name="comment"]').fill("Создан прогоном QA");
await page.locator('button[form="new-lead"]').click();
await page.waitForTimeout(1800);

const freshCard = page.locator("a", { hasText: fresh }).first();
check((await freshCard.count()) === 1, `новый лид «${fresh}» не появился на доске`);
await freshCard.click();
await page.waitForURL(/\/crm\/leads\/l_/, { timeout: 10000 });
const freshUrl = page.url();

await page.getByRole("button", { name: "Конвертировать", exact: true }).click();
await page.waitForTimeout(2500);
check(/\/crm\/deals\//.test(page.url()), `после конвертации не открылась сделка: ${page.url()}`);
const dealAfter = await page.locator("body").innerText();
check(dealAfter.includes(fresh), "в созданной сделке нет имени контакта из лида");

await page.goto(freshUrl, { waitUntil: "networkidle" });
const leadBody = await page.locator("body").innerText();
check(/Лид конвертирован/.test(leadBody), "конвертация не записана в историю лида");

// Тот же номер после конвертации — уже контакт, второй лид на него не заводится.
await page.goto(`${BASE}/crm/leads`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Новый лид", exact: true }).click();
await page.waitForTimeout(300);
await page.locator('input[name="name"]').fill(fresh);
await page.locator('input[name="phone"]').fill(freshPhone);
await page.getByRole("button", { name: "Проверить дубль", exact: true }).click();
await page.waitForTimeout(1200);
check(
  /Найден дубль/.test(await page.locator('[role="dialog"]').innerText()),
  "после конвертации тот же номер не распознан как дубль",
);
await page.keyboard.press("Escape");

/* 10. Рабочий день: таймер идёт по-настоящему, пауза его останавливает */
const work = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await work.addCookies([
  { name: "orbis_tenant", value: "seoulway", domain: "localhost", path: "/" },
  { name: "orbis_user", value: signSession("u_dilnoza"), domain: "localhost", path: "/" },
]);
const workPage = await work.newPage();
await workPage.goto(`${BASE}/`, { waitUntil: "networkidle" });

const profile = () => workPage.locator("header button[aria-expanded]").last();

/**
 * Меню профиля закрывается после каждого действия — так и задумано.
 * Поэтому перед каждым шагом панель открываем заново, а не полагаемся
 * на то, что она осталась открытой с прошлого клика.
 */
async function openPanel() {
  if (await workPage.locator(".card-raised").count()) return;
  await profile().click();
  await workPage.waitForSelector(".card-raised", { timeout: 5000 });
}
const panel = () => workPage.locator(".card-raised").first().innerText();
const press = async (value) => {
  await openPanel();
  await workPage.locator(`.card-raised button[name="what"][value="${value}"]`).click();
  await workPage.waitForTimeout(1200);
};

// Прогон мог оставить день начатым: состояние живёт в памяти сервера.
await openPanel();
if (await workPage.locator('.card-raised button[name="what"][value="end"]').count()) {
  await press("end");
  await openPanel();
}
// Статус набран капителью через CSS, поэтому сравниваем без учёта регистра.
check(
  /рабочий день не начат/i.test(await panel()),
  "у сотрудника без отметки не показан статус «Рабочий день не начат»",
);

await press("start");
await openPanel();
check(/рабочий день идёт/i.test(await panel()), "рабочий день не начался после нажатия");

const clockOf = (text) => text.match(/\d{2}:\d{2}:\d{2}/)?.[0] ?? "";
const first = clockOf(await panel());
check(Boolean(first), "в панели нет часов рабочего дня");
await workPage.waitForTimeout(2200);
const second = clockOf(await panel());
check(second !== first, `таймер не идёт: ${first} → ${second}`);

// на перерыве счёт останавливается — иначе отчётность по часам завышена
await press("break");
await openPanel();
const paused = clockOf(await panel());
await workPage.waitForTimeout(2200);
check(clockOf(await panel()) === paused, "на перерыве таймер продолжает идти");

await press("end");
await work.close();

/* 10b. Тема переключается и остаётся между страницами */
const theme = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await theme.addCookies([{ name: "orbis_tenant", value: "seoulway", domain: "localhost", path: "/" }]);
const themePage = await theme.newPage();
await themePage.goto(`${BASE}/`, { waitUntil: "networkidle" });
check(
  (await themePage.locator("html").getAttribute("data-theme")) === "light",
  "портал открывается не в светлой теме",
);
await themePage.locator("header button[aria-expanded]").last().click();
await themePage.waitForTimeout(250);
await themePage.locator('.card-raised button[name="theme"][value="dark"]').click();
await themePage.waitForTimeout(1200);
await themePage.goto(`${BASE}/tasks`, { waitUntil: "networkidle" });
check(
  (await themePage.locator("html").getAttribute("data-theme")) === "dark",
  "тёмная тема не сохранилась между страницами",
);
await theme.close();

/* 10c. Календарь: день по часам и линия настоящего времени */
await page.goto(`${BASE}/calendar`, { waitUntil: "networkidle" });
check(/Сентябрь|Октябрь|Ноябрь|Декабрь|Январь/.test(await page.locator("body").innerText()), "календарь не открылся месяцем");
const todayIso = new Date().toISOString().slice(0, 10);
await page.goto(`${BASE}/calendar?view=day&date=${todayIso}`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
const nowLine = await page.locator("text=/^\\d{2}:\\d{2}$/").count();
check(nowLine > 0, "в дневном разрезе нет отметки настоящего времени");

/* 10d. Структура компании: дерево и панель подразделения */
await page.goto(`${BASE}/team/structure`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const depCards = await page.locator("[data-dep]").count();
check(depCards >= 5, `на схеме мало подразделений: ${depCards}`);
await page.locator("[data-dep]").nth(1).click();
await page.waitForTimeout(300);
check(
  await page.getByText("Подчинённые", { exact: false }).first().isVisible(),
  "панель подразделения не показывает подчинённых",
);

/*
 * 11. Название и цвет стадии меняются в настройках воронки.
 * Стадию берём по месту в основной воронке, а не по подписи: подпись — как раз
 * то, что этот сценарий и меняет, иначе тест пройдёт только один раз.
 */
await page.goto(`${BASE}/admin/pipelines`, { waitUntil: "networkidle" });
const mainPipeline = page.locator("section", { hasText: "Поступление в вуз" }).first();
await mainPipeline.locator("button[data-stage]").first().click();
await page.waitForTimeout(400);
const renamed = `Новая сделка ${Date.now() % 1000}`;
await page.locator('input[name="labelRu"]').fill(renamed);
await page.locator('button[aria-label="#22c55e"]').click();
await page.getByRole("button", { name: "Сохранить", exact: true }).click();
await page.waitForTimeout(1800);

await page.goto(`${BASE}/crm/deals`, { waitUntil: "networkidle" });
const boardText = await page.locator("body").innerText();
check(boardText.includes(renamed), `переименование стадии не доехало до доски: нет «${renamed}»`);
const stageColor = await page
  .locator("section", { hasText: renamed })
  .first()
  .locator("header span.dot")
  .evaluate((el) => getComputedStyle(el).backgroundColor);
check(stageColor === "rgb(34, 197, 94)", `цвет стадии на доске не обновился: ${stageColor}`);

/*
 * 11b. «Отмена» закрывает окно во всех диалогах.
 * Кнопка внутри окна — не то же самое, что клик по фону: однажды защита
 * от закрытия фоном убила её во всех окнах сразу, и заметили это не мы.
 */
const dialogs = [
  ["новый лид", "/crm/leads", () => page.getByRole("button", { name: /Новый лид/ }).click()],
  ["стадия воронки", "/admin/pipelines", () => page.locator("button[data-stage]").first().click()],
  ["добавить стадию", "/admin/pipelines", () => page.getByRole("button", { name: /Добавить стадию/ }).first().click()],
  ["новая воронка", "/admin/pipelines", () => page.getByRole("button", { name: /Новая воронка/ }).click()],
  ["дело в календаре", "/calendar", () => page.getByRole("button", { name: "Добавить", exact: true }).click()],
  ["новый отдел", "/team/structure", () => page.locator("[aria-label='Добавить подразделение внутрь']").first().click()],
  ["переименование отдела", "/team/structure", () => page.locator("[aria-label='Переименовать подразделение']").first().click()],
];
for (const [name, route, open] of dialogs) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await open();
  await page.waitForTimeout(350);
  check(await page.locator("[role=dialog]").count() === 1, `окно «${name}» не открылось`);
  await page.locator("[role=dialog] button").filter({ hasText: /^Отмена$/ }).first().click();
  await page.waitForTimeout(350);
  check(await page.locator("[role=dialog]").count() === 0, `«Отмена» не закрыла окно «${name}»`);
}

/* 11c. Выпадающий список внутри панели фильтра не обрезается панелью */
await page.goto(`${BASE}/crm/leads?fields=source`, { waitUntil: "networkidle" });
await page.getByText("Фильтр + поиск").click();
await page.waitForTimeout(350);
await page.locator("button[aria-haspopup=listbox]").last().click();
await page.waitForTimeout(350);
const listVisible = await page.evaluate(() => {
  const pop = document.querySelector("[role=listbox]");
  if (!pop) return "нет списка";
  const r = pop.getBoundingClientRect();
  const el = document.elementFromPoint(r.left + r.width / 2, r.top + 20);
  return pop.contains(el) ? "ok" : "перекрыт";
});
check(listVisible === "ok", `выпадающий список в фильтре перекрыт: ${listVisible}`);

/* 11d. Канбан и список — два вида одного раздела */
await page.goto(`${BASE}/crm/deals?view=list`, { waitUntil: "networkidle" });
check(await page.locator("table").count() > 0, "вид «Список» не показал таблицу");
check(
  !(await page.locator("body").innerText()).includes("Перетащите карточку"),
  "вид «Список» всё ещё рисует доску",
);

/* 12. Лента событий не показывает чужую активность роли «только свои» */
const own = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await own.addCookies([
  { name: "orbis_tenant", value: "seoulway", domain: "localhost", path: "/" },
  { name: "orbis_user", value: signSession("u_kamila"), domain: "localhost", path: "/" },
]);
const ownPage = await own.newPage();
await ownPage.goto(`${BASE}/`, { waitUntil: "networkidle" });
const feed = await ownPage.locator("body").innerText();
check(!feed.includes("Рустам Эргашев"), "менеджер видит в ленте события чужих сотрудников");
await own.close();

console.log(fail.length ? "ПРОБЛЕМЫ В СЦЕНАРИЯХ:" : "Все сценарии прошли");
fail.forEach((f) => console.log(" - " + f));
await browser.close();
process.exit(fail.length ? 1 : 0);
