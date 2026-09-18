import Link from "next/link";
import { SectionFilter } from "@/components/SectionFilter";
import { TasksBoard, type TaskCard } from "@/components/TasksBoard";
import { NewTaskDialog } from "@/components/NewTaskDialog";
import { moduleGate } from "@/components/guard";
import { EmptyState, PageHeader } from "@/components/ui";
import { studentById } from "@/lib/data/students";
import { userById } from "@/lib/data/users";
import { FILTER_TEXT, matchesFilter, readFilter, readQuery, type FilterRow } from "@/lib/filters";
import { TODAY_ISO, isPast } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { scopedProjects, scopedTasks, scopedTeam } from "@/lib/queries";
import { allow } from "@/lib/rbac";
import { taskFields, taskPresets } from "@/lib/section-filters";
import { getSession } from "@/lib/session";
import { dealById } from "@/lib/store";
import { S } from "@/lib/strings";
import type { Task } from "@/lib/types";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const t = translator(session.locale);
  const gate = moduleGate(session, "tasks", t(S.nav.tasks));
  if (gate) return gate;

  const team = scopedTeam(session);
  const projects = scopedProjects(session);
  const fields = taskFields(team, projects, t);
  const values = readFilter(params);
  const query = readQuery(params);

  const all = scopedTasks(session);
  const cards: TaskCard[] = all
    .filter((task) => matchesFilter(taskRow(task), fields, values, query))
    .map((task) => {
      let relationLabel: string | null = null;
      if (task.relation?.type === "student") {
        relationLabel = studentById(task.relation.id)?.fullName ?? null;
      } else if (task.relation?.type === "deal") {
        const deal = dealById(task.relation.id);
        relationLabel = deal ? `${t(S.crm.deal)} ${deal.id.toUpperCase()}` : null;
      }

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueAt: task.dueAt,
        assigneeId: task.assigneeId,
        assigneeName: userById(task.assigneeId)?.name ?? "—",
        creatorName: userById(task.creatorId)?.name ?? "—",
        relationLabel,
        overdue: task.status !== "done" && isPast(task.dueAt),
      };
    });

  return (
    <>
      <PageHeader
        title={t(S.tasks.title)}
        meta={
          <>
            <span>
              {cards.filter((c) => c.status !== "done").length} {t(S.tasks.inProgress)}
            </span>
            <span className="text-ink-faint">·</span>
            <Link href="/tasks/projects" className="hover:text-ink">{t(S.projects.title)}</Link>
            <Link href="/tasks/reports" className="hover:text-ink">{t(S.projects.reports)}</Link>
          </>
        }
        actions={
          allow(session.tenant.id, session.role, "tasks", "create") ? (
            <NewTaskDialog
              locale={session.locale}
              defaultAssigneeId={session.user.id}
              defaultDue={TODAY_ISO}
              people={team.map((u) => ({ value: u.id, label: u.name, hint: u.title }))}
            />
          ) : null
        }
      />

      <SectionFilter
        scope="tasks"
        fields={fields}
        presets={taskPresets(session, TODAY_ISO)}
        locale={session.locale}
        userId={session.user.id}
        total={all.length}
        shown={cards.length}
      />

      {cards.length ? (
        <TasksBoard tasks={cards} locale={session.locale} />
      ) : (
        <EmptyState title={t(FILTER_TEXT.nothing)} />
      )}
    </>
  );
}

/** Плоское представление задачи для фильтра. */
function taskRow(task: Task): FilterRow {
  return {
    search: `${task.title} ${task.description}`,
    status: task.status,
    assigneeId: task.assigneeId,
    creatorId: task.creatorId,
    priority: task.priority,
    projectId: task.projectId,
    dueAt: task.dueAt,
    title: task.title,
  };
}
