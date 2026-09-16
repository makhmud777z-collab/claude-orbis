const MONTHS = [
  "янв", "фев", "мар", "апр", "мая", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

export const TODAY = new Date("2026-09-16T09:30:00");

export function parseDate(value: string): Date {
  return new Date(value.length <= 10 ? `${value}T00:00:00` : value);
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = parseDate(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatShortDate(value: string | null): string {
  if (!value) return "—";
  const d = parseDate(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatTime(value: string): string {
  const d = parseDate(value);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function daysUntil(value: string): number {
  const d = parseDate(value);
  const ms = d.getTime() - new Date(TODAY.toDateString()).getTime();
  return Math.round(ms / 86_400_000);
}

export function relativeDeadline(value: string | null): string {
  if (!value) return "без срока";
  const days = daysUntil(value);
  if (days === 0) return "сегодня";
  if (days === 1) return "завтра";
  if (days === -1) return "вчера";
  if (days < 0) return `просрочено на ${plural(-days, "день", "дня", "дней")}`;
  return `через ${plural(days, "день", "дня", "дней")}`;
}

export function relativeTime(value: string): string {
  const diff = TODAY.getTime() - parseDate(value).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${plural(hours, "час", "часа", "часов")} назад`;
  const days = Math.round(hours / 24);
  return `${plural(days, "день", "дня", "дней")} назад`;
}

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function money(value: number, currency: "USD" | "KRW" | "UZS" = "USD"): string {
  const sign = currency === "USD" ? "$" : currency === "KRW" ? "₩" : "";
  const formatted = new Intl.NumberFormat("ru-RU").format(value);
  return currency === "UZS" ? `${formatted} сум` : `${sign}${formatted}`;
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
