/**
 * Отступы и переполнение.
 *
 * Ловит класс ошибок, который глазами замечаешь последним, а клиент —
 * первым: подпись, вылезшая за карточку, кнопка, не влезшая в панель,
 * строка, обрезанная краем блока. Проверяем каждый экран на четырёх
 * ширинах и на двух языках: узбекские подписи длиннее русских, и вёрстка
 * рвётся именно на них.
 *
 * Многоточие (`truncate`) — осознанное решение, а не поломка, поэтому
 * такие элементы пропускаем.
 */
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";

const ROUTES = [
  "/", "/crm/leads", "/crm/deals", "/crm/contacts", "/crm/contacts/s_001", "/crm/deals/d_001",
  "/tasks", "/tasks/projects", "/tasks/reports", "/documents", "/deadlines", "/calendar",
  "/universities", "/universities/u_hallim", "/universities/compare", "/finance",
  "/team", "/team/u_nilufar", "/team/structure", "/team/reports",
  "/admin", "/admin/pipelines", "/admin/channels", "/admin/cards",
  "/admin/users", "/admin/permissions", "/admin/portal", "/admin/demo",
];

const CASES = [[1440, "ru"], [1180, "ru"], [820, "ru"], [390, "ru"], [1440, "uz"], [390, "uz"]];

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const problems = [];

for (const [width, locale] of CASES) {
  const ctx = await browser.newContext({ viewport: { width, height: 1000 } });
  await ctx.addCookies([
    { name: "orbis_tenant", value: "seoulway", domain: "localhost", path: "/" },
    { name: "orbis_locale", value: locale, domain: "localhost", path: "/" },
    { name: "orbis_admin", value: "t_seoulway", domain: "localhost", path: "/" },
  ]);
  const page = await ctx.newPage();

  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    const bad = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("body *")) {
        const cs = getComputedStyle(el);
        if (cs.overflowX !== "visible" && cs.overflowX !== "hidden") continue;
        if (cs.display === "inline") continue;
        if (cs.textOverflow === "ellipsis") continue;
        if (String(el.className || "").includes("truncate")) continue;
        if (el.clientWidth < 40) continue;
        const over = el.scrollWidth - el.clientWidth;
        if (over > 2) {
          const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 46);
          out.push(`${el.tagName.toLowerCase()} +${over}px « ${text} »`);
        }
      }
      return out.slice(0, 4);
    });
    for (const item of bad) problems.push(`${width}px/${locale} ${route}: ${item}`);
  }
  await ctx.close();
}

console.log(problems.length ? "ПЕРЕПОЛНЕНИЕ БЛОКОВ:" : "Отступы в порядке: ничего не вылезает за свои блоки");
problems.forEach((p) => console.log(" - " + p));
await browser.close();
process.exit(problems.length ? 1 : 0);
