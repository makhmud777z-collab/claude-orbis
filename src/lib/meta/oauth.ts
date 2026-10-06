import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Подключение страницы агентства через вход в Facebook.
 *
 * Приложение Meta одно на всю платформу, а страниц у агентств много,
 * поэтому в возврате от Facebook нужно понять, кто вообще это затеял.
 * Для этого в параметре state едет подписанная метка арендатора: без
 * подписи чужой человек подсунул бы свою страницу в чужое агентство.
 */

export const APP_ID = process.env.META_APP_ID ?? "";
export const APP_SECRET = process.env.META_APP_SECRET ?? "";
const STATE_SECRET = process.env.SESSION_SECRET || "orbis-dev-secret-change-in-production";

/** Настроено ли приложение. Без этого показываем подключение как недоступное. */
export const metaConfigured = () => Boolean(APP_ID && APP_SECRET);

const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Что просим у человека. leads_retrieval и pages_manage_metadata выдают
 * только после проверки приложения — до неё подключение работает лишь
 * у разработчиков самого приложения.
 */
export const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "leads_retrieval",
  "business_management",
].join(",");

export interface StatePayload {
  tenantId: string;
  userId: string;
  nonce: string;
}

export function signState(tenantId: string, userId: string): string {
  const nonce = randomBytes(8).toString("base64url");
  const body = Buffer.from(JSON.stringify({ tenantId, userId, nonce })).toString("base64url");
  const sig = createHmac("sha256", STATE_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState(state: string | null): StatePayload | null {
  if (!state) return null;
  const dot = state.lastIndexOf(".");
  if (dot < 0) return null;

  const body = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = createHmac("sha256", STATE_SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as StatePayload;
    return parsed.tenantId && parsed.userId ? parsed : null;
  } catch {
    return null;
  }
}

/** Куда отправить человека, чтобы он вошёл в Facebook и дал права. */
export function authUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: redirectUri,
    state,
    scope: SCOPES,
    response_type: "code",
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

export interface PageCandidate {
  pageId: string;
  name: string;
  token: string;
  igHandle: string | null;
}

/**
 * Обмен кода на токены и список страниц.
 *
 * Токены страниц, выданные по долгоживущему токену человека, живут долго
 * сами — отдельно продлевать их не нужно, но они умирают, если человек
 * сменил пароль или забрал у приложения права.
 */
export async function exchangeCode(
  code: string,
  redirectUri: string,
  http: typeof fetch = fetch,
): Promise<PageCandidate[]> {
  const tokenUrl = `${GRAPH}/oauth/access_token?${new URLSearchParams({
    client_id: APP_ID,
    client_secret: APP_SECRET,
    redirect_uri: redirectUri,
    code,
  })}`;
  const tokenRes = await http(tokenUrl, { cache: "no-store" });
  if (!tokenRes.ok) throw new Error(`Обмен кода: ${tokenRes.status} ${await tokenRes.text()}`);
  const short = (await tokenRes.json()) as { access_token?: string };
  if (!short.access_token) throw new Error("Facebook не вернул токен");

  // Короткий токен живёт часы: меняем на долгий, иначе страницы отвалятся
  // в тот же день.
  const longUrl = `${GRAPH}/oauth/access_token?${new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: APP_ID,
    client_secret: APP_SECRET,
    fb_exchange_token: short.access_token,
  })}`;
  const longRes = await http(longUrl, { cache: "no-store" });
  const long = longRes.ok
    ? ((await longRes.json()) as { access_token?: string }).access_token
    : short.access_token;

  const pagesUrl = `${GRAPH}/me/accounts?${new URLSearchParams({
    fields: "id,name,access_token,instagram_business_account{username}",
    access_token: long ?? short.access_token,
  })}`;
  const pagesRes = await http(pagesUrl, { cache: "no-store" });
  if (!pagesRes.ok) throw new Error(`Список страниц: ${pagesRes.status} ${await pagesRes.text()}`);

  const json = (await pagesRes.json()) as {
    data?: {
      id: string; name: string; access_token: string;
      instagram_business_account?: { username?: string };
    }[];
  };

  return (json.data ?? []).map((p) => ({
    pageId: p.id,
    name: p.name,
    token: p.access_token,
    igHandle: p.instagram_business_account?.username
      ? `@${p.instagram_business_account.username}`
      : null,
  }));
}

/**
 * Подписка страницы на вебхук. Без неё Meta просто не будет слать лиды —
 * приложение само по себе ничего не получает.
 */
export async function subscribePage(
  pageId: string,
  pageToken: string,
  http: typeof fetch = fetch,
): Promise<void> {
  const url = `${GRAPH}/${encodeURIComponent(pageId)}/subscribed_apps`;
  const res = await http(url, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ subscribed_fields: "leadgen", access_token: pageToken }),
  });
  if (!res.ok) throw new Error(`Подписка страницы: ${res.status} ${await res.text()}`);
}
