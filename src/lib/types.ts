import type { Edition } from "./edition";
import type { Loc, Locale } from "./i18n";

/**
 * Orbis System — доменная модель.
 * Слой данных намеренно отделён от UI: сейчас источник — моки в src/lib/data,
 * позже те же типы обслуживает Postgres/Prisma без изменений в компонентах.
 */

/* ── Арендатор (агентство) ───────────────────────────────────── */

export type TenantPlan = "trial" | "standard" | "pro" | "enterprise";

export interface Tenant {
  id: string;
  /** поддомен: {slug}.orbisystem.us */
  slug: string;
  name: string;
  legalName: string;
  /** собственный домен агентства, если подключён (CNAME → orbisystem.us) */
  customDomain: string | null;
  customDomainStatus: "none" | "pending" | "verified";
  plan: TenantPlan;
  /** версия продукта: какой набор модулей куплен агентством */
  edition: Edition;
  /** язык интерфейса по умолчанию; сотрудник может переключить себе */
  locale: Locale;
  /** договоры агентства ведутся в сумах */
  currency: "UZS";
  /** курс для пересчёта стоимости обучения: сум за $1 */
  usdRate: number;
  rateUpdatedAt: string;
  /** буква/монограмма в логотипе — брендинг арендатора без ломки палитры */
  mark: string;
  seatsUsed: number;
  seatsLimit: number;
  branches: Branch[];
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
}

/* ── Люди ────────────────────────────────────────────────────── */

export type Role =
  | "owner"
  | "director"
  | "branch_manager"
  | "sales_manager"
  | "case_manager"
  | "document_specialist"
  | "finance"
  | "partner";

export interface User {
  id: string;
  tenantId: string;
  name: string;
  role: Role;
  email: string;
  phone: string;
  /** второй номер: рабочий и личный держим отдельно — так просит карточка сотрудника */
  phone2: string | null;
  birthDate: string;
  branchId: string;
  title: string;
  status: "active" | "invited" | "suspended";
  lastActiveAt: string;
  /** дата приёма на работу */
  joinedAt: string;
}

/* ── Студенты ────────────────────────────────────────────────── */

export type DegreeLevel = "language" | "bachelor" | "master" | "phd";
export type Ownership = "national" | "public" | "private";
export type LeadSource =
  | "instagram"
  | "referral"
  | "walk_in"
  | "telegram"
  | "partner"
  | "website"
  | "event";

export interface StudentProfile {
  /** уровень TOPIK 0–6, 0 = нет сертификата */
  topik: number;
  topikExpiresAt: string | null;
  ielts: number | null;
  gpa: number | null;
  /** аттестат / диплом */
  education: string;
  graduationYear: number;
  /** бюджет семьи на год обучения, USD — вузы публикуют цены в долларах */
  budgetPerYear: number;
  preferredCities: string[];
  preferredMajors: string[];
  preferredOwnership: Ownership[];
  degreeLevel: DegreeLevel;
  intake: string;
  needsDorm: boolean;
  needsScholarship: boolean;
}

export interface Student {
  id: string;
  tenantId: string;
  branchId: string;
  fullName: string;
  latinName: string;
  birthDate: string;
  phone: string;
  email: string;
  city: string;
  source: LeadSource;
  ownerId: string;
  /** агент-партнёр, приведший студента; он видит только своих приведённых */
  referredById: string | null;
  /** лид, из которого появился контакт */
  leadId: string | null;
  /** номер паспорта — третий ключ дедупликации после телефона и почты */
  passport: string | null;
  status: "lead" | "active" | "enrolled" | "paused" | "lost";
  profile: StudentProfile;
  tags: string[];
  createdAt: string;
  lastTouchAt: string;
}

/* ── Лиды ────────────────────────────────────────────────────── */

export type LeadStage = "new" | "qualification" | "in_progress" | "converted" | "junk";

/**
 * Лид — необработанное обращение. Живёт до квалификации: после конвертации
 * появляется контакт (студент) и первая сделка, а лид закрывается.
 * На один номер телефона активный лид может быть только один.
 */
