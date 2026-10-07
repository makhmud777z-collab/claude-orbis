import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Приём вебхука Meta.
 *
 * Два места, где это обычно ломают:
 *
 * 1. Подпись считается по *сырому* телу запроса. Если сначала разобрать
 *    JSON, а потом собрать обратно, байты не совпадут — Meta экранирует
 *    юникод, а JSON.stringify нет, — и подпись не сойдётся никогда.
 * 2. Вебхук не приносит лид. В теле только его номер, за данными идём
 *    вторым запросом и уже токеном того агентства, чья это страница.
 */

export const APP_SECRET = process.env.META_APP_SECRET ?? "";
export const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN ?? "";

/** Подтверждение адреса: Meta зовёт GET и ждёт обратно hub.challenge. */
export function verifyChallenge(params: URLSearchParams): string | null {
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode !== "subscribe" || !challenge) return null;
  if (!VERIFY_TOKEN || token !== VERIFY_TOKEN) return null;
  return challenge;
}

/**
 * Подпись события. Заголовок — «sha256=<hex>», ключ — секрет приложения.
 * Сравнение постоянного времени: иначе по задержке ответа подпись
 * подбирается побайтно.
 */
export function signatureValid(rawBody: string, header: string | null): boolean {
  if (!APP_SECRET || !header) return false;
  const [algo, sent] = header.split("=");
  if (algo !== "sha256" || !sent) return false;

  const expected = createHmac("sha256", APP_SECRET).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(sent, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Для тестов и симулятора: подписать тело тем же способом, что и Meta. */
export function sign(rawBody: string, secret = APP_SECRET): string {
  return "sha256=" + createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

export interface LeadgenEvent {
  pageId: string;
  leadgenId: string;
  formId: string;
  adgroupId: string | null;
  createdAt: number | null;
}

/**
 * Разбор тела. В одном запросе Meta может прислать несколько событий и
 * не только про лиды — всё лишнее молча пропускаем.
 */
export function parseLeadgen(body: unknown): LeadgenEvent[] {
  const root = body as { object?: string; entry?: unknown[] } | null;
  if (!root || root.object !== "page" || !Array.isArray(root.entry)) return [];

  const out: LeadgenEvent[] = [];
  for (const raw of root.entry) {
    const entry = raw as { id?: string; changes?: unknown[] };
    if (!Array.isArray(entry.changes)) continue;

    for (const rawChange of entry.changes) {
      const change = rawChange as { field?: string; value?: Record<string, unknown> };
      if (change.field !== "leadgen" || !change.value) continue;

      const v = change.value;
      const leadgenId = String(v.leadgen_id ?? "");
      // Страницу берём из события: в entry.id она та же, но у Meta
      // исторически встречается и строка, и число.
      const pageId = String(v.page_id ?? entry.id ?? "");
      if (!leadgenId || !pageId) continue;

      out.push({
        leadgenId,
        pageId,
        formId: String(v.form_id ?? ""),
        adgroupId: v.adgroup_id ? String(v.adgroup_id) : null,
        createdAt: typeof v.created_time === "number" ? v.created_time : null,
      });
    }
  }
  return out;
}

export interface MetaField {
  name: string;
  values: string[];
}

/** Запрос за самим лидом. Токен — той страницы, с которой лид пришёл. */
/**
 * Код ошибки Graph API, вынутый из тела ответа.
 *
 * Разбирать текст ошибки глазами нельзя: «OAuthException» Meta ставит и на
 * отозванный доступ, и на превышение частоты запросов, после которого всё
 * само чинится. Решает только числовой код, и дальше по пути он должен
 * ехать отдельно от человеческого текста.
 */
export class GraphError extends Error {
  readonly code: number | null;
  readonly status: number;

  constructor(status: number, body: string) {
    const parsed = GraphError.read(body);
    super(
      parsed.message
        ? `Graph API ${status} (код ${parsed.code ?? "—"}): ${parsed.message}`
        : `Graph API ${status}: ${body.slice(0, 200)}`,
    );
    this.name = "GraphError";
    this.status = status;
    this.code = parsed.code;
  }

  private static read(body: string): { code: number | null; message: string } {
    try {
      const json = JSON.parse(body) as { error?: { code?: number; message?: string } };
      return {
        code: typeof json.error?.code === "number" ? json.error.code : null,
        message: json.error?.message ?? "",
      };
    } catch {
      return { code: null, message: "" };
    }
  }
}

export async function fetchLead(leadgenId: string, pageToken: string): Promise<MetaField[]> {
  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(leadgenId)}`
    + `?fields=field_data,created_time&access_token=${encodeURIComponent(pageToken)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new GraphError(res.status, await res.text());
  const json = (await res.json()) as { field_data?: MetaField[] };
  return json.field_data ?? [];
}
