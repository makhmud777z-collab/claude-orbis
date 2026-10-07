import { NextResponse } from "next/server";
import { hydrate } from "@/lib/db";
import { USERS, usersOfTenant } from "@/lib/data/users";
import {
  authUrl, exchangeCode, metaConfigured, ownOrigin, redirectUri, signState, verifyState,
  type PageCandidate,
} from "@/lib/meta/oauth";
import { allow } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { putMetaPending } from "@/lib/store";
import { TENANTS } from "@/lib/tenants";

/**
 * Подключение страницы Facebook: вход и возврат одним адресом.
 *
 * Без параметров — это начало: отправляем человека в Facebook. С state —
 * это возврат, и арендатора здесь уже не узнать по Host: адрес возврата у
 * приложения Meta один на всю платформу, а агентства живут на поддоменах.
 * Поэтому арендатор, сотрудник и адрес возврата едут в подписанном state.
 */

export const dynamic = "force-dynamic";

/**
 * Куда вернуть человека с результатом. 303 — чтобы браузер пошёл обычным
 * GET, а не повторил запрос к маршруту.
 */
const back = (origin: string, params: Record<string, string>) =>
  NextResponse.redirect(`${origin}/admin/meta?${new URLSearchParams(params)}`, 303);

/**
 * Откуда пришёл запрос. Заголовки прокси важнее адреса в request.url: за
 * прокси внутри контейнера протокол http, а человек ходит по https.
 */
function originOf(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Демо-список страниц, когда приложение Meta не настроено на этом сервере.
 *
 * Выбор страницы — отдельный экран со своими правилами, и проверять его
 * нечем, пока Meta не пропустила приложение через проверку. Экран прямо
 * говорит, что список ненастоящий; токены здесь пустые, и подписка на
 * вебхук с ними не делается — см. connectMetaPageAction.
 */
function demoPages(tenantName: string): PageCandidate[] {
  return [
    { pageId: "900000000000001", name: tenantName, token: "", igHandle: null },
    { pageId: "900000000000002", name: `${tenantName} — Korea`, token: "", igHandle: "@demo.korea" },
  ];
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const state = params.get("state");

  /* ── возврат из Facebook ───────────────────────────────────── */
  if (state) {
    const payload = verifyState(state);
    // Чужой или подделанный state: вести по нему некуда, даже с ошибкой.
    if (!payload) return new Response("bad state", { status: 400 });

    // Человек нажал «Отмена» в окне Facebook — это не сбой, а решение.
    if (params.get("error")) return back(payload.origin, { connect: "denied" });

    const code = params.get("code");
    if (!code) return back(payload.origin, { connect: "error" });

    hydrate(TENANTS, USERS);
    const user = usersOfTenant(payload.tenantId).find((u) => u.id === payload.userId);
    // Права проверяются и здесь: между началом и возвратом сотрудника могли
    // перевести на другую роль или уволить.
    if (!user || !allow(payload.tenantId, user.role, "admin", "edit")) {
      return back(payload.origin, { connect: "forbidden" });
    }

    let fbUserId: string | null = null;
    let pages: PageCandidate[];
    try {
      const result = await exchangeCode(code, redirectUri());
      fbUserId = result.fbUserId;
      pages = result.pages;
    } catch (error) {
      // Что именно сказал Facebook, человеку не поможет: экран предложит
      // повторить вход, подробности остаются в логе сервера.
      console.error("Meta connect:", error);
      return back(payload.origin, { connect: "error" });
    }

    if (!pages.length) return back(payload.origin, { connect: "empty" });

    putMetaPending({
      tenantId: payload.tenantId,
      userId: payload.userId,
      fbUserId,
      at: new Date().toISOString(),
      pages,
    });
    return back(payload.origin, { connect: "pick" });
  }

  /* ── начало: отправляем в Facebook ─────────────────────────── */
  const session = await getSession();
  if (!allow(session.tenant.id, session.role, "admin", "edit")) {
    return new Response("forbidden", { status: 403 });
  }

  const origin = originOf(request);
  // Адрес возврата едет в подписанном state, поэтому он обязан быть нашим:
  // иначе подписью Orbis можно было бы увести человека на чужой сайт.
  if (!ownOrigin(origin)) return new Response("bad host", { status: 400 });

  if (!metaConfigured()) {
    putMetaPending({
      tenantId: session.tenant.id,
      userId: session.user.id,
      at: new Date().toISOString(),
      pages: demoPages(session.tenant.name),
      demo: true,
    });
    return back(origin, { connect: "pick" });
  }

  return NextResponse.redirect(
    authUrl(redirectUri(), signState(session.tenant.id, session.user.id, origin)),
    303,
  );
}
