"use client";

import { moveProjectAction } from "@/app/actions";
import { useBoardDrag } from "./board";
import { Avatar, Progress, StatusDot } from "./ui";
import { PROJECT_STATUS } from "@/lib/labels";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";
import type { Project } from "@/lib/types";

export interface ProjectCard {
  id: string;
  name: string;
  description: string;
  status: Project["status"];
  leadName: string | null;
  memberNames: string[];
  /** срок и то, как он читается: «через 12 дней», «просрочен» */
  dueLabel: string;
  dueHint: string;
  done: number;
  total: number;
  overdue: number;
}

/** Порядок колонок — порядок работы, а не алфавит. */
const COLUMNS: Project["status"][] = ["active", "paused", "done"];

/**
 * Доска проектов.
 *
 * Раньше проекты показывались сеткой карточек, и статус нельзя было сменить
 * с экрана вовсе — только там, где проект создавали. Доска отвечает на это
 * прямо: проект переносят рукой из «активен» в «на паузе» и обратно, тем же
 * движением, что сделку по воронке и задачу по доске задач.
 */
export function ProjectsBoard({
  projects,
  locale,
  canEdit,
}: {
  projects: ProjectCard[];
  locale: Locale;
  canEdit: boolean;
}) {
  const t = translator(locale);

  const { columnFor, columnProps, cardProps, over } = useBoardDrag(
    projects,
    (project) => project.status,
    (id, status) => {
      const data = new FormData();
      data.set("id", id);
      data.set("status", status);
      void moveProjectAction(data);
    },
    canEdit,
  );

  return (
    <>
      {canEdit ? (
        <div className="t-micro mb-3 text-ink-faint">{t(S.projects.dragHint)}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {COLUMNS.map((status) => {
          const meta = PROJECT_STATUS[status];
          const items = projects.filter((project) => columnFor(project) === status);
          const active = over === status;

          return (
            <section
              key={status}
              {...columnProps(status)}
              className="relative flex flex-col overflow-hidden rounded-[18px] border border-hairline bg-surface-2 transition-colors duration-150"
              style={{
                background: active
                  ? `color-mix(in srgb, ${meta.dot} 6%, var(--color-surface-2))`
                  : undefined,
              }}
            >
              {active ? (
                <span
                  aria-hidden
                  className="kan-drop-ring pointer-events-none absolute inset-0 rounded-[18px]"
                  style={{ boxShadow: `inset 0 0 0 2px ${meta.dot}` }}
                />
              ) : null}
              <div className="h-[3px] w-full flex-none" style={{ background: meta.dot }} />

              <header className="flex-none border-b border-hairline-soft bg-surface-1 px-3.5 pb-3 pt-3">
                <div className="flex items-center gap-2">
                  <StatusDot color={meta.dot} />
                  <span
                    className="t-caption min-w-0 flex-1 truncate font-semibold"
                    style={{ color: meta.dot }}
                  >
                    {t(meta.label)}
                  </span>
                  <span className="t-micro t-num rounded-full bg-surface-3 px-1.5 py-0.5 font-semibold text-ink-muted">
                    {items.length}
                  </span>
                </div>
              </header>

              <div className="flex flex-1 flex-col gap-2.5 p-2.5">
                {items.map((project) => (
                  <Item
                    key={project.id}
                    project={project}
                    locale={locale}
                    drag={cardProps(project.id)}
                  />
                ))}
                {!items.length ? (
                  <div className="t-micro rounded-[12px] border border-dashed border-hairline px-3 py-7 text-center text-ink-faint">
                    {t(S.common.empty)}
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

function Item({
  project,
  locale,
  drag,
}: {
  project: ProjectCard;
  locale: Locale;
  drag: ReturnType<ReturnType<typeof useBoardDrag>["cardProps"]>;
}) {
  const t = translator(locale);
  const percent = project.total ? (project.done / project.total) * 100 : 0;

  return (
    <article
      {...drag}
      className={`card card-hover px-3.5 py-3 ${drag.className}`}
      style={{ cursor: drag.draggable ? "grab" : "default" }}
    >
      <div className="t-body-sm font-semibold">{project.name}</div>
      <p className="t-micro mt-1 line-clamp-2 leading-relaxed text-ink-faint">
        {project.description}
      </p>

      <div className="mt-2.5 border-t border-hairline-soft pt-2.5">
        <div className="t-micro mb-1.5 flex items-center justify-between text-ink-faint">
          <span>
            {project.done} / {project.total} {t(S.projects.completed)}
          </span>
          {project.overdue ? (
            <span style={{ color: "var(--color-status-risk)" }}>
              {project.overdue} {t(S.projects.overdueTasks)}
            </span>
          ) : null}
        </div>
        <Progress percent={percent} />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          {project.leadName ? (
            <span className="flex items-center gap-1.5" title={project.leadName}>
              <Avatar name={project.leadName} size={22} />
              <span className="t-micro truncate text-ink-faint">{project.leadName}</span>
            </span>
          ) : null}
        </div>
        <span className="t-micro flex-none text-ink-faint">{project.dueHint}</span>
      </div>
    </article>
  );
}
