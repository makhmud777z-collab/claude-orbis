import Link from "next/link";
import type { ReactNode } from "react";
import { IconMail, IconPhone } from "./icons";
import { Avatar, Progress, StatusDot } from "./ui";
import type { ListColumn } from "@/lib/list-columns";

export interface RecordRow {
  id: string;
  /** карточка записи, если она есть: у задачи своей страницы нет */
  href?: string | null;
  title: string;
  subtitle?: string | null;
  /** цветная метка слева — просрочка или высокий приоритет, как на доске */
  flag?: string | null;
  /** все возможные колонки раздела: показываются только выбранные */
  cells: Record<string, ReactNode>;
}

/**
 * Список записей рядом с доской — как в Битриксе.
 *
 * Доска отвечает на вопрос «где затор», список — «что у нас вообще есть»:
 * суммы, сроки и ответственные видны подряд, а не по одной карточке.
 *
 * Колонки приходят готовым списком, а строки несут все возможные ячейки
 * раздела. Так список один на весь портал: лиды, сделки, задачи и проекты
 * отличаются не кодом таблицы, а набором ячеек, который собирает страница.
 *
 * Название записи не отключается: это ссылка на карточку, и строка без неё
 * никуда не ведёт. Остальное сотрудник убирает и возвращает сам.
 */
