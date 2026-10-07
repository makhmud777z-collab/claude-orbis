import { NextResponse } from "next/server";
import { parseSignedRequest } from "@/lib/meta/signed-request";
import { forgetFbUser } from "@/lib/store";

/**
 * «Человек убрал приложение» — второй обязательный обратный вызов Meta.
 *
 * От удаления отличается смыслом, а не действием: согласия больше нет,
 * значит токены страниц, которые на нём держались, пора снять. Разделены
 * они потому, что в журнале это разные события, и агентству важно видеть,
 * что именно произошло.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const signed =
    new URLSearchParams(raw).get("signed_request") ??
    new URL(request.url).searchParams.get("signed_request");

  const payload = parseSignedRequest(signed);
  if (!payload?.user_id) {
    return NextResponse.json({ error: "bad signed_request" }, { status: 400 });
  }

  const record = forgetFbUser(String(payload.user_id), "deauthorize");
  // Meta не читает тело этого ответа — важен сам код 200.
  return NextResponse.json({ ok: true, removed: record.removed });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    about: "Meta deauthorize callback. Send a signed_request via POST.",
  });
}
