/**
 * Проверка приёма лидов из Meta без самой Meta.
 * Забор лида подменяется, остальное настоящее: подпись, разбор события,
 * поиск агентства по странице, раскладка полей, запись в воронку.
 * Запуск: npx tsx scripts/qa/meta.ts
 */
/** Проверка пути лида без Meta: забор данных подменяем, остальное настоящее. */
import { applyMapping, guessMapping, importLead } from "../../src/lib/meta/import";
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

  console.log(fail ? `\nПРОВАЛОВ: ${fail}` : "\nВСЁ ЧИСТО");
}

main().then(() => process.exit(fail ? 1 : 0));
