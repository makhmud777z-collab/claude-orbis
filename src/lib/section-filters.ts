import { channelsOf } from "./store";
import { userById } from "./data/users";
import { DEPARTMENTS } from "./data/org";
import { UNIVERSITIES } from "./data/universities";
import { STALE_DAYS } from "./format";
import { loc, type Translate } from "./i18n";
import {
  CITY_LABEL, DEGREE_LABEL, DEADLINE_KIND, DOCUMENT_STATUS, FIELD_LABEL, INTAKE_LABEL,
  OWNERSHIP_LABEL, PRIORITY_LABEL, ref, SOURCE_LABEL, STUDENT_STATUS, TASK_STATUS,
} from "./labels";
import { ROLES } from "./rbac";
import type { Session } from "./session";
import type { FilterField, FilterOption, FilterPreset } from "./filters";
import type { Pipeline, Project, User } from "./types";

/**
 * Поля фильтра для каждого раздела.
 *
 * Собираются из живых данных агентства: список кураторов, воронка, филиалы.
 * Так сотруднику не приходится вспоминать точные значения — он выбирает
 * из того, что реально есть в его агентстве.
 */

const opt = (value: string, label: string, extra?: Partial<FilterOption>): FilterOption => ({
  value, label, ...extra,
});

const peopleOptions = (team: User[]): FilterOption[] =>
  team.map((u) => opt(u.id, u.name, { hint: u.title }));

const stageOptions = (pipeline: Pipeline | undefined, t: Translate): FilterOption[] =>
  (pipeline?.stages ?? []).map((s) => opt(s.key, t(s.label), { color: s.color }));

const dictOptions = (dict: Record<string, { ru: string; uz: string }>, t: Translate): FilterOption[] =>
  Object.entries(dict).map(([key, label]) => opt(key, t(label)));

export function leadFields(session: Session, team: User[], pipeline: Pipeline | undefined, t: Translate): FilterField[] {
  return [
    { key: "stage", label: loc("Стадия", "Bosqich"), kind: "select", options: stageOptions(pipeline, t), base: true },
    { key: "ownerId", label: loc("Ответственный", "Mas’ul"), kind: "select", options: peopleOptions(team), base: true },
    { key: "source", label: loc("Источник", "Manba"), kind: "select", options: dictOptions(SOURCE_LABEL, t), base: true },
    { key: "channelId", label: loc("Канал", "Kanal"), kind: "select",
      options: channelsOf(session.tenant.id).map((c) => opt(c.id, c.title, { hint: c.handle })) },
    { key: "name", label: loc("Имя", "Ism"), kind: "text" },
    { key: "phone", label: loc("Телефон", "Telefon"), kind: "text" },
    { key: "createdAt", label: loc("Дата обращения", "Murojaat sanasi"), kind: "date", range: true },
  ];
}

export function dealFields(team: User[], pipeline: Pipeline | undefined, t: Translate): FilterField[] {
  return [
    { key: "stage", label: loc("Стадия", "Bosqich"), kind: "select", options: stageOptions(pipeline, t), base: true },
    { key: "ownerId", label: loc("Ответственный", "Mas’ul"), kind: "select", options: peopleOptions(team), base: true },
    { key: "contractValue", label: loc("Сумма договора", "Shartnoma summasi"), kind: "number", range: true, base: true },
    { key: "deadline", label: loc("Дедлайн", "Muddat"), kind: "date", range: true, base: true },
    { key: "universityId", label: loc("Вуз", "Universitet"), kind: "select",
      options: UNIVERSITIES.map((u) => opt(u.id, u.name, { hint: t(ref(CITY_LABEL, u.city)) })) },
    { key: "intake", label: loc("Набор", "Qabul"), kind: "select", options: dictOptions(INTAKE_LABEL, t) },
    { key: "degreeLevel", label: loc("Уровень", "Daraja"), kind: "select", options: dictOptions(DEGREE_LABEL, t) },
    { key: "priority", label: loc("Приоритет", "Ustuvorlik"), kind: "select", options: dictOptions(PRIORITY_LABEL, t) },
    { key: "contact", label: loc("Контакт", "Kontakt"), kind: "text" },
    { key: "idle", label: loc("Дней без движения", "Harakatsiz kunlar"), kind: "number", range: true },
  ];
}

export function contactFields(team: User[], t: Translate): FilterField[] {
  return [
    { key: "status", label: loc("Статус", "Holat"), kind: "select",
      options: Object.entries(STUDENT_STATUS).map(([key, v]) => opt(key, t(v.label), { color: v.dot })), base: true },
    { key: "ownerId", label: loc("Куратор", "Kurator"), kind: "select", options: peopleOptions(team), base: true },
    { key: "topik", label: loc("TOPIK", "TOPIK"), kind: "number", range: true, base: true },
    { key: "city", label: loc("Город", "Shahar"), kind: "select", options: dictOptions(CITY_LABEL, t) },
    { key: "source", label: loc("Источник", "Manba"), kind: "select", options: dictOptions(SOURCE_LABEL, t) },
    { key: "degreeLevel", label: loc("Цель", "Maqsad"), kind: "select", options: dictOptions(DEGREE_LABEL, t) },
    { key: "budget", label: loc("Бюджет на год, $", "Yillik byudjet, $"), kind: "number", range: true },
    { key: "createdAt", label: loc("В базе с", "Bazada"), kind: "date", range: true },
  ];
}

