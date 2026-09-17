import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const routes = ["/", "/students", "/applications", "/universities", "/documents", "/tasks", "/settings"];
const out = [];
for (const width of [390, 810]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  await ctx.addCookies([{ name: "orbis_tenant", value: "seoulway", domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  for (const r of routes) {
    await page.goto(BASE + r, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const navVisible = await page.locator("aside").first().isVisible().catch(() => false);
    out.push(`${width}px ${r.padEnd(16)} горизонт.прокрутка: ${overflow}px  боковое меню: ${navVisible ? "видно" : "скрыто"}`);
    if (width === 390 && (r === "/" || r === "/universities")) {
      await page.screenshot({ path: `shots/mobile-${r.replace(/\W/g, "") || "home"}.png`, fullPage: false });
    }
  }
  await ctx.close();
}
out.forEach((o) => console.log(o));
await browser.close();
process.exit(0 ? 1 : 0);
