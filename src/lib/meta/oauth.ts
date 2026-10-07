import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { ROOT_DOMAIN, TENANTS } from "../tenants";
import type { MetaPendingPage } from "../types";

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
  /**
   * Куда вернуть человека после возврата из Facebook.
   *
   * Адрес возврата у приложения Meta один на всю платформу, а агентства
   * живут на своих поддоменах: без этого поля возврат высадил бы человека
   * на корневом домене, где он никто.
   */
  origin: string;
  nonce: string;
}

export function signState(tenantId: string, userId: string, origin: string): string {
  const nonce = randomBytes(8).toString("base64url");
  const body = Buffer.from(JSON.stringify({ tenantId, userId, origin, nonce })).toString(
    "base64url",
  );
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
    if (!parsed.tenantId || !parsed.userId) return null;
    // Подпись наша, но сам адрес пришёл из заголовка Host запроса, который
    // подставляет тот, кто начал вход. Поэтому возврат — только на свои
    // хосты: иначе это открытый переадресатор с нашей подписью.
    return ownOrigin(parsed.origin) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Свой ли это адрес. Свои — поддомены платформы, собственные домены
 * агентств и localhost для разработки.
 */
export function ownOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  const root = ROOT_DOMAIN.split(":")[0];
  if (host === root || host.endsWith(`.${root}`)) return true;
  // В разработке агентство живёт на seoulway.localhost — тот же поддомен,
  // только база другая, см. slugFromHost.
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost")) return true;
  return TENANTS.some((t) => t.customDomain === host);
}

/**
 * Адрес возврата. Он обязан совпасть до символа с тем, что вписан в
 * настройках приложения Meta, поэтому берётся не из запроса, а задаётся
 * один раз на всю платформу.
 */
export const redirectUri = () =>
  process.env.META_REDIRECT_URI || `https://${ROOT_DOMAIN}/api/meta/connect`;

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

/** Страница из ответа Facebook: тот же вид, в каком её ждёт экран выбора. */
export type PageCandidate = MetaPendingPage;

/**
 * Обмен кода на токены и список страниц.
 *
 * Токены страниц, выданные по долгоживущему токену человека, живут долго
 * сами — отдельно продлевать их не нужно, но они умирают, если человек
 * сменил пароль или забрал у приложения права.
 */
export interface ExchangeResult {
  /**
   * Кто вошёл — идентификатор человека в рамках нашего приложения.
   * Нужен не для красоты: по нему Meta потом просит удалить данные, и без
   * него заявку «удалите мои данные» не с чем сопоставить.
   */
  fbUserId: string | null;
  pages: PageCandidate[];
}

export async function exchangeCode(
  code: string,
  redirectUri: string,
  http: typeof fetch = fetch,
): Promise<ExchangeResult> {
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

  const token = long ?? short.access_token;

  // Кто именно вошёл. Отдельным запросом: /me/accounts отдаёт страницы,
  // но не человека, который ими управляет.
  let fbUserId: string | null = null;
  try {
    const meRes = await http(`${GRAPH}/me?${new URLSearchParams({ fields: "id", access_token: token })}`, {
      cache: "no-store",
    });
    if (meRes.ok) fbUserId = ((await meRes.json()) as { id?: string }).id ?? null;
  } catch {
    // Не узнали — не повод рушить подключение: страницы важнее. Заявку на
    // удаление тогда разберут вручную по журналу.
    fbUserId = null;
  }

  const pagesUrl = `${GRAPH}/me/accounts?${new URLSearchParams({
    fields: "id,name,access_token,instagram_business_account{username}",
    access_token: token,
  })}`;
  const pagesRes = await http(pagesUrl, { cache: "no-store" });
  if (!pagesRes.ok) throw new Error(`Список страниц: ${pagesRes.status} ${await pagesRes.text()}`);

  const json = (await pagesRes.json()) as {
    data?: {
      id: string; name: string; access_token: string;
      instagram_business_account?: { username?: string };
    }[];
  };

  const pages = (json.data ?? []).map((p) => ({
    pageId: p.id,
    name: p.name,
    token: p.access_token,
    igHandle: p.instagram_business_account?.username
      ? `@${p.instagram_business_account.username}`
      : null,
  }));

  return { fbUserId, pages };
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
