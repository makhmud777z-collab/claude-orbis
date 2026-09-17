import { loc } from "../i18n";
import type { Department, Project, TaskTemplate, WorkSession } from "../types";

/** Структура компании: подразделения с руководителями. */
export const DEPARTMENTS: Department[] = [
  { id: "dep_sw_root", tenantId: "t_seoulway", name: loc("Seoul Way Education", "Seoul Way Education"), parentId: null, headId: "u_aziz" },
  { id: "dep_sw_sales", tenantId: "t_seoulway", name: loc("Отдел продаж", "Sotuv bo‘limi"), parentId: "dep_sw_root", headId: "u_dilnoza" },
  { id: "dep_sw_cases", tenantId: "t_seoulway", name: loc("Кураторы по Корее", "Koreya kuratorlari"), parentId: "dep_sw_root", headId: "u_nilufar" },
  { id: "dep_sw_docs", tenantId: "t_seoulway", name: loc("Документы и апостиль", "Hujjatlar va apostil"), parentId: "dep_sw_root", headId: "u_madina" },
  { id: "dep_sw_fin", tenantId: "t_seoulway", name: loc("Финансы", "Moliya"), parentId: "dep_sw_root", headId: "u_rustam" },
  { id: "dep_sw_sam", tenantId: "t_seoulway", name: loc("Филиал в Самарканде", "Samarqand filiali"), parentId: "dep_sw_root", headId: "u_shohruh" },
  { id: "dep_ax_root", tenantId: "t_agencyx", name: loc("Agency X", "Agency X"), parentId: null, headId: "u_x_director" },
  { id: "dep_ax_ops", tenantId: "t_agencyx", name: loc("Операционный отдел", "Operatsion bo‘lim"), parentId: "dep_ax_root", headId: "u_x_case" },
  { id: "dep_hb_root", tenantId: "t_hanbridge", name: loc("Hanbridge Consulting", "Hanbridge Consulting"), parentId: null, headId: "u_h_owner" },
];

/** В какое подразделение входит сотрудник. */
export const DEPARTMENT_OF: Record<string, string> = {
  u_aziz: "dep_sw_root", u_dilnoza: "dep_sw_sales", u_kamila: "dep_sw_sales",
  u_jasur: "dep_sw_sam", u_shohruh: "dep_sw_sam", u_nilufar: "dep_sw_cases",
  u_bekzod: "dep_sw_cases", u_madina: "dep_sw_docs", u_rustam: "dep_sw_fin",
  u_partner1: "dep_sw_sam", u_x_director: "dep_ax_root", u_x_case: "dep_ax_ops",
  u_x_sales: "dep_ax_ops", u_x_docs: "dep_ax_ops", u_h_owner: "dep_hb_root", u_h_case: "dep_hb_root",
};

export const PROJECTS: Project[] = [
  { id: "pr_001", tenantId: "t_seoulway", name: loc("Набор 2027 Весна", "2027 Bahor qabuli"), description: "Все студенты весеннего набора: сбор документов до 10 октября, подача до 15 ноября.", memberIds: ["u_nilufar", "u_bekzod", "u_madina", "u_shohruh"], leadId: "u_dilnoza", dueAt: "2026-11-15", status: "active", createdAt: "2026-06-01" },
  { id: "pr_002", tenantId: "t_seoulway", name: loc("Сверка каталога вузов", "Universitetlar katalogini tekshirish"), description: "Перевести 12 карточек из черновика в проверенные: сверить с admission guideline.", memberIds: ["u_nilufar", "u_dilnoza"], leadId: "u_dilnoza", dueAt: "2026-10-31", status: "active", createdAt: "2026-09-01" },
  { id: "pr_003", tenantId: "t_seoulway", name: loc("Открытие филиала в Бухаре", "Buxoroda filial ochish"), description: "Помещение, найм двух менеджеров, подключение к порталу.", memberIds: ["u_aziz", "u_dilnoza", "u_rustam"], leadId: "u_aziz", dueAt: "2027-02-01", status: "paused", createdAt: "2026-08-10" },
  { id: "pr_ax_001", tenantId: "t_agencyx", name: loc("Весенний набор", "Bahorgi qabul"), description: "Подготовка пакетов на весну 2027.", memberIds: ["u_x_case", "u_x_docs"], leadId: "u_x_director", dueAt: "2026-11-20", status: "active", createdAt: "2026-07-01" },
];

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: "tt_docs", tenantId: "t_seoulway",
    title: loc("Пакет документов для D-2", "D-2 uchun hujjatlar to‘plami"),
    description: loc("Полный чек-лист перед подачей в вуз.", "Universitetga topshirishdan oldingi to‘liq ro‘yxat."),
    checklist: [
      loc("Загранпаспорт — скан всех страниц", "Xorijiy pasport — barcha sahifalar"),
      loc("Аттестат с апостилем", "Apostilli attestat"),
      loc("Приложение с оценками с апостилем", "Apostilli baholar ilovasi"),
      loc("Справка из банка не старше 30 дней", "30 kundan oshmagan bank ma’lumotnomasi"),
      loc("Медицинская справка", "Tibbiy ma’lumotnoma"),
      loc("Фото 3.5×4.5 на белом фоне", "Oq fonda 3.5×4.5 rasm"),
    ],
    defaultAssigneeRole: "document_specialist",
  },
  {
    id: "tt_visa", tenantId: "t_seoulway",
    title: loc("Подача на визу", "Vizaga topshirish"),
    description: loc("Шаги от получения CoA до вылета.", "CoA olishdan jo‘nashgacha bo‘lgan qadamlar."),
    checklist: [
      loc("Получить CoA от вуза", "Universitetdan CoA olish"),
      loc("Записать на подачу в консульство", "Konsullikka navbat olish"),
      loc("Проверить пакет перед подачей", "Topshirishdan oldin tekshirish"),
      loc("Купить билет и оформить страховку", "Chipta va sug‘urta"),
    ],
    defaultAssigneeRole: "case_manager",
  },
  {
    id: "tt_first_call", tenantId: "t_seoulway",
    title: loc("Первый звонок лиду", "Lidga birinchi qo‘ng‘iroq"),
    description: loc("Скрипт квалификации обращения.", "Murojaatni malakalash skripti."),
    checklist: [
      loc("Уточнить уровень языка и TOPIK", "Til darajasi va TOPIK"),
      loc("Уточнить бюджет семьи на год", "Oilaning yillik byudjeti"),
      loc("Уточнить город и направление", "Shahar va yo‘nalish"),
      loc("Назначить консультацию", "Konsultatsiya belgilash"),
    ],
    defaultAssigneeRole: "sales_manager",
  },
];

