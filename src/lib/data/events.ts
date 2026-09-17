import type { CalendarEvent } from "../types";

/**
 * События календаря: встречи, звонки и интервью, которые сотрудник ставит
 * себе сам. Дедлайны и задачи в календарь приходят из своих разделов —
 * дублировать их здесь значит завести вторую правду о сроках.
 */
export const EVENTS: CalendarEvent[] = [
  { id: "ev_001", tenantId: "t_seoulway", title: "Консультация с семьёй Нурматовых", kind: "meeting", date: "2026-09-17", startTime: "10:00", endTime: "11:00", ownerId: "u_nilufar", relation: { type: "student", id: "s_001" }, note: "Обсудить апостиль и сроки подачи в Hallim." },
  { id: "ev_002", tenantId: "t_seoulway", title: "Звонок Севаре по языковым курсам", kind: "call", date: "2026-09-17", startTime: "12:30", endTime: "13:00", ownerId: "u_kamila", relation: null, note: "Уточнить бюджет и город." },
  { id: "ev_003", tenantId: "t_seoulway", title: "Zoom-интервью с Hallim", kind: "interview", date: "2026-09-18", startTime: "09:00", endTime: "10:00", ownerId: "u_shohruh", relation: { type: "deal", id: "d_004" }, note: "Малика Ҳакимова, фармация." },
  { id: "ev_004", tenantId: "t_seoulway", title: "Планёрка отдела продаж", kind: "meeting", date: "2026-09-17", startTime: "09:00", endTime: "09:30", ownerId: "u_dilnoza", relation: null, note: "Разбор лидов недели." },
  { id: "ev_005", tenantId: "t_seoulway", title: "Приём документов, Мадина", kind: "meeting", date: "2026-09-19", startTime: "14:00", endTime: "16:00", ownerId: "u_madina", relation: null, note: "Партия переводов из бюро." },
  { id: "ev_006", tenantId: "t_seoulway", title: "Встреча с родителями Феруза", kind: "meeting", date: "2026-09-22", startTime: "15:00", endTime: "16:00", ownerId: "u_kamila", relation: { type: "student", id: "s_008" }, note: "Стоимость проживания в Сеуле." },
  { id: "ev_007", tenantId: "t_seoulway", title: "Созвон с Baekdu по депозиту", kind: "call", date: "2026-09-24", startTime: "11:00", endTime: "11:30", ownerId: "u_nilufar", relation: { type: "deal", id: "d_014" }, note: "Подтвердить реквизиты." },
  { id: "ev_008", tenantId: "t_agencyx", title: "Консультация с Айданой", kind: "meeting", date: "2026-09-18", startTime: "11:00", endTime: "12:00", ownerId: "u_x_case", relation: { type: "student", id: "sx_001" }, note: "Портфолио для Dosan." },
  { id: "ev_009", tenantId: "t_hanbridge", title: "Первая встреча с Бегимай", kind: "meeting", date: "2026-09-18", startTime: "10:30", endTime: "11:30", ownerId: "u_h_case", relation: { type: "student", id: "sh_001" }, note: "" },
];

export const eventsOfTenant = (tenantId: string) => EVENTS.filter((e) => e.tenantId === tenantId);
