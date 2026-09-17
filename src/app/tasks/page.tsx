import Link from "next/link";
import { moduleGate } from "@/components/guard";
import { IconPlus } from "@/components/icons";
import { TasksBoard, type TaskCard } from "@/components/TasksBoard";
import { PageHeader } from "@/components/ui";
import { dealById } from "@/lib/store";
import { studentById } from "@/lib/data/students";
import { userById } from "@/lib/data/users";
import { translator } from "@/lib/i18n";
import { isPast } from "@/lib/format";
import { allow } from "@/lib/rbac";
import { S } from "@/lib/strings";
import { scopedTasks, scopedTeam } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function TasksPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const gate = moduleGate(session, "tasks", t(S.nav.tasks));
  if (gate) return gate;

  const cards: TaskCard[] = scopedTasks(session).map((task) => {
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
            <Link href="/tasks/templates" className="hover:text-ink">{t(S.projects.templates)}</Link>
          </>
        }
        actions={
          allow(session.tenant.id, session.role, "tasks", "create") ? (
            <button className="btn btn-primary btn-sm">
              <IconPlus size={15} /> {t(S.tasks.create)}
            </button>
          ) : null
        }
      />
      <TasksBoard
        tasks={cards}
        assignees={scopedTeam(session).map((u) => ({ id: u.id, name: u.name }))}
        currentUserId={session.user.id}
        locale={session.locale}
      />
    </>
  );
}
