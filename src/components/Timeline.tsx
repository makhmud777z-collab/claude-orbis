"use client";

import { useRef, useState } from "react";
import { addTimelineAction } from "@/app/actions";
import { DatePicker } from "./controls";
import { IconCheck } from "./icons";
import { Avatar, StatusDot } from "./ui";
import { translator, type Locale } from "@/lib/i18n";
import { formatters } from "@/lib/format";
import { S } from "@/lib/strings";
import type { TimelineKind } from "@/lib/types";

/** Событие истории, уже приведённое к строкам под текущий язык. */
export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  title: string;
  body: string | null;
  authorName: string;
  at: string;
  source: string | null;
  dueAt: string | null;
  done: boolean | null;
}

const KIND_COLOR: Record<TimelineKind, string> = {
  stage: "var(--color-status-open)",
  comment: "var(--color-ink-faint)",
  activity: "var(--color-status-progress)",
  reminder: "var(--color-status-progress)",
  message: "var(--color-status-magenta)",
  task: "var(--color-status-hold)",
  payment: "var(--color-status-deal)",
  document: "var(--color-status-violet)",
  system: "var(--color-ink-faint)",
};

/**
 * История карточки — правая колонка, как в Битриксе: сверху форма нового дела
 * или комментария, ниже лента всего, что происходило. Дубли сюда не попадают:
 * повторное обращение одного и того же человека система пишет в эту же ленту,
 * а не заводит вторую карточку.
 */
export function Timeline({
  entity,
  entityId,
  items,
  locale,
  canWrite,
}: {
  entity: "lead" | "deal" | "contact" | "employee";
  entityId: string;
  items: TimelineItem[];
  locale: Locale;
  canWrite: boolean;
}) {
  const t = translator(locale);
  const f = formatters(locale);
  const [kind, setKind] = useState<"activity" | "comment" | "message">("activity");
  const form = useRef<HTMLFormElement>(null);

  const tabs: { key: typeof kind; label: string }[] = [
    { key: "activity", label: t(S.timeline.tabActivity) },
    { key: "comment", label: t(S.timeline.tabComment) },
    { key: "message", label: t(S.timeline.tabMessage) },
  ];

  return (
    <div className="card p-4">
      <div className="t-headline mb-3">{t(S.timeline.title)}</div>

      {canWrite ? (
        <form
          ref={form}
          action={(data) => {
            form.current?.reset();
            return addTimelineAction(data);
          }}
          className="mb-5 rounded-[10px] border border-hairline-soft bg-surface-1 p-2.5"
        >
          <input type="hidden" name="entity" value={entity} />
          <input type="hidden" name="entityId" value={entityId} />
          <input type="hidden" name="kind" value={kind} />

          <div className="mb-2 flex flex-wrap gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setKind(tab.key)}
                className={`chip ${kind === tab.key ? "chip-active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <textarea
            name="body"
            rows={2}
            required
            placeholder={t(S.timeline.placeholder)}
            className="field resize-none text-[13px]"
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            {kind === "activity" ? (
              <label className="t-micro flex items-center gap-2 text-ink-faint">
                {t(S.timeline.dueTo)}
                <DatePicker name="dueAt" value="" locale={locale} width={160} />
              </label>
            ) : (
              <span />
            )}
            <button className="btn btn-primary btn-sm" type="submit">
              {t(S.timeline.add)}
            </button>
          </div>
        </form>
      ) : null}

      {items.length ? (
        <ol className="relative space-y-4 border-l border-hairline-soft pl-4">
          {items.map((item) => (
            <li key={item.id} className="relative">
              <span
                className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ring-4 ring-[var(--color-surface-1)]"
                style={{ background: KIND_COLOR[item.kind] }}
              />
              <div className="flex items-baseline justify-between gap-3">
                <span className="t-body-sm font-medium">{item.title}</span>
                <span className="t-micro flex-none text-ink-faint">{f.relativeTime(item.at)}</span>
              </div>
              {item.body ? (
                <p className="t-caption mt-1 leading-relaxed text-ink-muted">{item.body}</p>
              ) : null}
              {item.source ? (
                <div className="t-micro mt-1 flex items-center gap-1.5 text-ink-faint">
                  <StatusDot color={KIND_COLOR[item.kind]} />
                  {item.source}
                </div>
              ) : null}
              <div className="t-micro mt-1.5 flex items-center gap-2 text-ink-faint">
                <Avatar name={item.authorName} size={18} />
                {item.authorName}
                {item.dueAt ? (
                  <>
                    <span>·</span>
                    <span className={item.done ? "" : "text-ink-muted"}>
                      {item.done ? (
                        <span className="inline-flex items-center gap-1">
                          <IconCheck size={11} /> {t(S.timeline.done)}
                        </span>
                      ) : (
                        `${t(S.timeline.dueTo)} ${f.shortDate(item.dueAt)}`
                      )}
                    </span>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="t-caption py-6 text-center text-ink-faint">{t(S.timeline.empty)}</div>
      )}
    </div>
  );
}
