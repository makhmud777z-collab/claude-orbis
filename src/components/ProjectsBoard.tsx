"use client";

import { moveProjectAction } from "@/app/actions";
import { Board, BoardColumn } from "./BoardColumn";
import { useBoardDrag } from "./board";
import { Avatar, Progress } from "./ui";
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

  const { columnFor, columnProps, cardProps, dropIndex, over } = useBoardDrag(
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
    <Board hint={canEdit ? t(S.projects.dragHint) : null}>
      {COLUMNS.map((status) => {
        const meta = PROJECT_STATUS[status];
        const items = projects.filter((project) => columnFor(project) === status);

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
            cards={items.map((project) => (
              <Item
                key={project.id}
                project={project}
                locale={locale}
                drag={cardProps(project.id)}
              />
            ))}
          />
        );
      })}
    </Board>
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

      {/* min-w-0 на каждом уровне: без него длинное имя руководителя не
          обрезается, а распирает карточку и вылезает за колонку. */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        {project.leadName ? (
          <span className="flex min-w-0 items-center gap-1.5" title={project.leadName}>
            <Avatar name={project.leadName} size={22} />
            <span className="t-micro min-w-0 truncate text-ink-faint">{project.leadName}</span>
          </span>
        ) : (
          <span />
        )}
        <span className="t-micro flex-none text-ink-faint">{project.dueHint}</span>
      </div>
    </article>
  );
}
