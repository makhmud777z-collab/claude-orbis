import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";

/**
 * Пароли и подпись сессии — без внешних сервисов: приложение разворачивается
 * одним standalone-контейнером, и любой SaaS-провайдер тут был бы лишней
 * зависимостью на старте. scrypt — часть Node, ключ для подписи — свой.
 */

const SESSION_SECRET = process.env.SESSION_SECRET || "orbis-dev-secret-change-in-production";

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  // Секрет по умолчанию годится только для локальной разработки: с ним
  // подпись сессии предсказуема, и куки можно подделать.
  console.warn(
    "[auth] SESSION_SECRET не задан — сессии подписаны стандартным ключом. " +
      "Перед реальным запуском задайте свой SESSION_SECRET.",
  );
}

/** Хэш пароля: scrypt с солью, формат "salt:hash" — сравнение своё, без bcrypt. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/** Подписанный токен сессии: userId.signature — куку нельзя подделать без секрета. */
export function signSession(userId: string): string {
  const sig = createHmac("sha256", SESSION_SECRET).update(userId).digest("hex");
  return `${userId}.${sig}`;
}

export function verifySessionToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const userId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", SESSION_SECRET).update(userId).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

export function newInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Id для реальных арендаторов/сотрудников — не общий счётчик store.ts
 * (тот сбрасывается при перезапуске и коллизия перезапишет чужую запись
 * в SQLite), а случайный суффикс, уникальный без общего состояния.
 */
export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

/** Логин по умолчанию: транслитерация имени + короткий номер, если занято. */
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya", қ: "q", ў: "o", ғ: "g", ҳ: "h",
};

export function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

export function usernameFrom(name: string): string {
  const base = transliterate(name).split(".").filter(Boolean).slice(0, 2).join(".");
  return base || `user${randomBytes(3).toString("hex")}`;
}
