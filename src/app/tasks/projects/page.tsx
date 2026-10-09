import Link from "next/link";
import { ListColumns } from "@/components/ListColumns";
import { ProjectsBoard, type ProjectCard } from "@/components/ProjectsBoard";
import { BarCell, NumCell, PeopleCell, PersonCell, RecordList, TagCell } from "@/components/RecordList";
import { SectionFilter } from "@/components/SectionFilter";
import { ViewSwitch } from "@/components/ViewSwitch";
import { moduleGate } from "@/components/guard";
import { Crumbs, EmptyState, PageHeader } from "@/components/ui";
import { userById } from "@/lib/data/users";
import { FILTER_TEXT, matchesFilter, readFilter, readQuery, type FilterRow } from "@/lib/filters";
import { formatters, isPast } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { PROJECT_STATUS } from "@/lib/labels";
import { DEFAULT_LIST_COLUMNS, listCatalog, listColumns } from "@/lib/list-columns";
import { scopedProjects, scopedTasks, scopedTeam } from "@/lib/queries";
import { allow } from "@/lib/rbac";
import { projectFields, simplePresets } from "@/lib/section-filters";
import { getSession } from "@/lib/session";
import { listFieldsOf } from "@/lib/store";
import { P, S } from "@/lib/strings";
import { readView } from "@/lib/view";
import type { Project } from "@/lib/types";

/**
 * Проекты объединяют задачи в общую цель: набор, сверка каталога, открытие
 * филиала.
 *
 * Показываются так же, как всё остальное в портале: доской, если работу
 * ведут, и списком, если её проверяют. На доске столбцы — статусы проекта, и
 * проект переносится между ними рукой.
 */
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const t = translator(session.locale);
  const gate = moduleGate(session, "projects", t(S.projects.title));
  if (gate) return gate;

  const f = formatters(session.locale);
  const fields = projectFields(scopedTeam(session), t);
  const values = readFilter(params);
  const query = readQuery(params);

  const all = scopedProjects(session);
  const projects = all.filter((p) => matchesFilter(projectRow(p, t(p.name)), fields, values, query));
  const tasks = scopedTasks(session);

  const view = readView(params);
  const picked = listFieldsOf(session.user.id, "projects", DEFAULT_LIST_COLUMNS.projects);
  const columns = listColumns("projects", picked, t);

  /** Сколько задач проекта закрыто и сколько из открытых просрочено. */
  const progressOf = (project: Project) => {
    const mine = tasks.filter((task) => task.projectId === project.id);
    return {
      total: mine.length,
      done: mine.filter((task) => task.status === "done").length,
      overdue: mine.filter((task) => task.status !== "done" && isPast(task.dueAt)).length,
    };
  };

  const cards: ProjectCard[] = projects.map((project) => {
    const counts = progressOf(project);
    return {
      id: project.id,
      name: t(project.name),
      description: project.description,
      status: project.status,
      leadName: userById(project.leadId)?.name ?? null,
      memberNames: project.memberIds
        .map((id) => userById(id)?.name)
        .filter((name): name is string => Boolean(name)),
      dueLabel: f.date(project.dueAt),
      dueHint: f.relativeDeadline(project.dueAt),
      ...counts,
    };
  });

  return (
    <>
      <Crumbs back="/tasks" backLabel={t(S.nav.tasks)} current={t(S.projects.title)} />
      <PageHeader
        title={t(S.projects.title)}
        meta={
          <>
            <span>{f.plural(all.length, P.projects)}</span>
            <span>·</span>
            <Link href="/tasks" className="hover:text-ink">{t(S.nav.tasks)}</Link>
          </>
        }
        actions={
          <>
            <ViewSwitch view={view} locale={session.locale} />
            {view === "list" ? (
              <ListColumns
                section="projects"
                catalog={listCatalog("projects", t)}
                picked={picked}
                defaults={DEFAULT_LIST_COLUMNS.projects}
                locale={session.locale}
              />
            ) : null}
          </>
        }
      />

      <SectionFilter
        scope="projects"
        fields={fields}
        presets={simplePresets()}
        locale={session.locale}
        userId={session.user.id}
        total={all.length}
        shown={projects.length}
      />

      {!projects.length ? (
        <EmptyState title={t(FILTER_TEXT.nothing)} />
      ) : view === "list" ? (
        <RecordList
          nameLabel={t(S.list.name)}
          noColumnsNote={t(S.list.noColumns)}
          columns={columns}
          rows={cards.map((card) => {
            const meta = PROJECT_STATUS[card.status];
            const percent = card.total ? (card.done / card.total) * 100 : 0;

            return {
              id: card.id,
              title: card.name,
              subtitle: card.description,
              flag: card.overdue ? "var(--color-status-risk)" : null,
              cells: {
                status: <TagCell label={t(meta.label)} color={meta.dot} />,
                lead: card.leadName ? <PersonCell name={card.leadName} /> : null,
                due: <NumCell value={card.dueLabel} hint={card.dueHint} />,
                progress: (
                  <BarCell
                    percent={percent}
                    note={`${card.done} / ${card.total} ${t(S.projects.completed)}`}
                  />
                ),
                members: <PeopleCell names={card.memberNames} />,
              },
            };
          })}
        />
      ) : (
        <ProjectsBoard
          projects={cards}
          locale={session.locale}
          canEdit={allow(session.tenant.id, session.role, "projects", "edit")}
        />
      )}
    </>
  );
}

/** Плоское представление проекта для фильтра. */
function projectRow(project: Project, name: string): FilterRow {
  return {
    search: `${name} ${project.description}`,
    status: project.status,
    leadId: project.leadId,
    memberIds: project.memberIds,
    dueAt: project.dueAt,
    name,
  };
}
