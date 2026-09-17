import { CHANNELS } from "./data/channels";
import { DEALS } from "./data/deals";
import { LEADS, digits, isActiveLead } from "./data/leads";
import { EVENTS } from "./data/events";
import { DEPARTMENTS, DEPARTMENT_OF, PROJECTS, WORK_SESSIONS } from "./data/org";
import { PIPELINES } from "./data/pipelines";
import { STUDENTS } from "./data/students";
import { TASKS } from "./data/tasks";
import { TIMELINE } from "./data/timeline";
import { USERS } from "./data/users";
import { loc, type Loc } from "./i18n";
import type { Action, Module } from "./rbac";
import type {
  CalendarEvent, Deal, Department, EventKind, Lead, Pipeline, Project, Role, Stage,
  Student, Task, TimelineEvent, User, WorkSession,
} from "./types";

/**
 * Изменяемое хранилище поверх демо-данных.
 *
 * Пока нет базы, действия пользователя (перенос карточки, отметка рабочего дня,
 * переименование стадии, конвертация лида) должны где-то сохраняться — иначе
 * интерфейс притворяется рабочим. Состояние живёт в памяти процесса и
 * сбрасывается при перезапуске сервера; при переходе на Postgres этот модуль
 * заменяется репозиториями с теми же сигнатурами.
 */

interface State {
  leads: Lead[];
  deals: Deal[];
  students: Student[];
  tasks: Task[];
  pipelines: Pipeline[];
  timeline: TimelineEvent[];
  sessions: WorkSession[];
  projects: Project[];
  events: CalendarEvent[];
  departments: Department[];
  /** в каком подразделении числится сотрудник: userId → departmentId */
  departmentOf: Record<string, string>;
  /** переопределения прав по арендаторам: tenantId → роль → модуль → действия */
  permissions: Record<string, Partial<Record<Role, Partial<Record<Module, Action[]>>>>>;
  /** какие поля показывать на карточке канбана: userId → список полей */
  cardFields: Record<string, string[]>;
  /** сохранённые фильтры: «userId:раздел» → срезы сотрудника */
  filters: Record<string, SavedFilter[]>;
  /** код входа в «Администрирование», если агентство его сменило */
  passcodes: Record<string, string>;
  seq: number;
  version: number;
}

/**
 * Версия формы состояния. При hot reload прежний объект переживает правку
 * кода, и новое поле оказалось бы undefined — поэтому состояние с чужой
 * версией пересоздаётся целиком.
 */
const STATE_VERSION = 4;

const globalStore = globalThis as unknown as { __orbisStore?: State };

function createState(): State {
  return {
    leads: LEADS.map((x) => ({ ...x })),
    deals: DEALS.map((x) => ({ ...x })),
    students: STUDENTS.map((x) => ({ ...x })),
    tasks: TASKS.map((x) => ({ ...x })),
    pipelines: PIPELINES.map((p) => ({ ...p, stages: p.stages.map((s) => ({ ...s })) })),
    timeline: TIMELINE.map((x) => ({ ...x })),
    sessions: WORK_SESSIONS.map((x) => ({ ...x })),
    projects: PROJECTS.map((x) => ({ ...x })),
    events: EVENTS.map((x) => ({ ...x })),
    departments: DEPARTMENTS.map((x) => ({ ...x })),
    departmentOf: { ...DEPARTMENT_OF },
    permissions: {},
    cardFields: {},
    filters: {},
    passcodes: {},
    seq: 1000,
    version: STATE_VERSION,
  };
}

if (globalStore.__orbisStore?.version !== STATE_VERSION) globalStore.__orbisStore = createState();
const state: State = globalStore.__orbisStore;

const nextId = (prefix: string) => `${prefix}_${++state.seq}`;
const now = () => "2026-09-16T09:30:00";
const today = () => "2026-09-16";

