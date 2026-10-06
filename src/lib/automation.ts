import { loc, type Loc } from "./i18n";
import type { EventKind, RobotAction, TriggerEvent } from "./types";

/**
 * Роботы и триггеры: что агентство вообще может собрать.
 *
 * Весь набор действий и событий описан здесь данными, а не разбросан по
 * экрану и обработчику. Экран строит из этого формы, а runRobots —
 * выполнение: добавить действие значит дописать одну запись сюда и одну
 * ветку в runner, и больше нигде.
 *
 * Список закрыт нарочно. Робот обязан делать то, что портал делает на
 * самом деле: кнопка «отправить письмо клиенту» там, где почты нет, —
 * обещание, которое агентство обнаружит невыполненным на живых заявках.
 */

/** Какой второй параметр просит действие — от этого зависит форма. */
export type RobotParam = "none" | "stage" | "priority" | "eventKind";

export interface ActionSpec {
  id: RobotAction;
  label: Loc;
  hint: Loc;
  /** спрашивать ли «кому»: запись в историю и перевод ни к кому не адресованы */
  needsTarget: boolean;
  /** спрашивать ли текст */
  needsText: boolean;
  param: RobotParam;
  /** цвет метки действия на карточке робота */
  tone: string;
}

export const ROBOT_ACTIONS: ActionSpec[] = [
  {
    id: "task",
    label: loc("Поставить задачу", "Vazifa qo‘yish"),
    hint: loc("задача появится в разделе «Задачи»", "vazifa «Vazifalar» bo‘limida paydo bo‘ladi"),
    needsTarget: true,
    needsText: true,
    param: "priority",
    tone: "var(--color-status-progress)",
  },
  {
    id: "notify",
    label: loc("Уведомить сотрудника", "Xodimni ogohlantirish"),
    hint: loc("запись появится в колокольчике", "yozuv qo‘ng‘iroqchada paydo bo‘ladi"),
    needsTarget: true,
    needsText: true,
    param: "none",
    tone: "var(--color-accent)",
  },
  {
    id: "event",
    label: loc("Назначить звонок или встречу", "Qo‘ng‘iroq yoki uchrashuv belgilash"),
    hint: loc("событие встанет в календарь", "hodisa kalendarga tushadi"),
    needsTarget: true,
    needsText: true,
    param: "eventKind",
    tone: "var(--color-status-deal)",
  },
  {
    id: "assign",
    label: loc("Сменить ответственного", "Mas’ulni almashtirish"),
    hint: loc("карточка перейдёт другому сотруднику", "karta boshqa xodimga o‘tadi"),
    needsTarget: true,
    needsText: false,
    param: "none",
    tone: "var(--color-status-hold)",
  },
  {
    id: "note",
    label: loc("Записать в историю", "Tarixga yozish"),
    hint: loc("строка в ленте карточки", "karta lentasida qator"),
    needsTarget: false,
    needsText: true,
    param: "none",
    tone: "var(--color-ink-faint)",
  },
  {
    id: "move",
    label: loc("Перевести на стадию", "Bosqichga o‘tkazish"),
    hint: loc("карточка уедет дальше по воронке", "karta voronka bo‘ylab keyinga o‘tadi"),
    needsTarget: false,
    needsText: false,
    param: "stage",
    tone: "var(--color-status-risk)",
  },
];

export const actionSpec = (id: RobotAction): ActionSpec =>
  ROBOT_ACTIONS.find((a) => a.id === id) ?? ROBOT_ACTIONS[0];

export interface TriggerSpec {
  id: TriggerEvent;
  label: Loc;
  hint: Loc;
  /** для каких воронок событие имеет смысл */
  entity: "lead" | "deal" | "both";
}

