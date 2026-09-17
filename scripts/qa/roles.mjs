import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";

/**
 * Ожидания из матрицы прав и версии продукта (seoulway = CRM).
 * Проверяем не точный список ссылок, а контракт: что роль обязана видеть
 * и чего не должна видеть никогда. Так тест переживает добавление пунктов,
 * но ловит настоящую утечку доступа.
 */
const EXPECT = {
  u_aziz: {
    role: "Владелец",
    must: ["/", "/crm/leads", "/crm/deals", "/crm/contacts",
      "/tasks", "/tasks/projects", "/documents", "/deadlines", "/calendar", "/universities",
      "/finance", "/team", "/team/structure", "/team/reports", "/admin"],
    // настройки живут только внутри «Администрирования», отдельных пунктов нет
    mustNot: ["/tasks/templates", "/crm/channels", "/crm/settings", "/crm/pipelines", "/settings"],
  },
  u_dilnoza: {
    role: "Директор",
    must: ["/", "/crm/leads", "/crm/deals", "/crm/contacts",
      "/tasks", "/documents", "/deadlines", "/calendar", "/universities", "/finance",
      "/team", "/admin"],
    mustNot: ["/crm/channels", "/crm/settings", "/settings"],
  },
  u_shohruh: {
    role: "Руководитель филиала",
    must: ["/", "/crm/leads", "/crm/deals", "/crm/contacts", "/tasks", "/documents",
      "/deadlines", "/calendar", "/universities", "/finance", "/team"],
    mustNot: ["/crm/channels", "/crm/settings", "/admin", "/settings"],
  },
  u_kamila: {
    role: "Менеджер по продажам",
    must: ["/", "/crm/leads", "/crm/deals", "/crm/contacts", "/tasks", "/documents",
      "/deadlines", "/calendar", "/universities"],
    mustNot: ["/finance", "/team", "/admin", "/crm/channels"],
  },
  u_nilufar: {
    role: "Куратор (оператор)",
    must: ["/", "/crm/leads", "/crm/deals", "/crm/contacts", "/tasks", "/documents",
      "/deadlines", "/calendar", "/universities"],
    mustNot: ["/finance", "/team", "/admin", "/crm/channels"],
  },
  u_madina: {
    role: "Специалист по документам",
    must: ["/", "/crm/deals", "/crm/contacts", "/tasks", "/documents", "/deadlines", "/calendar"],
    mustNot: ["/crm/leads", "/finance", "/team", "/admin", "/universities"],
  },
  u_rustam: {
    role: "Финансы",
    must: ["/", "/crm/deals", "/crm/contacts", "/tasks", "/deadlines", "/calendar", "/finance", "/team/reports"],
    mustNot: ["/crm/leads", "/documents", "/admin", "/universities", "/team/structure"],
  },
  u_partner1: {
    role: "Агент-партнёр",
    must: ["/crm/deals", "/crm/contacts", "/tasks"],
    mustNot: ["/", "/crm/leads", "/finance", "/team", "/admin", "/documents", "/universities", "/calendar"],
  },
};

/** Разделы, прямой заход в которые должен давать заглушку, а не данные. */
const GUARDED = ["/finance", "/team", "/documents", "/universities",
  "/crm/leads", "/calendar", "/admin"];

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const issues = [];

for (const [userId, exp] of Object.entries(EXPECT)) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  await ctx.addCookies([
    { name: "orbis_tenant", value: "seoulway", domain: "localhost", path: "/" },
    { name: "orbis_user", value: userId, domain: "localhost", path: "/" },
    { name: "orbis_locale", value: "ru", domain: "localhost", path: "/" },
  ]);
  const page = await ctx.newPage();
  // Заходим туда, куда роль точно пускают, — иначе меню собрать не из чего.
  await page.goto(BASE + exp.must[0], { waitUntil: "networkidle" });

  const rail = page.locator("aside").first();
  // Раскрываем все разделы: подпункты видны только у развёрнутого раздела.
  // Список пересобирается после каждого клика, поэтому каждый раз берём первый
  // свёрнутый раздел, а не снимок всех кнопок.
  for (let i = 0; i < 8; i += 1) {
    const caret = rail.locator("button[aria-expanded='false']").first();
    if (!(await caret.count())) break;
    await caret.click();
    await page.waitForTimeout(80);
  }

  const got = new Set(
    await rail.locator("a[href]").evaluateAll((els) =>
      els.map((e) => e.getAttribute("href")).filter((h) => h && !h.startsWith("http"))),
  );
  const roleShown = await rail.innerText();

  const missing = exp.must.filter((href) => !got.has(href));
  const extra = exp.mustNot.filter((href) => got.has(href));
  if (missing.length) issues.push(`${userId} (${exp.role}): в меню нет ${JSON.stringify(missing)}`);
  if (extra.length) issues.push(`${userId} (${exp.role}): в меню лишнее ${JSON.stringify(extra)}`);
  if (!roleShown.includes(exp.role)) issues.push(`${userId}: в сайдбаре роль не «${exp.role}»`);

  for (const route of GUARDED.filter((r) => exp.mustNot.includes(r))) {
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    const txt = await page.locator("body").innerText();
    if (!/Раздел недоступен|Модуль не входит/.test(txt))
      issues.push(`${userId}: ${route} открылся без прав`);
  }
  await ctx.close();
}

console.log(issues.length ? "ПРОБЛЕМЫ С РОЛЯМИ:" : "Роли и доступы — совпадают с матрицей");
issues.forEach((i) => console.log(" - " + i));
await browser.close();
process.exit(issues.length ? 1 : 0);