/** Локальное время без часового пояса — в том же формате, что и демо-данные. */
function stamp(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* ── чтение ──────────────────────────────────────────────────── */
export const allLeads = (tenantId: string) => state.leads.filter((l) => l.tenantId === tenantId);
export const allDeals = (tenantId: string) => state.deals.filter((d) => d.tenantId === tenantId);
export const allStudents = (tenantId: string) => state.students.filter((s) => s.tenantId === tenantId);
export const allTasks = (tenantId: string) => state.tasks.filter((t) => t.tenantId === tenantId);
export const allProjects = (tenantId: string) => state.projects.filter((p) => p.tenantId === tenantId);
export const leadById = (id: string) => state.leads.find((l) => l.id === id);
export const dealById = (id: string) => state.deals.find((d) => d.id === id);
export const studentById = (id: string) => state.students.find((s) => s.id === id);

export const pipelinesOf = (tenantId: string, entity: "lead" | "deal") =>
  state.pipelines.filter((p) => p.tenantId === tenantId && p.entity === entity);
export const pipelineById = (id: string) => state.pipelines.find((p) => p.id === id);
export function defaultPipeline(tenantId: string, entity: "lead" | "deal"): Pipeline {
  const list = pipelinesOf(tenantId, entity);
  return list.find((p) => p.isDefault) ?? list[0];
}
export const stageOf = (pipeline: Pipeline | undefined, key: string): Stage | undefined =>
  pipeline?.stages.find((s) => s.key === key);

export const timelineAll = (tenantId: string) =>
  state.timeline.filter((e) => e.tenantId === tenantId);

export const timelineOf = (entity: TimelineEvent["entity"], entityId: string) =>
  state.timeline
    .filter((e) => e.entity === entity && e.entityId === entityId)
    .sort((a, b) => b.at.localeCompare(a.at));

export const sessionsOf = (tenantId: string) => state.sessions.filter((s) => s.tenantId === tenantId);
export const openSession = (userId: string) =>
  state.sessions.find((s) => s.userId === userId && !s.endedAt);

export const departmentOf = (userId: string) => state.departmentOf[userId] ?? null;
export const departmentsOf = (tenantId: string) =>
  state.departments.filter((d) => d.tenantId === tenantId);
export const departmentById = (id: string) => state.departments.find((d) => d.id === id);

/* ── структура компании ──────────────────────────────────────── */

/** Новое подразделение внутри выбранного: дерево растёт из интерфейса. */
export function addDepartment(tenantId: string, name: Loc, parentId: string | null, headId: string | null) {
  const department: Department = { id: nextId("dep"), tenantId, name, parentId, headId };
  state.departments.push(department);
  return department;
}

export function setDepartmentHead(departmentId: string, headId: string | null) {
  const department = departmentById(departmentId);
  if (department) department.headId = headId;
}

export function renameDepartment(departmentId: string, name: Loc) {
  const department = departmentById(departmentId);
  if (department) department.name = name;
}

/**
 * Перенос сотрудника в другое подразделение. Пишем в историю: перевод —
 * кадровое событие, и потом всегда спрашивают, когда и кто его сделал.
 */
export function moveEmployee(userId: string, departmentId: string, actorId: string) {
  const user = USERS.find((u) => u.id === userId);
  const to = departmentById(departmentId);
  if (!user || !to || state.departmentOf[userId] === departmentId) return;

  const from = departmentById(state.departmentOf[userId] ?? "");
  state.departmentOf[userId] = departmentId;
  addTimeline({
    tenantId: user.tenantId, entity: "employee", entityId: userId, kind: "system",
    title: loc(
      `Переведён: ${from ? from.name.ru : "—"} → ${to.name.ru}`,
      `Ko‘chirildi: ${from ? from.name.uz : "—"} → ${to.name.uz}`,
    ),
    body: null, authorId: actorId, source: null, dueAt: null, done: null,
  });
}
export const allEvents = (tenantId: string) => state.events.filter((e) => e.tenantId === tenantId);

/** Своё событие в календаре: встреча, звонок или интервью. */
export function addEvent(input: Omit<CalendarEvent, "id">) {
  const event: CalendarEvent = { ...input, id: nextId("ev") };
  state.events.push(event);
  addTimeline({
    tenantId: event.tenantId,
    entity: "employee",
    entityId: event.ownerId,
    kind: "activity",
    title: loc(`Событие в календаре: ${event.title}`, `Kalendarda hodisa: ${event.title}`),
    body: event.note || null,
    authorId: event.ownerId,
    source: null,
    dueAt: event.date,
    done: false,
  });
  return event;
}
export function removeEvent(id: string) {
  state.events = state.events.filter((e) => e.id !== id);
}
export type { EventKind };
export const channelsOf = (tenantId: string) => CHANNELS.filter((c) => c.tenantId === tenantId);

/* ── права ───────────────────────────────────────────────────── */
export const permissionOverrides = (tenantId: string) => state.permissions[tenantId] ?? {};

/* ── код входа в администрирование ───────────────────────────── */

export const passcodeOverride = (tenantId: string) => state.passcodes[tenantId];
export function setPasscode(tenantId: string, code: string) {
  state.passcodes[tenantId] = code;
}
export function setPermission(
  tenantId: string, role: Role, module: Module, actions: Action[],
) {
  state.permissions[tenantId] ??= {};
  state.permissions[tenantId][role] ??= {};
  state.permissions[tenantId][role]![module] = actions;
}

/* ── настройка карточки канбана ──────────────────────────────── */
export const CARD_FIELDS = ["phone", "source", "comment", "university", "program", "intake", "dossier", "amount", "deadline", "owner"] as const;
export type CardField = (typeof CARD_FIELDS)[number];
// Вуз уже стоит подзаголовком карточки, поэтому по умолчанию его не дублируем.
export const DEFAULT_CARD_FIELDS: CardField[] = ["phone", "dossier", "deadline", "amount"];

export const cardFieldsOf = (userId: string): CardField[] =>
  (state.cardFields[userId] as CardField[] | undefined) ?? DEFAULT_CARD_FIELDS;
export function setCardFields(userId: string, fields: string[]) {
  state.cardFields[userId] = fields;
}

/* ── запись в историю ────────────────────────────────────────── */
export function addTimeline(event: Omit<TimelineEvent, "id" | "at"> & { at?: string }) {
  const item: TimelineEvent = { ...event, id: nextId("tl"), at: event.at ?? now() };
  state.timeline.push(item);
  return item;
}

/* ── перенос карточки по стадиям ─────────────────────────────── */
export function moveCard(
  entity: "lead" | "deal", id: string, toStage: string, actorId: string, tenantId: string,
) {
  const record = entity === "deal" ? dealById(id) : leadById(id);
  if (!record) return { ok: false as const, reason: "not_found" as const };

  const pipeline = entity === "deal"
    ? pipelineById((record as Deal).pipelineId)
    : defaultPipeline(tenantId, "lead");
  const from = stageOf(pipeline, record.stage);
  const to = stageOf(pipeline, toStage);
  if (!to || record.stage === toStage) return { ok: false as const, reason: "same" as const };

  record.stage = toStage as Deal["stage"] & Lead["stage"];
  record.stageEnteredAt = today();
  addTimeline({
    tenantId, entity, entityId: id, kind: "stage",
    title: loc(
      `Стадия изменена: ${from?.label.ru ?? "—"} → ${to.label.ru}`,
      `Bosqich o‘zgardi: ${from?.label.uz ?? "—"} → ${to.label.uz}`,
    ),
    body: null, authorId: actorId, source: null, dueAt: null, done: null,
  });
  return { ok: true as const };
}

/* ── настройки воронки ───────────────────────────────────────── */

export function renameStage(pipelineId: string, stageKey: string, label: Loc) {
  const stage = stageOf(pipelineById(pipelineId), stageKey);
  if (stage) stage.label = label;
}
export function setStageColor(pipelineId: string, stageKey: string, color: string) {
  const stage = stageOf(pipelineById(pipelineId), stageKey);
  if (stage) stage.color = color;
}
export function setStageHint(pipelineId: string, stageKey: string, hint: Loc) {
  const stage = stageOf(pipelineById(pipelineId), stageKey);
  if (stage) stage.hint = hint;
}

/**
 * Финальная стадия — «успех» или «провал». Их ровно по одной на воронку:
 * две победных колонки превращают конверсию в предмет спора, а не в число.
 */
export function setStageFinal(pipelineId: string, stageKey: string, final: "won" | "lost" | null) {
  const pipeline = pipelineById(pipelineId);
  const stage = stageOf(pipeline, stageKey);
  if (!pipeline || !stage) return;
  if (final) {
    for (const other of pipeline.stages) {
      if (other.key !== stageKey && other.final === final) delete other.final;
    }
    stage.final = final;
  } else {
    delete stage.final;
  }
}

/** Порядок стадий — это порядок работы; менять его умеет только воронка. */
export function moveStage(pipelineId: string, stageKey: string, delta: number) {
  const pipeline = pipelineById(pipelineId);
  if (!pipeline) return;
  const from = pipeline.stages.findIndex((s) => s.key === stageKey);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= pipeline.stages.length) return;
  const [stage] = pipeline.stages.splice(from, 1);
  pipeline.stages.splice(to, 0, stage);
}

