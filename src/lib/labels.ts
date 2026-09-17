import { loc, type Loc } from "./i18n";
import type {
  DeadlineKind,
  DegreeLevel,
  DocumentStatus,
  LeadSource,
  Ownership,
  TaskStatus,
} from "./types";

/**
 * Стадии воронок больше не константы: они лежат в данных воронки (Pipeline),
 * потому что агентство переименовывает их и меняет цвета в настройках CRM.
 * Здесь остаются только справочники, которые не настраиваются.
 */

export const DOCUMENT_STATUS: Record<DocumentStatus, { label: Loc; dot: string }> = {
  missing: { label: loc("Нет файла", "Fayl yo‘q"), dot: "var(--color-status-risk)" },
  requested: { label: loc("Запрошен", "So‘ralgan"), dot: "var(--color-status-new)" },
  uploaded: { label: loc("Загружен", "Yuklangan"), dot: "var(--color-status-open)" },
  verified: { label: loc("Проверен", "Tekshirilgan"), dot: "var(--color-status-deal)" },
  rejected: { label: loc("Отклонён", "Rad etilgan"), dot: "var(--color-status-risk)" },
  expiring: { label: loc("Истекает", "Muddati tugayapti"), dot: "var(--color-status-progress)" },
};

export const TASK_STATUS: Record<TaskStatus, { label: Loc; dot: string }> = {
  todo: { label: loc("К выполнению", "Bajarilishi kerak"), dot: "var(--color-status-hold)" },
  in_progress: { label: loc("В работе", "Ishda"), dot: "var(--color-status-progress)" },
  review: { label: loc("На проверке", "Tekshiruvda"), dot: "var(--color-status-open)" },
  done: { label: loc("Готово", "Bajarildi"), dot: "var(--color-status-deal)" },
};

export const DEADLINE_KIND: Record<DeadlineKind, { label: Loc; dot: string }> = {
  university: { label: loc("Дедлайн вуза", "Universitet muddati"), dot: "var(--color-status-magenta)" },
  document: { label: loc("Документ", "Hujjat"), dot: "var(--color-status-progress)" },
  visa: { label: loc("Виза", "Viza"), dot: "var(--color-status-open)" },
  payment: { label: loc("Оплата", "To‘lov"), dot: "var(--color-status-deal)" },
  task: { label: loc("Задача", "Vazifa"), dot: "var(--color-status-hold)" },
  exam: { label: loc("Экзамен", "Imtihon"), dot: "var(--color-status-violet)" },
};

export const SOURCE_LABEL: Record<LeadSource, Loc> = {
  instagram: loc("Instagram", "Instagram"),
  referral: loc("Рекомендация", "Tavsiya"),
  walk_in: loc("Пришёл в офис", "Ofisga keldi"),
  telegram: loc("Telegram", "Telegram"),
  partner: loc("Партнёр", "Hamkor"),
  website: loc("Сайт", "Sayt"),
  event: loc("Выставка", "Ko‘rgazma"),
};

export const DEGREE_LABEL: Record<DegreeLevel, Loc> = {
  language: loc("Языковые курсы", "Til kurslari"),
  bachelor: loc("Бакалавриат", "Bakalavriat"),
  master: loc("Магистратура", "Magistratura"),
  phd: loc("Докторантура", "Doktorantura"),
};

export const OWNERSHIP_LABEL: Record<Ownership, Loc> = {
  national: loc("Национальный", "Milliy"),
  public: loc("Государственный", "Davlat"),
  private: loc("Частный", "Xususiy"),
};

export const STUDENT_STATUS: Record<
  "lead" | "active" | "enrolled" | "paused" | "lost",
  { label: Loc; dot: string }
> = {
  lead: { label: loc("Лид", "Lid"), dot: "var(--color-status-new)" },
  active: { label: loc("В работе", "Ishda"), dot: "var(--color-status-open)" },
  enrolled: { label: loc("Зачислен", "Qabul qilindi"), dot: "var(--color-status-deal)" },
  paused: { label: loc("На паузе", "To‘xtatilgan"), dot: "var(--color-status-hold)" },
  lost: { label: loc("Потерян", "Yo‘qotilgan"), dot: "var(--color-status-risk)" },
};

export const PRIORITY_LABEL: Record<"low" | "normal" | "high", Loc> = {
  low: loc("низкий", "past"),
  normal: loc("обычный", "oddiy"),
  high: loc("высокий", "yuqori"),
};

export const VISA_GRADE_LABEL: Record<"certified" | "general" | "restricted", Loc> = {
  certified: loc("Сертифицированный (упрощённая виза)", "Sertifikatlangan (yengil viza)"),
  general: loc("Обычный", "Oddiy"),
  restricted: loc("С ограничениями", "Cheklovlar bilan"),
};

export const PROGRAM_LANGUAGE: Record<"ko" | "en" | "ko/en", Loc> = {
  ko: loc("корейский", "koreys tili"),
  en: loc("английский", "ingliz tili"),
  "ko/en": loc("корейский / английский", "koreys / ingliz"),
};

