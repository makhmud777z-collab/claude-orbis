/**
 * Ищет loc("ru", "uz"), где узбекский вариант — копия русского.
 * Совпадение допустимо для имён собственных и аббревиатур (Instagram, TOPIK, Pro),
 * всё остальное — забытый перевод.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ALLOW = /^(Instagram|Telegram|TOPIK|IELTS|GPA|Pro|Standard|Enterprise|CRM|Advanced|University Finder|Offer|Viza|Admission guideline|[\d\s—·%+.,:/-]*)$/;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".ts") || p.endsWith(".tsx") ? [p] : [];
  });
}

const suspicious = [];
for (const file of files("src")) {
  const src = readFileSync(file, "utf8");
  const re = /loc\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const [, ru, uz] = m;
    if (ru === uz && !ALLOW.test(ru.trim())) {
      suspicious.push(`${file}: «${ru}»`);
    }
  }
}

console.log(suspicious.length ? `Совпадающие переводы (${suspicious.length}):` : "Переводы на месте: узбекские строки отличаются от русских");
suspicious.forEach((s) => console.log(" - " + s));