export interface Lead {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email: string | null;
  source: LeadSource;
  /** канал, из которого пришло обращение */
  channelId: string | null;
  comment: string;
  stage: LeadStage;
  stageEnteredAt: string;
  ownerId: string;
  branchId: string;
  createdAt: string;
  convertedContactId: string | null;
  convertedDealId: string | null;
  junkReason: string | null;
}

/* ── Сделки ──────────────────────────────────────────────────── */

export type DealStage =
  | "new"
  | "consultation"
  | "matching"
  | "documents"
  | "submitted"
  | "university_review"
  | "offer"
  | "visa"
  | "departed"
  | "lost";

export interface Deal {
  id: string;
  tenantId: string;
  /** воронка, в которой идёт сделка */
  pipelineId: string;
  /** контакт (студент); сделок у контакта может быть несколько — по одной на вуз */
  studentId: string;
  universityId: string;
  programId: string;
  degreeLevel: DegreeLevel;
  intake: string;
  stage: DealStage;
  stageEnteredAt: string;
  ownerId: string;
  priority: "low" | "normal" | "high";
  /** ближайший внешний дедлайн по заявке */
  deadline: string | null;
  /** сумма договора с семьёй, в сумах */
  contractValue: number;
  /** оплачено, в сумах */
  paid: number;
  createdAt: string;
  note: string;
  /** лид, из которого выросла сделка */
  leadId: string | null;
}

/* ── Воронки ─────────────────────────────────────────────────── */

export interface Stage {
  key: string;
  label: Loc;
  /** цвет стадии: палитра или произвольный HEX, задаётся в настройках воронки */
  color: string;
  hint: Loc;
  /** финальные стадии не показываются на доске отдельной колонкой */
  final?: "won" | "lost";
}

export interface Pipeline {
  id: string;
  tenantId: string;
  entity: "lead" | "deal";
  name: Loc;
  stages: Stage[];
  isDefault: boolean;
}

/* ── История действий ────────────────────────────────────────── */

export type TimelineKind =
  | "stage"
  | "comment"
  | "activity"
  | "reminder"
  | "message"
  | "task"
  | "payment"
  | "document"
  | "system";

export interface TimelineEvent {
  id: string;
  tenantId: string;
  entity: "lead" | "deal" | "contact" | "employee";
  entityId: string;
  kind: TimelineKind;
  title: Loc;
  body: string | null;
  authorId: string;
  at: string;
  /** откуда пришло событие: «Чат открытой линии — Instagram Direct» */
  source: Loc | null;
  dueAt: string | null;
  done: boolean | null;
}

/* ── Каналы продаж ───────────────────────────────────────────── */

export interface Channel {
  id: string;
  tenantId: string;
  kind: "instagram" | "telegram" | "email" | "phone";
  title: string;
  handle: string;
  status: "connected" | "pending" | "off";
  connectedAt: string | null;
  /** сколько лидов пришло из канала за месяц */
  leadsPerMonth: number;
}

/* ── Структура компании и рабочий день ───────────────────────── */

export interface Department {
  id: string;
  tenantId: string;
  name: Loc;
  parentId: string | null;
  headId: string | null;
}

export interface WorkSession {
  id: string;
  tenantId: string;
  userId: string;
  date: string;
  startedAt: string;
  endedAt: string | null;
  /** суммарная пауза в минутах — как её заполняют демо-данные */
  breakMinutes: number;
  /** суммарная пауза в секундах: живая отметка считает точнее минуты */
  breakSeconds?: number;
  /** пауза идёт прямо сейчас */
  onBreakSince: string | null;
}

/* ── Проекты и шаблоны задач ─────────────────────────────────── */

export interface Project {
  id: string;
  tenantId: string;
  name: Loc;
  description: string;
  memberIds: string[];
  leadId: string;
  dueAt: string;
  status: "active" | "done" | "paused";
  createdAt: string;
}

