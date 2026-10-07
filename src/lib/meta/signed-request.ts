import { createHmac, timingSafeEqual } from "node:crypto";
import { APP_SECRET } from "./webhook";

/**
 * Разбор signed_request — того, чем Meta подписывает обратные вызовы
 * «человек отключил приложение» и «человек просит удалить свои данные».
 *
 * Формат другой, чем у вебхука лидов: не заголовок с подписью, а одна
 * строка «подпись.тело», обе части в base64url. Проверять обязательно:
 * без проверки любой желающий мог бы прислать нам чужой идентификатор и
 * заставить удалить чужие подключения.
 */

export interface SignedRequest {
  /** идентификатор человека в рамках нашего приложения */
  user_id?: string;
  algorithm?: string;
  issued_at?: number;
  [key: string]: unknown;
}

/** base64url → Buffer. Meta не добивает строку знаками «=». */
const fromBase64Url = (value: string) =>
  Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");

export function parseSignedRequest(
  raw: string | null | undefined,
  secret = APP_SECRET,
): SignedRequest | null {
  if (!raw || !secret) return null;

  const dot = raw.indexOf(".");
  if (dot < 0) return null;

  const sig = fromBase64Url(raw.slice(0, dot));
  const payloadRaw = raw.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payloadRaw).digest();

  // Сравнение постоянного времени: иначе по скорости отказа можно
  // подбирать подпись побайтово.
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;

  let payload: SignedRequest;
  try {
    payload = JSON.parse(fromBase64Url(payloadRaw).toString("utf8")) as SignedRequest;
  } catch {
    return null;
  }

  // Meta подписывает только HMAC-SHA256; всё остальное — чужой формат.
  if (payload.algorithm && !/^HMAC-SHA256$/i.test(payload.algorithm)) return null;
  return payload;
}

/** Сборка подписанной строки — нужна проверкам, чтобы не звать Meta. */
export function signRequest(payload: SignedRequest, secret = APP_SECRET): string {
  const body = Buffer.from(JSON.stringify({ algorithm: "HMAC-SHA256", ...payload }))
    .toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${sig}.${body}`;
}
