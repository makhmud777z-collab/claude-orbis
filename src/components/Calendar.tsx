"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { addEventAction } from "@/app/actions";
import { DatePicker, Modal, Select } from "./controls";
import { IconChevron, IconPlus } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

/** Запись календаря: и своё событие, и срок, пришедший из другого раздела. */
export interface CalendarItem {
  id: string;
  title: string;
  date: string;
  /** «14:30»; у сроков времени нет — они идут строкой «весь день» */
  startTime: string | null;
  endTime: string | null;
  color: string;
  kindLabel: string;
  href: string | null;
  note: string;
  ownerName: string;
}

type View = "day" | "week" | "month";

const HOUR = 52;
const MONTHS = {
  ru: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
  uz: ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"],
};
const WEEKDAYS = {
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  uz: ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"],
};
const WEEKDAYS_LONG = {
  ru: ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"],
  uz: ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"],
};

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (v: string) => new Date(`${v}T00:00:00`);
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
/** Неделя начинается с понедельника — так принято и в Узбекистане, и в Корее. */
const weekStart = (d: Date) => {
  const out = new Date(d);
  out.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return out;
};
const addDays = (d: Date, n: number) => {
  const out = new Date(d);
  out.setDate(d.getDate() + n);
  return out;
};

/**
 * Календарь агентства.
 *
 * Открывается месяцем: сотруднику сначала нужно понять, где он во времени.
 * Клик по числу разворачивает день по часам, где видно, что во сколько
 * запланировано, и где идёт красная линия настоящего времени.
 */
