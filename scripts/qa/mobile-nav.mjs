import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addCookies([{ name: "orbis_tenant", value: "seoulway", domain: "localhost", path: "/" }]);
const page = await ctx.newPage();
const fail = [];

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.screenshot({ path: "shots/mobile-home.png" });

const burger = page.getByRole("button", { name: "Меню" });
if (!(await burger.count())) fail.push("нет кнопки меню на мобильном");
await burger.click();
await page.waitForTimeout(350);
await page.screenshot({ path: "shots/mobile-menu.png" });

const links = await page.locator("body > div.fixed nav a[href]").evaluateAll((e) => e.map((x) => x.getAttribute("href")));
if (links.length < 8) fail.push(`в мобильном меню только ${links.length} ссылок`);

await page.locator("body > div.fixed nav").getByRole("link", { name: "Каталог вузов" }).click();
await page.waitForURL(/universities/, { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(600);
if (!page.url().includes("/universities")) fail.push("переход из мобильного меню не сработал");
const menuStillOpen = await page.locator("body > div.fixed nav").isVisible().catch(() => false);
if (menuStillOpen) fail.push("меню не закрылось после перехода");
await page.screenshot({ path: "shots/mobile-catalog.png" });

// таблицы на мобильном должны скроллиться внутри, а не ломать страницу
await page.goto("http://localhost:3000/crm/contacts", { waitUntil: "networkidle" });
const inner = await page.locator(".scroll-x").first().evaluate((el) => el.scrollWidth > el.clientWidth);
if (!inner) fail.push("таблица контактов не имеет внутренней прокрутки");

console.log(fail.length ? "ПРОБЛЕМЫ:" : "Мобильная навигация работает");
fail.forEach((f) => console.log(" - " + f));
await browser.close();
process.exit(fail.length ? 1 : 0);