export interface TaskTemplate {
  id: string;
  tenantId: string;
  title: Loc;
  description: Loc;
  checklist: Loc[];
  defaultAssigneeRole: Role;
}

/* ── Календарь ───────────────────────────────────────────────── */

export type EventKind = "meeting" | "call" | "interview" | "personal";

/**
 * Событие календаря — единственная сущность, которую сотрудник заводит
 * сам по времени. Дедлайны, задачи и дела в календарь попадают из своих
 * разделов и здесь не хранятся.
 */
export interface CalendarEvent {
  id: string;
  tenantId: string;
  title: string;
  kind: EventKind;
  date: string;
  /** «14:30» — время начала и конца в часовой сетке дня */
  startTime: string;
  endTime: string;
  ownerId: string;
  /** с кем встреча: контакт, сделка или никто */
  relation: { type: "student" | "deal"; id: string } | null;
  note: string;
}

/* ── Документы ───────────────────────────────────────────────── */

export type DocumentStatus =
  | "missing"
  | "requested"
  | "uploaded"
  | "verified"
  | "rejected"
  | "expiring";

export interface StudentDocument {
  id: string;
  tenantId: string;
  studentId: string;
  dealId: string | null;
  kind: Loc;
  fileName: string | null;
  sizeKb: number | null;
  status: DocumentStatus;
  version: number;
  expiresAt: string | null;
  uploadedById: string | null;
  updatedAt: string;
  /** требуется апостиль/консульская легализация */
  needsApostille: boolean;
}

/* ── Задачи ──────────────────────────────────────────────────── */

export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export interface Task {
  id: string;
  tenantId: string;
  projectId: string | null;
  title: string;
  description: string;
  assigneeId: string;
  creatorId: string;
  status: TaskStatus;
  priority: "low" | "normal" | "high";
  dueAt: string;
  createdAt: string;
  relation: { type: "student" | "deal" | "lead" | "document" | "none"; id: string } | null;
}

/* ── Дедлайны ────────────────────────────────────────────────── */

export type DeadlineKind =
  | "university"
  | "document"
  | "visa"
  | "payment"
  | "task"
  | "exam";

export interface Deadline {
  id: string;
  tenantId: string;
  kind: DeadlineKind;
  /** заголовок двуязычный: часть текста система строит сама */
  title: Loc;
  date: string;
  ownerId: string;
  relation: { type: "student" | "deal" | "university"; id: string } | null;
}

/* ── Каталог вузов ───────────────────────────────────────────── */

export interface Program {
  id: string;
  name: string;
  field: string;
  degreeLevel: DegreeLevel;
  /** стоимость года обучения, USD */
  tuitionPerYear: number;
  language: "ko" | "en" | "ko/en";
  topikMin: number;
  ieltsMin: number | null;
}

export interface University {
  id: string;
  name: string;
  nameKo: string;
  city: string;
  region: string;
  ownership: Ownership;
  founded: number;
  nationalRank: number | null;
  /** статус визового доверия Минобразования Кореи */
  visaGrade: "certified" | "general" | "restricted";
  hasLanguageCenter: boolean;
  dormAvailable: boolean;
  dormCostPerYear: number | null;
  admissionFee: number;
  scholarshipMax: number;
  requirements: {
    topikMin: number;
    ieltsMin: number | null;
    gpaMin: number | null;
    bankBalance: number;
    graduationWithinYears: number | null;
  };
  intakes: string[];
  /** дедлайн подачи документов по каждому набору — ключевая дата для оператора */
  intakeDeadlines: { intake: string; deadline: string }[];
  fields: string[];
  programs: Program[];
  /** пока каталог заполняется вручную: draft → verified после сверки с guideline */
  dataStatus: "draft" | "verified";
  sourceUrl: string | null;
  updatedAt: string;
}

/* ── Лента событий ───────────────────────────────────────────── */

export interface ActivityEvent {
  id: string;
  tenantId: string;
  actorId: string;
  verb: string;
  object: string;
  at: string;
  kind: "stage" | "document" | "task" | "student" | "payment";
}
