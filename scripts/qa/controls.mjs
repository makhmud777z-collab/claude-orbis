/**
 * Мёртвые элементы управления.
 *
 * Кнопка, которая ничего не делает, — обещание, которое портал не выполняет:
 * сотрудник жмёт «Загрузить», «Экспорт», «Пригласить» и решает, что система
 * сломана. Проверка обходит все разделы и ищет кнопки без обработчика:
 * ни onClick, ни submit внутри формы, ни formAction. Обработчики живут
 * в props React'а — в DOM их не видно, поэтому достаём их из fiber.
 *
 * Кнопка, выключенная осознанно (disabled), нарушением не считается:
 * она честно говорит, что сейчас недоступна.
 */
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";

const ROUTES = [
  "/", "/crm/leads", "/crm/deals", "/crm/contacts", "/crm/contacts/s_001",
  "/crm/deals/d_001", "/crm/leads/l_001", "/crm/pipelines", "/crm/settings",
  "/tasks", "/tasks/projects", "/tasks/reports", "/documents", "/deadlines",
  "/calendar", "/universities", "/universities/u_hallim", "/universities/compare",
  "/finance", "/team", "/team/u_nilufar", "/team/structure", "/team/reports",
  "/settings", "/admin", "/admin/pipelines", "/admin/channels", "/admin/cards",
  "/admin/users", "/admin/permissions", "/admin/portal", "/admin/demo",
];

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

const broken = [];
for (const route of ROUTES) {
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  const dead = await page.evaluate(() => {
    const out = [];
    const propsOf = (el) => {
      const key = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
      return key ? el[key] : null;
    };
    for (const el of document.querySelectorAll("button, a[role=button], [role=button]")) {
      if (el.disabled) continue;
      // Внутри формы кнопка отправляет её — обработчик ей не нужен.
      if (el.closest("form")) continue;
      const props = propsOf(el);
      if (props && (props.onClick || props.onMouseDown || props.onKeyDown || props.formAction)) {
        continue;
      }
      out.push((el.getAttribute("aria-label") || el.innerText || "").trim().slice(0, 44)
        || "<без подписи>");
    }
    return out;
  });
  if (dead.length) broken.push(`${route}: ${dead.join(", ")}`);
}

await browser.close();

if (broken.length) {
  console.log("КНОПКИ БЕЗ ДЕЙСТВИЯ:");
  broken.forEach((b) => console.log(" - " + b));
  process.exit(1);
}
console.log("Элементы управления живые: кнопок без действия нет");