export function Calendar({
  items,
  locale,
  canCreate,
  today,
}: {
  items: CalendarItem[];
  locale: Locale;
  canCreate: boolean;
  /** «сегодня» приходит с сервера, чтобы первый кадр совпал с разметкой */
  today: string;
}) {
  const t = translator(locale);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const view = (params.get("view") as View) || "month";
  const selected = params.get("date") || today;
  const cursor = parse(selected);

  const [adding, setAdding] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  // Красная линия — настоящее время, поэтому появляется только после
  // гидратации: на сервере «сейчас» другое, и разметка бы разошлась.
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const go = (next: { view?: View; date?: string }) => {
    const out = new URLSearchParams(params.toString());
    out.set("view", next.view ?? view);
    out.set("date", next.date ?? selected);
    router.push(`${pathname}?${out}`);
  };

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
    }
    return map;
  }, [items]);

  const shift = (step: number) => {
    const next =
      view === "month"
        ? new Date(cursor.getFullYear(), cursor.getMonth() + step, 1)
        : addDays(cursor, view === "week" ? step * 7 : step);
    go({ date: iso(next) });
  };

  const title =
    view === "day"
      ? `${cursor.getDate()} ${MONTHS[locale][cursor.getMonth()].toLowerCase()} ${cursor.getFullYear()}`
      : view === "week"
        ? `${weekStart(cursor).getDate()} — ${addDays(weekStart(cursor), 6).getDate()} ${MONTHS[locale][cursor.getMonth()].toLowerCase()} ${cursor.getFullYear()}`
        : `${MONTHS[locale][cursor.getMonth()]} ${cursor.getFullYear()}`;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="card min-w-0 overflow-hidden">
        <div className="card-head flex-wrap">
          <div className="min-w-0">
            <div className="t-headline truncate">{title}</div>
            {view === "day" ? (
              <div className="t-micro mt-0.5 text-ink-faint">
                {WEEKDAYS_LONG[locale][(cursor.getDay() + 6) % 7]}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-0.5 rounded-full bg-surface-3 p-0.5">
              {(["day", "week", "month"] as View[]).map((key) => (
                <button
                  key={key}
                  onClick={() => go({ view: key })}
                  className="t-micro rounded-full px-2.5 py-1.5 transition-colors"
                  style={{
                    background: view === key ? "var(--color-surface-1)" : "transparent",
                    color: view === key ? "var(--color-ink)" : "var(--color-ink-faint)",
                    fontWeight: view === key ? 600 : 500,
                  }}
                >
                  {t(key === "day" ? S.calendar.day : key === "week" ? S.calendar.week : S.calendar.month)}
                </button>
              ))}
            </span>

            <button className="btn-icon h-8 w-8" onClick={() => shift(-1)} aria-label="←">
              <IconChevron size={14} style={{ transform: "rotate(90deg)" }} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => go({ date: today })}>
              {t(S.calendar.today)}
            </button>
            <button className="btn-icon h-8 w-8" onClick={() => shift(1)} aria-label="→">
              <IconChevron size={14} style={{ transform: "rotate(-90deg)" }} />
            </button>

            {canCreate ? (
              <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
                <IconPlus size={14} /> {t(S.calendar.add)}
              </button>
            ) : null}
          </div>
        </div>

        {view === "month" ? (
          <MonthGrid
            cursor={cursor}
            today={today}
            selected={selected}
            byDate={byDate}
            locale={locale}
            onPick={(date) => go({ view: "day", date })}
          />
        ) : (
          <HourGrid
            days={view === "day" ? [cursor] : Array.from({ length: 7 }, (_, i) => addDays(weekStart(cursor), i))}
            today={today}
            byDate={byDate}
            locale={locale}
            now={now}
            onPick={(date) => go({ view: "day", date })}
          />
        )}
      </div>

      <aside className="min-w-0 space-y-4">
        <MiniMonth
          cursor={cursor}
          today={today}
          selected={selected}
          byDate={byDate}
          locale={locale}
          onPick={(date) => go({ date })}
          onShift={(step) => go({ date: iso(new Date(cursor.getFullYear(), cursor.getMonth() + step, 1)) })}
        />

        <div className="card p-4">
          <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
            {t(S.calendar.onDay)} {cursor.getDate()} {MONTHS[locale][cursor.getMonth()].toLowerCase()}
          </div>
          <div className="space-y-2.5">
            {(byDate.get(selected) ?? []).map((item) => (
              <Entry key={item.id} item={item} />
            ))}
            {!(byDate.get(selected) ?? []).length ? (
              <div className="t-caption text-ink-faint">{t(S.calendar.empty)}</div>
            ) : null}
          </div>
        </div>
      </aside>

      <Modal open={adding} onClose={() => setAdding(false)} title={t(S.calendar.add)} width={460}>
        <form
          action={(data) => {
            setAdding(false);
            return addEventAction(data);
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.calendar.eventTitle)}</span>
            <input name="title" required autoFocus className="field text-[13px]" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.calendar.date)}</span>
              <DatePicker name="date" value={selected} locale={locale} />
            </label>
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.calendar.kind)}</span>
              <EventKindPicker locale={locale} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.calendar.from)}</span>
              <TimePicker name="startTime" initial="10:00" locale={locale} />
            </label>
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.calendar.to)}</span>
              <TimePicker name="endTime" initial="11:00" locale={locale} />
            </label>
          </div>

          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.crm.comment)}</span>
            <textarea name="note" rows={2} className="field resize-none text-[13px]" />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdding(false)}>
              {t(S.common.reset)}
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              {t(S.common.save)}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Entry({ item }: { item: CalendarItem }) {
  const body = (
    <span className="flex min-w-0 gap-2.5">
      <span className="mt-0.5 h-8 w-[3px] flex-none rounded-full" style={{ background: item.color }} />
      <span className="min-w-0">
        <span className="t-caption block truncate">{item.title}</span>
        <span className="t-micro block truncate text-ink-faint">
          {item.startTime ? `${item.startTime} — ${item.endTime} · ` : ""}
          {item.kindLabel}
        </span>
      </span>
    </span>
  );
  return item.href ? (
    <Link href={item.href} className="block rounded-[8px] p-1 transition-colors hover:bg-surface-2">
      {body}
    </Link>
  ) : (
    <span className="block p-1">{body}</span>
  );
}

