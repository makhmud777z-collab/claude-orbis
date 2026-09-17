/**
 * Локализация.
 * Единый механизм: любая переводимая строка — объект {ru, uz}.
 * Ключей-строк нет, поэтому опечатка в переводе — ошибка компиляции,
 * а не пустое место в интерфейсе.
 */

export type Locale = "ru" | "uz";

export const LOCALES: { key: Locale; label: string; short: string }[] = [
  { key: "ru", label: "Русский", short: "RU" },
  { key: "uz", label: "O‘zbekcha", short: "UZ" },
];

export interface Loc {
  ru: string;
  uz: string;
}

export const loc = (ru: string, uz: string): Loc => ({ ru, uz });

export type Translate = (value: Loc) => string;

/** t = translator(locale); t(S.nav.students) */
export const translator =
  (locale: Locale): Translate =>
  (value: Loc) =>
    value[locale] ?? value.ru;

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "ru" || value === "uz";
}
