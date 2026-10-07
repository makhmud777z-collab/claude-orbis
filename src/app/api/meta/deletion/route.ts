import { NextResponse } from "next/server";
import { parseSignedRequest } from "@/lib/meta/signed-request";
import { forgetFbUser } from "@/lib/store";
import { ROOT_DOMAIN } from "@/lib/tenants";

/**
 * «Удалите мои данные» — обратный вызов, который Meta требует от каждого
 * приложения, прежде чем выпустить его к живым людям.
 *
 * Meta присылает только идентификатор человека в рамках нашего приложения
 * и ждёт в ответ JSON с адресом проверки и кодом заявки. HTML вместо JSON
 * или ответ без любого из двух полей — отказ на проверке приложения.
 */

export const dynamic = "force-dynamic";

/**
 * Куда человек пойдёт проверять. Адрес на корневом домене платформы:
 * заявка не принадлежит ни одному агентству — она про человека.
 */
const statusBase = () =>
  process.env.META_STATUS_URL || `https://${ROOT_DOMAIN}/data-deletion`;

export async function POST(request: Request) {
  /*
   * Тело приходит формой, а не JSON. Берём сырой текст: разбирать его
   * как форму можно и так, а подпись считается по самой строке.
   */
  const raw = await request.text();
  const signed =
    new URLSearchParams(raw).get("signed_request") ??
    // Некоторые проверочные инструменты Meta шлют то же поле в адресе.
    new URL(request.url).searchParams.get("signed_request");

  const payload = parseSignedRequest(signed);
  // Без проверенной подписи любой желающий стирал бы чужие подключения.
  if (!payload?.user_id) {
    return NextResponse.json({ error: "bad signed_request" }, { status: 400 });
  }

  const record = forgetFbUser(String(payload.user_id), "deletion");

  return NextResponse.json({
    url: `${statusBase()}?code=${record.code}`,
    confirmation_code: record.code,
  });
}

/**
 * Meta иногда проверяет адрес обычным GET. Отвечаем по-человечески, а не
 * «метод не поддерживается»: проверяющий видит живой адрес.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    about: "Meta data deletion callback. Send a signed_request via POST.",
  });
}
