import { chromium } from "playwright";

// ожидания из матрицы прав + версии продукта (seoulway = CRM)
const EXPECT = {
  u_aziz:      { role: "Владелец",                 nav: ["/","/students","/applications","/documents","/tasks","/deadlines","/universities","/finance","/team","/settings"] },
  u_dilnoza:   { role: "Директор",                 nav: ["/","/students","/applications","/documents","/tasks","/deadlines","/universities","/finance","/team","/settings"] },
  u_shohruh:   { role: "Руководитель филиала",     nav: ["/","/students","/applications","/documents","/tasks","/deadlines","/universities","/finance","/team","/settings"] },
  u_kamila:    { role: "Менеджер по продажам",     nav: ["/","/students","/applications","/documents","/tasks","/deadlines","/universities"] },
  u_nilufar:   { role: "Куратор (оператор)",       nav: ["/","/students","/applications","/documents","/tasks","/deadlines","/universities"] },
  u_madina:    { role: "Специалист по документам", nav: ["/","/students","/applications","/documents","/tasks","/deadlines"] },
  u_rustam:    { role: "Финансы",                  nav: ["/","/students","/applications","/tasks","/deadlines","/finance"] },
  u_partner1:  { role: "Агент-партнёр",            nav: ["/students","/applications","/tasks"] },
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const issues = [];

for (const [userId, exp] of Object.entries(EXPECT)) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([
    { name: "orbis_tenant", value: "seoulway", domain: "localhost", path: "/" },
    { name: "orbis_user", value: userId, domain: "localhost", path: "/" },
    { name: "orbis_locale", value: "ru", domain: "localhost", path: "/" },
  ]);
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/universities", { waitUntil: "networkidle" }).catch(() => {});
  // партнёр не видит каталог — зайдём туда, куда пускают
  if (page.url().includes("universities") && (await page.locator("text=Раздел недоступен").count())) {
    await page.goto("http://localhost:3000/students", { waitUntil: "networkidle" });
  }
  const nav = await page.locator("aside").first().locator("a[href]").evaluateAll((els) =>
    els.map((e) => e.getAttribute("href")).filter((h) => h && !h.startsWith("http")));
  // подпункты (срезы с ?query и /universities/compare) в матрицу не входят
  const got = [...new Set(nav)].filter((h) => !h.includes("?") && h !== "/universities/compare").sort();
  const want = [...new Set(exp.nav)].sort();
  const roleShown = await page.locator("aside").first().innerText();

  const missing = want.filter((w) => !got.includes(w));
  const extra = got.filter((g) => !want.includes(g));
  if (missing.length || extra.length)
    issues.push(`${userId} (${exp.role}): нет ${JSON.stringify(missing)} лишнее ${JSON.stringify(extra)}`);
  if (!roleShown.includes(exp.role))
    issues.push(`${userId}: в сайдбаре роль не «${exp.role}»`);

  // прямой заход в запрещённый раздел должен давать заглушку, а не данные
  const forbidden = ["/finance", "/team", "/settings", "/documents", "/universities"].filter((r) => !want.includes(r));
  for (const route of forbidden) {
    await page.goto("http://localhost:3000" + route, { waitUntil: "networkidle" });
    const txt = await page.locator("body").innerText();
    if (!/Раздел недоступен|Модуль не входит/.test(txt))
      issues.push(`${userId}: ${route} открылся без прав`);
  }
  await ctx.close();
}

console.log(issues.length ? "ПРОБЛЕМЫ С РОЛЯМИ:" : "Роли и доступы — совпадают с матрицей");
issues.forEach((i) => console.log(" - " + i));
await browser.close();
