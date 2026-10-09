import Link from "next/link";
import { DeadlinesBoard, type DeadlineGroup } from "@/components/DeadlinesBoard";
import { ListColumns } from "@/components/ListColumns";
import { NumCell, PersonCell, RecordList, TagCell, TextCell } from "@/components/RecordList";
import { SectionFilter } from "@/components/SectionFilter";
import { ViewSwitch } from "@/components/ViewSwitch";
import { moduleGate } from "@/components/guard";
import { IconCalendar } from "@/components/icons";
import { Crumbs, EmptyState, PageHeader } from "@/components/ui";
import { userById } from "@/lib/data/users";
import { FILTER_TEXT, matchesFilter, readFilter, readQuery, type FilterRow } from "@/lib/filters";
import { daysUntil, formatters } from "@/lib/format";
import { translator, type Loc } from "@/lib/i18n";
import { DEADLINE_KIND } from "@/lib/labels";
import { DEFAULT_LIST_COLUMNS, listCatalog, listColumns } from "@/lib/list-columns";
import { scopedDeadlines, scopedTeam } from "@/lib/queries";
import { deadlineFields, simplePresets } from "@/lib/section-filters";
import { getSession } from "@/lib/session";
import { listFieldsOf } from "@/lib/store";
import { P, S } from "@/lib/strings";
import { readView } from "@/lib/view";
import type { Deadline } from "@/lib/types";

/**
 * Столбцы доски — срочность, а не вид дедлайна, и цвет идёт от красного к
 * серому: просрочка кричит, «позже» молчит. Те же группы раскладывают и
 * список, поэтому они описаны один раз.
 */
const GROUPS: { key: string; title: Loc; color: string; test: (d: number) => boolean }[] = [
  { key: "overdue", title: S.deadlines.groupOverdue, color: "var(--color-status-risk)", test: (d) => d < 0 },
  { key: "today", title: S.deadlines.groupToday, color: "var(--color-status-progress)", test: (d) => d >= 0 && d <= 1 },
  { key: "week", title: S.deadlines.groupWeek, color: "var(--color-status-open)", test: (d) => d > 1 && d <= 7 },
  { key: "month", title: S.deadlines.groupMonth, color: "var(--color-status-deal)", test: (d) => d > 7 && d <= 30 },
  { key: "later", title: S.deadlines.groupLater, color: "var(--color-status-hold)", test: (d) => d > 30 },
];

export default async function DeadlinesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const t = translator(session.locale);
  const f = formatters(session.locale);
  const gate = moduleGate(session, "deadlines", t(S.nav.deadlines));
  if (gate) return gate;

  const fields = deadlineFields(scopedTeam(session), t);
  const values = readFilter(params);
  const query = readQuery(params);

  const all = scopedDeadlines(session);
  const deadlines = all.filter((d) => matchesFilter(deadlineRow(d, t(d.title)), fields, values, query));
  const overdue = all.filter((d) => daysUntil(d.date) < 0).length;

  const view = readView(params);
  const picked = listFieldsOf(session.user.id, "deadlines", DEFAULT_LIST_COLUMNS.deadlines);
  const columns = listColumns("deadlines", picked, t);

  /** Дедлайн — не самостоятельная запись: ведём к той, где живёт срок. */
  const href = (d: Deadline) =>
    d.relation?.type === "deal"
      ? `/crm/deals/${d.relation.id}`
      : d.relation?.type === "student"
        ? `/crm/contacts/${d.relation.id}`
        : "/tasks";

  const sourceLabel = (d: Deadline) =>
    d.relation?.type === "deal"
      ? t(S.crm.deal)
      : d.relation?.type === "student"
        ? t(S.crm.contact)
        : t(S.nav.tasks);

  const groups: DeadlineGroup[] = GROUPS.map((group) => ({
    key: group.key,
    title: t(group.title),
    color: group.color,
    cards: deadlines
      .filter((d) => group.test(daysUntil(d.date)))
      .map((d) => ({
        id: d.id,
        href: href(d),
        title: t(d.title),
        kindLabel: t(DEADLINE_KIND[d.kind].label),
        kindColor: DEADLINE_KIND[d.kind].dot,
        ownerName: userById(d.ownerId)?.name ?? "—",
        dateLabel: f.shortDate(d.date),
        leftLabel: f.relativeDeadline(d.date),
        overdue: daysUntil(d.date) < 0,
      })),
  }));

  return (
    <>
      <Crumbs back="/" backLabel={t(S.nav.dashboard)} current={t(S.deadlines.title)} />
      <PageHeader
        title={t(S.deadlines.title)}
        meta={
          <>
            <span>{f.plural(all.length, P.deadlines)}</span>
            <span className="text-ink-faint">·</span>
            <span>
              {overdue} {t(S.deadlines.overdue)}
            </span>
            <span className="text-ink-faint">·</span>
            <span>{t(S.deadlines.subtitle)}</span>
          </>
        }
        actions={
          <>
            <ViewSwitch view={view} locale={session.locale} />
            {view === "list" ? (
              <ListColumns
                section="deadlines"
                catalog={listCatalog("deadlines", t)}
                picked={picked}
                defaults={DEFAULT_LIST_COLUMNS.deadlines}
                locale={session.locale}
              />
            ) : null}
            <Link href="/calendar" className="btn btn-secondary btn-sm">
              <IconCalendar size={15} /> {t(S.deadlines.toCalendar)}
            </Link>
          </>
        }
      />

      <SectionFilter
        scope="deadlines"
        fields={fields}
        presets={simplePresets()}
        locale={session.locale}
        userId={session.user.id}
        total={all.length}
        shown={deadlines.length}
      />

      {!deadlines.length ? (
        <EmptyState title={t(FILTER_TEXT.nothing)} />
      ) : view === "list" ? (
        <RecordList
          nameLabel={t(S.list.name)}
          noColumnsNote={t(S.list.noColumns)}
          columns={columns}
          rows={deadlines.map((d) => {
            const kind = DEADLINE_KIND[d.kind];
            const late = daysUntil(d.date) < 0;
            return {
              id: d.id,
              href: href(d),
              title: t(d.title),
              // Подзаголовка нет намеренно: вид дедлайна — своя колонка, и
              // дублировать «Задача» под каждым названием незачем.
              subtitle: null,
              flag: late ? "var(--color-status-risk)" : null,
              cells: {
                kind: <TagCell label={t(kind.label)} color={kind.dot} />,
                owner: <PersonCell name={userById(d.ownerId)?.name ?? "—"} />,
                date: (
                  <NumCell
                    value={f.shortDate(d.date)}
                    hint={f.relativeDeadline(d.date)}
                    accent={late ? "var(--color-status-risk)" : null}
                  />
                ),
                source: <TextCell value={sourceLabel(d)} />,
              },
            };
          })}
        />
      ) : (
        <DeadlinesBoard groups={groups} emptyLabel={t(S.common.empty)} />
      )}
    </>
  );
}

/** Плоское представление дедлайна для фильтра. */
function deadlineRow(d: Deadline, title: string): FilterRow {
  return { search: title, kind: d.kind, ownerId: d.ownerId, date: d.date };
}
