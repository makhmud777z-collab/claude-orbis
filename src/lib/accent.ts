import { loc, type Loc } from "./i18n";

/**
 * Цвет портала.
 *
 * Один акцент на весь интерфейс: ссылки, фокус, выделение, главная кнопка,
 * активный пункт меню. Поэтому выбор — это не «тема оформления», а именно
 * цвет: всё остальное остаётся тем же.
 *
 * Хранится в cookie рядом с темой, чтобы сервер подставил переменную сразу
 * на <html> и страница не мигнула чужим цветом при загрузке.
 *
 * Шесть значений, а не палитра из пятидесяти: акцент должен оставаться
 * различимым рядом со статусными цветами — красным «просрочено», зелёным
 * «успех», жёлтым «в работе». Каждое из шести проверено на это.
 */
export type Accent = "indigo" | "ocean" | "teal" | "plum" | "coral" | "graphite";

export interface AccentSpec {
  key: Accent;
  label: Loc;
  /** светлая тема */
  light: string;
  /** тёмная: на тёмном фоне тот же тон читается глуше, поэтому светлее */
  dark: string;
}

export const ACCENTS: AccentSpec[] = [
  { key: "indigo", label: loc("Индиго", "Indigo"), light: "#4c5ce0", dark: "#7b88ff" },
  { key: "ocean", label: loc("Океан", "Okean"), light: "#0a74c4", dark: "#44a6f0" },
  { key: "teal", label: loc("Хвоя", "Igna"), light: "#0e8777", dark: "#2fc0aa" },
  { key: "plum", label: loc("Слива", "Olxo‘ri"), light: "#8b3fb8", dark: "#c06ae8" },
  { key: "coral", label: loc("Коралл", "Marjon"), light: "#d6452f", dark: "#ff7a62" },
  { key: "graphite", label: loc("Графит", "Grafit"), light: "#37475e", dark: "#9fb0c8" },
];

export const DEFAULT_ACCENT: Accent = "indigo";

export function isAccent(value: string | undefined | null): value is Accent {
  return ACCENTS.some((a) => a.key === value);
}

export const accentSpec = (key: Accent): AccentSpec =>
  ACCENTS.find((a) => a.key === key) ?? ACCENTS[0];

/** Значение переменной для текущей темы — его ставит layout на <html>. */
export const accentValue = (key: Accent, theme: "light" | "dark"): string =>
  theme === "dark" ? accentSpec(key).dark : accentSpec(key).light;
