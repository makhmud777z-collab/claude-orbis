import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";

const ROUTES = [
  "/",
  "/crm/leads", "/crm/leads/l_001", "/crm/deals", "/crm/deals/d_001",
  "/crm/contacts", "/crm/contacts/s_001", "/crm/pipelines", "/crm/channels", "/crm/settings",
  "/tasks", "/tasks/projects", "/tasks/reports", "/tasks/templates",
  "/documents", "/deadlines",
  "/universities", "/universities/u_hallim", "/universities/compare",
  "/finance",
  "/team", "/team/u_nilufar", "/team/structure", "/team/reports",
  "/admin/users", "/admin/permissions", "/settings",
];
const TENANTS = ["seoulway", "agencyx", "hanbridge"];

/**
 * Записи, которые принадлежат seoulway. Для других агентств 404 на них —
 * не поломка, а работающая изоляция данных: именно так и должно быть.
 */
const FOREIGN = {
  "/crm/contacts/s_001": ["agencyx", "hanbridge"],
  "/crm/deals/d_001": ["agencyx", "hanbridge"],
  "/crm/leads/l_001": ["agencyx", "hanbridge"],
  "/team/u_nilufar": ["agencyx", "hanbridge"],
};
const LOCALES = ["ru", "uz"];

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [];

for (const tenant of TENANTS) {
  for (const locale of LOCALES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addCookies([
      { name: "orbis_tenant", value: tenant, domain: "localhost", path: "/" },
      { name: "orbis_locale", value: locale, domain: "localhost", path: "/" },
    ]);
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
    page.on("pageerror", (e) => errors.push("PAGEERROR " + String(e).slice(0, 160)));

    for (const route of ROUTES) {
      errors.length = 0;
      let status = 0;
      try {
        const resp = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 20000 });
        status = resp?.status() ?? 0;
      } catch (e) { problems.push([tenant, locale, route, "NAV_FAIL", String(e).slice(0, 80)]); continue; }

      const body = await page.locator("body").innerText();
      // признаки проблем
      const foreign = (FOREIGN[route] ?? []).includes(tenant);
      if (foreign) {
        const txt = await page.locator("body").innerText();
        // Чужая запись обязана дать 404 — либо, если модуль не входит в версию
        // агентства, заглушку версии. В обоих случаях никаких данных в теле.
        const blocked = status === 404 || /Модуль не входит|Modul sizning/.test(txt);
        const leaked = /Азиза Нурматова|Отабек Нурматов|Нилуфар Саидова/.test(txt);
        if (!blocked || leaked)
          problems.push([tenant, locale, route, "УТЕЧКА", `статус ${status}${leaked ? ", видны данные" : ""}`]);
        continue;
      }
      if (status >= 400) problems.push([tenant, locale, route, "HTTP", status]);
      if (errors.length) problems.push([tenant, locale, route, "CONSOLE", errors[0]]);
      if (/undefined|NaN|\[object Object\]/.test(body)) {
        const m = body.match(/.{0,40}(undefined|NaN|\[object Object\]).{0,40}/);
        problems.push([tenant, locale, route, "BADTEXT", m?.[0]?.replace(/\n/g, " ")]);
      }
      // непереведённые русские строки в узбекской локали — только в интерфейсных зонах
      if (locale === "uz") {
        const nav = await page.locator("aside").first().innerText().catch(() => "");
        if (/[А-Яа-я]/.test(nav)) problems.push([tenant, locale, route, "UNTRANSLATED_NAV", nav.match(/[А-Яа-я][^\n]*/)?.[0]]);
      }
    }
    await ctx.close();
  }
}

console.log(problems.length ? "ПРОБЛЕМЫ:" : "Проблем не найдено");
for (const p of problems) console.log(p.join(" | "));
await browser.close();
process.exit(problems.length ? 1 : 0);