/** Ключ стадии латиницей: он уходит в адрес доски и в данные сделок. */
function stageKeyFrom(name: string, taken: string[]): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "stage";
  let key = base;
  let n = 2;
  while (taken.includes(key)) key = `${base}_${n++}`;
  return key;
}

export function addStage(pipelineId: string, label: Loc, color: string) {
  const pipeline = pipelineById(pipelineId);
  if (!pipeline) return null;
  const key = stageKeyFrom(label.ru, pipeline.stages.map((s) => s.key));
  const stage: Stage = { key, label, color, hint: { ru: "", uz: "" } };
  // новая стадия встаёт перед финальными: работа идёт до результата, не после
  const finalAt = pipeline.stages.findIndex((s) => s.final);
  if (finalAt < 0) pipeline.stages.push(stage);
  else pipeline.stages.splice(finalAt, 0, stage);
  return stage;
}

/**
 * Стадию нельзя удалить, пока на ней стоят карточки: иначе сделка окажется
 * на стадии, которой нет, и пропадёт с доски. Сначала переносим карточки.
 */
export function stageUsage(pipelineId: string, stageKey: string): number {
  const pipeline = pipelineById(pipelineId);
  if (!pipeline) return 0;
  return pipeline.entity === "lead"
    ? state.leads.filter((l) => l.stage === stageKey && l.tenantId === pipeline.tenantId).length
    : state.deals.filter((d) => d.pipelineId === pipelineId && d.stage === stageKey).length;
}

