import Link from "next/link";
import { redirect } from "next/navigation";
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
import { formatShortDate, money, relativeDeadline, relativeTime } from "@/lib/format";
import { BOARD_STAGES, DEADLINE_KIND, stageMeta } from "@/lib/labels";
import {
  scopedActivity,
  scopedApplications,
  scopedDeadlines,
  scopedStudents,
  scopedTasks,
} from "@/lib/queries";
import { can, visibleModules } from "@/lib/rbac";
import { NAV } from "@/components/nav";
import { getSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await getSession();

  // У роли может не быть дашборда (например, у агента-партнёра) —
  // уводим на первый доступный ей раздел вместо пустого экрана.
  if (!can(session.role, "dashboard")) {
    const allowed = new Set(visibleModules(session.role));
    const first = NAV.find((n) => n.href !== "/" && allowed.has(n.module));
    redirect(first?.href ?? "/students");
  }

  const students = scopedStudents(session);
  const applications = scopedApplications(session);
  const deadlines = scopedDeadlines(session);
  const tasks = scopedTasks(session);
  const activity = scopedActivity(session);

  const active = students.filter((s) => s.status === "active").length;
  const inPipeline = applications.filter(
    (a) => !["departed", "lost"].includes(a.stage),
  );
  const soon = deadlines.filter((d) => {
    const days = Math.round(
      (new Date(d.date).getTime() - new Date("2026-09-16").getTime()) / 86_400_000,
    );
    return days <= 7;
  });
  const contracted = inPipeline.reduce((sum, a) => sum + a.contractValue, 0);
  const collected = inPipeline.reduce((sum, a) => sum + a.paid, 0);

  const byStage = BOARD_STAGES.map((stage) => ({
    stage,
    meta: stageMeta(stage),
    count: applications.filter((a) => a.stage === stage).length,
  }));
  const maxStage = Math.max(1, ...byStage.map((s) => s.count));

  const myTasks = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        title={`Добрый день, ${session.user.name.split(" ")[0]}`}
        meta={
          <>
            <span>{session.tenant.name}</span>
            <span className="text-ink-faint">·</span>
            <span>16 сентября 2026, среда</span>
            <span className="text-ink-faint">·</span>
            <span>
              {inPipeline.length} активных заявок · {soon.length} дедлайнов на неделе
            </span>
          </>
        }
        actions={
          <>
            <button className="btn btn-secondary btn-sm">
              <IconExport size={15} /> Экспорт
            </button>
            <Link href="/applications" className="btn btn-primary btn-sm">
              <IconPlus size={15} /> Новая заявка
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Студенты в работе"
          value={active}
          hint={`всего в базе ${students.length}`}
          accent="var(--color-status-open)"
        />
        <StatTile
          label="Заявки в воронке"
          value={inPipeline.length}
          hint={`${applications.filter((a) => a.stage === "offer").length} с offer · ${applications.filter((a) => a.stage === "visa").length} на визе`}
          accent="var(--color-status-violet)"
        />
        <StatTile
          label="Дедлайны ≤ 7 дней"
          value={soon.length}
          hint={soon[0] ? `ближайший — ${formatShortDate(soon[0].date)}` : "всё спокойно"}
          accent="var(--color-status-progress)"
        />
        <StatTile
          label="Законтрактовано"
          value={money(contracted)}
          hint={`оплачено ${money(collected)} · ${Math.round((collected / Math.max(1, contracted)) * 100)}%`}
          accent="var(--color-status-deal)"
        />
      </div>

      <section className="mt-9">
        <SectionTitle
          action={
            <Link href="/applications" className="t-caption text-ink-muted hover:text-ink">
              Открыть доску <IconArrowUpRight size={13} className="inline" />
            </Link>
          }
        >
          Воронка заявок
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
                {meta.short}
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

      <div className="mt-9 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <section>
          <SectionTitle
            action={
              <Link href="/deadlines" className="t-caption text-ink-muted hover:text-ink">
                Все дедлайны
              </Link>
            }
          >
            Ближайшие дедлайны
          </SectionTitle>
          <div className="card divide-y divide-hairline-soft">
            {deadlines.slice(0, 6).map((d) => {
              const kind = DEADLINE_KIND[d.kind];
              const owner = userById(d.ownerId);
              return (
                <div key={d.id} className="flex items-center gap-4 px-5 py-3.5">
                  <StatusDot color={kind.dot} />
                  <div className="min-w-0 flex-1">
                    <div className="t-body-sm truncate">{d.title}</div>
                    <div className="t-micro mt-0.5 text-ink-faint">
                      {kind.label} · {owner?.name ?? "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="t-caption t-num">{formatShortDate(d.date)}</div>
                    <div className="t-micro text-ink-faint">
                      {relativeDeadline(d.date)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="spotlight-violet mt-5 overflow-hidden rounded-[30px] px-8 py-8">
            <div className="t-caption uppercase tracking-[0.1em] text-white/70">
              Подбор вузов
            </div>
            <div className="mt-3 max-w-sm text-[24px] font-medium leading-[1.15] tracking-[-0.9px] text-white">
              Соберите шорт-лист по TOPIK, бюджету, городу и направлению — за один
              проход по каталогу.
            </div>
            <Link
              href="/universities"
              className="btn mt-6 bg-white text-black hover:bg-white/90"
            >
              Открыть каталог <IconArrowUpRight size={14} />
            </Link>
          </div>
        </section>

        <section>
          <SectionTitle
            action={
              <Link href="/tasks" className="t-caption text-ink-muted hover:text-ink">
                Все задачи
              </Link>
            }
          >
            Мои задачи
          </SectionTitle>
          <div className="card divide-y divide-hairline-soft">
            {myTasks.map((t) => {
              const assignee = userById(t.assigneeId);
              return (
                <div key={t.id} className="flex items-start gap-3.5 px-5 py-3.5">
                  <span className="mt-1 h-3.5 w-3.5 flex-none rounded-[5px] border border-hairline" />
                  <div className="min-w-0 flex-1">
                    <div className="t-body-sm">{t.title}</div>
                    <div className="t-micro mt-1 flex items-center gap-2 text-ink-faint">
                      <Avatar name={assignee?.name ?? "—"} size={18} />
                      {assignee?.name}
                      <span>·</span>
                      <span
                        style={{
                          color:
                            t.dueAt <= "2026-09-18"
                              ? "var(--color-status-risk)"
                              : undefined,
                        }}
                      >
                        {relativeDeadline(t.dueAt)}
                      </span>
                    </div>
                  </div>
                  {t.priority === "high" ? (
                    <Chip dot="var(--color-status-risk)">важно</Chip>
                  ) : null}
                </div>
              );
            })}
          </div>

          <SectionTitle>Лента агентства</SectionTitle>
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
                      {relativeTime(e.at)}
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
