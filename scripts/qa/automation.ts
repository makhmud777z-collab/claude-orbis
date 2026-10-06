/**
 * Проверка роботов и триггеров без интерфейса.
 *
 * Автоматика опасна тем, что выглядит рабочей: карточки нарисованы,
 * переключатели щёлкают — а задача не создалась. Поэтому здесь проверяется
 * не настройка, а последствия: появилась ли задача, уехала ли карточка,
 * что записано в журнал и где цепочка обрывается.
 *
 * Запуск: npx tsx scripts/qa/automation.ts
 */
import { actionSpec, DELAYS, delayLabel, ROBOT_ACTIONS, triggersFor, TRIGGER_EVENTS } from "../../src/lib/automation";
import * as db from "../../src/lib/store";
import type { Robot } from "../../src/lib/types";

let fail = 0;
const ok = (c: boolean, t: string, extra = "") => {
  if (!c) fail++;
  console.log(`  ${c ? "✓" : "✗"} ${t}${extra ? "  — " + extra : ""}`);
};

const TENANT = "t_seoulway";
const LEADS = "pl_sw_leads";
const DEALS = "pl_sw_main";
const OWNER = "u_aziz";

/** Заведомо будущий момент: им прогоняют очередь, не дожидаясь часа. */
const LATER = "2099-01-01T00:00:00";

/** Робот со всеми обязательными полями: тест задаёт только интересное. */
const robot = (patch: Partial<Robot>): Omit<Robot, "id" | "order"> => ({
  tenantId: TENANT,
  pipelineId: LEADS,
  stage: "new",
  action: "note",
  delayMinutes: 0,
  target: "owner",
  text: "",
  param: "",
  enabled: true,
  ...patch,
});

/** Свежий лид на первой стадии — отправная точка почти каждой проверки. */
function freshLead(phone: string) {
  const made = db.createLead({
    tenantId: TENANT, name: "Проверка роботов", phone, email: null,
    source: "walk_in", channelId: null, comment: "", ownerId: OWNER, branchId: "b_tas",
  });
  if (!made.ok) throw new Error("лид не создался: занят телефон " + phone);
  return made.lead;
}