function MonthGrid({
  cursor, today, selected, byDate, locale, onPick,
}: {
  cursor: Date;
  today: string;
  selected: string;
  byDate: Map<string, CalendarItem[]>;
  locale: Locale;
  onPick: (date: string) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = weekStart(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-hairline-soft">
        {WEEKDAYS[locale].map((d) => (
          <div key={d} className="t-micro px-2 py-2 text-center text-ink-faint">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day) => {
          const key = iso(day);
          const list = byDate.get(key) ?? [];
          const outside = day.getMonth() !== cursor.getMonth();
          const isToday = key === today;
          const isSelected = key === selected;
          return (
            <button
              key={key}
              onClick={() => onPick(key)}
              className="min-h-[104px] border-b border-r border-hairline-soft p-1.5 text-left transition-colors hover:bg-surface-2"
              style={{
                opacity: outside ? 0.45 : 1,
                background: isSelected ? "color-mix(in srgb, var(--color-accent) 7%, transparent)" : undefined,
              }}
            >
              <span
                className="t-caption t-num inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5"
                style={{
                  background: isToday ? "var(--color-accent)" : "transparent",
                  color: isToday ? "#fff" : "var(--color-ink-muted)",
                  fontWeight: isToday ? 700 : 500,
                }}
              >
                {day.getDate()}
              </span>
              <span className="mt-1 block space-y-1">
                {list.slice(0, 3).map((item) => (
                  <span key={item.id} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: item.color }} />
                    <span className="t-micro truncate text-ink-muted">
                      {item.startTime ? `${item.startTime} ` : ""}
                      {item.title}
                    </span>
                  </span>
                ))}
                {list.length > 3 ? (
                  <span className="t-micro block text-ink-faint">+{list.length - 3}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HourGrid({
  days, today, byDate, locale, now, onPick,
}: {
  days: Date[];
  today: string;
  byDate: Map<string, CalendarItem[]>;
  locale: Locale;
  now: number | null;
  onPick: (date: string) => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const scroller = useRef<HTMLDivElement>(null);

  // Сутки в сетку не помещаются, а ночь никому не нужна: открываем день там,
  // где сотрудник находится сейчас, и не заставляем прокручивать вручную.
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const target = ((now ?? 9 * 60) / 60) * HOUR - box.clientHeight / 3;
    box.scrollTop = Math.max(0, target);
    // прокручиваем один раз на открытие дня, дальше сотрудник крутит сам
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0]?.toDateString()]);

  return (
    <div className="scroll-x">
      <div style={{ minWidth: days.length > 1 ? 720 : undefined }}>
        {days.length > 1 ? (
          <div className="grid border-b border-hairline-soft" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
            <span />
            {days.map((day) => {
              const key = iso(day);
              return (
                <button key={key} onClick={() => onPick(key)} className="px-2 py-2 text-center transition-colors hover:bg-surface-2">
                  <span className="t-micro block text-ink-faint">{WEEKDAYS[locale][(day.getDay() + 6) % 7]}</span>
                  <span
                    className="t-caption t-num mt-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5"
                    style={{
                      background: key === today ? "var(--color-accent)" : "transparent",
                      color: key === today ? "#fff" : "var(--color-ink)",
                      fontWeight: key === today ? 700 : 500,
                    }}
                  >
                    {day.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {/* сроки и задачи без времени — строкой над сеткой */}
        <div className="grid border-b border-hairline-soft" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          <span className="t-micro px-2 py-2 text-right text-ink-faint">{locale === "ru" ? "весь день" : "kun bo‘yi"}</span>
          {days.map((day) => {
            const list = (byDate.get(iso(day)) ?? []).filter((i) => !i.startTime);
            return (
              <span key={iso(day)} className="min-h-[34px] space-y-1 border-l border-hairline-soft p-1">
                {list.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href ?? "#"}
                    className="t-micro block truncate rounded-[6px] px-1.5 py-1"
                    style={{
                      background: `color-mix(in srgb, ${item.color} 14%, transparent)`,
                      color: item.color,
                    }}
                  >
                    {item.title}
                  </Link>
                ))}
              </span>
            );
          })}
        </div>

        <div
          ref={scroller}
          className="relative grid overflow-y-auto"
          style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)`, maxHeight: "58vh" }}
        >
          <div>
            {hours.map((h) => (
              <div key={h} className="t-micro relative text-right text-ink-faint" style={{ height: HOUR }}>
                <span className="absolute -top-1.5 right-2">{pad(h)}:00</span>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const key = iso(day);
            const list = (byDate.get(key) ?? []).filter((i) => i.startTime);
            return (
              <div key={key} className="relative border-l border-hairline-soft">
                {hours.map((h) => (
                  <div key={h} className="border-b border-hairline-soft" style={{ height: HOUR }} />
                ))}

                {list.map((item) => {
                  const from = minutes(item.startTime!);
                  const to = Math.max(from + 30, minutes(item.endTime ?? item.startTime!));
                  const height = ((to - from) / 60) * HOUR - 2;
                  return (
                    <Link
                      key={item.id}
                      href={item.href ?? "#"}
                      className="absolute left-1 right-1 overflow-hidden rounded-[8px] px-2 py-1"
                      style={{
                        top: (from / 60) * HOUR,
                        height,
                        background: `color-mix(in srgb, ${item.color} 16%, var(--color-surface-1))`,
                        borderLeft: `3px solid ${item.color}`,
                      }}
                    >
                      <span className="t-micro block truncate font-medium">{item.title}</span>
                      {height >= 42 ? (
                        <span className="t-micro block truncate text-ink-faint">
                          {item.startTime} — {item.endTime} · {item.ownerName}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}

                {/* линия настоящего времени — только на сегодняшней колонке */}
                {now !== null && key === today ? (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
                    style={{ top: (now / 60) * HOUR }}
                  >
                    <span
                      className="t-micro t-num -ml-[52px] w-[46px] rounded-[4px] px-1 text-right"
                      style={{ background: "var(--color-status-risk)", color: "#fff" }}
                    >
                      {pad(Math.floor(now / 60))}:{pad(now % 60)}
                    </span>
                    <span className="h-px flex-1" style={{ background: "var(--color-status-risk)" }} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniMonth({
  cursor, today, selected, byDate, locale, onPick, onShift,
}: {
  cursor: Date;
  today: string;
  selected: string;
  byDate: Map<string, CalendarItem[]>;
  locale: Locale;
  onPick: (date: string) => void;
  onShift: (step: number) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = weekStart(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between">
        <button className="btn-icon h-7 w-7" onClick={() => onShift(-1)} aria-label="←">
          <IconChevron size={13} style={{ transform: "rotate(90deg)" }} />
        </button>
        <span className="t-caption">
          {MONTHS[locale][cursor.getMonth()]} {cursor.getFullYear()}
        </span>
        <button className="btn-icon h-7 w-7" onClick={() => onShift(1)} aria-label="→">
          <IconChevron size={13} style={{ transform: "rotate(-90deg)" }} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS[locale].map((d) => (
          <div key={d} className="t-micro py-1 text-center text-ink-faint">
            {d}
          </div>
        ))}
        {cells.map((day) => {
          const key = iso(day);
          const outside = day.getMonth() !== cursor.getMonth();
          const isToday = key === today;
          const isSelected = key === selected;
          const has = (byDate.get(key) ?? []).length > 0;
          return (
            <button
              key={key}
              onClick={() => onPick(key)}
              className="t-caption t-num relative h-8 rounded-[7px] transition-colors hover:bg-surface-2"
              style={{
                opacity: outside ? 0.4 : 1,
                background: isToday
                  ? "var(--color-accent)"
                  : isSelected
                    ? "var(--color-surface-3)"
                    : "transparent",
                color: isToday ? "#fff" : "var(--color-ink-muted)",
                fontWeight: isToday || isSelected ? 600 : 400,
              }}
            >
              {day.getDate()}
              {has && !isToday ? (
                <span
                  className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                  style={{ background: "var(--color-accent)" }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Тип события выбирается своим списком — нативного выпадающего в портале нет. */
function EventKindPicker({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [kind, setKind] = useState("meeting");
  const options = [
    { value: "meeting", label: t(S.calendar.kindMeeting), color: "var(--color-status-open)" },
    { value: "call", label: t(S.calendar.kindCall), color: "var(--color-status-deal)" },
    { value: "interview", label: t(S.calendar.kindInterview), color: "var(--color-status-violet)" },
    { value: "personal", label: t(S.calendar.kindPersonal), color: "var(--color-status-hold)" },
  ];
  return (
    <>
      <input type="hidden" name="kind" value={kind} />
      <Select locale={locale} width="100%" value={kind} options={options} onChange={setKind} />
    </>
  );
}

/** Время с шагом в полчаса: набирать руками на портале неудобно. */
function TimePicker({ name, initial, locale }: { name: string; initial: string; locale: Locale }) {
  const [value, setValue] = useState(initial);
  const options = Array.from({ length: 48 }, (_, i) => {
    const time = `${pad(Math.floor(i / 2))}:${i % 2 ? "30" : "00"}`;
    return { value: time, label: time };
  });
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select locale={locale} width="100%" value={value} options={options} onChange={setValue} searchable />
    </>
  );
}
