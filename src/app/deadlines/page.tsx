import Link from "next/link";
import { IconExport } from "@/components/icons";
import { NoAccess } from "@/components/NoAccess";
import { Avatar, PageHeader, SectionTitle, StatusDot } from "@/components/ui";
import { userById } from "@/lib/data/users";
import { daysUntil, formatters } from "@/lib/format";
import { translator, type Loc } from "@/lib/i18n";
import { DEADLINE_KIND } from "@/lib/labels";
import { can } from "@/lib/rbac";
import { scopedDeadlines } from "@/lib/queries";
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

export default async function DeadlinesPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const f = formatters(session.locale);
  if (!can(session.role, "deadlines")) {
    return (
      <NoAccess role={session.role} module={t(S.nav.deadlines)} locale={session.locale} />
    );
  }

  const deadlines = scopedDeadlines(session);
  const overdue = deadlines.filter((d) => daysUntil(d.date) < 0).length;

  const href = (d: Deadline) =>
    d.relation?.type === "application"
      ? `/applications/${d.relation.id}`
      : d.relation?.type === "student"
        ? `/students/${d.relation.id}`
        : "/tasks";

  return (
    <>
      <PageHeader
        title={t(S.deadlines.title)}
        meta={
          <>
            <span>
              {deadlines.length} {t(S.deadlines.events)}
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
          <button className="btn btn-secondary btn-sm">
            <IconExport size={15} /> {t(S.deadlines.toCalendar)}
          </button>
        }
      />

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
                        <div className="t-body-sm">{d.title}</div>
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
