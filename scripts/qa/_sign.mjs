import { createHmac } from "node:crypto";

/**
 * Та же подпись, что и src/lib/auth.ts::signSession — куку orbis_user
 * больше нельзя просто выставить сырым id, её проверяют по HMAC.
 * QA-скрипты не тянут TS-модуль из src напрямую, поэтому логика
 * продублирована здесь; секрет читается из того же SESSION_SECRET,
 * что видит и сам dev-сервер.
 */
const SESSION_SECRET = process.env.SESSION_SECRET || "orbis-dev-secret-change-in-production";

export function signSession(userId) {
  const sig = createHmac("sha256", SESSION_SECRET).update(userId).digest("hex");
  return `${userId}.${sig}`;
}
