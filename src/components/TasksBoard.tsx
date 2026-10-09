"use client";

import { moveTaskAction } from "@/app/actions";
import { Board, BoardColumn } from "./BoardColumn";
import { useBoardDrag } from "./board";
import { Avatar } from "./ui";
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
export function TasksBoard({
  tasks,
  locale,
  canEdit,
}: {
  tasks: TaskCard[];
  locale: Locale;
  /** без права на правку доска остаётся доской, но не двигается */
  canEdit: boolean;
}) {
  const t = translator(locale);

  // Тот же механизм, что на досках лидов и сделок, — см. board.ts. Раньше
  // этой доске перетаскивания не досталось вовсе: колонки рисовались,
  // карточки не двигались.
  const { columnFor, columnProps, cardProps, dropIndex, over } = useBoardDrag(
    tasks,
    (task) => task.status,
    (id, status) => {
      const data = new FormData();
      data.set("id", id);
      data.set("status", status);
      void moveTaskAction(data);
    },
    canEdit,
  );

  return (
    <Board hint={canEdit ? t(S.tasks.dragHint) : null}>
      {COLUMNS.map((status) => {
        const meta = TASK_STATUS[status];
        const items = tasks.filter((task) => columnFor(task) === status);

        return (
          <BoardColumn
            key={status}
            color={meta.dot}
            title={t(meta.label)}
            count={items.length}
            active={over === status}
            dropAt={dropIndex(status)}
            drop={columnProps(status)}
            emptyLabel={t(S.common.empty)}
            cards={items.map((task) => (
              <TaskItem key={task.id} task={task} locale={locale} drag={cardProps(task.id)} />
            ))}
          />
        );
      })}
    </Board>
  );
}

function TaskItem({
  task,
  locale,
  drag,
}: {
  task: TaskCard;
  locale: Locale;
  drag: ReturnType<ReturnType<typeof useBoardDrag>["cardProps"]>;
}) {
  const f = formatters(locale);
  // Тот же язык, что у карточки сделки: просрочка важнее высокого приоритета.
  const flag = task.overdue
    ? "var(--color-status-risk)"
    : task.priority === "high"
      ? "var(--color-status-progress)"
      : null;

  return (
    <article
      {...drag}
      className={`card card-hover relative px-3.5 py-3 ${drag.className}`}
      style={{ cursor: drag.draggable ? "grab" : "default" }}
    >
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
