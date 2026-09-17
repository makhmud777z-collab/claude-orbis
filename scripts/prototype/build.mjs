/**
 * Сборка одностраничного прототипа.
 *
 * Берёт оболочку (shell.html), модули из src/ и выгруженные данные,
 * складывает в один HTML-файл без внешних зависимостей, кроме шрифта.
 * Запуск: npx tsx scripts/prototype/data.ts && node scripts/prototype/build.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const here = "scripts/prototype";
const headHtml = readFileSync(join(here, "head.html"), "utf8");
const bodyHtml = readFileSync(join(here, "body.html"), "utf8");
const data = readFileSync(join(here, "build/data.json"), "utf8");

// Порядок важен: модули нумерованы, потому что состояние и справочники
// должны объявляться раньше экранов, которые их читают.
const modules = readdirSync(join(here, "src"))
  .filter((f) => f.endsWith(".js"))
  .sort()
  .map((f) => readFileSync(join(here, "src", f), "utf8"));

const html = `<!doctype html><html lang="ru"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${headHtml}</head>
<body>
${bodyHtml}
<script>window.__ORBIS__ = ${data};</script>
<script>
${modules.join("\n\n")}
</script>
</body></html>
`;

writeFileSync(join(here, "build/prototype.html"), html);
console.log(`Прототип собран: ${(html.length / 1024).toFixed(0)} КБ · ${modules.length} модулей`);