export function taskFields(team: User[], projects: Project[], t: Translate): FilterField[] {
  return [
    { key: "status", label: loc("Статус", "Holat"), kind: "select",
      options: Object.entries(TASK_STATUS).map(([key, v]) => opt(key, t(v.label), { color: v.dot })), base: true },
    { key: "assigneeId", label: loc("Исполнитель", "Ijrochi"), kind: "select", options: peopleOptions(team), base: true },
    { key: "priority", label: loc("Приоритет", "Ustuvorlik"), kind: "select", options: dictOptions(PRIORITY_LABEL, t), base: true },
    { key: "projectId", label: loc("Проект", "Loyiha"), kind: "select",
      options: projects.map((p) => opt(p.id, t(p.name))) },
    { key: "creatorId", label: loc("Постановщик", "Topshiruvchi"), kind: "select", options: peopleOptions(team) },
    { key: "dueAt", label: loc("Срок", "Muddat"), kind: "date", range: true },
    { key: "title", label: loc("Название", "Nomi"), kind: "text" },
  ];
}

export function projectFields(team: User[], t: Translate): FilterField[] {
  return [
    { key: "status", label: loc("Статус", "Holat"), kind: "select", options: [
      opt("active", t(loc("Активен", "Faol")), { color: "var(--color-status-open)" }),
      opt("done", t(loc("Завершён", "Yakunlangan")), { color: "var(--color-status-deal)" }),
      opt("paused", t(loc("На паузе", "To‘xtatilgan")), { color: "var(--color-status-hold)" }),
    ], base: true },
    { key: "leadId", label: loc("Руководитель", "Rahbar"), kind: "select", options: peopleOptions(team), base: true },
    { key: "memberIds", label: loc("Участник", "Ishtirokchi"), kind: "select", options: peopleOptions(team) },
    { key: "dueAt", label: loc("Срок", "Muddat"), kind: "date", range: true },
    { key: "name", label: loc("Название", "Nomi"), kind: "text" },
  ];
}

export function deadlineFields(team: User[], t: Translate): FilterField[] {
  return [
    { key: "kind", label: loc("Тип", "Turi"), kind: "select",
      options: Object.entries(DEADLINE_KIND).map(([key, v]) => opt(key, t(v.label), { color: v.dot })), base: true },
    { key: "ownerId", label: loc("Ответственный", "Mas’ul"), kind: "select", options: peopleOptions(team), base: true },
    { key: "date", label: loc("Дата", "Sana"), kind: "date", range: true, base: true },
  ];
}

export function documentFields(team: User[], t: Translate): FilterField[] {
  return [
    { key: "status", label: loc("Статус", "Holat"), kind: "select",
      options: Object.entries(DOCUMENT_STATUS).map(([key, v]) => opt(key, t(v.label), { color: v.dot })), base: true },
    { key: "kind", label: loc("Тип документа", "Hujjat turi"), kind: "text", base: true },
    { key: "student", label: loc("Контакт", "Kontakt"), kind: "text", base: true },
    { key: "uploadedById", label: loc("Кто загрузил", "Kim yukladi"), kind: "select", options: peopleOptions(team) },
    { key: "expiresAt", label: loc("Годен до", "Amal qiladi"), kind: "date", range: true },
    { key: "needsApostille", label: loc("Нужен апостиль", "Apostil kerak"), kind: "select", options: [
      opt("yes", t(loc("Да", "Ha"))), opt("no", t(loc("Нет", "Yo‘q"))),
    ] },
  ];
}

export function teamFields(session: Session, t: Translate): FilterField[] {
  return [
    { key: "role", label: loc("Роль", "Rol"), kind: "select",
      options: ROLES.map((r) => opt(r.key, t(r.label))), base: true },
    { key: "branchId", label: loc("Филиал", "Filial"), kind: "select",
      options: session.tenant.branches.map((b) => opt(b.id, t(ref(CITY_LABEL, b.city)))), base: true },
    { key: "status", label: loc("Статус", "Holat"), kind: "select", options: [
      opt("active", t(loc("Активен", "Faol")), { color: "var(--color-status-deal)" }),
      opt("invited", t(loc("Приглашён", "Taklif qilingan")), { color: "var(--color-status-progress)" }),
      opt("suspended", t(loc("Заблокирован", "Bloklangan")), { color: "var(--color-status-hold)" }),
    ], base: true },
    { key: "departmentId", label: loc("Подразделение", "Bo‘lim"), kind: "select",
      options: DEPARTMENTS.filter((d) => d.tenantId === session.tenant.id).map((d) => opt(d.id, t(d.name))) },
    { key: "joinedAt", label: loc("Принят на работу", "Ishga qabul"), kind: "date", range: true },
  ];
}

