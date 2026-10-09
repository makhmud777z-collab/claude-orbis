import Link from "next/link";
import { ListColumns } from "@/components/ListColumns";
import {
  NumCell, PersonCell, RecordList, TagCell, TextCell,
} from "@/components/RecordList";
import { SectionFilter } from "@/components/SectionFilter";
import { TasksBoard, type TaskCard } from "@/components/TasksBoard";
import { NewTaskDialog } from "@/components/NewTaskDialog";
import { ViewSwitch } from "@/components/ViewSwitch";
import { moduleGate } from "@/components/guard";
import { Crumbs, EmptyState, PageHeader } from "@/components/ui";
import { studentById } from "@/lib/data/students";
import { userById } from "@/lib/data/users";
import { FILTER_TEXT, matchesFilter, readFilter, readQuery, type FilterRow } from "@/lib/filters";
import { TODAY_ISO, formatters, isPast } from "@/lib/format";
import { PRIORITY_LABEL, TASK_STATUS } from "@/lib/labels";
import { DEFAULT_LIST_COLUMNS, listCatalog, listColumns } from "@/lib/list-columns";
import { translator, type Translate } from "@/lib/i18n";
import { scopedProjects, scopedTasks, scopedTeam } from "@/lib/queries";
import { allow } from "@/lib/rbac";
import { taskFields, taskPresets } from "@/lib/section-filters";
import { getSession } from "@/lib/session";
import { dealById, listFieldsOf } from "@/lib/store";
import { readView } from "@/lib/view";
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

  const f = formatters(session.locale);
  const all = scopedTasks(session);
  // Доска и список показывают один и тот же срез: фильтр отбирает задачи
  // один раз, а дальше они просто по-разному нарисованы.
  const shown = all.filter((task) => matchesFilter(taskRow(task), fields, values, query));
  const cards: TaskCard[] = shown.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueAt: task.dueAt,
    assigneeId: task.assigneeId,
    assigneeName: userById(task.assigneeId)?.name ?? "—",
    creatorName: userById(task.creatorId)?.name ?? "—",
    relationLabel: relationOf(task, t),
    overdue: task.status !== "done" && isPast(task.dueAt),
  }));

  const view = readView(params);
  const picked = listFieldsOf(session.user.id, "tasks", DEFAULT_LIST_COLUMNS.tasks);
  const columns = listColumns("tasks", picked, t);

  return (
    <>
      <Crumbs back="/" backLabel={t(S.nav.dashboard)} current={t(S.tasks.title)} />
      <PageHeader
        title={t(S.tasks.title)}
        meta={
          <>
            <span>
              {all.filter((task) => task.status !== "done").length} {t(S.tasks.inProgress)}
            </span>
            <span className="text-ink-faint">·</span>
            <Link href="/tasks/projects" className="hover:text-ink">{t(S.projects.title)}</Link>
            <Link href="/tasks/reports" className="hover:text-ink">{t(S.projects.reports)}</Link>
          </>
        }
        actions={
          <>
            <ViewSwitch view={view} locale={session.locale} />
            {view === "list" ? (
              <ListColumns
                section="tasks"
                catalog={listCatalog("tasks", t)}
                picked={picked}
                defaults={DEFAULT_LIST_COLUMNS.tasks}
                locale={session.locale}
              />
            ) : null}
            {allow(session.tenant.id, session.role, "tasks", "create") ? (
              <NewTaskDialog
                locale={session.locale}
                defaultAssigneeId={session.user.id}
                defaultDue={TODAY_ISO}
                people={team.map((u) => ({ value: u.id, label: u.name, hint: u.title }))}
              />
            ) : null}
          </>
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

      {!cards.length ? (
        <EmptyState title={t(FILTER_TEXT.nothing)} />
      ) : view === "list" ? (
        <RecordList
          nameLabel={t(S.list.name)}
          noColumnsNote={t(S.list.noColumns)}
          columns={columns}
          rows={shown.map((task) => {
            const status = TASK_STATUS[task.status];
            const overdue = task.status !== "done" && isPast(task.dueAt);
            const project = task.projectId
              ? projects.find((p) => p.id === task.projectId)
              : undefined;

            return {
              id: task.id,
              href: relationHref(task),
              title: task.title,
              subtitle: relationOf(task, t) ?? task.description,
              flag: overdue
                ? "var(--color-status-risk)"
                : task.priority === "high"
                  ? "var(--color-status-progress)"
                  : null,
              cells: {
                status: <TagCell label={t(status.label)} color={status.dot} />,
                assignee: <PersonCell name={userById(task.assigneeId)?.name ?? "—"} />,
                due: (
                  <NumCell
                    value={f.shortDate(task.dueAt)}
                    hint={f.relativeDeadline(task.dueAt)}
                    accent={overdue ? "var(--color-status-risk)" : null}
                  />
                ),
                priority: <TextCell value={t(PRIORITY_LABEL[task.priority])} />,
                project: project ? <TextCell value={t(project.name)} /> : null,
                creator: <PersonCell name={userById(task.creatorId)?.name ?? "—"} />,
              },
            };
          })}
        />
      ) : (
        <TasksBoard
          tasks={cards}
          locale={session.locale}
          canEdit={allow(session.tenant.id, session.role, "tasks", "edit")}
        />
      )}
    </>
  );
}

/**
 * Куда ведёт строка списка. Своей страницы у задачи нет, поэтому ведём к
 * тому, из-за чего она появилась: к контакту или к сделке. Нет связи — нет
 * и ссылки.
 */
function relationHref(task: Task): string | null {
  if (task.relation?.type === "student") return `/crm/contacts/${task.relation.id}`;
  if (task.relation?.type === "deal") return `/crm/deals/${task.relation.id}`;
  return null;
}

/**
 * К чему привязана задача. Подзаголовок строки и карточки — одно и то же,
 * поэтому считается в одном месте.
 */
function relationOf(task: Task, t: Translate): string | null {
  if (task.relation?.type === "student") {
    return studentById(task.relation.id)?.fullName ?? null;
  }
  if (task.relation?.type === "deal") {
    const deal = dealById(task.relation.id);
    return deal ? `${t(S.crm.deal)} ${deal.id.toUpperCase()}` : null;
  }
  return null;
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