export function RecordList({
  columns,
  rows,
  nameLabel,
  noColumnsNote,
}: {
  columns: ListColumn[];
  rows: RecordRow[];
  nameLabel: string;
  /** подсказка на случай, когда сотрудник снял все колонки */
  noColumnsNote?: string;
}) {
  // Ширина под колонки: название забирает больше всех, остальные — поровну.
  // Меньше этой ширины таблица не сжимается, а уезжает в горизонтальную
  // прокрутку: сплющенные колонки с переносами читать невозможно.
  const minWidth = 320 + columns.length * 150;

  return (
    <div className="card overflow-hidden">
      <div className="scroll-x">
        <table className="w-full border-collapse" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-hairline-soft" style={{ background: "var(--color-surface-2)" }}>
              <th className="t-micro px-5 py-3 text-left font-medium uppercase tracking-[0.07em] text-ink-faint">
                {nameLabel}
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="t-micro px-5 py-3 font-medium uppercase tracking-[0.07em] text-ink-faint"
                  style={{ textAlign: column.numeric ? "right" : "left" }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="row-hover border-b border-hairline-soft last:border-b-0 hover:bg-surface-2"
              >
                <td className="px-5 py-3">
                  <Name row={row} />
                </td>

                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-5 py-3"
                    style={{ textAlign: column.numeric ? "right" : "left" }}
                  >
                    {row.cells[column.key] ?? <span className="t-caption text-ink-faint">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!columns.length && noColumnsNote ? (
        <div className="t-micro border-t border-hairline-soft px-5 py-3 text-ink-faint">
          {noColumnsNote}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Название записи. Ссылкой — когда у записи есть своя страница; у задачи её
 * нет, и притворяться ссылкой в таком случае хуже, чем не быть ею.
 */
function Name({ row }: { row: RecordRow }) {
  const body = (
    <>
      {row.flag ? (
        <span
          aria-hidden
          className="absolute -left-2.5 top-1 h-6 w-[3px] rounded-full"
          style={{ background: row.flag }}
        />
      ) : null}
      <span className="t-body-sm block truncate font-medium">{row.title}</span>
      {row.subtitle ? (
        <span className="t-micro block truncate text-ink-faint">{row.subtitle}</span>
      ) : null}
    </>
  );

  return row.href ? (
    <Link href={row.href} className="relative block min-w-0">
      {body}
    </Link>
  ) : (
    <span className="relative block min-w-0">{body}</span>
  );
}

/* ── ячейки ──────────────────────────────────────────────────────
   Собраны здесь, а не в страницах: иначе одна и та же стадия в списке лидов
   и в списке сделок начинает выглядеть по-разному. ─────────────── */

/** Стадия или статус: точка цвета, подпись и необязательная пометка рядом. */
export function TagCell({
  label,
  color,
  note,
  noteColor,
}: {
  label: string;
  color: string;
  note?: string | null;
  noteColor?: string;
}) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="chip">
        <StatusDot color={color} />
        {label}
      </span>
      {note ? (
        <span
          className="t-micro whitespace-nowrap rounded-full px-2 py-0.5"
          style={{
            background: `color-mix(in srgb, ${noteColor ?? "var(--color-status-progress)"} 16%, transparent)`,
            color: noteColor ?? "var(--color-status-progress)",
          }}
        >
          {note}
        </span>
      ) : null}
    </span>
  );
}

/** Человек: аватар и имя. Одного имени мало — глаз ищет лицо. */
export function PersonCell({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2">
      <Avatar name={name} size={24} />
      <span className="t-caption whitespace-nowrap text-ink-muted">{name}</span>
    </span>
  );
}

/** Несколько людей подряд — участники проекта. */
export function PeopleCell({ names, limit = 4 }: { names: string[]; limit?: number }) {
  if (!names.length) return <span className="t-caption text-ink-faint">—</span>;
  const shown = names.slice(0, limit);
  return (
    <span className="flex items-center gap-1">
      {shown.map((name) => (
        <span key={name} title={name}>
          <Avatar name={name} size={22} />
        </span>
      ))}
      {names.length > shown.length ? (
        <span className="t-micro t-num text-ink-faint">+{names.length - shown.length}</span>
      ) : null}
    </span>
  );
}

/** Число или дата: моноширинная цифра и подпись под ней. */
export function NumCell({
  value,
  hint,
  accent,
}: {
  value: string;
  hint?: string | null;
  accent?: string | null;
}) {
  return (
    <span className="block">
      <span
        className="t-body-sm t-num block whitespace-nowrap"
        style={{ color: accent ?? undefined, fontWeight: accent ? 600 : undefined }}
      >
        {value}
      </span>
      {hint ? <span className="t-micro block whitespace-nowrap text-ink-faint">{hint}</span> : null}
    </span>
  );
}

/** Обычный текст: длинный — в одну строку с обрезкой, иначе строки разъезжаются. */
export function TextCell({ value, hint }: { value: string; hint?: string | null }) {
  return (
    <span className="block max-w-[260px]">
      <span className="t-caption block truncate text-ink-muted">{value}</span>
      {hint ? <span className="t-micro block truncate text-ink-faint">{hint}</span> : null}
    </span>
  );
}

/** Готовность: полоса и доля — читается быстрее, чем «7 / 12». */
export function BarCell({ percent, note }: { percent: number; note?: string | null }) {
  return (
    <span className="ml-auto block w-[110px]">
      <span className="t-micro t-num mb-1 block text-right text-ink-muted">
        {Math.round(percent)}%
      </span>
      <Progress percent={percent} />
      {note ? <span className="t-micro mt-1 block text-right text-ink-faint">{note}</span> : null}
    </span>
  );
}

/** Позвонить и написать прямо из строки, без захода в карточку. */
export function ContactsCell({
  phone,
  email,
  callLabel,
  writeLabel,
}: {
  phone: string | null;
  email: string | null;
  callLabel: string;
  writeLabel: string;
}) {
  if (!phone && !email) return <span className="t-caption text-ink-faint">—</span>;
  return (
    <span className="flex items-center gap-1">
      {phone ? (
        <a className="btn-icon h-8 w-8" href={`tel:${phone}`} aria-label={callLabel} title={phone}>
          <IconPhone size={14} />
        </a>
      ) : null}
      {email ? (
        <a className="btn-icon h-8 w-8" href={`mailto:${email}`} aria-label={writeLabel} title={email}>
          <IconMail size={14} />
        </a>
      ) : null}
    </span>
  );
}
