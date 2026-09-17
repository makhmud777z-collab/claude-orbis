"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconCalendar, IconChevron, IconCheck, IconSearch } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

/**
 * Собственные элементы управления вместо браузерных.
 * Нативный <select> рисует операционная система: на тёмном портале он выглядит
 * чужеродно и не поддаётся стилизации, поэтому весь ввод — свой.
 */

export interface Option {
  value: string;
  label: string;
  hint?: string;
  color?: string;
}

interface PopoverBox {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

const GAP = 6;
const EDGE = 12;

/**
 * Куда положить выпадающий список.
 *
 * Правила простые, но их легко нарушить: список ровно той же ширины, что
 * и поле (иначе он выглядит чужим), не вылезает за края окна и никогда
 * не накрывает само поле — если снизу места мало, открывается вверх.
 */
function popoverBox(anchorEl: HTMLElement, count: number, withSearch: boolean): PopoverBox {
  const rect = anchorEl.getBoundingClientRect();
  const width = Math.min(
    Math.max(rect.width, 200),
    Math.max(200, window.innerWidth - EDGE * 2),
  );
  const wanted = count * 36 + (withSearch ? 46 : 0) + 8;
  const below = window.innerHeight - rect.bottom - GAP - EDGE;
  const above = rect.top - GAP - EDGE;
  const flip = below < Math.min(wanted, 180) && above > below;
  const maxHeight = Math.max(120, Math.min(wanted, flip ? above : below));
  return {
    width,
    left: Math.max(EDGE, Math.min(rect.left, window.innerWidth - width - EDGE)),
    top: flip ? Math.max(EDGE, rect.top - GAP - maxHeight) : rect.bottom + GAP,
    maxHeight,
  };
}

/** То же для панели известного размера — календаря. */
function panelBox(anchorEl: HTMLElement, width: number, height: number): PopoverBox {
  const rect = anchorEl.getBoundingClientRect();
  const flip = window.innerHeight - rect.bottom - GAP - EDGE < height && rect.top > height + GAP + EDGE;
  return {
    width,
    left: Math.max(EDGE, Math.min(rect.left, window.innerWidth - width - EDGE)),
    top: flip
      ? rect.top - GAP - height
      : Math.max(EDGE, Math.min(rect.bottom + GAP, window.innerHeight - height - EDGE)),
    maxHeight: height,
  };
}

export function Select({
  value, options, onChange, placeholder, locale, width = 180, searchable,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  locale: Locale;
  width?: number | string;
  searchable?: boolean;
}) {
  const t = translator(locale);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [box, setBox] = useState<PopoverBox | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  const current = options.find((o) => o.value === value);
  const withSearch = searchable ?? options.length > 10;
  const list = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(`[data-select="${id}"]`)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, id]);

  const toggle = () => {
    if (!open && button.current) setBox(popoverBox(button.current, options.length, withSearch));
    setOpen((v) => !v);
    setQuery("");
  };

  // Список длинный и окно узкое — позицию нужно пересчитать, иначе он
  // останется висеть там, где кнопки уже нет.
  useEffect(() => {
    if (!open) return;
    const sync = () => button.current && setBox(popoverBox(button.current, options.length, withSearch));
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open, options.length, withSearch]);

  return (
    <>
      <button
        ref={button}
        type="button"
        data-select={id}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="field flex items-center gap-2 text-left"
        style={{ width, height: 32, padding: "0 10px", borderRadius: 100, fontSize: 12 }}
      >
        {current?.color ? (
          <span className="dot" style={{ background: current.color }} />
        ) : null}
        <span className="min-w-0 flex-1 truncate">
          {current?.label ?? placeholder ?? "—"}
        </span>
        <IconChevron size={13} className="flex-none text-ink-faint" />
      </button>

      {open && box
        ? createPortal(
            <div
              data-select={id}
              className="card-raised fixed z-[60] overflow-y-auto py-1"
              style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }}
              role="listbox"
            >
              {withSearch ? (
                <div className="sticky top-0 bg-surface-2 px-2 pb-2 pt-1">
                  <label className="relative flex items-center">
                    <span className="pointer-events-none absolute left-2.5 text-ink-faint">
                      <IconSearch size={13} />
                    </span>
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t(S.common.searchShort)}
                      className="field h-8 pl-7 text-[12px]"
                    />
                  </label>
                </div>
              ) : null}

              {list.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-surface-1"
                >
                  {option.color ? (
                    <span className="dot" style={{ background: option.color }} />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="t-caption block truncate">{option.label}</span>
                    {option.hint ? (
                      <span className="t-micro block truncate text-ink-faint">{option.hint}</span>
                    ) : null}
                  </span>
                  {option.value === value ? <IconCheck size={13} /> : null}
                </button>
              ))}
              {!list.length ? (
                <div className="t-micro px-3 py-4 text-center text-ink-faint">
                  {t(S.common.nothingFound)}
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** Модальное окно вместо alert/confirm. */
export function Modal({
  open, title, onClose, children, footer, width = 520,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        className="scrim-in absolute inset-0 backdrop-blur-sm"
        style={{ background: "var(--color-scrim)" }}
        onClick={onClose}
        aria-label="Закрыть"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="card-raised relative z-10 max-h-[85vh] w-full overflow-y-auto p-6"
        style={{ maxWidth: width }}
      >
        <div className="t-headline mb-4">{title}</div>
        {children}
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

/** Подсказка вместо системного title. */
export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show ? (
        <span
          role="tooltip"
          className="t-micro pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-[8px] border border-hairline bg-surface-2 px-2.5 py-1.5 text-ink shadow-lg"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}

/** Палитра стадии: готовые цвета и ввод HEX-кода вручную. */
export const STAGE_PALETTE = [
  "#ff7a3d", "#ff5577", "#d44df0", "#6a4cf5", "#0099ff", "#22c55e",
  "#e0b341", "#8a8a8a", "#f97316", "#ec4899", "#a855f7", "#3b82f6",
  "#06b6d4", "#10b981", "#84cc16", "#eab308", "#64748b", "#ffffff",
];

export function ColorPicker({
  value, onChange, locale,
}: {
  value: string;
  onChange: (color: string) => void;
  locale: Locale;
}) {
  const t = translator(locale);
  const [hex, setHex] = useState(value);

  useEffect(() => setHex(value), [value]);

  const apply = (next: string) => {
    const clean = next.startsWith("#") ? next : `#${next}`;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) onChange(clean.toLowerCase());
  };

  return (
    <div>
      <div className="grid grid-cols-9 gap-2">
        {STAGE_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-label={color}
            className="h-6 w-6 rounded-full border transition-transform hover:scale-110"
            style={{
              background: color,
              borderColor: color.toLowerCase() === value.toLowerCase() ? "var(--color-ink)" : "transparent",
              borderWidth: color.toLowerCase() === value.toLowerCase() ? 2 : 1,
            }}
          />
        ))}
      </div>
      <label className="mt-4 flex items-center gap-2">
        <span className="t-micro text-ink-faint">{t(S.pipelines.hexCode)}</span>
        <span className="flex items-center gap-2 rounded-[10px] border border-hairline-soft bg-surface-1 px-2.5 py-1.5">
          <span className="h-4 w-4 rounded-full" style={{ background: value }} />
          <input
            value={hex}
            onChange={(e) => {
              setHex(e.target.value);
              apply(e.target.value);
            }}
            spellCheck={false}
            className="t-caption t-num w-[80px] bg-transparent outline-none"
          />
        </span>
      </label>
    </div>
  );
}

/**
 * Календарь вместо <input type="date">.
 * Нативное поле даты рисует операционная система: на тёмном портале оно
 * выпадает из палитры и по-разному выглядит в каждом браузере.
 */
const WEEKDAYS: Record<Locale, string[]> = {
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  uz: ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"],
};
const MONTH_NAMES: Record<Locale, string[]> = {
  ru: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
  uz: ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"],
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function DatePicker({
  name,
  value,
  onChange,
  locale,
  width = "100%",
  placeholder,
}: {
  name?: string;
  value: string;
  onChange?: (value: string) => void;
  locale: Locale;
  width?: number | string;
  placeholder?: string;
}) {
  const t = translator(locale);
  const [current, setCurrent] = useState(value);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<PopoverBox | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => setCurrent(value), [value]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(`[data-date="${id}"]`)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open, id]);

  const selected = current ? new Date(`${current}T00:00:00`) : null;
  const [view, setView] = useState(() => selected ?? new Date());
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  // Неделя начинается с понедельника — так принято в Узбекистане и Корее.
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();

  const pick = (day: number) => {
    const next = iso(new Date(view.getFullYear(), view.getMonth(), day));
    setCurrent(next);
    onChange?.(next);
    setOpen(false);
  };

  const shift = (months: number) =>
    setView(new Date(view.getFullYear(), view.getMonth() + months, 1));

  const label = selected
    ? `${selected.getDate()} ${MONTH_NAMES[locale][selected.getMonth()].slice(0, 3).toLowerCase()} ${selected.getFullYear()}`
    : (placeholder ?? t(S.common.pickDate));

  return (
    <>
      {name ? <input type="hidden" name={name} value={current} readOnly /> : null}
      <button
        ref={button}
        type="button"
        data-date={id}
        onClick={() => {
          if (!open && button.current) setBox(panelBox(button.current, 272, 330));
          if (!open) setView(selected ?? new Date());
          setOpen((v) => !v);
        }}
        className="field flex items-center gap-2 text-left text-[13px]"
        style={{ width, height: 34, padding: "0 12px" }}
      >
        <span className="flex-none text-ink-faint">
          <IconCalendar size={14} />
        </span>
        <span className="min-w-0 flex-1 truncate" style={{ color: current ? undefined : "var(--color-ink-faint)" }}>
          {label}
        </span>
      </button>

      {open && box
        ? createPortal(
            <div
              data-date={id}
              className="card-raised fixed z-[75] p-3"
              style={{ top: box.top, left: box.left, width: box.width }}
            >
              <div className="mb-2 flex items-center justify-between">
                <button type="button" className="btn-icon h-7 w-7" onClick={() => shift(-1)} aria-label="−1">
                  <IconChevron size={13} style={{ transform: "rotate(90deg)" }} />
                </button>
                <span className="t-caption">
                  {MONTH_NAMES[locale][view.getMonth()]} {view.getFullYear()}
                </span>
                <button type="button" className="btn-icon h-7 w-7" onClick={() => shift(1)} aria-label="+1">
                  <IconChevron size={13} style={{ transform: "rotate(-90deg)" }} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {WEEKDAYS[locale].map((day) => (
                  <div key={day} className="t-micro py-1 text-center text-ink-faint">
                    {day}
                  </div>
                ))}
                {Array.from({ length: offset }).map((_, i) => (
                  <span key={`pad_${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const cell = iso(new Date(view.getFullYear(), view.getMonth(), day));
                  const on = cell === current;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => pick(day)}
                      className="t-caption t-num h-8 rounded-[7px] transition-colors hover:bg-surface-1"
                      style={{
                        background: on ? "var(--color-ink)" : "transparent",
                        color: on ? "var(--color-canvas)" : "var(--color-ink-muted)",
                        fontWeight: on ? 600 : 400,
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex gap-1.5 border-t border-hairline-soft pt-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm flex-1"
                  onClick={() => {
                    const today = iso(new Date());
                    setCurrent(today);
                    onChange?.(today);
                    setOpen(false);
                  }}
                >
                  {t(S.common.today)}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm flex-1"
                  onClick={() => {
                    setCurrent("");
                    onChange?.("");
                    setOpen(false);
                  }}
                >
                  {t(S.common.clear)}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
