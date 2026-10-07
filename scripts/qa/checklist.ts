/**
 * Проверка чек-листа документов агентства.
 *
 * Список связан с уже собранными документами только названием — другого
 * ключа нет. Поэтому проверяется не «список правится», а последствия:
 * не отрывается ли досье при переименовании и не заводятся ли два пункта
 * с одним именем, которые куратор не различит.
 *
 * Запуск: npx tsx scripts/qa/checklist.ts
 */
import { checklistKey } from "../../src/lib/labels";
import * as db from "../../src/lib/store";
import { loc } from "../../src/lib/i18n";

let fail = 0;
const ok = (c: boolean, t: string, extra = "") => {
  if (!c) fail++;
  console.log(`  ${c ? "✓" : "✗"} ${t}${extra ? "  — " + extra : ""}`);
};

const TENANT = "t_seoulway";

function main() {
  console.log("СТАРТОВЫЙ НАБОР");
  const start = db.checklistOf(TENANT);
  ok(start.length >= 10, "шаблон отдаётся, пока агентство список не правило", String(start.length));
  ok(start.every((x, i) => i === 0 || x.order >= start[i - 1].order), "порядок возрастает");
  ok(db.checklistOf("t_agencyx").length === start.length, "другое агентство получает тот же шаблон");

  console.log("\nДОБАВЛЕНИЕ");
  const added = db.addChecklistItem(TENANT, loc("Справка о доходах", "Daromad ma’lumotnomasi"), true);
  ok(Boolean(added), "свой пункт добавлен");
  ok(db.checklistOf(TENANT).length === start.length + 1, "список вырос на один");
  ok(db.checklistOf(TENANT).at(-1)?.id === added?.id, "новый пункт встал последним");
  ok(db.checklistOf("t_agencyx").length === start.length, "у другого агентства не появился");

  const twice = db.addChecklistItem(TENANT, loc("Справка о доходах", "Другое название"), false);
  ok(twice === undefined, "второй пункт с тем же названием не заводится");

  console.log("\nПЕРЕИМЕНОВАНИЕ НЕ ОТРЫВАЕТ ДОСЬЕ");
  // Документы связаны с чек-листом названием: после переименования они
  // обязаны остаться на своём пункте, иначе запрос заведёт второй такой же.
  const before = db.documentsOfTenant(TENANT).filter((d) => checklistKey(d.kind) === "Загранпаспорт").length;
  ok(before > 0, "в досье есть документы по этому пункту", String(before));

  const passport = db.checklistOf(TENANT).find((x) => checklistKey(x.kind) === "Загранпаспорт")!;
  const renamed = db.updateChecklistItem(TENANT, passport.id, {
    kind: loc("Паспорт для выезда", "Chet el pasporti"),
  });
  ok(renamed.ok, "переименование прошло");
  const after = db.documentsOfTenant(TENANT).filter((d) => checklistKey(d.kind) === "Паспорт для выезда").length;
  ok(after === before, "все документы переехали на новое название", `${before} → ${after}`);
  ok(db.documentsOfTenant(TENANT).every((d) => checklistKey(d.kind) !== "Загранпаспорт"),
    "под старым названием не осталось ничего");

  const clash = db.updateChecklistItem(TENANT, passport.id, { kind: loc("Справка о доходах", "x") });
  ok(!clash.ok && clash.reason === "duplicate", "переименование в занятое имя отклонено");
  ok(checklistKey(db.checklistOf(TENANT).find((x) => x.id === passport.id)!.kind) === "Паспорт для выезда",
    "и название при этом не испортилось");

  console.log("\nАПОСТИЛЬ");
  db.updateChecklistItem(TENANT, passport.id, { needsApostille: true });
  ok(db.checklistOf(TENANT).find((x) => x.id === passport.id)?.needsApostille === true, "апостиль включается");
  db.updateChecklistItem(TENANT, passport.id, { needsApostille: false });
  ok(db.checklistOf(TENANT).find((x) => x.id === passport.id)?.needsApostille === false, "и выключается");

  console.log("\nПОРЯДОК");
  const list = db.checklistOf(TENANT);
  const second = list[1];
  db.moveChecklistItem(TENANT, second.id, -1);
  ok(db.checklistOf(TENANT)[0].id === second.id, "пункт поднялся");
  db.moveChecklistItem(TENANT, second.id, 1);
  ok(db.checklistOf(TENANT)[1].id === second.id, "и опустился обратно");

  db.moveChecklistItem(TENANT, db.checklistOf(TENANT)[0].id, -1);
  ok(db.checklistOf(TENANT).length === list.length, "выше первого не уезжает и список цел");
  db.moveChecklistItem(TENANT, db.checklistOf(TENANT).at(-1)!.id, 1);
  ok(db.checklistOf(TENANT).length === list.length, "ниже последнего тоже");

  const orders = db.checklistOf(TENANT).map((x) => x.order);
  ok(new Set(orders).size === orders.length, "порядковые номера не задваиваются");

  console.log("\nУДАЛЕНИЕ");
  const n = db.checklistOf(TENANT).length;
  db.removeChecklistItem(TENANT, added!.id);
  ok(db.checklistOf(TENANT).length === n - 1, "пункт удалён");
  db.removeChecklistItem(TENANT, "ck_несуществующий");
  ok(db.checklistOf(TENANT).length === n - 1, "удаление несуществующего ничего не портит");

  console.log(fail ? `\nПРОВАЛОВ: ${fail}` : "\nВСЁ ЧИСТО");
}

main();
process.exit(fail ? 1 : 0);
