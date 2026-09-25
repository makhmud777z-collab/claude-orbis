import { chromium } from "playwright";
import { signSession } from "./_sign.mjs";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addCookies([
  { name: "orbis_tenant", value: "seoulway", domain: "localhost", path: "/" },
  { name: "orbis_user", value: signSession("u_aziz"), domain: "localhost", path: "/" },
  { name: "orbis_admin", value: "t_seoulway", domain: "localhost", path: "/" },
]);
const p = await ctx.newPage();

async function addField(entityLabel, name) {
  await p.goto("http://localhost:3000/admin/fields", { waitUntil: "load", timeout: 120000 });
  await p.waitForTimeout(300);
  await p.getByRole("button", { name: "Добавить поле" }).click();
  await p.waitForTimeout(250);
  // pick entity chip
  await p.getByRole("button", { name: new RegExp(`^${entityLabel}$`) }).click();
  await p.fill('input[name="labelRu"]', name);
  await p.getByRole("button", { name: "Готово" }).click();
  await p.waitForTimeout(600);
}

await addField("Сделка", "Бюджет клиента");
await addField("Лид", "Кампания");
await p.goto("http://localhost:3000/admin/fields", { waitUntil: "load" });
await p.waitForTimeout(400);
await p.screenshot({ path: "/tmp/shots/cf2-admin-grouped.png", fullPage: true });

// deal card shows the deal field
await p.goto("http://localhost:3000/crm/deals/d_001", { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(500);
console.log("deal card has field:", await p.locator("text=Бюджет клиента").count() > 0);
console.log("deal card NOT showing lead field:", await p.locator("text=Кампания").count() === 0);
await p.screenshot({ path: "/tmp/shots/cf2-deal.png" });

// lead card shows the lead field
await p.goto("http://localhost:3000/crm/leads/l_001", { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(500);
console.log("lead card has field:", await p.locator("text=Кампания").count() > 0);
console.log("lead card NOT showing deal field:", await p.locator("text=Бюджет клиента").count() === 0);
await browser.close();