export function removeStage(pipelineId: string, stageKey: string) {
  const pipeline = pipelineById(pipelineId);
  if (!pipeline || pipeline.stages.length <= 2) return { ok: false as const, reason: "last" as const };
  if (stageUsage(pipelineId, stageKey) > 0) return { ok: false as const, reason: "used" as const };
  pipeline.stages = pipeline.stages.filter((s) => s.key !== stageKey);
  return { ok: true as const };
}

export const dealsOfPipeline = (pipelineId: string) =>
  state.deals.filter((d) => d.pipelineId === pipelineId);

export function renamePipeline(pipelineId: string, name: Loc) {
  const pipeline = pipelineById(pipelineId);
  if (pipeline) pipeline.name = name;
}

/** Воронка по умолчанию одна на сущность — та, что открывается без выбора. */
export function setDefaultPipeline(pipelineId: string) {
  const pipeline = pipelineById(pipelineId);
  if (!pipeline) return;
  for (const other of state.pipelines) {
    if (other.tenantId === pipeline.tenantId && other.entity === pipeline.entity) {
      other.isDefault = other.id === pipelineId;
    }
  }
}

/** Новая воронка повторяет стадии существующей: пустая никому не нужна. */
export function addPipeline(tenantId: string, entity: "lead" | "deal", name: Loc) {
  const sample = defaultPipeline(tenantId, entity);
  const pipeline: Pipeline = {
    id: nextId("pl"),
    tenantId,
    entity,
    name,
    isDefault: false,
    stages: sample.stages.map((s) => ({ ...s, label: { ...s.label }, hint: { ...s.hint } })),
  };
  state.pipelines.push(pipeline);
  return pipeline;
}

