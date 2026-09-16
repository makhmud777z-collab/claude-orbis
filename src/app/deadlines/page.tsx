import Link from "next/link";
import { IconExport } from "@/components/icons";
import { NoAccess } from "@/components/NoAccess";
import { Avatar, PageHeader, SectionTitle, StatusDot } from "@/components/ui";
import { userById } from "@/lib/data/users";
import { daysUntil, formatDate, relativeDeadline } from "@/lib/format";
import { DEADLINE_KIND } from "@/lib/labels";
import { can } from "@/lib/rbac";
import { scopedDeadlines } from "@/lib/queries";
import { getSession } from "@/lib/session";
import type { Deadline } from "@/lib/types";

const GROUPS = [
  { key: "overdue", title: "Просрочено", test: (d: number) => d < 0 },
  { key: "today", title: "Сегодня и завтра", test: (d: number) => d >= 0 && d <= 1 },
  { key: "week", title: "Ближайшие 7 дней", test: (d: number) => d > 1 && d <= 7 },
  { key: "month", title: "8–30 дней", test: (d: number) => d > 7 && d <= 30 },
  { key: "later", title: "Позже", test: (d: number) => d > 30 },
];

export default async function DeadlinesPage() {
  const session = await getSession();
  if (!can(session.role, "deadlines")) {
    return <NoAccess role={session.role} module="Дедлайны" />;
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
        title="Дедлайны"
        meta={
          <>
            <span>{deadlines.length} событий</span>
            <span className="text-ink-faint">·</span>
            <span>{overdue} просрочено</span>
            <span className="text-ink-faint">·</span>
            <span>
              собираются автоматически из заявок, документов и задач — вручную ничего
              не дублируется
            </span>
          </>
        }
        actions={
          <button className="btn btn-secondary btn-sm">
            <IconExport size={15} /> В календарь (.ics)
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
                {group.title}
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
                        <div className="t-micro text-ink-faint">{kind.label}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar name={owner?.name ?? "—"} size={22} />
                        <span className="t-caption text-ink-muted">{owner?.name}</span>
                      </div>
                      <div className="w-36 text-right">
                        <div className="t-caption t-num">{formatDate(d.date)}</div>
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
                          {relativeDeadline(d.date)}
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
