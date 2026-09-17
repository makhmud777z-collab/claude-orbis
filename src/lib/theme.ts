import { loc, type Loc } from "./i18n";

/**
 * Тема оформления портала.
 *
 * Хранится в cookie, поэтому её видит сервер и сразу ставит нужный
 * `data-theme` на <html>: страница не успевает мигнуть чужой палитрой.
 * Светлая — по умолчанию: портал открывают на весь рабочий день, и на
 * светлом фоне глаза устают меньше.
 */
export type Theme = "light" | "dark";

export const THEMES: { key: Theme; label: Loc; hint: Loc }[] = [
  {
    key: "light",
    label: loc("Светлая", "Yorug‘"),
    hint: loc("для работы днём", "kunduzgi ish uchun"),
  },
  {
    key: "dark",
    label: loc("Тёмная", "Qorong‘i"),
    hint: loc("для работы вечером", "kechqurungi ish uchun"),
  },
];

export function isTheme(value: string | undefined | null): value is Theme {
  return value === "light" || value === "dark";
}