export function removePipeline(pipelineId: string) {
  const pipeline = pipelineById(pipelineId);
  if (!pipeline || pipeline.isDefault) return { ok: false as const, reason: "default" as const };
  const used = state.deals.some((d) => d.pipelineId === pipelineId);
  if (used) return { ok: false as const, reason: "used" as const };
  state.pipelines = state.pipelines.filter((p) => p.id !== pipelineId);
  return { ok: true as const };
}

/* ── дедупликация: один человек — один контакт и один активный лид ── */
export interface DuplicateHit {
  kind: "contact" | "lead";
  id: string;
  name: string;
  matchedBy: "phone" | "email" | "passport";
}

export function findDuplicate(
  tenantId: string,
  probe: { phone?: string; email?: string | null; passport?: string | null },
  ignore?: { leadId?: string; studentId?: string },
): DuplicateHit | null {
  const phone = probe.phone ? digits(probe.phone) : "";
  const email = probe.email?.trim().toLowerCase() ?? "";
  const passport = probe.passport?.trim().toUpperCase() ?? "";

  for (const s of allStudents(tenantId)) {
    if (ignore?.studentId === s.id) continue;
    if (phone && digits(s.phone) === phone) return { kind: "contact", id: s.id, name: s.fullName, matchedBy: "phone" };
    if (email && s.email.toLowerCase() === email) return { kind: "contact", id: s.id, name: s.fullName, matchedBy: "email" };
    if (passport && s.passport?.toUpperCase() === passport) return { kind: "contact", id: s.id, name: s.fullName, matchedBy: "passport" };
  }
  for (const l of allLeads(tenantId)) {
    if (!isActiveLead(l) || ignore?.leadId === l.id) continue;
    if (phone && digits(l.phone) === phone) return { kind: "lead", id: l.id, name: l.name, matchedBy: "phone" };
    if (email && l.email?.toLowerCase() === email) return { kind: "lead", id: l.id, name: l.name, matchedBy: "email" };
  }
  return null;
}

/** Создание лида с проверкой дубля: повторное обращение уходит в существующую карточку. */
export function createLead(input: Omit<Lead, "id" | "createdAt" | "stageEnteredAt" | "stage" | "convertedContactId" | "convertedDealId" | "junkReason">) {
  const duplicate = findDuplicate(input.tenantId, { phone: input.phone, email: input.email });
  if (duplicate) {
    addTimeline({
      tenantId: input.tenantId,
      entity: duplicate.kind === "contact" ? "contact" : "lead",
      entityId: duplicate.id, kind: "message",
      title: loc("Повторное обращение", "Takroriy murojaat"),
      body: input.comment || null, authorId: input.ownerId,
      source: loc("Определено как дубль по номеру телефона", "Telefon raqami bo‘yicha dublikat deb aniqlandi"),
      dueAt: null, done: null,
    });
    return { ok: false as const, duplicate };
  }
  const lead: Lead = {
    ...input, id: nextId("l"), stage: "new", stageEnteredAt: today(),
    createdAt: today(), convertedContactId: null, convertedDealId: null, junkReason: null,
  };
  state.leads.push(lead);
  addTimeline({
    tenantId: lead.tenantId, entity: "lead", entityId: lead.id, kind: "system",
    title: loc("Лид создан", "Lid yaratildi"), body: lead.comment || null,
    authorId: lead.ownerId, source: null, dueAt: null, done: null,
  });
  return { ok: true as const, lead };
}

