import { loc, type Loc } from "./i18n";

/**
 * Умный фильтр разделов.
 *
 * Один механизм на весь портал: раздел описывает свои поля, а панель,
 * разбор адреса и проверка записи одинаковы везде. Значения живут в адресе
 * страницы — фильтр можно переслать коллеге ссылкой, и он увидит тот же срез.
 */

export type FieldKind = "text" | "select" | "multiselect" | "date" | "number";

export interface FilterOption {
  value: string;
  label: string;
  hint?: string;
  color?: string;
}

export interface FilterField {
  key: string;
  label: Loc;
  kind: FieldKind;
  options?: FilterOption[];
  /** поле показано в панели сразу; остальные добавляются кнопкой «Добавить поле» */
  base?: boolean;
  /** для дат и чисел: сравнение «от» и «до» вместо точного совпадения */
  range?: boolean;
}

/** Готовый срез раздела: «Мои сделки», «Просроченные», «В работе». */
export interface FilterPreset {
  key: string;
  label: Loc;
  values: FilterValues;
}

export type FilterValues = Record<string, string>;

/** Плоское представление записи: только то, по чему её фильтруют. */
export type FilterRow = Record<string, string | number | string[] | null | undefined> & {
  /** строка, по которой идёт поиск в верхнем поле */
  search: string;
};

export const FILTER_PREFIX = "f_";
export const QUERY_KEY = "q";
export const FIELDS_KEY = "fields";
export const PRESET_KEY = "preset";

/** Значения фильтра из адреса страницы. */
export function readFilter(params: Record<string, string | string[] | undefined>): FilterValues {
  const values: FilterValues = {};
  for (const [key, raw] of Object.entries(params)) {
    if (!key.startsWith(FILTER_PREFIX)) continue;
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) values[key.slice(FILTER_PREFIX.length)] = value;
  }
  return values;
}

const one = (raw: string | string[] | undefined) => (Array.isArray(raw) ? raw[0] : raw) ?? "";

export function readQuery(params: Record<string, string | string[] | undefined>): string {
  return one(params[QUERY_KEY]).trim();
}

/** Поля, которые сотрудник добавил к базовым. */
export function readFields(
  params: Record<string, string | string[] | undefined>,
  fields: FilterField[],
): string[] {
  const extra = one(params[FIELDS_KEY]).split(",").filter(Boolean);
  const base = fields.filter((f) => f.base).map((f) => f.key);
  return [...base, ...extra.filter((key) => !base.includes(key) && fields.some((f) => f.key === key))];
}

const asArray = (value: string | number | string[] | null | undefined): string[] => {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
};

/**
 * Подходит ли запись под фильтр.
 * Пустое значение поля ничего не сужает — так же, как в Битриксе:
 * незаполненное условие просто не участвует.
 */
export function matchesFilter(
  row: FilterRow,
  fields: FilterField[],
  values: FilterValues,
  query: string,
): boolean {
  if (query && !row.search.toLowerCase().includes(query.toLowerCase())) return false;

  for (const field of fields) {
    if (field.range) {
      const from = values[`${field.key}From`];
      const to = values[`${field.key}To`];
      const raw = row[field.key];
      if (!from && !to) continue;
      if (raw === null || raw === undefined || raw === "") return false;
      if (field.kind === "number") {
        const n = Number(raw);
        if (from && n < Number(from)) return false;
        if (to && n > Number(to)) return false;
      } else {
        const v = String(raw);
        if (from && v < from) return false;
        if (to && v > to) return false;
      }
      continue;
    }

    const value = values[field.key];
    if (!value) continue;

    if (field.kind === "multiselect") {
      const wanted = value.split(",").filter(Boolean);
      if (!wanted.length) continue;
      const actual = asArray(row[field.key]);
      if (!wanted.some((w) => actual.includes(w))) return false;
      continue;
    }
    if (field.kind === "text") {
      if (!String(row[field.key] ?? "").toLowerCase().includes(value.toLowerCase())) return false;
      continue;
    }
    if (String(row[field.key] ?? "") !== value) return false;
  }
  return true;
}

/** Сколько условий реально сужают выдачу — число рядом со строкой поиска. */
export function countActive(fields: FilterField[], values: FilterValues, query: string): number {
  let n = query ? 1 : 0;
  for (const field of fields) {
    if (field.range) {
      if (values[`${field.key}From`] || values[`${field.key}To`]) n += 1;
    } else if (values[field.key]) {
      n += 1;
    }
  }
  return n;
}

/** Подписи, общие для фильтра во всех разделах. */
export const FILTER_TEXT = {
  placeholder: loc("Фильтр + поиск", "Filtr + qidiruv"),
  find: loc("Найти", "Topish"),
  reset: loc("Сбросить", "Tozalash"),
  addField: loc("Добавить поле", "Maydon qo‘shish"),
  restoreFields: loc("Вернуть поля по умолчанию", "Standart maydonlarni qaytarish"),
  saveFilter: loc("Сохранить фильтр", "Filtrni saqlash"),
  savedFilters: loc("Сохранённые фильтры", "Saqlangan filtrlar"),
  filterName: loc("Название фильтра", "Filtr nomi"),
  from: loc("от", "dan"),
  to: loc("до", "gacha"),
  any: loc("Любое", "Istalgan"),
  nothing: loc("Ничего не найдено — попробуйте снять условия.", "Hech narsa topilmadi — shartlarni olib tashlang."),
  activeOne: loc("условие", "shart"),
  clearAll: loc("Снять все", "Barchasini olib tashlash"),
} satisfies Record<string, Loc>;
