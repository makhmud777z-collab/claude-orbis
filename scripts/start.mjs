/**
 * Запуск собранного портала.
 *
 * next.config включает output: "standalone" — минимальный сервер в
 * .next/standalone, который разворачивается без node_modules целиком.
 * Обычный `next start` с этим режимом не работает и честно об этом
 * предупреждает, поэтому запускаем standalone-сервер сами.
 *
 * Сборщик кладёт туда только серверный код: статику (.next/static) и
 * файлы из public/ нужно перенести рядом, иначе страница придёт без
 * стилей и скриптов. Копируем средствами Node, а не cp — скрипт должен
 * работать и в Windows.
 */
import { cpSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

if (!existsSync(join(standalone, "server.js"))) {
  console.error("Сборки нет. Сначала: npm run build");
  process.exit(1);
}

cpSync(join(root, ".next", "static"), join(standalone, ".next", "static"), { recursive: true });
if (existsSync(join(root, "public"))) {
  cpSync(join(root, "public"), join(standalone, "public"), { recursive: true });
}

const port = process.env.PORT ?? "3000";
console.log(`Orbis: http://localhost:${port}`);

spawn(process.execPath, ["server.js"], {
  cwd: standalone,
  stdio: "inherit",
  env: { ...process.env, PORT: port },
}).on("exit", (code) => process.exit(code ?? 0));