export const TRIGGER_EVENTS: TriggerSpec[] = [
  {
    id: "lead_created",
    label: loc("Лид создан", "Lid yaratildi"),
    hint: loc("любая новая заявка", "har qanday yangi ariza"),
    entity: "lead",
  },
  {
    id: "meta_lead",
    label: loc("Лид из рекламы Meta", "Meta reklamasidan lid"),
    hint: loc("заявка пришла из формы Facebook", "ariza Facebook formasidan keldi"),
    entity: "lead",
  },
  {
    id: "comment",
    label: loc("Комментарий в карточке", "Kartada izoh"),
    hint: loc("сотрудник написал в ленте", "xodim lentaga yozdi"),
    entity: "both",
  },
  {
    id: "activity",
    label: loc("Отмечено дело или звонок", "Ish yoki qo‘ng‘iroq belgilandi"),
    hint: loc("в ленту добавили дело", "lentaga ish qo‘shildi"),
    entity: "both",
  },
  {
    id: "converted",
    label: loc("Лид стал сделкой", "Lid bitimga aylandi"),
    hint: loc("после конвертации лида", "lid konvertatsiyasidan so‘ng"),
    entity: "deal",
  },
  {
    id: "document",
    label: loc("Документ принят", "Hujjat qabul qilindi"),
    hint: loc("пункт досье проверен", "dosye bandi tekshirildi"),
    entity: "deal",
  },
];

export const triggerSpec = (id: TriggerEvent): TriggerSpec | undefined =>
  TRIGGER_EVENTS.find((e) => e.id === id);

/** События, которые имеет смысл вешать на воронку этой сущности. */
export const triggersFor = (entity: "lead" | "deal") =>
  TRIGGER_EVENTS.filter((e) => e.entity === entity || e.entity === "both");

/* ── задержка ────────────────────────────────────────────────── */

/**
 * Готовые задержки вместо поля ввода минут.
 *
 * «Через 2160 минут» никто не считает в уме, а свободное поле заводит
 * разговор о секундах и месяцах, которых здесь не будет. Семи шагов
 * хватает на всё, что агентство реально настраивает.
 */
export const DELAYS: { minutes: number; label: Loc }[] = [
  { minutes: 0, label: loc("сразу", "darhol") },
  { minutes: 15, label: loc("через 15 минут", "15 daqiqadan so‘ng") },
  { minutes: 60, label: loc("через час", "bir soatdan so‘ng") },
  { minutes: 240, label: loc("через 4 часа", "4 soatdan so‘ng") },
  { minutes: 1440, label: loc("через день", "bir kundan so‘ng") },
  { minutes: 4320, label: loc("через 3 дня", "3 kundan so‘ng") },
  { minutes: 10080, label: loc("через неделю", "bir haftadan so‘ng") },
];

export function delayLabel(minutes: number): Loc {
  const known = DELAYS.find((d) => d.minutes === minutes);
  if (known) return known.label;
  if (minutes < 60) return loc(`через ${minutes} мин`, `${minutes} daq. so‘ng`);
  if (minutes < 1440) return loc(`через ${Math.round(minutes / 60)} ч`, `${Math.round(minutes / 60)} soat so‘ng`);
  return loc(`через ${Math.round(minutes / 1440)} дн`, `${Math.round(minutes / 1440)} kun so‘ng`);
}

/* ── кому ────────────────────────────────────────────────────── */

export const TARGET_OWNER = "owner";
export const TARGET_HEAD = "head";

export const TARGETS: { id: string; label: Loc }[] = [
  { id: TARGET_OWNER, label: loc("Ответственный за карточку", "Karta mas’uli") },
  { id: TARGET_HEAD, label: loc("Руководитель подразделения", "Bo‘lim rahbari") },
];

/* ── виды событий и важность ─────────────────────────────────── */

export const EVENT_KINDS: { id: EventKind; label: Loc }[] = [
  { id: "call", label: loc("Звонок", "Qo‘ng‘iroq") },
  { id: "meeting", label: loc("Встреча", "Uchrashuv") },
  { id: "interview", label: loc("Собеседование", "Suhbat") },
];

export const PRIORITIES: { id: "low" | "normal" | "high"; label: Loc }[] = [
  { id: "low", label: loc("Низкая", "Past") },
  { id: "normal", label: loc("Обычная", "Oddiy") },
  { id: "high", label: loc("Высокая", "Yuqori") },
];
