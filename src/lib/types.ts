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
  /** код входа в «Администрирование»: настройки портала закрыты от сотрудников */
  adminPasscode: string;
  createdAt: string;
  /**
   * "seed" (или не указано) — демо-агентство из моков: вход без пароля,
   * переключатель ролей открыт всем. "signup" — реальное агентство,
   * созданное через форму регистрации: без входа доступа в портал нет.
   */
  source?: "seed" | "signup";
  /** пользовательские поля карточки контакта, заведённые самим агентством */
  customFields?: CustomField[];
}

export interface Branch {
  id: string;
  name: string;
  city: string;
}

/** Тип пользовательского поля, которое агентство заводит само. */
export type CustomFieldType = "text" | "number" | "date" | "select";

/** К какой карточке относится поле: контакт, лид или сделка. */
export type CustomFieldEntity = "contact" | "lead" | "deal";

/**
 * Пользовательское поле карточки, заведённое агентством в
 * администрировании — без разработчика. Определения живут на арендаторе
 * (у каждого агентства свой набор), значения — на самой карточке.
 */
export interface CustomField {
  id: string;
  /** к какой карточке привязано поле */
  entity: CustomFieldEntity;
  label: Loc;
  type: CustomFieldType;
  /** варианты для типа «список»; для остальных типов не используется */
  options?: string[];
}

/* ── Люди ────────────────────────────────────────────────────── */

/**
 * Роль — идентификатор внутри агентства, а не значение из списка в коде.
 * Каждое агентство заводит свои роли и называет их как хочет; стартовый
 * набор (SEED_ROLES в rbac.ts) подставляется при регистрации и дальше
 * живёт как обычные данные арендатора.
 */
export type Role = string;

/** Роль агентства: название, зона видимости и галочки по разделам. */
export interface TenantRole {
  id: Role;
  tenantId: string;
  /** Loc у стартового набора, обычная строка — как её назвал админ. */
  name: string | Loc;
  scope: "tenant" | "branch" | "own";
  /** пояснение из стартового набора; у заведённых агентством его нет */
  description?: string | Loc;
  permissions: Partial<Record<string, string[]>>;
  /**
   * Владельца нельзя переименовать, урезать или удалить: иначе агентство
   * останется без входа в администрирование, и вернуть его сможет только
   * поддержка руками в базе.
   */
  system?: boolean;
}

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
  /**
   * Разделы, скрытые лично этому сотруднику решением админа (ключи модулей).
   * Это сужение поверх прав роли: убрать доступ можно, выдать сверх роли —
   * нет. Пусто/не задано — сотрудник видит всё, что даёт его роль.
   */
  restrictedModules?: string[];
  /** логин для входа в портал: свой у каждого сотрудника, уникален в рамках агентства */
  username?: string;
  /** хэш пароля (scrypt); пусто, пока сотрудник не принял приглашение */
  passwordHash?: string | null;
  /** одноразовая ссылка-приглашение: /invite/{token} */
  inviteToken?: string | null;
  inviteExpiresAt?: string | null;
}

/* ── Студенты ────────────────────────────────────────────────── */

export type DegreeLevel = "language" | "bachelor" | "master" | "phd";
export type Ownership = "national" | "public" | "private";
export type LeadSource =
  | "instagram"
  | "facebook"
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

/* ── Meta: страницы, раскладка полей, журнал ─────────────────── */

/**
 * Подключённая страница Facebook. Ключ всей маршрутизации: вебхук Meta
 * приходит одинаковый для всех агентств, и кому отдать лид, определяется
 * только по pageId.
 */
export interface MetaPage {
  id: string;
  tenantId: string;
  /** идентификатор страницы в Meta */
  pageId: string;
  pageName: string;
  /** аккаунт Instagram, привязанный к странице, если есть */
  igHandle: string | null;
  /** долгоживущий токен страницы: им забираются сами лиды */
  token: string;
  /** канал в «Каналах продаж», который эта страница питает */
  channelId: string | null;
  status: "connected" | "needs_reconnect" | "off";
  connectedAt: string;
  connectedBy: string;
  /**
   * Чей аккаунт Facebook дал доступ. По нему разбирается заявка «удалите
   * мои данные»: Meta присылает только этот идентификатор, и без него
   * искать, что именно отключать, не по чему.
   */
  connectedByFbId: string | null;
}

/**
 * Страница, которую человек только что принёс из Facebook, но ещё не выбрал.
 *
 * Вход в Facebook отдаёт сразу все страницы человека, а агентству нужны не
 * все: поэтому между возвратом и подключением стоит экран выбора. Список
 * держится в памяти до выбора и живёт недолго — в нём лежат токены страниц.
 */
export interface MetaPendingPage {
  pageId: string;
  name: string;
  token: string;
  igHandle: string | null;
}

/** Незавершённое подключение: что принёс возврат из Facebook и кому. */
export interface MetaPending {
  tenantId: string;
  /** аккаунт Facebook, который вошёл: едет дальше в подключённую страницу */
  fbUserId?: string | null;
  /** кто начал подключение: подключать будет он же */
  userId: string;
  at: string;
  pages: MetaPendingPage[];
  /**
   * Приложение Meta не настроено, и список собран из демо-данных. Экран
   * обязан сказать это прямо: иначе агентство решит, что лиды уже идут.
   */
  demo?: boolean;
}

