import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const routes = ["/", "/crm/contacts", "/crm/deals", "/crm/leads", "/universities", "/documents", "/tasks", "/calendar", "/team", "/team/structure", "/admin/permissions", "/settings"];
const out = [];
const broken = [];
for (const width of [390, 810]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  await ctx.addCookies([{ name: "orbis_tenant", value: "seoulway", domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  for (const r of routes) {
    await page.goto(BASE + r, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const navVisible = await page.locator("aside").first().isVisible().catch(() => false);
    out.push(`${width}px ${r.padEnd(20)} горизонт.прокрутка: ${overflow}px  боковое меню: ${navVisible ? "видно" : "скрыто"}`);
    // Горизонтальная прокрутка страницы на телефоне — это поломка вёрстки,
    // а не мелочь: половина карточки уезжает за экран.
    if (overflow > 1) broken.push(`${width}px ${r}: прокрутка ${overflow}px`);
    if (width === 390 && (r === "/" || r === "/universities")) {
      await page.screenshot({ path: `shots/mobile-${r.replace(/\W/g, "") || "home"}.png`, fullPage: false });
    }
  }
  await ctx.close();
}
out.forEach((o) => console.log(o));
if (broken.length) {
  console.log("ПРОБЛЕМЫ ВЁРСТКИ:");
  broken.forEach((b) => console.log(" - " + b));
}
await browser.close();
process.exit(broken.length ? 1 : 0);
