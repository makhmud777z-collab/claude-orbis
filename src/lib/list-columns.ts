import type { Loc, Translate } from "./i18n";
import { S } from "./strings";

/**
 * Колонки списка — как в Битриксе.
 *
 * У каждого раздела, где есть доска, есть и список, а у списка — свой набор
 * колонок, который сотрудник собирает сам. Каталог колонок лежит здесь, а не
 * в компоненте списка, по той же причине, по которой ключ вида лежит в
 * `view.ts`: его читает серверная страница, и клиентской границы между ними
 * быть не должно.
 *
 * Название записи в каталог не входит: это ссылка на карточку, и без неё
 * строка перестаёт быть строкой. Всё остальное — выбор сотрудника, вплоть до
 * «оставить одно название».
 */
export type ListSection = "leads" | "deals" | "tasks" | "projects";

export interface ListColumnSpec {
  key: string;
  label: Loc;
  /** число или дата: такие колонки читают справа */
  numeric?: boolean;
}

export interface ListColumn {
  key: string;
  label: string;
  numeric?: boolean;
}

export const LIST_COLUMNS: Record<ListSection, ListColumnSpec[]> = {
  leads: [
    { key: "stage", label: S.crm.stage },
    { key: "owner", label: S.pipelines.fieldOwner },
    { key: "created", label: S.list.created, numeric: true },
    { key: "source", label: S.crm.source },
    { key: "channel", label: S.crm.channel },
    { key: "comment", label: S.crm.comment },
    { key: "contacts", label: S.list.contacts },
  ],
  deals: [
    { key: "stage", label: S.crm.stage },
    { key: "owner", label: S.pipelines.fieldOwner },
    { key: "amount", label: S.pipelines.fieldAmount, numeric: true },
    { key: "deadline", label: S.pipelines.fieldDeadline, numeric: true },
    { key: "university", label: S.pipelines.fieldUniversity },
    { key: "intake", label: S.pipelines.fieldIntake },
    { key: "dossier", label: S.pipelines.fieldDossier },
    { key: "contacts", label: S.list.contacts },
  ],
  tasks: [
    { key: "status", label: S.list.status },
    { key: "assignee", label: S.tasks.assignee },
    { key: "due", label: S.tasks.due, numeric: true },
    { key: "priority", label: S.tasks.priority },
    { key: "project", label: S.list.project },
    { key: "creator", label: S.list.creator },
  ],
  projects: [
    { key: "status", label: S.list.status },
    { key: "lead", label: S.projects.manager },
    { key: "due", label: S.projects.due, numeric: true },
    { key: "progress", label: S.list.progress, numeric: true },
    { key: "members", label: S.projects.members },
  ],
};

/** Набор по умолчанию: то, за чем в раздел заходят чаще всего. */
export const DEFAULT_LIST_COLUMNS: Record<ListSection, string[]> = {
  leads: ["stage", "owner", "created", "contacts"],
  deals: ["stage", "owner", "amount", "deadline", "contacts"],
  tasks: ["status", "assignee", "due", "priority"],
  projects: ["status", "lead", "due", "progress"],
};

/**
 * Выбранные колонки в порядке каталога.
 *
 * Порядок берётся из каталога, а не из выбора сотрудника: столбцы в таблице
 * читаются слева направо от главного к второстепенному, и порядок галочек в
 * настройке не должен этого ломать.
 */
export function listColumns(
  section: ListSection,
  picked: string[],
  t: Translate,
): ListColumn[] {
  return LIST_COLUMNS[section]
    .filter((c) => picked.includes(c.key))
    .map((c) => ({ key: c.key, label: t(c.label), numeric: c.numeric }));
}

/** Каталог для настройки: все колонки раздела с переведёнными подписями. */
export const listCatalog = (section: ListSection, t: Translate): ListColumn[] =>
  LIST_COLUMNS[section].map((c) => ({ key: c.key, label: t(c.label), numeric: c.numeric }));
