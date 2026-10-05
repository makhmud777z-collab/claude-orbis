import { recordMetaEvent } from "@/lib/store";
import { importLead } from "@/lib/meta/import";
import { fetchLead, parseLeadgen, signatureValid, verifyChallenge } from "@/lib/meta/webhook";

/**
 * Единственный адрес, в который Meta шлёт лиды со всех агентств сразу.
 *
 * Арендатора здесь нет и быть не может: запрос приходит от Meta, а не от
 * сотрудника, без куки и с корневого домена. Агентство определяется по
 * странице внутри события — см. metaPageByPageId.
 */

// Вебхук нельзя кэшировать и нельзя собирать заранее: это живой приём.
export const dynamic = "force-dynamic";

/** Подтверждение адреса при подключении вебхука в кабинете Meta. */
export async function GET(request: Request) {
  const challenge = verifyChallenge(new URL(request.url).searchParams);
  if (!challenge) return new Response("forbidden", { status: 403 });
  return new Response(challenge, {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

export async function POST(request: Request) {
  // Сырое тело, а не разобранный JSON: подпись считается по тем самым
  // байтам, что прислала Meta. Пересобранный JSON её не повторит.
  const raw = await request.text();

  if (!signatureValid(raw, request.headers.get("x-hub-signature-256"))) {
    return new Response("bad signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    // Отвечаем 200: на кривое тело повторы бессмысленны, а Meta будет
    // слать его, пока не получит успех.
    return Response.json({ ok: false, reason: "bad json" });
  }

  const events = parseLeadgen(body);

  /*
   * Meta ждёт ответ быстро и считает задержку отказом: не успели — пришлёт
   * то же событие ещё раз. Поэтому разбираем приход сразу, но коротко.
   * Когда появится очередь, сюда встанет постановка задачи, а разбор
   * уедет в обработчик.
   */
  for (const event of events) {
    const result = await importLead(event, fetchLead);
    recordMetaEvent({
      tenantId: result.tenantId,
      leadgenId: event.leadgenId,
      pageId: event.pageId,
      formId: event.formId,
      status: result.status,
      note: result.note,
      leadId: result.leadId,
    });
  }

  // Всегда 200: иначе Meta будет повторять событие, которое мы уже
  // разобрали и записали в журнал.
  return Response.json({ ok: true, received: events.length });
}
