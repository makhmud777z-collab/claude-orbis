"use client";

import { useMemo, useState } from "react";
import { Avatar, Chip, StatusDot } from "./ui";
import { TASK_STATUS } from "@/lib/labels";
import { relativeDeadline } from "@/lib/format";
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

export function TasksBoard({
  tasks,
  assignees,
  currentUserId,
}: {
  tasks: TaskCard[];
  assignees: { id: string; name: string }[];
  currentUserId: string;
}) {
  const [assignee, setAssignee] = useState("all");
  const [mine, setMine] = useState(false);

  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (mine && t.assigneeId !== currentUserId) return false;
        if (assignee !== "all" && t.assigneeId !== assignee) return false;
        return true;
      }),
    [tasks, assignee, mine, currentUserId],
  );

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button onClick={() => setMine((v) => !v)}>
          <Chip active={mine}>Только мои</Chip>
        </button>
        <select
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="field h-[30px] w-auto rounded-full py-0 text-[12px]"
        >
          <option value="all">Все исполнители</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <span className="t-micro ml-auto text-ink-faint">
          {filtered.filter((t) => t.overdue).length} просрочено
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((status) => {
          const meta = TASK_STATUS[status];
          const items = filtered.filter((t) => t.status === status);
          return (
            <section key={status}>
              <div className="mb-3 flex items-center gap-2 rounded-[10px] border border-hairline-soft bg-surface-1 px-3.5 py-2.5">
                <StatusDot color={meta.dot} />
                <span className="t-caption flex-1">{meta.label}</span>
                <span className="t-micro t-num rounded-full bg-surface-2 px-2 py-0.5 text-ink-muted">
                  {items.length}
                </span>
              </div>
              <div className="space-y-3">
                {items.map((t) => (
                  <article key={t.id} className="card card-hover p-4">
                    <div className="t-body-sm">{t.title}</div>
                    {t.description ? (
                      <p className="t-micro mt-1.5 leading-relaxed text-ink-faint">
                        {t.description}
                      </p>
                    ) : null}
                    {t.relationLabel ? (
                      <div className="mt-3">
                        <Chip>{t.relationLabel}</Chip>
                      </div>
                    ) : null}
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={t.assigneeName} size={22} />
                        <span className="t-micro truncate text-ink-faint">
                          {t.assigneeName}
                        </span>
                      </div>
                      <span
                        className="t-micro"
                        style={{
                          color: t.overdue ? "var(--color-status-risk)" : undefined,
                        }}
                      >
                        {relativeDeadline(t.dueAt)}
                      </span>
                    </div>
                    {t.priority === "high" ? (
                      <div className="mt-3 border-t border-hairline-soft pt-3">
                        <Chip dot="var(--color-status-risk)">высокий приоритет</Chip>
                      </div>
                    ) : null}
                  </article>
                ))}
                {!items.length ? (
                  <div className="t-micro rounded-[15px] border border-dashed border-hairline px-4 py-8 text-center text-ink-faint">
                    Пусто
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
