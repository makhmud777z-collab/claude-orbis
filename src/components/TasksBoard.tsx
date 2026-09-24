import { Avatar, StatusDot } from "./ui";
import { TASK_STATUS } from "@/lib/labels";
import { formatters } from "@/lib/format";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";
import type { TaskStatus } from "@/lib/types";

export interface TaskCard {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: "low" | "normal" | "high";
  dueAt: string;
  assigneeName: string;
  assigneeId: string;
  creatorName: string;
  relationLabel: string | null;
  overdue: boolean;
}

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "review", "done"];

/**
 * Доска задач.
 *
 * Раньше рисовалась совсем другим кодом, чем канбан лидов и сделок, — своя
 * плашка колонки, свои карточки-чипы. Один и тот же приём по всему порталу:
 * цвет статуса живёт в полосе сверху колонки и в точке с названием, сама
 * колонка и карточки — на нейтральной поверхности. Отбор делает умный
 * фильтр раздела на сервере, поэтому здесь нет ни своего состояния,
 * ни второго набора фильтров.
 */
export function TasksBoard({ tasks, locale }: { tasks: TaskCard[]; locale: Locale }) {
  const t = translator(locale);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((status) => {
        const meta = TASK_STATUS[status];
        const items = tasks.filter((task) => task.status === status);
        return (
          <section
            key={status}
            className="flex flex-col overflow-hidden rounded-[18px] border border-hairline bg-surface-2"
          >
            <div className="h-[3px] w-full flex-none" style={{ background: meta.dot }} />
            <header className="flex-none border-b border-hairline-soft bg-surface-1 px-3.5 pb-3 pt-3">
              <div className="flex items-center gap-2">
                <StatusDot color={meta.dot} />
                <span className="t-caption min-w-0 flex-1 truncate font-semibold" style={{ color: meta.dot }}>
                  {t(meta.label)}
                </span>
                <span className="t-micro t-num rounded-full bg-surface-3 px-1.5 py-0.5 font-semibold text-ink-muted">
                  {items.length}
                </span>
              </div>
            </header>

            <div className="flex flex-1 flex-col gap-2.5 p-2.5">
              {items.map((task) => (
                <TaskItem key={task.id} task={task} locale={locale} />
              ))}
              {!items.length ? (
                <div className="rounded-[12px] border border-dashed border-hairline px-3 py-7 text-center text-ink-faint t-micro">
                  {t(S.common.empty)}
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TaskItem({ task, locale }: { task: TaskCard; locale: Locale }) {
  const t = translator(locale);
  const f = formatters(locale);
  // Тот же язык, что у карточки сделки: просрочка важнее высокого приоритета.
  const flag = task.overdue
    ? "var(--color-status-risk)"
    : task.priority === "high"
      ? "var(--color-status-progress)"
      : null;

  return (
    <article className="card card-hover relative px-3.5 py-3">
      {flag ? (
        <span
          className="absolute left-1.5 top-3.5 h-6 w-[3px] rounded-full"
          style={{ background: flag }}
        />
      ) : null}

      <div style={{ paddingLeft: flag ? 8 : 0 }}>
        <div className="t-body-sm font-semibold">{task.title}</div>
        {task.relationLabel ? (
          <div className="t-micro mt-0.5 truncate text-ink-faint">{task.relationLabel}</div>
        ) : null}
        {task.description ? (
          <p className="t-micro mt-1.5 line-clamp-2 leading-relaxed text-ink-faint">
            {task.description}
          </p>
        ) : null}

        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-hairline-soft pt-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={task.assigneeName} size={22} />
            <span className="t-micro truncate text-ink-faint">{task.assigneeName}</span>
          </div>
          <span
            className="t-micro flex-none"
            style={{
              color: task.overdue ? "var(--color-status-risk)" : undefined,
              fontWeight: task.overdue ? 600 : undefined,
            }}
          >
            {f.relativeDeadline(task.dueAt)}
          </span>
        </div>
      </div>
    </article>
  );
}
