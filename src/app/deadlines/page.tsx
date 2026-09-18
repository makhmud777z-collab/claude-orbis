import Link from "next/link";
import { SectionFilter } from "@/components/SectionFilter";
import { moduleGate } from "@/components/guard";
import { IconCalendar } from "@/components/icons";
import { Avatar, EmptyState, PageHeader, SectionTitle, StatusDot } from "@/components/ui";
import { userById } from "@/lib/data/users";
import { FILTER_TEXT, matchesFilter, readFilter, readQuery, type FilterRow } from "@/lib/filters";
import { daysUntil, formatters } from "@/lib/format";
import { translator, type Loc } from "@/lib/i18n";
import { DEADLINE_KIND } from "@/lib/labels";
import { scopedDeadlines, scopedTeam } from "@/lib/queries";
import { deadlineFields, simplePresets } from "@/lib/section-filters";
import { getSession } from "@/lib/session";
import { S } from "@/lib/strings";
import type { Deadline } from "@/lib/types";

const GROUPS: { key: string; title: Loc; test: (d: number) => boolean }[] = [
  { key: "overdue", title: S.deadlines.groupOverdue, test: (d) => d < 0 },
  { key: "today", title: S.deadlines.groupToday, test: (d) => d >= 0 && d <= 1 },
  { key: "week", title: S.deadlines.groupWeek, test: (d) => d > 1 && d <= 7 },
  { key: "month", title: S.deadlines.groupMonth, test: (d) => d > 7 && d <= 30 },
  { key: "later", title: S.deadlines.groupLater, test: (d) => d > 30 },
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
  const overdue = deadlines.filter((d) => daysUntil(d.date) < 0).length;

  const href = (d: Deadline) =>
    d.relation?.type === "deal"
      ? `/crm/deals/${d.relation.id}`
      : d.relation?.type === "student"
        ? `/crm/contacts/${d.relation.id}`
        : "/tasks";

  return (
    <>
      <PageHeader
        title={t(S.deadlines.title)}
        meta={
          <>
            <span>
              {all.length} {t(S.deadlines.events)}
            </span>
            <span className="text-ink-faint">·</span>
            <span>
              {overdue} {t(S.deadlines.overdue)}
            </span>
            <span className="text-ink-faint">·</span>
            <span>{t(S.deadlines.subtitle)}</span>
          </>
        }
        actions={
          <Link href="/calendar" className="btn btn-secondary btn-sm">
            <IconCalendar size={15} /> {t(S.deadlines.toCalendar)}
          </Link>
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

      {!deadlines.length ? <EmptyState title={t(FILTER_TEXT.nothing)} /> : null}

      <div className="space-y-8">
        {GROUPS.map((group) => {
          const items = deadlines.filter((d) => group.test(daysUntil(d.date)));
          if (!items.length) return null;
          return (
            <section key={group.key}>
              <SectionTitle
                action={<span className="t-caption text-ink-faint">{items.length}</span>}
              >
                {t(group.title)}
              </SectionTitle>
              <div className="card divide-y divide-hairline-soft">
                {items.map((d) => {
                  const kind = DEADLINE_KIND[d.kind];
                  const owner = userById(d.ownerId);
                  const days = daysUntil(d.date);
                  return (
                    <Link
                      key={d.id}
                      href={href(d)}
                      className="flex flex-wrap items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2"
                    >
                      <StatusDot color={kind.dot} />
                      <div className="min-w-[220px] flex-1">
                        <div className="t-body-sm">{t(d.title)}</div>
                        <div className="t-micro text-ink-faint">{t(kind.label)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar name={owner?.name ?? "—"} size={22} />
                        <span className="t-caption text-ink-muted">{owner?.name}</span>
                      </div>
                      <div className="w-36 text-right">
                        <div className="t-caption t-num">{f.date(d.date)}</div>
                        <div
                          className="t-micro"
                          style={{
                            color:
                              days < 0
                                ? "var(--color-status-risk)"
                                : days <= 3
                                  ? "var(--color-status-progress)"
                                  : "var(--color-ink-faint)",
                          }}
                        >
                          {f.relativeDeadline(d.date)}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

/** Плоское представление дедлайна для фильтра. */
function deadlineRow(d: Deadline, title: string): FilterRow {
  return { search: title, kind: d.kind, ownerId: d.ownerId, date: d.date };
}