/** Куда класть поле формы Meta. Пустая строка — не переносить. */
export type MetaTarget = "name" | "phone" | "email" | "comment" | "";

/**
 * Раскладка одной формы. У каждого агентства формы свои: одно спрашивает
 * «телефон», другое — «ваш номер для связи», поэтому соответствие полей
 * задаётся в Orbis на каждую форму отдельно.
 */
export interface MetaFormMapping {
  id: string;
  tenantId: string;
  pageId: string;
  formId: string;
  formName: string;
  /** имя поля в форме Meta → поле лида */
  map: Record<string, MetaTarget>;
  /** на кого вешать лиды этой формы; пусто — на владельца агентства */
  ownerId: string | null;
  updatedAt: string;
}

/** Журнал приходов: защита от повторов и место, куда смотреть при разборе. */
export interface MetaEvent {
  id: string;
  tenantId: string | null;
  leadgenId: string;
  pageId: string;
  formId: string;
  status: "imported" | "duplicate" | "unknown_page" | "no_mapping" | "failed";
  note: string;
  leadId: string | null;
  at: string;
}

/**
 * Заявка на удаление данных из Facebook.
 *
 * Meta требует, чтобы человек мог стереть то, что мы о нём храним, и чтобы
 * у заявки был код, по которому он проверит исполнение. Храним сам факт и
 * что было сделано — иначе на вопрос «вы правда удалили?» ответить нечем.
 */
export interface MetaDeletion {
  id: string;
  /** идентификатор человека в рамках нашего приложения */
  fbUserId: string;
  /** код, который человек увидит и сможет проверить */
  code: string;
  /** сколько подключений страниц сняли по заявке */
  removed: number;
  kind: "deletion" | "deauthorize";
  at: string;
}

/**
 * Пункт чек-листа документов агентства.
 *
 * Набор документов у агентств разный: кто-то возит студентов только по
 * языковым курсам, кому-то нужна справка о родстве, а кому-то нет. Поэтому
 * чек-лист — данные арендатора, а не список в коде.
 */
export interface ChecklistItem {
  id: string;
  tenantId: string;
  kind: Loc;
  /** нужен ли апостиль: по этому полю досье подсказывает порядок действий */
  needsApostille: boolean;
  order: number;
}

/* ── Роботы и триггеры ───────────────────────────────────────── */

/**
 * Что робот делает, когда карточка встала на стадию.
 *
 * Список закрыт нарочно: робот обязан делать то, что портал умеет на
 * самом деле. Обещать «отправить письмо клиенту» там, где почты нет,
 * хуже, чем не обещать вовсе.
 */
export type RobotAction =
  | "task"    // поставить задачу
  | "notify"  // уведомить сотрудника
  | "event"   // назначить звонок или встречу
  | "assign"  // сменить ответственного
  | "note"    // записать в историю карточки
  | "move";   // перевести на другую стадию

/**
 * Кому адресовано действие. Конкретного сотрудника выбирать можно, но
 * по умолчанию робот говорит с тем, кто ведёт карточку: иначе при
 * увольнении или отпуске вся автоматика едет в пустоту.
 */
export type RobotTarget =
  | "owner" // ответственный за карточку
  | "head"  // руководитель его подразделения
  | string; // идентификатор сотрудника

export interface Robot {
  id: string;
  tenantId: string;
  pipelineId: string;
  /** ключ стадии: робот живёт на стадии, а не на воронке целиком */
  stage: string;
  action: RobotAction;
  /** 0 — сразу при входе на стадию, иначе через столько минут */
  delayMinutes: number;
  target: RobotTarget;
  /** текст задачи, уведомления или записи — свой у каждого агентства */
  text: string;
  /**
   * Второй параметр действия: для «перевести» — ключ стадии, для
   * «назначить» — вид события, для «задачи» — важность.
   */
  param: string;
  order: number;
  enabled: boolean;
}

/**
 * Событие, по которому карточка сама переезжает на стадию.
 *
 * Робот отвечает на вопрос «карточка пришла — что сделать», триггер — на
 * обратный: «что-то случилось — куда её поставить».
 */
export type TriggerEvent =
  | "lead_created" // лид появился в системе
  | "meta_lead"    // лид пришёл из рекламы Meta
  | "comment"      // в карточку написали комментарий
  | "activity"     // отмечено дело: звонок, встреча
  | "converted"    // лид стал сделкой
  | "document";    // документ студента принят

export interface Trigger {
  id: string;
  tenantId: string;
  pipelineId: string;
  /** на какую стадию переставить карточку, когда событие случилось */
  stage: string;
  event: TriggerEvent;
  enabled: boolean;
}

/** Отложенный запуск: робот с задержкой ждёт здесь своего часа. */
export interface RobotPending {
  id: string;
  tenantId: string;
  robotId: string;
  entity: "lead" | "deal";
  entityId: string;
  /** стадия, на которой робот был заведён: карточка могла уже уехать */
  stage: string;
  dueAt: string;
  actorId: string;
}

/**
 * Журнал срабатываний. Автоматика, которую не видно, — автоматика, которой
 * не доверяют: сюда смотрят, когда «робот не сработал».
 */
export interface RobotRun {
  id: string;
  tenantId: string;
  robotId: string | null;
  /** какой триггер сработал, если это был триггер, а не робот */
  triggerId: string | null;
  entity: "lead" | "deal";
  entityId: string;
  status: "done" | "skipped" | "failed";
  note: string;
  at: string;
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
