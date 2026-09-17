import Link from "next/link";
import { notFound } from "next/navigation";
import { moduleGate } from "@/components/guard";
import { IconMail, IconPhone } from "@/components/icons";
import { Timeline } from "@/components/Timeline";
import { Avatar, Chip, Field, PageHeader, SectionTitle, StatusDot } from "@/components/ui";
import { DEPARTMENTS } from "@/lib/data/org";
import { age, formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { CITY_LABEL, ref, TASK_STATUS } from "@/lib/labels";
import { scopedContacts, scopedDeals, scopedTasks, scopedTeam } from "@/lib/queries";
import { allow, roleDef } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { departmentOf, sessionMinutes, sessionsOf } from "@/lib/store";
import { S } from "@/lib/strings";
import { timelineItems } from "@/lib/timeline-view";

/** Карточка сотрудника: ФИО, день рождения, два номера, дата приёма и нагрузка. */
export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;
  const t = translator(session.locale);
  const gate = moduleGate(session, "team", t(S.nav.team));
  if (gate) return gate;

  const user = scopedTeam(session).find((u) => u.id === id);
  if (!user) notFound();

  const f = formatters(session.locale);
  const role = roleDef(user.role);
  const department = DEPARTMENTS.find((d) => d.id === departmentOf(user.id));
  const branch = session.tenant.branches.find((b) => b.id === user.branchId);
  const canEdit = allow(session.tenant.id, session.role, "team", "edit");

  const contacts = scopedContacts(session).filter((s) => s.ownerId === user.id);
  const deals = scopedDeals(session).filter((d) => d.ownerId === user.id);
  const tasks = scopedTasks(session).filter((x) => x.assigneeId === user.id);
  const sessions = sessionsOf(session.tenant.id)
    .filter((s) => s.userId === user.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const totalMinutes = sessions.reduce((sum, s) => sum + sessionMinutes(s), 0);

  return (
    <>
      <div className="t-caption mb-4 flex items-center gap-2 text-ink-faint">
        <Link href="/team" className="hover:text-ink">{t(S.nav.team)}</Link>
        <span>/</span>
        <span className="text-ink-muted">{user.name}</span>
      </div>

      <PageHeader
        title={user.name}
        meta={
          <>
            <span>{user.title}</span>
            <span>·</span>
            <Chip active>{t(role.label)}</Chip>
            <span>
              {branch ? t(ref(CITY_LABEL, branch.city)) : "—"} · {age(user.birthDate)}{" "}
              {t(S.students.age)}
            </span>
          </>
        }
        actions={
          <>
            <a href={`tel:${user.phone}`} className="btn btn-secondary btn-sm">
              <IconPhone size={15} /> {t(S.students.call)}
            </a>
            <a href={`mailto:${user.email}`} className="btn btn-secondary btn-sm">
              <IconMail size={15} /> {t(S.students.write)}
            </a>
          </>
        }
      />

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={user.name} size={44} />
              <div className="min-w-0">
                <div className="t-body-sm truncate">{user.email}</div>
                <div className="t-micro truncate text-ink-faint">
                  {t(S.team.lastSeen)} {f.relativeTime(user.lastActiveAt)}
                </div>
              </div>
            </div>
            <Field label={t(S.team.birthDate)} value={f.date(user.birthDate)} />
            <Field label={t(S.team.phoneWork)} value={user.phone} />
            <Field label={t(S.team.phonePersonal)} value={user.phone2 ?? "—"} />
            <Field label={t(S.team.hiredAt)} value={f.date(user.joinedAt)} />
            <Field
              label={t(S.team.department)}
              value={
                department ? (
                  <Link href="/team/structure" className="hover:underline">{t(department.name)}</Link>
                ) : (
                  "—"
                )
              }
            />
            <Field label={t(S.admin.scope)} value={t(
              role.scope === "tenant"
                ? S.common.scopeTenant
                : role.scope === "branch"
                  ? S.common.scopeBranch
                  : S.common.scopeOwn,
            )} />
          </div>

          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              {t(S.staffReports.title)}
            </div>
            <Field label={t(S.staffReports.days)} value={sessions.length} />
            <Field
              label={t(S.staffReports.hours)}
              value={`${Math.round(totalMinutes / 60)}`}
            />
            <Field
              label={t(S.staffReports.average)}
              value={
                sessions.length
                  ? `${Math.round(totalMinutes / sessions.length / 6) / 10} ${t(S.common.hoursShort)}`
                  : t(S.staffReports.noData)
              }
            />
            <Link href="/team/reports" className="btn btn-ghost btn-sm mt-3">
              {t(S.staffReports.title)}
            </Link>
          </div>
        </div>

        <div className="min-w-0 space-y-8">
          <section>
            <SectionTitle
              action={<span className="t-caption text-ink-faint">{sessions.length}</span>}
            >
              {t(S.team.workdayToday)}
            </SectionTitle>
            <div className="card divide-y divide-hairline-soft">
              {sessions.length ? (
                sessions.slice(0, 8).map((s) => (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                    <StatusDot
                      color={s.endedAt ? "var(--color-status-deal)" : "var(--color-status-progress)"}
                    />
                    <span className="t-body-sm w-28 flex-none">{f.shortDate(s.date)}</span>
                    <span className="t-caption t-num flex-1 text-ink-muted">
                      {f.time(s.startedAt)} — {s.endedAt ? f.time(s.endedAt) : "…"}
                    </span>
                    <span className="t-caption t-num flex-none">
                      {Math.floor(sessionMinutes(s) / 60)}:
                      {String(sessionMinutes(s) % 60).padStart(2, "0")}
                    </span>
                    <span className="t-micro w-20 flex-none text-right text-ink-faint">
                      {s.breakMinutes ? `−${s.breakMinutes} ${t(S.common.minutesShort)}` : ""}
                    </span>
                  </div>
                ))
              ) : (
                <div className="t-body-sm px-5 py-8 text-center text-ink-muted">
                  {t(S.staffReports.noData)}
                </div>
              )}
            </div>
          </section>

          <section>
            <SectionTitle>{t(S.nav.tasks)}</SectionTitle>
            <div className="card divide-y divide-hairline-soft">
              {tasks.length ? (
                tasks.slice(0, 8).map((task) => {
                  const status = TASK_STATUS[task.status];
                  return (
                    <div key={task.id} className="flex items-center gap-3 px-5 py-3.5">
                      <StatusDot color={status.dot} />
                      <span className="t-body-sm min-w-0 flex-1 truncate">{task.title}</span>
                      <span className="t-micro flex-none text-ink-faint">
                        {f.relativeDeadline(task.dueAt)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="t-body-sm px-5 py-8 text-center text-ink-muted">
                  {t(S.common.noTasks)}
                </div>
              )}
            </div>
          </section>

          <section>
            <SectionTitle
              action={
                <span className="t-caption text-ink-faint">
                  {contacts.length} {t(S.team.studentsShort)} · {deals.length}{" "}
                  {t(S.team.dealsShort)}
                </span>
              }
            >
              {t(S.crm.deals)}
            </SectionTitle>
            <Timeline
              entity="employee"
              entityId={user.id}
              items={timelineItems("employee", user.id, t)}
              locale={session.locale}
              canWrite={canEdit}
            />
          </section>
        </div>
      </div>
    </>
  );
}
