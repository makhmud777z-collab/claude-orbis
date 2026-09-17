import type { Locale } from "./i18n";

const MONTHS: Record<Locale, string[]> = {
  ru: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
  uz: ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"],
};

export const TODAY = new Date("2026-09-16T09:30:00");

export function parseDate(value: string): Date {
  return new Date(value.length <= 10 ? `${value}T00:00:00` : value);
}

export function daysUntil(value: string): number {
  const ms = parseDate(value).getTime() - new Date(TODAY.toDateString()).getTime();
  return Math.round(ms / 86_400_000);
}

export function age(birthDate: string): number {
  const d = parseDate(birthDate);
  let years = TODAY.getFullYear() - d.getFullYear();
  const m = TODAY.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && TODAY.getDate() < d.getDate())) years -= 1;
  return years;
}

export function initials(name: string): string {
  const [a, b] = name.trim().split(/\s+/);
  return `${a?.[0] ?? ""}${b?.[0] ?? ""}`.toUpperCase();
}

/**
 * Склонения: в русском три формы, в узбекском слово не меняется.
 * Поэтому склонение — часть локали, а не отдельная утилита.
 */
function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}

const DAY_WORDS: Record<Locale, [string, string, string]> = {
  ru: ["день", "дня", "дней"],
  uz: ["kun", "kun", "kun"],
};
const HOUR_WORDS: Record<Locale, [string, string, string]> = {
  ru: ["час", "часа", "часов"],
  uz: ["soat", "soat", "soat"],
};

/**
 * Деньги.
 * Договоры агентства ведутся в сумах, стоимость обучения в Корее —
 * в долларах: так её публикуют вузы. Курс хранится у арендатора,
 * пересчёт показывается рядом, чтобы семья видела привычную цифру.
 */
const SOM_WORDS: Record<Locale, { unit: string; mln: string; mlrd: string }> = {
  ru: { unit: "сум", mln: "млн", mlrd: "млрд" },
  uz: { unit: "so‘m", mln: "mln", mlrd: "mlrd" },
};

export function som(
  value: number,
  opts: { compact?: boolean; locale?: Locale } = {},
): string {
  const w = SOM_WORDS[opts.locale ?? "ru"];
  if (opts.compact) {
    if (value >= 1_000_000_000)
      return `${(value / 1_000_000_000).toFixed(1).replace(".", ",")} ${w.mlrd} ${w.unit}`;
    if (value >= 1_000_000) return `${Math.round(value / 1_000_000)} ${w.mln} ${w.unit}`;
  }
  return `${new Intl.NumberFormat("ru-RU").format(Math.round(value))} ${w.unit}`;
}

export function usd(value: number): string {
  return `$${new Intl.NumberFormat("ru-RU").format(Math.round(value))}`;
}

export function usdToSom(value: number, rate: number): number {
  return Math.round((value * rate) / 100_000) * 100_000;
}

export interface Formatters {
  locale: Locale;
  /** склонение существительного при числе: 1 вуз · 2 вуза · 12 вузов */
  plural: (n: number, forms: Record<Locale, [string, string, string]>) => string;
  date: (value: string | null) => string;
  shortDate: (value: string | null) => string;
  time: (value: string) => string;
  relativeDeadline: (value: string | null) => string;
  relativeTime: (value: string) => string;
  days: (n: number) => string;
  som: (value: number, opts?: { compact?: boolean }) => string;
  usd: typeof usd;
  /** «$7 800 · 101 млн сум» — цена вуза с пересчётом по курсу арендатора */
  usdWithSom: (value: number, rate: number) => string;
}

export function formatters(locale: Locale): Formatters {
  const date = (value: string | null) => {
    if (!value) return "—";
    const d = parseDate(value);
    return `${d.getDate()} ${MONTHS[locale][d.getMonth()]} ${d.getFullYear()}`;
  };

  const shortDate = (value: string | null) => {
    if (!value) return "—";
    const d = parseDate(value);
    return `${d.getDate()} ${MONTHS[locale][d.getMonth()]}`;
  };

  const days = (n: number) =>
    locale === "ru"
      ? pluralRu(n, ...DAY_WORDS.ru)
      : `${n} ${DAY_WORDS.uz[0]}`;

  const hours = (n: number) =>
    locale === "ru"
      ? pluralRu(n, ...HOUR_WORDS.ru)
      : `${n} ${HOUR_WORDS.uz[0]}`;

  const relativeDeadline = (value: string | null) => {
    if (!value) return locale === "ru" ? "без срока" : "muddatsiz";
    const d = daysUntil(value);
    if (d === 0) return locale === "ru" ? "сегодня" : "bugun";
    if (d === 1) return locale === "ru" ? "завтра" : "ertaga";
    if (d === -1) return locale === "ru" ? "вчера" : "kecha";
    if (d < 0)
      return locale === "ru"
        ? `просрочено на ${days(-d)}`
        : `${days(-d)} kechikdi`;
    return locale === "ru" ? `через ${days(d)}` : `${days(d)}dan keyin`;
  };

  const relativeTime = (value: string) => {
    const diff = TODAY.getTime() - parseDate(value).getTime();
    const minutes = Math.round(diff / 60_000);
    if (minutes < 1) return locale === "ru" ? "только что" : "hozirgina";
    if (minutes < 60)
      return locale === "ru" ? `${minutes} мин назад` : `${minutes} daqiqa oldin`;
    const h = Math.round(minutes / 60);
    if (h < 24)
      return locale === "ru" ? `${hours(h)} назад` : `${hours(h)} oldin`;
    const d = Math.round(h / 24);
    return locale === "ru" ? `${days(d)} назад` : `${days(d)} oldin`;
  };

  return {
    locale,
    plural: (n, forms) =>
      locale === "ru" ? pluralRu(n, ...forms.ru) : `${n} ${forms.uz[0]}`,
    date,
    shortDate,
    time: (value: string) => {
      const d = parseDate(value);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    },
    relativeDeadline,
    relativeTime,
    days,
    som: (value, opts = {}) => som(value, { ...opts, locale }),
    usd,
    usdWithSom: (value: number, rate: number) =>
      `${usd(value)} · ${som(usdToSom(value, rate), { compact: true, locale })}`,
  };
}