/**
 * Рабочие дни: отметки «начать / завершить». Из них считается отчётность.
 * Открытая сессия — та, у которой нет endedAt.
 */
export const WORK_SESSIONS: WorkSession[] = [
  { id: "ws_01", tenantId: "t_seoulway", userId: "u_nilufar", date: "2026-09-16", startedAt: "2026-09-16T08:58:00", endedAt: null, breakMinutes: 0, onBreakSince: null },
  { id: "ws_02", tenantId: "t_seoulway", userId: "u_kamila", date: "2026-09-16", startedAt: "2026-09-16T09:12:00", endedAt: null, breakMinutes: 20, onBreakSince: null },
  { id: "ws_03", tenantId: "t_seoulway", userId: "u_madina", date: "2026-09-16", startedAt: "2026-09-16T08:45:00", endedAt: null, breakMinutes: 0, onBreakSince: null },
  { id: "ws_04", tenantId: "t_seoulway", userId: "u_nilufar", date: "2026-09-15", startedAt: "2026-09-15T09:02:00", endedAt: "2026-09-15T18:24:00", breakMinutes: 45, onBreakSince: null },
  { id: "ws_05", tenantId: "t_seoulway", userId: "u_kamila", date: "2026-09-15", startedAt: "2026-09-15T09:31:00", endedAt: "2026-09-15T18:05:00", breakMinutes: 60, onBreakSince: null },
  { id: "ws_06", tenantId: "t_seoulway", userId: "u_bekzod", date: "2026-09-15", startedAt: "2026-09-15T08:50:00", endedAt: "2026-09-15T20:47:00", breakMinutes: 40, onBreakSince: null },
  { id: "ws_07", tenantId: "t_seoulway", userId: "u_madina", date: "2026-09-15", startedAt: "2026-09-15T08:40:00", endedAt: "2026-09-15T17:30:00", breakMinutes: 30, onBreakSince: null },
  { id: "ws_08", tenantId: "t_seoulway", userId: "u_shohruh", date: "2026-09-15", startedAt: "2026-09-15T09:15:00", endedAt: "2026-09-15T18:02:00", breakMinutes: 50, onBreakSince: null },
  { id: "ws_09", tenantId: "t_seoulway", userId: "u_rustam", date: "2026-09-15", startedAt: "2026-09-15T09:40:00", endedAt: "2026-09-15T17:30:00", breakMinutes: 60, onBreakSince: null },
  { id: "ws_10", tenantId: "t_seoulway", userId: "u_nilufar", date: "2026-09-14", startedAt: "2026-09-14T08:55:00", endedAt: "2026-09-14T18:10:00", breakMinutes: 45, onBreakSince: null },
  { id: "ws_11", tenantId: "t_seoulway", userId: "u_kamila", date: "2026-09-14", startedAt: "2026-09-14T09:48:00", endedAt: "2026-09-14T18:00:00", breakMinutes: 55, onBreakSince: null },
  { id: "ws_12", tenantId: "t_seoulway", userId: "u_bekzod", date: "2026-09-14", startedAt: "2026-09-14T09:05:00", endedAt: "2026-09-14T19:30:00", breakMinutes: 35, onBreakSince: null },
];

export const departmentsOfTenant = (tenantId: string) => DEPARTMENTS.filter((d) => d.tenantId === tenantId);
export const projectsOfTenant = (tenantId: string) => PROJECTS.filter((p) => p.tenantId === tenantId);
export const templatesOfTenant = (tenantId: string) => TASK_TEMPLATES.filter((t) => t.tenantId === tenantId);