/** Конвертация лида: появляется контакт и первая сделка, лид закрывается. */
export function convertLead(leadId: string, actorId: string) {
  const lead = leadById(leadId);
  if (!lead || lead.stage === "converted") return { ok: false as const };

  const existing = findDuplicate(lead.tenantId, { phone: lead.phone, email: lead.email }, { leadId });
  let studentId: string;

  if (existing?.kind === "contact") {
    studentId = existing.id;
  } else {
    const student: Student = {
      id: nextId("s"), tenantId: lead.tenantId, branchId: lead.branchId,
      fullName: lead.name, latinName: lead.name, birthDate: "2006-01-01",
      phone: lead.phone, email: lead.email ?? "", city: "Ташкент",
      source: lead.source, ownerId: lead.ownerId, referredById: null,
      leadId: lead.id, passport: null, status: "active",
      profile: {
        topik: 0, topikExpiresAt: null, ielts: null, gpa: null,
        education: "—", graduationYear: 2026, budgetPerYear: 8000,
        preferredCities: [], preferredMajors: [], preferredOwnership: ["private", "public", "national"],
        degreeLevel: "bachelor", intake: "2027 Весна", needsDorm: true, needsScholarship: false,
      },
      tags: [], createdAt: today(), lastTouchAt: today(),
    };
    state.students.push(student);
    studentId = student.id;
    addTimeline({
      tenantId: lead.tenantId, entity: "contact", entityId: studentId, kind: "system",
      title: loc("Контакт создан из лида", "Kontakt liddan yaratildi"), body: null,
      authorId: actorId, source: loc(`Лид ${lead.id.toUpperCase()}`, `Lid ${lead.id.toUpperCase()}`),
      dueAt: null, done: null,
    });
  }

  const pipeline = defaultPipeline(lead.tenantId, "deal");
  const deal: Deal = {
    id: nextId("d"), tenantId: lead.tenantId, pipelineId: pipeline.id, studentId,
    universityId: "", programId: "", degreeLevel: "bachelor", intake: "2027 Весна",
    stage: "new", stageEnteredAt: today(), ownerId: lead.ownerId, priority: "normal",
    deadline: null, contractValue: 0, paid: 0, createdAt: today(),
    note: lead.comment, leadId: lead.id,
  };
  state.deals.push(deal);

  lead.stage = "converted";
  lead.stageEnteredAt = today();
  lead.convertedContactId = studentId;
  lead.convertedDealId = deal.id;

  addTimeline({
    tenantId: lead.tenantId, entity: "lead", entityId: lead.id, kind: "system",
    title: loc("Лид конвертирован", "Lid konvertatsiya qilindi"),
    body: existing?.kind === "contact"
      ? "Контакт уже существовал — создана только сделка."
      : "Созданы контакт и первая сделка.",
    authorId: actorId, source: null, dueAt: null, done: null,
  });
  return { ok: true as const, studentId, dealId: deal.id, reusedContact: existing?.kind === "contact" };
}

/* ── рабочий день ────────────────────────────────────────────── */

/**
 * Отметка рабочего дня ставится настоящим временем, а не демо-датой:
 * это единственное место продукта, где секунды идут по-настоящему —
 * сотрудник видит, сколько он отработал прямо сейчас.
 */
export function startWorkDay(tenantId: string, userId: string) {
  if (openSession(userId)) return;
  const at = stamp();
  state.sessions.push({
    id: nextId("ws"), tenantId, userId, date: at.slice(0, 10),
    startedAt: at, endedAt: null, breakMinutes: 0, onBreakSince: null,
  });
}
export function endWorkDay(userId: string) {
  const session = openSession(userId);
  if (!session) return;
  if (session.onBreakSince) {
    session.breakSeconds = (session.breakSeconds ?? 0) + elapsedSince(session.onBreakSince);
    session.onBreakSince = null;
  }
  session.endedAt = liveDay(session) ? stamp() : now();
}
export function toggleBreak(userId: string) {
  const session = openSession(userId);
  if (!session) return;
  if (session.onBreakSince) {
    session.breakSeconds = (session.breakSeconds ?? 0) + elapsedSince(session.onBreakSince);
    session.onBreakSince = null;
  } else {
    session.onBreakSince = liveDay(session) ? stamp() : now();
  }
}

/** Отметка сделана сегодня по-настоящему, а не пришла из демо-данных. */
const liveDay = (s: WorkSession) => s.date === stamp().slice(0, 10);

