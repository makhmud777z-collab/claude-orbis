import type { ActivityEvent } from "../types";

export const ACTIVITY: ActivityEvent[] = [
  { id: "e_01", tenantId: "t_seoulway", actorId: "u_nilufar", verb: "перевёл заявку", object: "Шахзод Мирзаев → Получен offer", at: "2026-09-16T09:05:00", kind: "stage" },
  { id: "e_02", tenantId: "t_seoulway", actorId: "u_madina", verb: "проверила документ", object: "Аттестат — Малика Ҳакимова", at: "2026-09-16T08:47:00", kind: "document" },
  { id: "e_03", tenantId: "t_seoulway", actorId: "u_kamila", verb: "добавила студента", object: "Феруза Шарипова", at: "2026-09-16T08:22:00", kind: "student" },
  { id: "e_04", tenantId: "t_seoulway", actorId: "u_rustam", verb: "принял оплату", object: "$1 250 — Азиза Нурматова", at: "2026-09-15T18:10:00", kind: "payment" },
  { id: "e_05", tenantId: "t_seoulway", actorId: "u_bekzod", verb: "перевёл заявку", object: "Дилшод Каримов → Виза D-2", at: "2026-09-15T16:31:00", kind: "stage" },
  { id: "e_06", tenantId: "t_seoulway", actorId: "u_dilnoza", verb: "поставила задачу", object: "Обновить справку из банка — Нигора", at: "2026-09-15T15:02:00", kind: "task" },
  { id: "e_07", tenantId: "t_seoulway", actorId: "u_shohruh", verb: "загрузил документ", object: "Справка о родстве — Зарина", at: "2026-09-15T12:44:00", kind: "document" },
  { id: "e_08", tenantId: "t_seoulway", actorId: "u_jasur", verb: "перевёл заявку", object: "Зарина Тошпулатова → Подано в вуз", at: "2026-09-14T17:20:00", kind: "stage" },
  { id: "e_09", tenantId: "t_seoulway", actorId: "u_nilufar", verb: "отклонила документ", object: "Справка из банка — Нигора Ахмедова", at: "2026-09-14T11:05:00", kind: "document" },
  { id: "e_10", tenantId: "t_seoulway", actorId: "u_aziz", verb: "пригласил сотрудника", object: "Улугбек Ниязов — агент-партнёр", at: "2026-09-10T13:00:00", kind: "student" },
];

export function activityOfTenant(tenantId: string) {
  return ACTIVITY.filter((e) => e.tenantId === tenantId);
}