function main() {
  console.log("КАТАЛОГ");
  ok(ROBOT_ACTIONS.length >= 6, "действий заведено", String(ROBOT_ACTIONS.length));
  ok(ROBOT_ACTIONS.every((a) => a.label.ru && a.label.uz), "у каждого действия обе подписи");
  ok(TRIGGER_EVENTS.every((e) => e.label.ru && e.label.uz), "у каждого события обе подписи");
  ok(actionSpec("move").param === "stage", "«перевести» просит стадию");
  ok(actionSpec("note").needsTarget === false, "записи в историю получатель не нужен");
  ok(!triggersFor("lead").some((e) => e.id === "converted"), "«лид стал сделкой» не предлагается в воронке лидов");
  ok(triggersFor("deal").some((e) => e.id === "comment"), "общее событие есть в обеих воронках");
  ok(DELAYS[0].minutes === 0, "первая задержка — «сразу»");
  ok(delayLabel(120).ru.includes("2"), "незнакомая задержка подписана часами", delayLabel(120).ru);

  console.log("\nДЕМО-НАБОР");
  ok(db.robotsOf(TENANT).length > 0, "у демо-агентства роботы заведены", String(db.robotsOf(TENANT).length));
  ok(db.robotsOf("t_agencyx").length === 0, "чужие роботы не видны", String(db.robotsOf("t_agencyx").length));
  ok(db.robotsOfStage(LEADS, "new").length >= 2, "на стадии «Новый» несколько роботов");

  console.log("\nЗАДАЧА ПРИ СОЗДАНИИ ЛИДА");
  const tasksBefore = db.allTasks(TENANT).length;
  const lead = freshLead("+998 90 777-01-01");
  const tasksAfter = db.allTasks(TENANT);
  ok(tasksAfter.length === tasksBefore + 1, "робот поставил задачу новому лиду", `${tasksBefore} → ${tasksAfter.length}`);
  const made = tasksAfter[tasksAfter.length - 1];
  ok(made.title === "Позвонить новому лиду", "текст задачи взят из робота", made.title);
  ok(made.assigneeId === OWNER, "задача ушла ответственному за карточку", made.assigneeId);
  ok(made.priority === "high", "важность из настройки робота", made.priority);

  console.log("\nОТЛОЖЕННЫЙ РОБОТ");
  // Второй робот стадии «Новый» ждёт час — сразу выполниться он не должен.
  const runs = db.robotRunsOf(TENANT);
  ok(!runs.some((r) => r.note.includes("висит в «Новых»")), "робот с задержкой не выстрелил сразу");
  ok(db.sweepRobots(TENANT) === 0, "созревших в очереди нет");

  const soon = db.saveRobot(robot({ stage: "qualification", action: "note", text: "Отложенная запись", delayMinutes: 15 }))!;
  db.moveCard("lead", lead.id, "qualification", OWNER, TENANT);
  ok(db.robotRunsOf(TENANT).every((r) => r.note !== "Отложенная запись"), "отложенный шаг ещё не сделан");

  // Подкручиваем робота на «сразу» и прогоняем очередь: запись должна лечь.
  db.saveRobot({ ...soon, delayMinutes: 0 });
  db.moveCard("lead", lead.id, "new", OWNER, TENANT);
  db.moveCard("lead", lead.id, "qualification", OWNER, TENANT);
  ok(db.robotRunsOf(TENANT).some((r) => r.note === "Отложенная запись"), "без задержки тот же шаг сработал");
  db.removeRobot(TENANT, soon.id);

  console.log("\nКАРТОЧКА УШЛА СО СТАДИИ");
  // Самое опасное место автоматики: робот дождался своего часа уже после
  // того, как карточку увели дальше. Выполнить его — соврать о состоянии.
  const late = db.saveRobot(robot({ stage: "in_progress", text: "Поздний шаг", delayMinutes: 15 }))!;
  const runner = freshLead("+998 90 777-01-02");
  db.moveCard("lead", runner.id, "in_progress", OWNER, TENANT);
  ok(db.sweepRobots(TENANT) === 0, "шаг ещё ждёт своего часа");

  db.moveCard("lead", runner.id, "qualification", OWNER, TENANT);
  ok(db.sweepRobots(TENANT, LATER) >= 1, "созревший шаг разобран очередью");
  const lateRun = db.robotRunsOf(TENANT).find((r) => r.robotId === late.id);
  ok(lateRun?.status === "skipped", "шаг пропущен: карточка уже уехала", String(lateRun?.note));

  // А если карточка на месте — тот же шаг обязан выполниться.
  const patient = freshLead("+998 90 777-01-07");
  db.moveCard("lead", patient.id, "in_progress", OWNER, TENANT);
  ok(db.sweepRobots(TENANT, LATER) >= 1, "второй шаг тоже созрел");
  const kept = db.robotRunsOf(TENANT).find((r) => r.robotId === late.id && r.entityId === patient.id);
  ok(kept?.status === "done", "шаг выполнен, раз карточка не уходила", String(kept?.status));
  db.removeRobot(TENANT, late.id);

  console.log("\nСМЕНА ОТВЕТСТВЕННОГО");
  const assign = db.saveRobot(robot({ stage: "in_progress", action: "assign", target: "u_kamila" }))!;
  const handed = freshLead("+998 90 777-01-03");
  db.moveCard("lead", handed.id, "in_progress", OWNER, TENANT);
  ok(db.leadById(handed.id)?.ownerId === "u_kamila", "робот передал карточку другому сотруднику", String(db.leadById(handed.id)?.ownerId));
  db.removeRobot(TENANT, assign.id);

  console.log("\nПЕРЕВОД НА СТАДИЮ И ЗАЩИТА ОТ ПЕТЛИ");
  const there = db.saveRobot(robot({ stage: "new", action: "move", param: "qualification" }))!;
  const back = db.saveRobot(robot({ stage: "qualification", action: "move", param: "new" }))!;
  const spun = freshLead("+998 90 777-01-04");
  const stage = db.leadById(spun.id)?.stage;
  ok(stage === "new" || stage === "qualification", "карточка встала, а не крутится", String(stage));
  const stopped = db.robotRunsOf(TENANT).some((r) => r.note.includes("слишком длинная"));
  ok(stopped, "петля переводов оборвана и записана в журнал");
  db.removeRobot(TENANT, there.id);
  db.removeRobot(TENANT, back.id);

  console.log("\nВЫКЛЮЧЕННЫЙ РОБОТ");
  const muted = db.saveRobot(robot({ stage: "junk", text: "Не должен сработать" }))!;
  db.toggleRobot(TENANT, muted.id);
  const ignored = freshLead("+998 90 777-01-05");
  db.moveCard("lead", ignored.id, "junk", OWNER, TENANT);
  ok(!db.robotRunsOf(TENANT).some((r) => r.robotId === muted.id), "выключенный робот не работает");
  db.toggleRobot(TENANT, muted.id);
  db.moveCard("lead", ignored.id, "new", OWNER, TENANT);
  db.moveCard("lead", ignored.id, "junk", OWNER, TENANT);
  ok(db.robotRunsOf(TENANT).some((r) => r.robotId === muted.id), "включённый обратно — работает");
  db.removeRobot(TENANT, muted.id);

  console.log("\nНЕКОМУ АДРЕСОВАТЬ");
  const orphan = db.saveRobot(robot({ stage: "junk", action: "notify", target: "u_nobody", text: "В пустоту" }))!;
  const nobody = freshLead("+998 90 777-01-06");
  db.moveCard("lead", nobody.id, "junk", OWNER, TENANT);
  const skipped = db.robotRunsOf(TENANT).find((r) => r.robotId === orphan.id);
  ok(skipped?.status === "skipped", "шаг пропущен, а не выполнен «хоть на кого-нибудь»", String(skipped?.note));
  db.removeRobot(TENANT, orphan.id);

  console.log("\nТРИГГЕРЫ");
  // Демо-триггер: заявка из рекламы Meta сразу уезжает в «Новый».
  const fromAds = db.createLead({
    tenantId: TENANT, name: "Из рекламы", phone: "+998 90 777-02-01", email: null,
    source: "facebook", channelId: null, comment: "", ownerId: OWNER, branchId: "b_tas",
  });
  ok(fromAds.ok, "лид из рекламы создан");

  const moved = db.saveTrigger({ tenantId: TENANT, pipelineId: LEADS, stage: "in_progress", event: "comment", enabled: true })!;
  const commented = freshLead("+998 90 777-02-02");
  db.fireTrigger("comment", "lead", commented.id, TENANT, OWNER);
  ok(db.leadById(commented.id)?.stage === "in_progress", "комментарий увёл карточку на свою стадию", String(db.leadById(commented.id)?.stage));
  ok(db.robotRunsOf(TENANT).some((r) => r.triggerId === moved.id), "срабатывание триггера записано в журнал");

  // Повтор того же события: карточка уже на месте, двигать нечего.
  const before = db.robotRunsOf(TENANT).filter((r) => r.triggerId === moved.id).length;
  db.fireTrigger("comment", "lead", commented.id, TENANT, OWNER);
  ok(db.robotRunsOf(TENANT).filter((r) => r.triggerId === moved.id).length === before,
    "повтор события на той же стадии ничего не делает");

  db.toggleTrigger(TENANT, moved.id);
  const quiet = freshLead("+998 90 777-02-03");
  db.fireTrigger("comment", "lead", quiet.id, TENANT, OWNER);
  ok(db.leadById(quiet.id)?.stage === "new", "выключенный триггер не двигает карточку");
  db.removeTrigger(TENANT, moved.id);

  console.log("\nОДНО СОБЫТИЕ — ОДНА СТАДИЯ");
  db.saveTrigger({ tenantId: TENANT, pipelineId: DEALS, stage: "consultation", event: "comment", enabled: true });
  db.saveTrigger({ tenantId: TENANT, pipelineId: DEALS, stage: "matching", event: "comment", enabled: true });
  const rival = db.triggersOfPipeline(DEALS).filter((x) => x.event === "comment");
  ok(rival.length === 1, "второй триггер на то же событие заменил первый", `осталось ${rival.length}`);
  ok(rival[0]?.stage === "matching", "побеждает заведённый последним", String(rival[0]?.stage));
  for (const x of db.triggersOfPipeline(DEALS)) db.removeTrigger(TENANT, x.id);

  console.log("\nУДАЛЕНИЕ ЧИСТИТ ОЧЕРЕДЬ");
  const doomed = db.saveRobot(robot({ stage: "junk", text: "Удалённый", delayMinutes: 1440 }))!;
  const victim = freshLead("+998 90 777-03-01");
  db.moveCard("lead", victim.id, "junk", OWNER, TENANT);
  db.removeRobot(TENANT, doomed.id);
  ok(db.sweepRobots(TENANT) === 0, "снятый робот не выстрелит из очереди");

  console.log("\nЧУЖОЕ АГЕНТСТВО");
  db.saveRobot(robot({ tenantId: "t_agencyx", pipelineId: "pl_ax_leads", text: "Чужой" }));
  ok(!db.robotsOf(TENANT).some((r) => r.text === "Чужой"), "робот другого агентства не попал в наш список");
  db.removeRobot(TENANT, "ничего-такого-нет");
  ok(db.robotsOf("t_agencyx").length === 1, "удаление по чужому арендатору не трогает запись");

  console.log(fail ? `\nПРОВАЛОВ: ${fail}` : "\nВСЁ ЧИСТО");
}

main();
process.exit(fail ? 1 : 0);