const parse = (v: string) => new Date(v.length <= 10 ? `${v}T00:00:00` : v);
const elapsedSince = (from: string) =>
  Math.max(0, Math.round((Date.now() - parse(from).getTime()) / 1000));

/** Суммарный перерыв в секундах, включая идущий прямо сейчас. */
export function breakSeconds(s: WorkSession): number {
  const stored = s.breakSeconds ?? s.breakMinutes * 60;
  return stored + (s.onBreakSince ? elapsedSince(s.onBreakSince) : 0);
}

/**
 * Отработанные секунды: конец (или «сейчас») минус начало и перерывы.
 * «Сейчас» у сегодняшней отметки настоящее, у демо-данных — демо-дата,
 * иначе прошлогодние сиды показали бы тысячи часов.
 */
export function sessionSeconds(s: WorkSession): number {
  const end = s.endedAt ? parse(s.endedAt) : liveDay(s) ? new Date() : parse(now());
  const raw = Math.max(0, Math.round((end.getTime() - parse(s.startedAt).getTime()) / 1000));
  return Math.max(0, raw - breakSeconds(s));
}

export const sessionMinutes = (s: WorkSession): number => Math.round(sessionSeconds(s) / 60);

/* ── редактирование полей карточки ───────────────────────────── */

/** Какие поля карточки сотрудник правит прямо из карточки, кнопкой «Изменить». */
export const EDITABLE: Record<"lead" | "deal" | "contact" | "employee", string[]> = {
  lead: ["name", "phone", "email", "comment"],
  deal: ["intake", "deadline", "contractValue", "paid", "priority", "note"],
  contact: ["fullName", "latinName", "phone", "email", "city", "passport", "birthDate"],
  employee: ["name", "title", "email", "phone", "phone2", "birthDate", "joinedAt"],
};

const NUMERIC = new Set(["contractValue", "paid"]);

/**
 * Точечное изменение полей карточки с записью в её историю.
 * Дубли проверяются здесь же: телефон нельзя переписать на чужой,
 * иначе в базе появятся два человека с одним номером.
 */
export function updateCard(
  entity: "lead" | "deal" | "contact" | "employee",
  id: string,
  patch: Record<string, string>,
  actorId: string,
): { ok: true } | { ok: false; duplicate: DuplicateHit } {
  const found =
    entity === "lead" ? leadById(id)
    : entity === "deal" ? dealById(id)
    : entity === "employee" ? USERS.find((u) => u.id === id)
    : studentById(id);
  if (!found) return { ok: true };
  // Точечная правка по именам полей: белый список EDITABLE уже ограничил набор.
  const record = found as unknown as Record<string, unknown>;

  const tenantId = String(record.tenantId);
  const allowed = EDITABLE[entity];

  // Дубли ищем среди людей агентства; сотрудник в эту базу не входит.
  if (entity !== "deal" && entity !== "employee" && (patch.phone || patch.email)) {
    const hit = findDuplicate(
      tenantId,
      { phone: patch.phone, email: patch.email ?? null, passport: patch.passport ?? null },
      entity === "lead" ? { leadId: id } : { studentId: id },
    );
    if (hit) return { ok: false, duplicate: hit };
  }

  const changed: string[] = [];
  for (const [key, raw] of Object.entries(patch)) {
    if (!allowed.includes(key)) continue;
    const value = NUMERIC.has(key) ? Number(raw.replace(/\s/g, "")) || 0 : raw.trim();
    if (record[key] === value) continue;
    record[key] = value === "" && key !== "comment" && key !== "note" ? null : value;
    changed.push(key);
  }
  if (!changed.length) return { ok: true };

  addTimeline({
    tenantId,
    entity,
    entityId: id,
    kind: "system",
    // В историю уходит то, что человек видел на экране, а не имя колонки.
    title: loc(
      `Изменены поля: ${changed.map((k) => FIELD_LABEL[k]?.ru ?? k).join(", ")}`,
      `Maydonlar o‘zgardi: ${changed.map((k) => FIELD_LABEL[k]?.uz ?? k).join(", ")}`,
    ),
    body: null,
    authorId: actorId,
    source: null,
    dueAt: null,
    done: null,
  });
  return { ok: true };
}

