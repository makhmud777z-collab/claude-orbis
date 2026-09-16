import type {
  ApplicationStage,
  DeadlineKind,
  DegreeLevel,
  DocumentStatus,
  LeadSource,
  Ownership,
  TaskStatus,
} from "./types";

export interface StageMeta {
  key: ApplicationStage;
  label: string;
  short: string;
  /** цвет точки-индикатора; заливки остаются монохромными */
  dot: string;
  hint: string;
}

/** Воронка заявки: от первого контакта до вылета. */
export const STAGES: StageMeta[] = [
  { key: "new", label: "Новая заявка", short: "Новые", dot: "var(--color-status-new)", hint: "Лид оставил контакт, первый звонок не сделан" },
  { key: "consultation", label: "Консультация", short: "Консультация", dot: "var(--color-status-open)", hint: "Профиль собран, бюджет и цели обсуждены" },
  { key: "matching", label: "Подбор вузов", short: "Подбор вуза", dot: "var(--color-status-violet)", hint: "Куратор формирует шорт-лист из каталога" },
  { key: "documents", label: "Сбор документов", short: "Документы", dot: "var(--color-status-progress)", hint: "Апостиль, переводы, справка из банка" },
  { key: "submitted", label: "Подано в вуз", short: "Подача", dot: "var(--color-status-magenta)", hint: "Пакет отправлен, оплачен admission fee" },
  { key: "university_review", label: "Ожидание вуза", short: "Ожидание", dot: "var(--color-status-hold)", hint: "Вуз рассматривает, возможно интервью" },
  { key: "offer", label: "Получен offer", short: "Offer", dot: "var(--color-status-deal)", hint: "Пришло письмо о зачислении / CoA" },
  { key: "visa", label: "Виза D-2 / D-4", short: "Виза", dot: "var(--color-status-open)", hint: "Подача в консульство, ожидание решения" },
  { key: "departed", label: "Выехал", short: "Выехал", dot: "var(--color-status-deal)", hint: "Студент в Корее, кейс закрыт успешно" },
  { key: "lost", label: "Отказ / потерян", short: "Отказ", dot: "var(--color-status-risk)", hint: "Отказ вуза, консульства или самого студента" },
];

/** Колонки канбан-доски: активная операционка без архивных стадий. */
export const BOARD_STAGES: ApplicationStage[] = [
  "new",
  "consultation",
  "matching",
  "documents",
  "submitted",
  "university_review",
  "offer",
  "visa",
];

export function stageMeta(stage: ApplicationStage): StageMeta {
  return STAGES.find((s) => s.key === stage) ?? STAGES[0];
}

export const DOCUMENT_STATUS: Record<
  DocumentStatus,
  { label: string; dot: string }
> = {
  missing: { label: "Нет файла", dot: "var(--color-status-risk)" },
  requested: { label: "Запрошен", dot: "var(--color-status-new)" },
  uploaded: { label: "Загружен", dot: "var(--color-status-open)" },
  verified: { label: "Проверен", dot: "var(--color-status-deal)" },
  rejected: { label: "Отклонён", dot: "var(--color-status-risk)" },
  expiring: { label: "Истекает", dot: "var(--color-status-progress)" },
};

export const TASK_STATUS: Record<TaskStatus, { label: string; dot: string }> = {
  todo: { label: "К выполнению", dot: "var(--color-status-hold)" },
  in_progress: { label: "В работе", dot: "var(--color-status-progress)" },
  review: { label: "На проверке", dot: "var(--color-status-open)" },
  done: { label: "Готово", dot: "var(--color-status-deal)" },
};

export const DEADLINE_KIND: Record<DeadlineKind, { label: string; dot: string }> = {
  university: { label: "Дедлайн вуза", dot: "var(--color-status-magenta)" },
  document: { label: "Документ", dot: "var(--color-status-progress)" },
  visa: { label: "Виза", dot: "var(--color-status-open)" },
  payment: { label: "Оплата", dot: "var(--color-status-deal)" },
  task: { label: "Задача", dot: "var(--color-status-hold)" },
  exam: { label: "Экзамен", dot: "var(--color-status-violet)" },
};

export const SOURCE_LABEL: Record<LeadSource, string> = {
  instagram: "Instagram",
  referral: "Рекомендация",
  walk_in: "Пришёл в офис",
  telegram: "Telegram",
  partner: "Партнёр",
  website: "Сайт",
  event: "Выставка",
};

export const DEGREE_LABEL: Record<DegreeLevel, string> = {
  language: "Языковые курсы",
  bachelor: "Бакалавриат",
  master: "Магистратура",
  phd: "Докторантура",
};

export const OWNERSHIP_LABEL: Record<Ownership, string> = {
  national: "Национальный",
  public: "Государственный",
  private: "Частный",
};

export const STUDENT_STATUS: Record<
  "lead" | "active" | "enrolled" | "paused" | "lost",
  { label: string; dot: string }
> = {
  lead: { label: "Лид", dot: "var(--color-status-new)" },
  active: { label: "В работе", dot: "var(--color-status-open)" },
  enrolled: { label: "Зачислен", dot: "var(--color-status-deal)" },
  paused: { label: "На паузе", dot: "var(--color-status-hold)" },
  lost: { label: "Потерян", dot: "var(--color-status-risk)" },
};

/** Базовый чек-лист пакета документов для D-2/D-4. */
export const DOCUMENT_CHECKLIST = [
  { kind: "Загранпаспорт", needsApostille: false },
  { kind: "Аттестат / диплом", needsApostille: true },
  { kind: "Приложение с оценками", needsApostille: true },
  { kind: "Сертификат TOPIK", needsApostille: false },
  { kind: "Сертификат IELTS", needsApostille: false },
  { kind: "Справка из банка", needsApostille: false },
  { kind: "Свидетельство о рождении", needsApostille: true },
  { kind: "Справка о родстве", needsApostille: true },
  { kind: "Медицинская справка (туберкулёз)", needsApostille: false },
  { kind: "Мотивационное письмо", needsApostille: false },
  { kind: "Фото 3.5×4.5", needsApostille: false },
  { kind: "Договор с агентством", needsApostille: false },
] as const;
