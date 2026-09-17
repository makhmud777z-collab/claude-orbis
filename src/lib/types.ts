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
  branchId: string;
  title: string;
  status: "active" | "invited" | "suspended";
  lastActiveAt: string;
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
  status: "lead" | "active" | "enrolled" | "paused" | "lost";
  profile: StudentProfile;
  tags: string[];
  createdAt: string;
  lastTouchAt: string;
}

/* ── Заявки ──────────────────────────────────────────────────── */

export type ApplicationStage =
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

export interface Application {
  id: string;
  tenantId: string;
  studentId: string;
  universityId: string;
  programId: string;
  degreeLevel: DegreeLevel;
  intake: string;
  stage: ApplicationStage;
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
  applicationId: string | null;
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
  title: string;
  description: string;
  assigneeId: string;
  creatorId: string;
  status: TaskStatus;
  priority: "low" | "normal" | "high";
  dueAt: string;
  createdAt: string;
  relation: { type: "student" | "application" | "document" | "none"; id: string } | null;
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
  relation: { type: "student" | "application" | "university"; id: string } | null;
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
