import Link from "next/link";
import { redirect } from "next/navigation";
import { NAV } from "@/components/nav";
import { IconArrowUpRight, IconExport, IconPlus } from "@/components/icons";
import {
  Avatar,
  Chip,
  PageHeader,
  Progress,
  SectionTitle,
  StatTile,
  StatusDot,
} from "@/components/ui";
import { userById } from "@/lib/data/users";
import { formatters, isPast, isSoon } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { BOARD_STAGES, DEADLINE_KIND, stageMeta } from "@/lib/labels";
import {
  scopedActivity,
  scopedApplications,
  scopedDeadlines,
  scopedStudents,
  scopedTasks,
} from "@/lib/queries";
import { editionModules, hasModule, homeHref } from "@/lib/edition";
import { can, visibleModules } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { S } from "@/lib/strings";

export default async function DashboardPage() {
  const session = await getSession();

  // В версии MVP дашборда нет: система открывается сразу каталогом вузов.
  if (!hasModule(session.tenant.edition, "dashboard")) {
    redirect(homeHref(session.tenant.edition));
  }

  // У роли может не быть дашборда (например, у агента-партнёра) —
  // уводим на первый доступный ей раздел вместо пустого экрана.
  if (!can(session.role, "dashboard")) {
    const inEdition = new Set(editionModules(session.tenant.edition));
    const allowed = new Set(
      visibleModules(session.role).filter((m) => inEdition.has(m)),
    );
    const first = NAV.find((n) => n.href !== "/" && allowed.has(n.module));
    redirect(first?.href ?? "/universities");
  }

  const t = translator(session.locale);
  const f = formatters(session.locale);

  const students = scopedStudents(session);
  const applications = scopedApplications(session);
  const deadlines = scopedDeadlines(session);
  const tasks = scopedTasks(session);
  const activity = scopedActivity(session);

  const active = students.filter((s) => s.status === "active").length;
  const inPipeline = applications.filter(
    (a) => !["departed", "lost"].includes(a.stage),
  );
  // Просроченное — отдельная беда, в «ближайшие 7 дней» оно не входит.
  const overdue = deadlines.filter((d) => isPast(d.date));
  const soon = deadlines.filter((d) => isSoon(d.date, 7));
  const contracted = inPipeline.reduce((sum, a) => sum + a.contractValue, 0);
  const collected = inPipeline.reduce((sum, a) => sum + a.paid, 0);

  const byStage = BOARD_STAGES.map((stage) => ({
    stage,
    meta: stageMeta(stage),
    count: applications.filter((a) => a.stage === stage).length,
  }));
  const maxStage = Math.max(1, ...byStage.map((s) => s.count));

  const myTasks = tasks
    .filter((task) => task.status !== "done")
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        title={`${t(S.dashboard.greeting)}, ${session.user.name.split(" ")[0]}`}
        meta={
          <>
            <span>{session.tenant.name}</span>
            <span className="text-ink-faint">·</span>
            <span>{t(S.dashboard.date)}</span>
            <span className="text-ink-faint">·</span>
            <span>
              {inPipeline.length} {t(S.dashboard.activeApps)} · {soon.length}{" "}
              {t(S.dashboard.weekDeadlines)}
            </span>
          </>
        }
        actions={
          <>
            <button className="btn btn-secondary btn-sm">
              <IconExport size={15} /> {t(S.common.export)}
            </button>
            <Link href="/applications" className="btn btn-primary btn-sm">
              <IconPlus size={15} /> {t(S.dashboard.newApplication)}
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={t(S.dashboard.tileStudents)}
          value={active}
          hint={`${t(S.dashboard.tileStudentsHint)} ${students.length}`}
          accent="var(--color-status-open)"
        />
        <StatTile
          label={t(S.dashboard.tileApps)}
          value={inPipeline.length}
          hint={`${applications.filter((a) => a.stage === "offer").length} ${t(S.dashboard.tileWithOffer)} · ${applications.filter((a) => a.stage === "visa").length} ${t(S.dashboard.tileOnVisa)}`}
          accent="var(--color-status-violet)"
        />
        <StatTile
          label={t(S.dashboard.tileDeadlines)}
          value={soon.length}
          hint={
            overdue.length
              ? `${overdue.length} ${t(S.deadlines.overdue)}`
              : soon[0]
                ? `${t(S.dashboard.tileNearest)} — ${f.shortDate(soon[0].date)}`
                : t(S.dashboard.tileCalm)
          }
          accent="var(--color-status-progress)"
        />
        <StatTile
          label={t(S.dashboard.tileContracted)}
          value={f.som(contracted, { compact: true })}
          hint={`${t(S.dashboard.tilePaid)} ${f.som(collected, { compact: true })} · ${Math.round((collected / Math.max(1, contracted)) * 100)}%`}
          accent="var(--color-status-deal)"
        />
      </div>

      <section className="mt-9">
        <SectionTitle
          action={
            <Link href="/applications" className="t-caption text-ink-muted hover:text-ink">
              {t(S.dashboard.openBoard)} <IconArrowUpRight size={13} className="inline" />
            </Link>
          }
        >
          {t(S.dashboard.funnel)}
        </SectionTitle>
        <div className="card grid grid-cols-2 divide-y divide-hairline-soft sm:grid-cols-4 sm:divide-y-0 xl:grid-cols-8">
          {byStage.map(({ stage, meta, count }) => (
            <Link
              key={stage}
              href={`/applications?stage=${stage}`}
              className="group px-5 py-5 transition-colors hover:bg-surface-2 sm:border-r sm:border-hairline-soft sm:last:border-r-0"
            >
              <div className="t-micro flex items-center gap-2 whitespace-nowrap text-ink-muted">
                <StatusDot color={meta.dot} />
                {t(meta.short)}
              </div>
              <div className="t-num mt-3 text-[26px] font-medium tracking-[-1.2px]">
                {count}
              </div>
              <div className="mt-3">
                <Progress percent={(count / maxStage) * 100} tone={meta.dot} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-9 grid min-w-0 gap-5 lg:grid-cols-[1.15fr_1fr]">
        <section className="min-w-0">
          <SectionTitle
            action={
              <Link href="/deadlines" className="t-caption text-ink-muted hover:text-ink">
                {t(S.dashboard.allDeadlines)}
              </Link>
            }
          >
            {t(S.dashboard.nearestDeadlines)}
          </SectionTitle>
          <div className="card divide-y divide-hairline-soft">
            {deadlines.slice(0, 6).map((d) => {
              const kind = DEADLINE_KIND[d.kind];
              const owner = userById(d.ownerId);
              return (
                <div key={d.id} className="flex items-center gap-4 px-5 py-3.5">
                  <StatusDot color={kind.dot} />
                  <div className="min-w-0 flex-1">
                    <div className="t-body-sm truncate">{t(d.title)}</div>
                    <div className="t-micro mt-0.5 text-ink-faint">
                      {t(kind.label)} · {owner?.name ?? "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="t-caption t-num">{f.shortDate(d.date)}</div>
                    <div className="t-micro text-ink-faint">
                      {f.relativeDeadline(d.date)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="spotlight-violet mt-5 overflow-hidden rounded-[30px] px-8 py-8">
            <div className="t-caption uppercase tracking-[0.1em] text-white/70">
              {t(S.dashboard.spotlightEyebrow)}
            </div>
            <div className="mt-3 max-w-sm text-[24px] font-medium leading-[1.15] tracking-[-0.9px] text-white">
              {t(S.dashboard.spotlightTitle)}
            </div>
            <Link
              href="/universities"
              className="btn mt-6 bg-white text-black hover:bg-white/90"
            >
              {t(S.dashboard.spotlightCta)} <IconArrowUpRight size={14} />
            </Link>
          </div>
        </section>

        <section className="min-w-0">
          <SectionTitle
            action={
              <Link href="/tasks" className="t-caption text-ink-muted hover:text-ink">
                {t(S.dashboard.allTasks)}
              </Link>
            }
          >
            {t(S.dashboard.myTasks)}
          </SectionTitle>
          <div className="card divide-y divide-hairline-soft">
            {myTasks.map((task) => {
              const assignee = userById(task.assigneeId);
              return (
                <div key={task.id} className="flex items-start gap-3.5 px-5 py-3.5">
                  <span className="mt-1 h-3.5 w-3.5 flex-none rounded-[5px] border border-hairline" />
                  <div className="min-w-0 flex-1">
                    <div className="t-body-sm">{task.title}</div>
                    <div className="t-micro mt-1 flex items-center gap-2 text-ink-faint">
                      <Avatar name={assignee?.name ?? "—"} size={18} />
                      {assignee?.name}
                      <span>·</span>
                      <span
                        style={{
                          color: isSoon(task.dueAt, 2) || isPast(task.dueAt)
                            ? "var(--color-status-risk)"
                            : undefined,
                        }}
                      >
                        {f.relativeDeadline(task.dueAt)}
                      </span>
                    </div>
                  </div>
                  {task.priority === "high" ? (
                    <Chip dot="var(--color-status-risk)">{t(S.dashboard.important)}</Chip>
                  ) : null}
                </div>
              );
            })}
          </div>

          <SectionTitle>{t(S.dashboard.feed)}</SectionTitle>
          <div className="card divide-y divide-hairline-soft">
            {activity.slice(0, 7).map((e) => {
              const actor = userById(e.actorId);
              return (
                <div key={e.id} className="flex items-start gap-3 px-5 py-3">
                  <Avatar name={actor?.name ?? "—"} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="t-body-sm">
                      <span className="text-ink">{actor?.name}</span>{" "}
                      <span className="text-ink-muted">{e.verb}</span> {e.object}
                    </div>
                    <div className="t-micro mt-0.5 text-ink-faint">
                      {f.relativeTime(e.at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
