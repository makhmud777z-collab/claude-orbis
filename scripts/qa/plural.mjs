/**
 * Согласование числа и существительного.
 *
 * «5 сделки», «1 карточек», «42 лидов» — мелочь, которая сразу выдаёт
 * недоделанный продукт. В русском три формы, и каждая подпись рядом с числом
 * обязана их учитывать: для этого есть `f.plural` и словарь `P` в strings.ts.
 *
 * Скрипт читает готовые страницы и проверяет каждую пару «число + слово»
 * на одной строке. Перенос строки означает разные блоки (крупное число
 * в плитке и подпись под ним) — там согласование не требуется.
 */
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";

const ROUTES = [
  "/", "/crm/leads", "/crm/deals", "/crm/contacts", "/crm/contacts/s_001",
  "/crm/deals/d_001", "/crm/leads/l_001", "/tasks", "/tasks/projects", "/tasks/reports",
  "/documents", "/deadlines", "/calendar", "/universities", "/universities/u_hallim",
  "/universities/compare", "/finance", "/team", "/team/u_nilufar", "/team/structure",
  "/team/reports", "/settings", "/admin", "/admin/pipelines", "/admin/channels",
  "/admin/cards", "/admin/users", "/admin/permissions", "/admin/portal",
];

/** [одна, две, пять] — те же формы, что в словаре P. */
const WORDS = [
  ["сделка", "сделки", "сделок"], ["лид", "лида", "лидов"],
  ["контакт", "контакта", "контактов"], ["задача", "задачи", "задач"],
  ["проект", "проекта", "проектов"], ["документ", "документа", "документов"],
  ["папка", "папки", "папок"], ["отдел", "отдела", "отделов"],
  ["модуль", "модуля", "модулей"], ["договор", "договора", "договоров"],
  ["дедлайн", "дедлайна", "дедлайнов"], ["событие", "события", "событий"],
  ["программа", "программы", "программ"], ["вуз", "вуза", "вузов"],
  ["стадия", "стадии", "стадий"], ["карточка", "карточки", "карточек"],
  ["воронка", "воронки", "воронок"], ["день", "дня", "дней"],
  ["час", "часа", "часов"], ["человек", "человека", "человек"],
  ["сотрудник", "сотрудника", "сотрудников"], ["канал", "канала", "каналов"],
  ["шаблон", "шаблона", "шаблонов"], ["год", "года", "лет"],
  ["студент", "студента", "студентов"], ["заявка", "заявки", "заявок"],
  ["место", "места", "мест"],
];

const form = (n, [one, few, many]) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
};

const dictionary = new Map();
for (const forms of WORDS) for (const word of new Set(forms)) dictionary.set(word, forms);

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const ctx = await browser.newContext({ viewport: { width: 1480, height: 950 } });
await ctx.addCookies([
  { name: "orbis_tenant", value: "seoulway", domain: "localhost", path: "/" },
  { name: "orbis_locale", value: "ru", domain: "localhost", path: "/" },
  { name: "orbis_admin", value: "t_seoulway", domain: "localhost", path: "/" },
]);
const page = await ctx.newPage();

const broken = new Set();
for (const route of ROUTES) {
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  const text = await page.evaluate(
    () => (document.querySelector("main") ?? document.body).innerText,
  );
  for (const match of text.matchAll(/(\d+)[  ]+([А-Яа-яЁё]+)/g)) {
    const forms = dictionary.get(match[2].toLowerCase());
    if (!forms) continue;
    const want = form(Number(match[1]), forms);
    if (want !== match[2].toLowerCase()) {
      broken.add(`${route}: «${match[0]}» → надо «${match[1]} ${want}»`);
    }
  }
}

await browser.close();

if (broken.size) {
  console.log("ОШИБКИ СОГЛАСОВАНИЯ:");
  [...broken].forEach((b) => console.log(" - " + b));
  process.exit(1);
}
console.log("Числа и существительные согласованы");
