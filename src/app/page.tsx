import Link from "next/link";
import { redirect } from "next/navigation";
import { navFor } from "@/components/nav";
import { openModules } from "@/components/guard";
import { IconArrowUpRight, IconPlus, IconUniversity } from "@/components/icons";
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          accent={overdue.length ? "var(--color-status-risk)" : "var(--color-status-progress)"}
          danger={overdue.length > 0}
        />
        <StatTile
          label={t(S.dashboard.tileContracted)}
          value={f.som(contracted, { compact: true })}
          hint={`${t(S.dashboard.tilePaid)} ${f.som(collected, { compact: true })} · ${Math.round((collected / Math.max(1, contracted)) * 100)}%`}
          accent="var(--color-status-deal)"
        />
      </div>

      {/* Воронка нарочно не показывает финальные стадии — у графика свой смысл,
          не список всех исходов. Но то, что компания теряет, не может
          прятаться совсем: если за месяц были отказы, полоса стоит первой
          после плиток, красная, с суммой — не ещё один спокойный факт. */}
      {lostRecently.length ? (
        <Link
          href="/crm/deals?stage=lost"
          className="card card-hover mt-4 flex flex-wrap items-center gap-3 px-5 py-3.5"
          style={{
            borderColor: "color-mix(in srgb, var(--color-status-risk) 35%, var(--color-hairline))",
            background: "color-mix(in srgb, var(--color-status-risk) 6%, var(--color-surface-1))",
          }}
        >
          <span
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full"
            style={{
              background: "color-mix(in srgb, var(--color-status-risk) 16%, transparent)",
              color: "var(--color-status-risk)",
            }}
          >
            <IconArrowUpRight size={14} style={{ transform: "rotate(135deg)" }} />
          </span>
          <span className="t-body-sm font-semibold" style={{ color: "var(--color-status-risk)" }}>
            {f.plural(lostRecently.length, P.refusals)} {t(S.dashboard.lostPeriod)}
          </span>
          {lostValue ? (
            <span className="t-caption t-num" style={{ color: "var(--color-status-risk)" }}>
              {t(S.dashboard.lostValue)} {f.som(lostValue, { compact: true })}
            </span>
          ) : null}
          <span className="t-caption ml-auto flex flex-none items-center gap-1" style={{ color: "var(--color-status-risk)" }}>
            {t(S.dashboard.lostCta)} <IconArrowUpRight size={12} />
          </span>
        </Link>
      ) : null}

      <section className="mt-9">
        <SectionTitle
          action={
            <Link href="/crm/deals" className="t-caption text-ink-muted hover:text-ink">
              {t(S.dashboard.openBoard)} <IconArrowUpRight size={13} className="inline" />
            </Link>
          }
        >
          {t(S.dashboard.funnel)}
        </SectionTitle>
        {/* Восемь стадий в один ряд требуют ~1500px: раньше они вставали
            в ряд уже с 1280px, и подписи ломались посреди слова. */}
        <div className="card grid grid-cols-2 divide-y divide-hairline-soft sm:grid-cols-4 sm:divide-y-0 2xl:grid-cols-8">
          {byStage.map(({ stage, label, dot, count }) => (
            <Link
              key={stage}
              href={`/crm/deals?stage=${stage}`}
              className="group min-w-0 px-5 py-5 transition-colors hover:bg-surface-2 sm:border-r sm:border-hairline-soft sm:last:border-r-0"
            >
              {/* Восемь стадий в ряд: подпись переносится, а не вылезает за
                  колонку. Две строки заняты всегда, иначе числа под ними
                  прыгают по вертикали от длины названия. */}
              <div className="t-micro flex min-h-[2.6em] min-w-0 items-start gap-2 text-ink-muted">
                <span className="mt-[3px] flex-none">
                  <StatusDot color={dot} />
                </span>
                <span className="min-w-0 leading-snug" style={{ overflowWrap: "anywhere" }}>
                  {label}
                </span>
              </div>
              <div className="t-num mt-3 text-[26px] font-medium tracking-[-1.2px]">
                {count}
              </div>
              <div className="mt-3">
                <Progress percent={(count / maxStage) * 100} tone={dot} />
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
              // Просрочка — не ещё один нейтральный факт в списке: это то,
              // что уже стоило компании денег или доверия семьи, и должно
              // читаться раньше, чем название и ответственный.
              const overdue = isPast(d.date);
              return (
                <div
                  key={d.id}
                  className="flex items-center gap-4 px-5 py-3.5"
                  style={overdue ? { background: "color-mix(in srgb, var(--color-status-risk) 6%, transparent)" } : undefined}
                >
                  <StatusDot color={overdue ? "var(--color-status-risk)" : kind.dot} />
                  <div className="min-w-0 flex-1">
                    <div className="t-body-sm truncate">{t(d.title)}</div>
                    <div className="t-micro mt-0.5 text-ink-faint">
                      {t(kind.label)} · {owner?.name ?? "—"}
                    </div>
                  </div>
                  <div className="text-right">
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

          {/* Раньше здесь стоял градиентный промо-баннер с белым текстом
              поверх фиолетовой заливки — рекламный приём ради самого приёма:
              каталог и так первым пунктом в меню. Карточка той же плотности,
              что соседние блоки страницы, без декоративного фона под текст. */}
          <Link
            href="/universities"
            className="card card-hover mt-5 flex items-center gap-4 p-5"
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-surface-2 text-ink-muted">
              <IconUniversity size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="t-body-sm block">{t(S.dashboard.spotlightTitle)}</span>
              <span className="t-micro mt-0.5 block text-ink-faint">
                {t(S.dashboard.spotlightEyebrow)}
              </span>
            </span>
            {/* Карточка целиком — ссылка, поэтому подпись «Открыть каталог»
                рядом с текстом лишняя; на 390px ей и не хватало места. */}
            <span className="hidden flex-none items-center gap-1 text-ink-muted sm:flex t-caption">
              {t(S.dashboard.spotlightCta)} <IconArrowUpRight size={13} />
            </span>
            <span className="flex-none text-ink-faint sm:hidden">
              <IconArrowUpRight size={15} />
            </span>
          </Link>
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
              // Просрочено и «скоро» — не одно и то же: красим в красный только
              // то, что уже сорвалось, иначе всё подряд становится тревожным
              // и красный перестаёт что-либо выделять.
              const overdue = isPast(task.dueAt);
              const soon = !overdue && isSoon(task.dueAt, 2);
              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3.5 px-5 py-3.5"
                  style={overdue ? { background: "color-mix(in srgb, var(--color-status-risk) 6%, transparent)" } : undefined}
                >
                  <span
                    className="mt-1 h-3.5 w-3.5 flex-none rounded-[5px] border"
                    style={{ borderColor: overdue ? "var(--color-status-risk)" : "var(--color-hairline)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="t-body-sm">{task.title}</div>
                    {/* Имя куратора и срок на телефоне в одну строку не встают:
                        переносим, иначе строка выталкивает карточку за экран. */}
                    <div className="t-micro mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-ink-faint">
                      <Avatar name={assignee?.name ?? "—"} size={18} />
                      {assignee?.name}
                      <span>·</span>
                      <span
                        style={{
                          color: overdue
                            ? "var(--color-status-risk)"
                            : soon
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

          <SectionTitle>{t(S.dashboard.feed)}</SectionTitle>
          <div className="card divide-y divide-hairline-soft">
            {activity.slice(0, 7).map((e) => {
              const actor = userById(e.authorId);
              return (
                <div key={e.id} className="flex items-start gap-3 px-5 py-3">
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
