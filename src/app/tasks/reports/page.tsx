import Link from "next/link";
import { moduleGate } from "@/components/guard";
import { Avatar, PageHeader, Progress, StatTile, StatusDot } from "@/components/ui";
import { formatters, isPast, isSoon } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { TASK_STATUS } from "@/lib/labels";
import { scopedProjects, scopedTasks, scopedTeam } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { P, S } from "@/lib/strings";
import type { TaskStatus } from "@/lib/types";

const ORDER: TaskStatus[] = ["todo", "in_progress", "review", "done"];

/** Отчёты по задачам: кто загружен, что просрочено, как идут проекты. */
export default async function TaskReportsPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const gate = moduleGate(session, "tasks", t(S.projects.reports));
  if (gate) return gate;

  const f = formatters(session.locale);
  const tasks = scopedTasks(session);
  const team = scopedTeam(session);
  const projects = scopedProjects(session);

  const open = tasks.filter((task) => task.status !== "done");
  const overdue = open.filter((task) => isPast(task.dueAt));
  const week = open.filter((task) => isSoon(task.dueAt, 7));

  const byPerson = team
    .map((user) => {
      const mine = tasks.filter((task) => task.assigneeId === user.id);
      return {
        user,
        total: mine.length,
        open: mine.filter((task) => task.status !== "done").length,
        overdue: mine.filter((task) => task.status !== "done" && isPast(task.dueAt)).length,
        done: mine.filter((task) => task.status === "done").length,
      };
    })
    .filter((row) => row.total)
    .sort((a, b) => b.open - a.open);

  const maxOpen = Math.max(1, ...byPerson.map((row) => row.open));

  return (
    <>
      <PageHeader
        title={t(S.projects.reports)}
        meta={
          <>
            <span>{f.plural(tasks.length, P.tasks)}</span>
            <span>·</span>
            <Link href="/tasks" className="hover:text-ink">{t(S.nav.tasks)}</Link>
            <span>·</span>
            <Link href="/tasks/projects" className="hover:text-ink">{t(S.projects.title)}</Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={t(S.tasks.inProgress)}
          value={open.length}
          hint={`${tasks.length - open.length} ${t(S.projects.completed)}`}
          accent="var(--color-status-open)"
        />
        <StatTile
          label={t(S.projects.overdueTasks)}
          value={overdue.length}
          hint={overdue[0] ? f.relativeDeadline(overdue[0].dueAt) : t(S.dashboard.tileCalm)}
          accent="var(--color-status-risk)"
        />
        <StatTile
          label={t(S.staffReports.week)}
          value={week.length}
          hint={t(S.dashboard.weekDeadlines)}
          accent="var(--color-status-progress)"
        />
        <StatTile
          label={t(S.projects.title)}
          value={projects.filter((p) => p.status === "active").length}
          hint={`${projects.length} ${t(S.common.all).toLowerCase()}`}
          accent="var(--color-status-violet)"
        />
      </div>

      <section className="mt-9 grid min-w-0 gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="card min-w-0 p-5">
          <h2 className="t-headline mb-4">{t(S.staffReports.employee)}</h2>
          <div className="space-y-3">
            {byPerson.map((row) => (
              <Link
                key={row.user.id}
                href={`/team/${row.user.id}`}
                className="flex items-center gap-3"
              >
                <Avatar name={row.user.name} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="t-caption block truncate">{row.user.name}</span>
                  <span className="mt-1 block">
                    <Progress
                      percent={(row.open / maxOpen) * 100}
                      tone={row.overdue ? "var(--color-status-risk)" : "ink"}
                    />
                  </span>
                </span>
                <span className="t-caption t-num w-20 flex-none text-right">
                  {row.open}
                  {row.overdue ? (
                    <span style={{ color: "var(--color-status-risk)" }}> · {row.overdue}</span>
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card min-w-0 p-5">
          <h2 className="t-headline mb-4">{t(S.tasks.title)}</h2>
          <div className="space-y-3">
            {ORDER.map((status) => {
              const count = tasks.filter((task) => task.status === status).length;
              const meta = TASK_STATUS[status];
              return (
                <div key={status}>
                  <div className="t-caption mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <StatusDot color={meta.dot} />
                      {t(meta.label)}
                    </span>
                    <span className="t-num text-ink-muted">{count}</span>
                  </div>
                  <Progress
                    percent={tasks.length ? (count / tasks.length) * 100 : 0}
                    tone={meta.dot}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
