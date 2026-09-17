import Link from "next/link";
import { moduleGate } from "@/components/guard";
import { Avatar, Chip, PageHeader, Progress, StatusDot } from "@/components/ui";
import { userById } from "@/lib/data/users";
import { formatters, isPast } from "@/lib/format";
import { translator, type Loc } from "@/lib/i18n";
import { scopedProjects, scopedTasks } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { P, S } from "@/lib/strings";
import type { Project } from "@/lib/types";

const STATUS: Record<Project["status"], { label: Loc; dot: string }> = {
  active: { label: S.projects.statusActive, dot: "var(--color-status-open)" },
  done: { label: S.projects.statusDone, dot: "var(--color-status-deal)" },
  paused: { label: S.projects.statusPaused, dot: "var(--color-status-hold)" },
};

/** Проекты объединяют задачи в общую цель: набор, сверка каталога, открытие филиала. */
export default async function ProjectsPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const gate = moduleGate(session, "projects", t(S.projects.title));
  if (gate) return gate;

  const f = formatters(session.locale);
  const projects = scopedProjects(session);
  const tasks = scopedTasks(session);

  return (
    <>
      <PageHeader
        title={t(S.projects.title)}
        meta={
          <>
            <span>{f.plural(projects.length, P.projects)}</span>
            <span>·</span>
            <Link href="/tasks" className="hover:text-ink">{t(S.nav.tasks)}</Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => {
          const mine = tasks.filter((task) => task.projectId === project.id);
          const done = mine.filter((task) => task.status === "done").length;
          const overdue = mine.filter(
            (task) => task.status !== "done" && isPast(task.dueAt),
          ).length;
          const status = STATUS[project.status];
          const lead = userById(project.leadId);

          return (
            <article key={project.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="t-body-lg min-w-0">{t(project.name)}</h2>
                <span className="chip flex-none">
                  <StatusDot color={status.dot} />
                  {t(status.label)}
                </span>
              </div>

              <p className="t-caption mt-2 leading-relaxed text-ink-muted">
                {project.description}
              </p>

              <div className="mt-4">
                <div className="t-micro mb-1.5 flex items-center justify-between text-ink-faint">
                  <span>
                    {done} / {mine.length} {t(S.projects.completed)}
                  </span>
                  {overdue ? (
                    <span style={{ color: "var(--color-status-risk)" }}>
                      {overdue} {t(S.projects.overdueTasks)}
                    </span>
                  ) : null}
                </div>
                <Progress percent={mine.length ? (done / mine.length) * 100 : 0} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {lead ? (
                  <Chip active>
                    <Avatar name={lead.name} size={18} />
                    {lead.name}
                  </Chip>
                ) : null}
                {project.memberIds.slice(0, 4).map((memberId) => {
                  const member = userById(memberId);
                  return member ? (
                    <Chip key={memberId}>
                      <Avatar name={member.name} size={16} />
                      {member.name.split(" ")[0]}
                    </Chip>
                  ) : null;
                })}
              </div>

              <div className="t-micro mt-4 text-ink-faint">
                {t(S.projects.due)}: {f.date(project.dueAt)} · {f.relativeDeadline(project.dueAt)}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