/** Базовый чек-лист пакета документов для D-2/D-4. */
export const DOCUMENT_CHECKLIST: { kind: Loc; needsApostille: boolean }[] = [
  { kind: loc("Загранпаспорт", "Xorijiy pasport"), needsApostille: false },
  { kind: loc("Аттестат / диплом", "Attestat / diplom"), needsApostille: true },
  { kind: loc("Приложение с оценками", "Baholar ilovasi"), needsApostille: true },
  { kind: loc("Сертификат TOPIK", "TOPIK sertifikati"), needsApostille: false },
  { kind: loc("Сертификат IELTS", "IELTS sertifikati"), needsApostille: false },
  { kind: loc("Справка из банка", "Bankdan ma’lumotnoma"), needsApostille: false },
  { kind: loc("Свидетельство о рождении", "Tug‘ilganlik guvohnomasi"), needsApostille: true },
  { kind: loc("Справка о родстве", "Qarindoshlik ma’lumotnomasi"), needsApostille: true },
  { kind: loc("Медицинская справка (туберкулёз)", "Tibbiy ma’lumotnoma (sil)"), needsApostille: false },
  { kind: loc("Мотивационное письмо", "Motivatsion xat"), needsApostille: false },
  { kind: loc("Фото 3.5×4.5", "Rasm 3.5×4.5"), needsApostille: false },
  { kind: loc("Договор с агентством", "Agentlik bilan shartnoma"), needsApostille: false },
];

/** Стабильный ключ пункта чек-листа — по русскому названию. */
export const checklistKey = (kind: Loc) => kind.ru;

/**
 * Справочные значения приходят из данных на русском — он канонический ключ.
 * Свободный текст (заметки кураторов, названия задач, лента событий)
 * не переводится: это пользовательский контент, а не интерфейс.
 */
export const FIELD_LABEL: Record<string, Loc> = {
  "Медицина": loc("Медицина", "Tibbiyot"),
  "Инженерия": loc("Инженерия", "Muhandislik"),
  "IT и Computer Science": loc("IT и Computer Science", "IT va Computer Science"),
  "Бизнес и менеджмент": loc("Бизнес и менеджмент", "Biznes va menejment"),
  "Дизайн и искусство": loc("Дизайн и искусство", "Dizayn va san’at"),
  "Гуманитарные науки": loc("Гуманитарные науки", "Gumanitar fanlar"),
  "Естественные науки": loc("Естественные науки", "Tabiiy fanlar"),
  "Языковая программа": loc("Языковая программа", "Til dasturi"),
};

export const CITY_LABEL: Record<string, Loc> = {
  "Сеул": loc("Сеул", "Seul"),
  "Пусан": loc("Пусан", "Busan"),
  "Инчхон": loc("Инчхон", "Incheon"),
  "Тэгу": loc("Тэгу", "Daegu"),
  "Тэджон": loc("Тэджон", "Daejeon"),
  "Кванджу": loc("Кванджу", "Gwangju"),
  "Сувон": loc("Сувон", "Suwon"),
  "Чонджу": loc("Чонджу", "Jeonju"),
  "Ташкент": loc("Ташкент", "Toshkent"),
  "Самарканд": loc("Самарканд", "Samarqand"),
  "Алматы": loc("Алматы", "Almati"),
  "Бишкек": loc("Бишкек", "Bishkek"),
};

export const REGION_LABEL: Record<string, Loc> = {
  "Столичный регион": loc("Столичный регион", "Poytaxt mintaqasi"),
  "Кёнсан-Намдо": loc("Кёнсан-Намдо", "Gyeongsang-Namdo"),
  "Кёнсан-Пукто": loc("Кёнсан-Пукто", "Gyeongsang-Bukto"),
  "Чхунчхон-Намдо": loc("Чхунчхон-Намдо", "Chungcheong-Namdo"),
  "Чолла-Намдо": loc("Чолла-Намдо", "Jeolla-Namdo"),
  "Чолла-Пукто": loc("Чолла-Пукто", "Jeolla-Bukto"),
  "Кёнги-До": loc("Кёнги-До", "Gyeonggi-Do"),
};

export const INTAKE_LABEL: Record<string, Loc> = {
  "2026 Осень": loc("2026 Осень", "2026 Kuz"),
  "2027 Весна": loc("2027 Весна", "2027 Bahor"),
  "2027 Осень": loc("2027 Осень", "2027 Kuz"),
};

export const BRANCH_LABEL: Record<string, Loc> = {
  "Головной офис": loc("Головной офис", "Bosh ofis"),
  "Филиал": loc("Филиал", "Filial"),
  "Филиал, Самарканд": loc("Филиал, Самарканд", "Filial, Samarqand"),
};

/** Справочник с запасным вариантом: неизвестное значение показываем как есть. */
export const ref = (dict: Record<string, Loc>, value: string): Loc =>
  dict[value] ?? loc(value, value);
