import { IconPlus } from "@/components/icons";
import { NoAccess } from "@/components/NoAccess";
import { TasksBoard, type TaskCard } from "@/components/TasksBoard";
import { PageHeader } from "@/components/ui";
import { applicationById } from "@/lib/data/applications";
import { studentById } from "@/lib/data/students";
import { userById } from "@/lib/data/users";
import { can } from "@/lib/rbac";
import { scopedTasks, scopedTeam } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function TasksPage() {
  const session = await getSession();
  if (!can(session.role, "tasks")) {
    return <NoAccess role={session.role} module="Задачи" />;
  }

  const cards: TaskCard[] = scopedTasks(session).map((t) => {
    let relationLabel: string | null = null;
    if (t.relation?.type === "student") {
      relationLabel = studentById(t.relation.id)?.fullName ?? null;
    } else if (t.relation?.type === "application") {
      const app = applicationById(t.relation.id);
      relationLabel = app ? `Заявка ${app.id.toUpperCase()}` : null;
    }

    return {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueAt: t.dueAt,
      assigneeId: t.assigneeId,
      assigneeName: userById(t.assigneeId)?.name ?? "—",
      creatorName: userById(t.creatorId)?.name ?? "—",
      relationLabel,
      overdue: t.status !== "done" && t.dueAt < "2026-09-16",
    };
  });

  return (
    <>
      <PageHeader
        title="Задачи"
        meta={
          <>
            <span>{cards.filter((c) => c.status !== "done").length} в работе</span>
            <span className="text-ink-faint">·</span>
            <span>
              руководитель ставит задачу — исполнитель видит её у себя и в дедлайнах
            </span>
          </>
        }
        actions={
          can(session.role, "tasks", "create") ? (
            <button className="btn btn-primary btn-sm">
              <IconPlus size={15} /> Новая задача
            </button>
          ) : null
        }
      />
      <TasksBoard
        tasks={cards}
        assignees={scopedTeam(session).map((u) => ({ id: u.id, name: u.name }))}
        currentUserId={session.user.id}
      />
    </>
  );
}