export function universityFields(t: Translate): FilterField[] {
  const cities = [...new Set(UNIVERSITIES.map((u) => u.city))];
  const fields = [...new Set(UNIVERSITIES.flatMap((u) => u.fields))];
  return [
    { key: "city", label: loc("Город", "Shahar"), kind: "multiselect",
      options: cities.map((c) => opt(c, t(ref(CITY_LABEL, c)))), base: true },
    { key: "fields", label: loc("Направление", "Yo‘nalish"), kind: "multiselect",
      options: fields.map((f) => opt(f, t(ref(FIELD_LABEL, f)))), base: true },
    { key: "ownership", label: loc("Форма собственности", "Mulkchilik shakli"), kind: "multiselect",
      options: Object.entries(OWNERSHIP_LABEL).map(([key, label]) => opt(key, t(label))), base: true },
    { key: "degree", label: loc("Уровень обучения", "Ta’lim bosqichi"), kind: "select",
      options: (["language", "bachelor", "master"] as const).map((d) => opt(d, t(DEGREE_LABEL[d]))), base: true },
    { key: "tuition", label: loc("Стоимость года, $", "Yillik narx, $"), kind: "number", range: true, base: true },
    { key: "topik", label: loc("TOPIK студента", "Talabaning TOPIK"), kind: "select",
      options: [0, 1, 2, 3, 4, 5, 6].map((n) => opt(String(n), n === 0 ? t(loc("Нет сертификата", "Sertifikat yo‘q")) : `TOPIK ${n}`)) },
    { key: "ielts", label: loc("IELTS студента", "Talabaning IELTS"), kind: "select",
      options: [5, 5.5, 6, 6.5, 7].map((n) => opt(String(n), `IELTS ${n}`)) },
    { key: "intake", label: loc("Набор", "Qabul"), kind: "select", options: dictOptions(INTAKE_LABEL, t) },
    { key: "extras", label: loc("Условия", "Shartlar"), kind: "multiselect", options: [
      opt("dorm", t(loc("Есть общежитие", "Yotoqxona bor"))),
      opt("grant", t(loc("Грант от 50%", "50% dan grant"))),
      opt("english", t(loc("Программы на английском", "Ingliz tilidagi dasturlar"))),
      opt("certified", t(loc("Визовый статус certified", "Certified viza maqomi"))),
    ] },
  ];
}

/* ── готовые срезы ───────────────────────────────────────────── */

export const allPreset: FilterPreset = { key: "", label: loc("Все", "Barchasi"), values: {} };

export function leadPresets(session: Session): FilterPreset[] {
  return [
    allPreset,
    { key: "mine", label: loc("Мои лиды", "Mening lidlarim"), values: { ownerId: session.user.id } },
    { key: "new", label: loc("Новые", "Yangi"), values: { stage: "new" } },
    { key: "work", label: loc("В работе", "Ishda"), values: { stage: "in_progress" } },
    { key: "junk", label: loc("Некачественные", "Sifatsiz"), values: { stage: "junk" } },
  ];
}

export function dealPresets(session: Session, today: string): FilterPreset[] {
  return [
    allPreset,
    { key: "mine", label: loc("Мои сделки", "Mening bitimlarim"), values: { ownerId: session.user.id } },
    { key: "docs", label: loc("Сбор документов", "Hujjat yig‘ish"), values: { stage: "documents" } },
    { key: "overdue", label: loc("Просроченные", "Kechikkan"), values: { deadlineTo: today } },
    // «Зависшие» — сделки, которые неделю стоят на одной стадии: главный
    // повод открыть доску утром.
    { key: "stale", label: loc("Зависшие", "Qotib qolganlar"), values: { idleFrom: String(STALE_DAYS) } },
    { key: "lost", label: loc("Закрытые сделки", "Yopilgan bitimlar"), values: { stage: "lost" } },
  ];
}

export function contactPresets(session: Session): FilterPreset[] {
  return [
    allPreset,
    { key: "mine", label: loc("Мои контакты", "Mening kontaktlarim"), values: { ownerId: session.user.id } },
    { key: "active", label: loc("В работе", "Ishda"), values: { status: "active" } },
    { key: "enrolled", label: loc("Зачислены", "Qabul qilingan"), values: { status: "enrolled" } },
    { key: "lost", label: loc("Потеряны", "Yo‘qotilgan"), values: { status: "lost" } },
  ];
}

export function taskPresets(session: Session, today: string): FilterPreset[] {
  return [
    allPreset,
    { key: "mine", label: loc("Мои задачи", "Mening vazifalarim"), values: { assigneeId: session.user.id } },
    { key: "overdue", label: loc("Просроченные", "Kechikkan"), values: { dueAtTo: today } },
    { key: "high", label: loc("Важные", "Muhim"), values: { priority: "high" } },
    { key: "done", label: loc("Выполненные", "Bajarilgan"), values: { status: "done" } },
  ];
}

export function simplePresets(): FilterPreset[] {
  return [allPreset];
}

export const ownerName = (id: string) => userById(id)?.name ?? "";
