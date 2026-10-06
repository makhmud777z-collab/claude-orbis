/**
 * Проверка приёма лидов из Meta без самой Meta.
 * Забор лида подменяется, остальное настоящее: подпись, разбор события,
 * поиск агентства по странице, раскладка полей, запись в воронку.
 * Запуск: npx tsx scripts/qa/meta.ts
 */
/** Проверка пути лида без Meta: забор данных подменяем, остальное настоящее. */
import { applyMapping, guessMapping, importLead } from "../../src/lib/meta/import";
import { authUrl, exchangeCode, ownOrigin, signState, subscribePage, verifyState } from "../../src/lib/meta/oauth";
import { parseLeadgen, sign, signatureValid } from "../../src/lib/meta/webhook";
import * as db from "../../src/lib/store";

let fail = 0;
const ok = (c: boolean, t: string, extra = "") => {
  if (!c) fail++;
  console.log(`  ${c ? "✓" : "✗"} ${t}${extra ? "  — " + extra : ""}`);
};

async function main() {
  console.log("ПОДПИСЬ");
  const body = JSON.stringify({ object: "page", entry: [] });
  process.env.META_APP_SECRET = "s3cret";
  const s = sign(body, "s3cret");
  ok(s.startsWith("sha256="), "подпись в формате sha256=…");
  ok(!signatureValid(body, "sha256=deadbeef"), "чужая подпись отвергнута");
  ok(!signatureValid(body, null), "без заголовка отвергнуто");

  console.log("\nРАЗБОР СОБЫТИЯ");
  const payload = {
    object: "page",
    entry: [{
      id: "102938475610293", time: 1438292065,
      changes: [
        { field: "leadgen", value: { leadgen_id: "L-1", page_id: "102938475610293", form_id: "7001", adgroup_id: "A-9", created_time: 1438292065 } },
        { field: "feed", value: { item: "status" } },
      ],
    }],
  };
  const events = parseLeadgen(payload);
  ok(events.length === 1, "из двух изменений взято одно leadgen", `получено ${events.length}`);
  ok(events[0]?.leadgenId === "L-1" && events[0]?.pageId === "102938475610293", "номер лида и страница разобраны");
  ok(parseLeadgen({ object: "user", entry: [] }).length === 0, "чужой объект пропущен");

  console.log("\nРАСКЛАДКА ПОЛЕЙ");
  const fields = [
    { name: "full_name", values: ["Азиза Нурматова"] },
    { name: "phone_number", values: ["+998 90 000-00-77"] },
    { name: "email", values: ["aziza@example.uz"] },
    { name: "какой уровень образования?", values: ["Бакалавриат"] },
    { name: "utm_source", values: ["ig_story"] },
  ];
  const map = { full_name: "name", phone_number: "phone", email: "email", "какой уровень образования?": "comment" } as const;
  const draft = applyMapping(fields, map as never);
  ok(draft.name === "Азиза Нурматова", "имя разложено");
  ok(draft.phone === "+998 90 000-00-77", "телефон разложен");
  ok(draft.email === "aziza@example.uz", "почта разложена");
  ok(draft.comment.includes("Бакалавриат"), "назначенное поле ушло в комментарий");
  ok(draft.comment.includes("utm_source: ig_story"), "ненастроенное поле не потеряно");
  const guess = guessMapping(["full_name", "phone_number", "свой вопрос"]);
  ok(guess.full_name === "name" && guess.phone_number === "phone" && guess["свой вопрос"] === "", "догадка по известным именам");

  console.log("\nПУТЬ ЛИДА ЦЕЛИКОМ");
  const before = db.allLeads("t_seoulway").length;
  const load = async () => fields;
  const r1 = await importLead({ leadgenId: "L-1", pageId: "102938475610293", formId: "7001", adgroupId: null, createdAt: null }, load);
  ok(r1.status === "imported", "лид принят", r1.note);
  ok(r1.tenantId === "t_seoulway", "попал в нужное агентство по странице", String(r1.tenantId));
  const after = db.allLeads("t_seoulway").length;
  ok(after === before + 1, "в воронке стало на один лид больше", `${before} → ${after}`);
  const lead = db.allLeads("t_seoulway").find((l) => l.id === r1.leadId);
  ok(lead?.source === "facebook" && lead?.channelId === "ch_sw_ig", "источник и канал проставлены");
  ok(lead?.ownerId === "u_kamila", "ответственный из раскладки формы", String(lead?.ownerId));

  console.log("\nЗНАКОМЫЙ ТЕЛЕФОН");
  const known = [
    { name: "full_name", values: ["Азиза Нурматова"] },
    { name: "phone_number", values: ["+998 90 111-22-33"] },
  ];
  const n0 = db.allLeads("t_seoulway").length;
  const rd = await importLead({ leadgenId: "L-7", pageId: "102938475610293", formId: "7001", adgroupId: null, createdAt: null },
    async () => known);
  ok(rd.status === "duplicate", "телефон уже в базе — лид не задваивается", rd.note.slice(0, 44));
  ok(db.allLeads("t_seoulway").length === n0, "в воронке ничего не прибавилось");

  console.log("\nЧУЖОЕ И ПОВТОРЫ");
  const r2 = await importLead({ leadgenId: "L-2", pageId: "000000000", formId: "7001", adgroupId: null, createdAt: null }, load);
  ok(r2.status === "unknown_page" && r2.tenantId === null, "неизвестная страница не падает и ни к кому не липнет");

  db.recordMetaEvent({ tenantId: "t_seoulway", leadgenId: "L-9", pageId: "102938475610293", formId: "7001", status: "imported", note: "", leadId: "l_x" });
  const r3 = await importLead({ leadgenId: "L-9", pageId: "102938475610293", formId: "7001", adgroupId: null, createdAt: null }, load);
  ok(r3.status === "duplicate", "повтор того же лида не создаёт второй");

  const r4 = await importLead({ leadgenId: "L-3", pageId: "102938475610293", formId: "7001", adgroupId: null, createdAt: null },
    async () => { throw new Error("Graph API 400"); });
  ok(r4.status === "failed" && r4.note.includes("400"), "ошибка Graph API записана, а не проглочена");

  const r5 = await importLead({ leadgenId: "L-4", pageId: "102938475610293", formId: "9999", adgroupId: null, createdAt: null },
    async () => [{ name: "любимый цвет", values: ["синий"] }]);
  ok(r5.status === "no_mapping", "форма без телефона и почты не создаёт пустой лид", r5.note.slice(0, 48));
  ok(Boolean(db.metaFormBy("102938475610293", "9999")), "новая форма заведена для настройки агентством");

  console.log("\nПОДКЛЮЧЕНИЕ СТРАНИЦЫ: МЕТКА ВОЗВРАТА");
  const home = "https://seoulway.orbisystem.us";
  const token = signState("t_seoulway", "u_aziz", home);
  const parsed = verifyState(token);
  ok(parsed?.tenantId === "t_seoulway", "арендатор вернулся из метки", String(parsed?.tenantId));
  ok(parsed?.userId === "u_aziz" && parsed?.origin === home, "сотрудник и адрес возврата сохранены");
  ok(verifyState(token.replace(/.$/, "x")) === null, "подделанная подпись метки отвергнута");
  ok(verifyState("мусор") === null && verifyState(null) === null, "мусор вместо метки отвергнут");

  // Два подключения подряд не должны дать одинаковую метку: иначе её можно
  // переиспользовать.
  ok(signState("t_seoulway", "u_aziz", home) !== token, "метка каждый раз новая");

  // Адрес возврата наш, но его подставляет тот, кто начал вход: подпись
  // Orbis не должна превратиться в переадресатор на чужой сайт.
  ok(ownOrigin(home) && ownOrigin("http://localhost:3000"), "свои адреса приняты");
  ok(ownOrigin("http://seoulway.localhost:3000"), "поддомен агентства в разработке принят");
  ok(ownOrigin("https://crm.agencyx.uz"), "собственный домен агентства принят");
  ok(!ownOrigin("https://evil.example.com"), "чужой адрес отвергнут");
  ok(!ownOrigin("https://orbisystem.us.evil.com"), "похожий чужой адрес отвергнут");
  ok(verifyState(signState("t_x", "u_x", "https://evil.example.com")) === null,
    "метка с чужим адресом не проходит проверку");

  console.log("\nПОДКЛЮЧЕНИЕ СТРАНИЦЫ: ОБМЕН КОДА");
  const seen: string[] = [];
  const graph: typeof fetch = async (input) => {
    const url = String(input);
    seen.push(url.split("?")[0].replace("https://graph.facebook.com/v21.0", ""));
    if (url.includes("fb_exchange_token")) return Response.json({ access_token: "LONG" });
    if (url.includes("/oauth/access_token")) return Response.json({ access_token: "SHORT" });
    if (url.includes("/me/accounts")) {
      ok(url.includes("access_token=LONG"), "страницы запрошены долгим токеном");
      return Response.json({
        data: [
          { id: "111", name: "Seoul Way", access_token: "PAGE-1", instagram_business_account: { username: "seoulway.uz" } },
          { id: "222", name: "Seoul Way Korea", access_token: "PAGE-2" },
        ],
      });
    }
    return new Response("not found", { status: 404 });
  };

  const found = await exchangeCode("CODE", "https://orbisystem.us/api/meta/connect", graph);
  ok(found.length === 2, "список страниц разобран", `получено ${found.length}`);
  ok(found[0]?.pageId === "111" && found[0]?.token === "PAGE-1", "токен страницы, а не человека");
  ok(found[0]?.igHandle === "@seoulway.uz", "Instagram страницы подхвачен", String(found[0]?.igHandle));
  ok(found[1]?.igHandle === null, "страница без Instagram не ломает разбор");
  ok(seen.filter((u) => u === "/oauth/access_token").length === 2,
    "короткий токен обменян на долгий, а не использован как есть");

  const broke: typeof fetch = async () => new Response("Invalid code", { status: 400 });
  let threw = "";
  await exchangeCode("BAD", "https://orbisystem.us/api/meta/connect", broke).catch((e) => {
    threw = String(e);
  });
  ok(threw.includes("400"), "отказ Facebook не проглочен", threw.slice(0, 48));

  console.log("\nПОДКЛЮЧЕНИЕ СТРАНИЦЫ: ПОДПИСКА НА ЛИДЫ");
  const calls: { url: string; body: string }[] = [];
  await subscribePage("111", "PAGE-1", async (input, init) => {
    calls.push({ url: String(input), body: String(init?.body) });
    return Response.json({ success: true });
  });
  const sub = calls[0];
  ok(Boolean(sub) && sub.url.endsWith("/111/subscribed_apps"), "подписка ушла на страницу");
  ok(sub.body.includes("subscribed_fields=leadgen"), "подписка именно на лиды", sub.body.replace("PAGE-1", "…"));
  ok(sub.body.includes("access_token=PAGE-1"), "подписка токеном страницы");

  let subFailed = "";
  await subscribePage("111", "PAGE-1", async () => new Response("no permission", { status: 403 })).catch(
    (e) => { subFailed = String(e); },
  );
  ok(subFailed.includes("403"), "отказ подписки виден вызывающему", subFailed.slice(0, 48));

  console.log("\nПОДКЛЮЧЕНИЕ СТРАНИЦЫ: ВЫБОР");
  db.putMetaPending({ tenantId: "t_seoulway", userId: "u_aziz", at: new Date().toISOString(), pages: found });
  ok(db.metaPendingOf("t_seoulway")?.pages.length === 2, "список ждёт выбора");
  ok(db.metaPendingOf("t_agencyx") === undefined, "список не видно другому агентству");

  db.dropMetaPendingPage("t_seoulway", "111");
  ok(db.metaPendingOf("t_seoulway")?.pages.length === 1, "выбранная страница ушла из списка");
  db.dropMetaPendingPage("t_seoulway", "222");
  ok(db.metaPendingOf("t_seoulway") === undefined, "пустой список не остаётся висеть");

  // Адрес входа: без него человек не попадёт в Facebook, а при опечатке в
  // правах Meta молча не даст забирать лиды.
  const entry = new URL(authUrl("https://orbisystem.us/api/meta/connect", token));
  ok(entry.searchParams.get("state") === token, "метка доехала до адреса входа");
  ok(entry.searchParams.get("redirect_uri") === "https://orbisystem.us/api/meta/connect", "адрес возврата передан");
  ok((entry.searchParams.get("scope") ?? "").includes("leads_retrieval"), "право на забор лидов запрошено");

  console.log(fail ? `\nПРОВАЛОВ: ${fail}` : "\nВСЁ ЧИСТО");
}

main().then(() => process.exit(fail ? 1 : 0));