/** Подписи полей для истории: «Изменены поля: должность», а не «title». */
const FIELD_LABEL: Record<string, Loc> = {
  name: loc("имя", "ism"),
  fullName: loc("ФИО", "F.I.Sh."),
  latinName: loc("имя латиницей", "lotincha ism"),
  title: loc("должность", "lavozim"),
  email: loc("почта", "pochta"),
  phone: loc("телефон", "telefon"),
  phone2: loc("второй номер", "ikkinchi raqam"),
  birthDate: loc("день рождения", "tug‘ilgan kun"),
  joinedAt: loc("дата приёма", "ishga qabul sanasi"),
  city: loc("город", "shahar"),
  passport: loc("паспорт", "pasport"),
  comment: loc("комментарий", "izoh"),
  note: loc("заметка", "eslatma"),
  contractValue: loc("сумма договора", "shartnoma summasi"),
  paid: loc("оплата", "to‘lov"),
  deadline: loc("дедлайн", "muddat"),
  intake: loc("набор", "qabul"),
  priority: loc("приоритет", "ustuvorlik"),
};

/* ── сотрудники ──────────────────────────────────────────────── */

/**
 * Сотрудники правятся на месте, в самом массиве USERS: их читают десятки
 * мест через userById, и отдельная копия в хранилище развела бы две версии
 * одного человека. При переходе на базу здесь останется UPDATE по id.
 */
export function setUserRole(userId: string, role: Role, actorId: string) {
  const user = USERS.find((u) => u.id === userId);
  if (!user || user.role === role) return { ok: false as const };

  // Владелец должен остаться хотя бы один — иначе агентство теряет доступ
  // к тарифу и домену, и вернуть его будет некому.
  const owners = USERS.filter((u) => u.tenantId === user.tenantId && u.role === "owner");
  if (user.role === "owner" && owners.length === 1) {
    return { ok: false as const, reason: "last_owner" as const };
  }

  user.role = role;
  addTimeline({
    tenantId: user.tenantId, entity: "employee", entityId: user.id, kind: "system",
    title: loc("Роль изменена", "Rol o‘zgartirildi"), body: role,
    authorId: actorId, source: null, dueAt: null, done: null,
  });
  return { ok: true as const };
}

export function setUserStatus(userId: string, status: User["status"], actorId: string) {
  const user = USERS.find((u) => u.id === userId);
  if (!user || user.status === status) return;
  user.status = status;
  addTimeline({
    tenantId: user.tenantId, entity: "employee", entityId: user.id, kind: "system",
    title: status === "suspended"
      ? loc("Доступ заблокирован", "Kirish bloklandi")
      : loc("Доступ восстановлен", "Kirish tiklandi"),
    body: null, authorId: actorId, source: null, dueAt: null, done: null,
  });
}

/* ── сохранённые фильтры ─────────────────────────────────────── */

export interface SavedFilter {
  id: string;
  name: string;
  /** строка запроса без «?» — ровно то, что стоит в адресе раздела */
  query: string;
}

/**
 * Свои срезы сотрудника: он собирает набор условий и сохраняет его под именем,
 * как в Битриксе. Хранится на сотрудника и раздел — чужие срезы не мешают.
 */
export function savedFilters(userId: string, scope: string): SavedFilter[] {
  return state.filters[`${userId}:${scope}`] ?? [];
}
export function saveFilter(userId: string, scope: string, name: string, query: string) {
  const key = `${userId}:${scope}`;
  state.filters[key] ??= [];
  const existing = state.filters[key].find((f) => f.name === name);
  if (existing) existing.query = query;
  else state.filters[key].push({ id: nextId("flt"), name, query });
}
export function deleteFilter(userId: string, scope: string, id: string) {
  const key = `${userId}:${scope}`;
  state.filters[key] = (state.filters[key] ?? []).filter((f) => f.id !== id);
}
