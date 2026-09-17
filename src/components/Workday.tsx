"use client";

import { useEffect, useState } from "react";
import { workdayAction } from "@/app/actions";
import { IconPause, IconPlay, IconStop } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

/** Состояние рабочего дня — считается на сервере из отметок сотрудника. */
export interface WorkdayState {
  started: boolean;
  onBreak: boolean;
  /** «09:12» — во сколько сотрудник отметился */
  startedAt: string | null;
  /** отработано на момент рендера страницы */
  seconds: number;
  /** суммарный перерыв за день */
  breakSeconds: number;
}

const two = (n: number) => String(n).padStart(2, "0");
export const clock = (seconds: number) =>
  `${two(Math.floor(seconds / 3600))}:${two(Math.floor(seconds / 60) % 60)}:${two(seconds % 60)}`;

/**
 * Часы рабочего дня.
 *
 * Сервер отдаёт, сколько уже отработано на момент рендера, а секунды
 * дальше идут в браузере: так таймер живой, но не зависит от того,
 * совпадают ли часы сотрудника с часами сервера. На перерыве счёт стоит —
 * иначе отчётность по часам врала бы в пользу сотрудника.
 */
export function useWorkdayClock(workday: WorkdayState) {
  const [tick, setTick] = useState(0);
  const running = workday.started && !workday.onBreak;

  useEffect(() => {
    setTick(0);
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running, workday.seconds]);

  return workday.seconds + (running ? tick : 0);
}

/** Компактный индикатор в шапке: видно, что день идёт, не открывая меню. */
export function WorkdayPill({ workday, locale }: { workday: WorkdayState; locale: Locale }) {
  const t = translator(locale);
  const seconds = useWorkdayClock(workday);

  if (!workday.started) {
    return (
      <form action={workdayAction}>
        <input type="hidden" name="what" value="start" />
        <button className="btn btn-secondary btn-sm hidden sm:inline-flex" type="submit">
          <IconPlay size={13} />
          {t(S.workday.start)}
        </button>
      </form>
    );
  }

  const color = workday.onBreak ? "var(--color-status-progress)" : "var(--color-status-deal)";
  return (
    <span
      className="hidden items-center gap-2 rounded-full border px-3 py-1.5 sm:inline-flex"
      style={{
        borderColor: `color-mix(in srgb, ${color} 34%, transparent)`,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
      title={t(workday.onBreak ? S.workday.onBreak : S.workday.working)}
    >
      <span className="relative flex h-1.5 w-1.5">
        {workday.onBreak ? null : (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
            style={{ background: color }}
          />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      </span>
      <span className="t-caption t-num tabular-nums" style={{ color }}>
        {clock(seconds)}
      </span>
    </span>
  );
}

/** Панель рабочего дня в меню профиля: часы крупно и три понятных действия. */
export function WorkdayPanel({ workday, locale }: { workday: WorkdayState; locale: Locale }) {
  const t = translator(locale);
  const seconds = useWorkdayClock(workday);
  const color = workday.onBreak
    ? "var(--color-status-progress)"
    : workday.started
      ? "var(--color-status-deal)"
      : "var(--color-ink-faint)";

  return (
    <div
      className="rounded-[12px] border p-4"
      style={{
        borderColor: `color-mix(in srgb, ${color} 26%, var(--color-hairline))`,
        background: `color-mix(in srgb, ${color} 7%, var(--color-surface-2))`,
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="t-micro uppercase tracking-[0.08em]" style={{ color }}>
          {workday.onBreak
            ? t(S.workday.onBreak)
            : workday.started
              ? t(S.workday.working)
              : t(S.workday.notStarted)}
        </span>
        {workday.startedAt ? (
          <span className="t-micro t-num text-ink-faint">
            {t(S.workday.startedAt)} {workday.startedAt}
          </span>
        ) : null}
      </div>

      <div
        className="t-num mt-2 tabular-nums"
        style={{
          fontSize: 34,
          fontWeight: 500,
          letterSpacing: "-1.6px",
          lineHeight: 1,
          color: workday.started ? "var(--color-ink)" : "var(--color-ink-faint)",
        }}
      >
        {clock(seconds)}
      </div>

      {workday.breakSeconds > 0 ? (
        <div className="t-micro mt-1.5 text-ink-faint">
          {t(S.workday.breakTotal)} {clock(workday.breakSeconds)}
        </div>
      ) : null}

      <form action={workdayAction} className="mt-3.5 flex gap-1.5">
        {workday.started ? (
          <>
            <button
              name="what"
              value="break"
              className="btn btn-secondary btn-sm flex-1 justify-center"
              type="submit"
            >
              {workday.onBreak ? <IconPlay size={13} /> : <IconPause size={13} />}
              {workday.onBreak ? t(S.workday.breakEnd) : t(S.workday.breakStart)}
            </button>
            <button
              name="what"
              value="end"
              className="btn btn-primary btn-sm flex-1 justify-center"
              type="submit"
            >
              <IconStop size={13} />
              {t(S.workday.end)}
            </button>
          </>
        ) : (
          <button
            name="what"
            value="start"
            className="btn btn-primary btn-sm w-full justify-center"
            type="submit"
          >
            <IconPlay size={13} />
            {t(S.workday.start)}
          </button>
        )}
      </form>
    </div>
  );
}
