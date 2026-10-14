import Link from "next/link";
import { redirect } from "next/navigation";
import { navFor } from "@/components/nav";
import { openModules } from "@/components/guard";
import { IconArrowUpRight, IconPlus } from "@/components/icons";
import {
  Avatar,
  Chip,
  PageHeader,
  StatTile,
  StatusDot,
} from "@/components/ui";
import { userById } from "@/lib/data/users";
import { daysUntil, formatters, isPast, isSoon } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { DEADLINE_KIND } from "@/lib/labels";
import {
  scopedActivity,
  scopedDeals,
  scopedDeadlines,
  scopedContacts,
  scopedTasks,
} from "@/lib/queries";
import { hasModule, homeHref } from "@/lib/edition";
import { allow } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { defaultPipeline } from "@/lib/store";
import { P, S } from "@/lib/strings";

export default async function DashboardPage() {
  const session = await getSession();

  // В версии MVP дашборда нет: система открывается сразу каталогом вузов.
  if (!hasModule(session.tenant.edition, "dashboard")) {
    redirect(homeHref(session.tenant.edition));
  }

  // У роли может не быть дашборда (например, у агента-партнёра) —
  // уводим на первый доступный ей раздел вместо пустого экрана.
  if (!allow(session.tenant.id, session.role, "dashboard")) {
    const first = navFor(new Set(openModules(session))).find((n) => n.href !== "/");
    redirect(first?.href ?? "/universities");
  }

  const t = translator(session.locale);
  const f = formatters(session.locale);

  const students = scopedContacts(session);
  const applications = scopedDeals(session);
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

  // Отказы воронка не показывает вовсе — финальные стадии из неё убраны
  // намеренно, у графика свой смысл. Но то, что компания теряет, не может
  // быть невидимым: считаем отдельно и выводим отдельной строкой.
  const lostRecently = applications.filter(
    (a) => a.stage === "lost" && -daysUntil(a.stageEnteredAt) <= 30,
  );
  const lostValue = lostRecently.reduce((sum, a) => sum + a.contractValue, 0);

  // Воронка на дашборде повторяет настройки воронки сделок: те же стадии и цвета.
  const pipeline = defaultPipeline(session.tenant.id, "deal");
  const byStage = (pipeline?.stages ?? [])
    .filter((stage) => !stage.final)
    .map((stage) => ({
      stage: stage.key,
      label: t(stage.label),
      dot: stage.color,
      count: applications.filter((a) => a.stage === stage.key).length,
    }));

  // «Мои задачи» — только назначенные мне. У руководителя своих задач
  // может не быть: тогда блок честно называется «Задачи команды», а не
  // выдаёт чужие задачи за свои.
  const openTasks = tasks
    .filter((task) => task.status !== "done")
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const ownTasks = openTasks.filter((task) => task.assigneeId === session.user.id);
  const myTasks = (ownTasks.length ? ownTasks : openTasks).slice(0, 5);
  const tasksTitle = ownTasks.length ? S.dashboard.myTasks : S.dashboard.teamTasks;

  // Задачи уже стоят в соседнем блоке — здесь сроки вузов, виз и документов,
  // иначе одна и та же задача показывалась бы на экране дважды.
  const keyDeadlines = deadlines.filter((d) => d.kind !== "task").slice(0, 6);

  const paidShare = Math.round((collected / Math.max(1, contracted)) * 100);
  const funnelTotal = Math.max(1, byStage.reduce((n, s) => n + s.count, 0));

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
              {f.plural(inPipeline.length, P.deals)} {t(S.dashboard.activeApps)} ·{" "}
              {f.plural(soon.length, P.deadlines)} {t(S.dashboard.weekDeadlines)}
            </span>
          </>
        }
        actions={
          <Link href="/crm/leads" className="btn btn-primary btn-sm">
            <IconPlus size={15} /> {t(S.crm.newLead)}
          </Link>
        }
      />

      {/* Бенто: одна тёмная карточка под главную цифру — деньги, — и четыре
          спокойные рядом. Один акцент на экран, остальное — воздух. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-12">
        <Link
          href="/finance"
          className="card-ink card-hover col-span-2 flex min-w-0 flex-col justify-between gap-8 p-6 sm:p-7 xl:col-span-6 xl:row-span-2"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="t-caption ink-soft">{t(S.dashboard.heroLabel)}</span>
            <span className="t-caption ink-soft flex items-center gap-1">
              {t(S.dashboard.heroOpen)} <IconArrowUpRight size={13} />
            </span>
          </div>
          <div className="min-w-0">
            <div className="t-num text-[44px] font-medium leading-none tracking-[-2.2px] sm:text-[56px] sm:tracking-[-2.8px]">
              {f.som(contracted, { compact: true })}
            </div>
            <div className="mt-6 flex h-2 w-full overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--color-canvas) 18%, transparent)" }}>
              <div className="bar-fill h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, paidShare))}%`, background: "var(--color-canvas)" }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="min-w-0">
                <div className="t-micro ink-soft">{t(S.dashboard.tilePaid)} · {paidShare}%</div>
                <div className="t-body-lg t-num mt-1 font-medium">{f.som(collected, { compact: true })}</div>
              </div>
              <div className="min-w-0">
                <div className="t-micro ink-soft">{t(S.dashboard.heroRest)}</div>
                <div className="t-body-lg t-num mt-1 font-medium">{f.som(Math.max(0, contracted - collected), { compact: true })}</div>
              </div>
            </div>
          </div>
        </Link>

        <div className="min-w-0 xl:col-span-3">
          <StatTile
            label={t(S.dashboard.tileStudents)}
            value={active}
            hint={`${t(S.dashboard.tileStudentsHint)} ${students.length}`}
          />
        </div>
        <div className="min-w-0 xl:col-span-3">
          <StatTile
            label={t(S.dashboard.tileApps)}
            value={inPipeline.length}
            hint={`${applications.filter((a) => a.stage === "offer").length} ${t(S.dashboard.tileWithOffer)} · ${applications.filter((a) => a.stage === "visa").length} ${t(S.dashboard.tileOnVisa)}`}
          />
        </div>
        <div className="min-w-0 xl:col-span-3">
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
            danger={overdue.length > 0}
          />
        </div>
        {/* Отказы воронка не показывает — финальные стадии из неё убраны.
            Но потери не могут быть невидимы: отдельная плитка, красная,
            как только за месяц был хоть один отказ. */}
        <Link href="/crm/deals?stage=lost" className="block min-w-0 xl:col-span-3">
          <StatTile
            label={t(S.dashboard.tileLost)}
            value={lostRecently.length}
            hint={
              lostRecently.length
                ? lostValue
                  ? `${t(S.dashboard.lostValue)} ${f.som(lostValue, { compact: true })}`
                  : t(S.dashboard.lostCta)
                : t(S.dashboard.tileLostCalm)
            }
            danger={lostRecently.length > 0}
          />
        </Link>
      </div>

      {/* Воронка — одна полоса из долей стадий и подписи под ней. Восемь
          отдельных шкал читались как восемь разных графиков. */}
      <section className="card mt-4 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[17px] font-semibold tracking-[-0.4px]">{t(S.dashboard.funnel)}</h2>
            <span className="t-caption text-ink-faint">
              {f.plural(inPipeline.length, P.deals)} {t(S.dashboard.funnelInWork)}
            </span>
          </div>
          <Link href="/crm/deals" className="t-caption text-ink-muted hover:text-ink">
            {t(S.dashboard.openBoard)} <IconArrowUpRight size={13} className="inline" />
          </Link>
        </div>
        <div className="mt-5 flex h-2.5 w-full gap-[3px] overflow-hidden rounded-full">
          {byStage
            .filter((s) => s.count > 0)
            .map(({ stage, dot, count }) => (
              <span
                key={stage}
                className="bar-fill h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(count / funnelTotal) * 100}%`, background: dot }}
              />
            ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 2xl:grid-cols-8">
          {byStage.map(({ stage, label, dot, count }) => (
            <Link key={stage} href={`/crm/deals?stage=${stage}`} className="group min-w-0">
              <div className="t-num text-[24px] font-medium leading-none tracking-[-1px]" style={{ color: count ? undefined : "var(--color-ink-faint)" }}>
                {count}
              </div>
              <div className="t-micro mt-2 flex min-w-0 items-start gap-1.5 text-ink-muted group-hover:text-ink">
                <span className="mt-[3px] flex-none">
                  <StatusDot color={dot} />
                </span>
                <span className="min-w-0 leading-snug" style={{ overflowWrap: "anywhere" }}>
                  {label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-[1fr_1fr_0.9fr]">
        <section className="card min-w-0 overflow-hidden">
          <BlockHead
            title={t(S.dashboard.nearestDeadlines)}
            href="/deadlines"
            action={t(S.dashboard.allDeadlines)}
          />
          <div className="divide-y divide-hairline-soft">
            {keyDeadlines.map((d) => {
              const kind = DEADLINE_KIND[d.kind];
              const owner = userById(d.ownerId);
              // Просрочка читается раньше названия: красная дата и точка.
              const overdue = isPast(d.date);
              return (
                <div key={d.id} className="flex items-center gap-4 px-6 py-3.5">
                  <StatusDot color={overdue ? "var(--color-status-risk)" : kind.dot} />
                  <div className="min-w-0 flex-1">
                    <div className="t-body-sm truncate">{t(d.title)}</div>
                    <div className="t-micro mt-0.5 text-ink-faint">
                      {t(kind.label)} · {owner?.name ?? "—"}
                    </div>
                  </div>
                  <div className="flex-none text-right">
                    <div className="t-caption t-num" style={{ color: overdue ? "var(--color-status-risk)" : undefined }}>
                      {f.shortDate(d.date)}
                    </div>
                    <div
                      className="t-micro"
                      style={{
                        color: overdue ? "var(--color-status-risk)" : "var(--color-ink-faint)",
                        fontWeight: overdue ? 600 : undefined,
                      }}
                    >
                      {f.relativeDeadline(d.date)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card min-w-0 overflow-hidden">
          <BlockHead title={t(tasksTitle)} href="/tasks" action={t(S.dashboard.allTasks)} />
          <div className="divide-y divide-hairline-soft">
            {myTasks.map((task) => {
              const assignee = userById(task.assigneeId);
              // Красный — только для сорванного; «скоро» — жёлтым, иначе
              // тревожным становится всё и красный перестаёт выделять.
              const overdue = isPast(task.dueAt);
              const soonTask = !overdue && isSoon(task.dueAt, 2);
              return (
                <div key={task.id} className="flex items-start gap-3.5 px-6 py-3.5">
                  <span
                    className="mt-1 h-3.5 w-3.5 flex-none rounded-[5px] border"
                    style={{ borderColor: overdue ? "var(--color-status-risk)" : "var(--color-hairline)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="t-body-sm">{task.title}</div>
                    {/* имя и срок переносятся на телефоне, а не выталкивают карточку */}
                    <div className="t-micro mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-ink-faint">
                      <Avatar name={assignee?.name ?? "—"} size={18} />
                      {assignee?.name}
                      <span>·</span>
                      <span
                        style={{
                          color: overdue
                            ? "var(--color-status-risk)"
                            : soonTask
                              ? "var(--color-status-progress)"
                              : undefined,
                          fontWeight: overdue ? 600 : undefined,
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
        </section>

        <section className="card min-w-0 overflow-hidden lg:col-span-2 2xl:col-span-1">
          <BlockHead title={t(S.dashboard.feed)} />
          {/* На всю ширину лента встаёт в две колонки, в узком третьем
              столбце — в одну; линии только между строками, не под заголовком. */}
          <div className="grid [&>*]:border-t [&>*]:border-hairline-soft [&>*:first-child]:border-t-0 lg:grid-cols-2 lg:[&>*:nth-child(2)]:border-t-0 2xl:grid-cols-1 2xl:[&>*:nth-child(2)]:border-t">
            {activity.slice(0, 6).map((e) => {
              const actor = userById(e.authorId);
              return (
                <div key={e.id} className="flex items-start gap-3 px-6 py-3">
                  <Avatar name={actor?.name ?? "—"} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="t-body-sm">
                      <span className="text-ink">{actor?.name}</span>{" "}
                      <span className="text-ink-muted">{t(e.title)}</span>
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

/** Заголовок внутри блока: название слева, тихая ссылка справа. */
function BlockHead({ title, href, action }: { title: string; href?: string; action?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-6 pb-2 pt-5">
      <h2 className="text-[17px] font-semibold tracking-[-0.4px]">{title}</h2>
      {href && action ? (
        <Link href={href} className="t-caption flex-none text-ink-muted hover:text-ink">
          {action} <IconArrowUpRight size={13} className="inline" />
        </Link>
      ) : null}
    </div>
  );
}
