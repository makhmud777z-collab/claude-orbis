import Link from "next/link";
import { notFound } from "next/navigation";
import { moduleGate } from "@/components/guard";
import { IconMail, IconPhone } from "@/components/icons";
import { EditableFields } from "@/components/EditableFields";
import { Timeline } from "@/components/Timeline";
import { Avatar, Chip, Field, PageHeader, SectionTitle, StatusDot } from "@/components/ui";
import { DEPARTMENTS } from "@/lib/data/org";
import { age, formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { CITY_LABEL, ref, TASK_STATUS } from "@/lib/labels";
import { scopedContacts, scopedDeals, scopedTasks, scopedTeam } from "@/lib/queries";
import { allow, roleDef } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { departmentOf, pipelineById, sessionMinutes, sessionsOf, stageOf } from "@/lib/store";
import { P, S } from "@/lib/strings";
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
            <div className="flex items-center gap-3">
              <Avatar name={user.name} size={44} />
              <div className="min-w-0">
                <div className="t-body-sm truncate">{user.email}</div>
                <div className="t-micro truncate text-ink-faint">
                  {t(S.team.lastSeen)} {f.relativeTime(user.lastActiveAt)}
                </div>
              </div>
            </div>
          </div>

          <EditableFields
            entity="employee"
            id={user.id}
            title={t(S.team.personal)}
            locale={session.locale}
            canEdit={canEdit}
            fields={[
              { name: "name", label: t(S.common.fullName), value: user.name, display: user.name },
              { name: "title", label: t(S.team.position), value: user.title, display: user.title },
              { name: "email", label: "Email", value: user.email, display: user.email },
              { name: "phone", label: t(S.team.phoneWork), value: user.phone, display: user.phone },
              {
                name: "phone2",
                label: t(S.team.phonePersonal),
                value: user.phone2 ?? "",
                display: user.phone2 ?? "—",
              },
              {
                name: "birthDate",
                label: t(S.team.birthDate),
                value: user.birthDate,
                display: f.date(user.birthDate),
                kind: "date",
              },
              {
                name: "joinedAt",
                label: t(S.team.hiredAt),
                value: user.joinedAt,
                display: f.date(user.joinedAt),
                kind: "date",
              },
            ]}
          />

          <div className="card overflow-hidden">
            <div className="card-head">
              <span className="t-caption">{t(S.team.placeInCompany)}</span>
            </div>
            <div className="px-5 py-2">
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
          </div>

          <div className="card overflow-hidden">
            <div className="card-head">
              <span className="t-caption">{t(S.staffReports.title)}</span>
            </div>
            <div className="px-5 py-2">
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
            </div>
            <div className="border-t border-hairline-soft px-5 py-3">
              <Link href="/team/reports" className="t-caption text-ink-muted hover:text-ink">
                {t(S.staffReports.openReport)}
              </Link>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-8">
          <section>
            <SectionTitle
              action={
                <span className="t-caption whitespace-nowrap text-ink-faint">
                  {f.plural(sessions.length, P.days)}
                </span>
              }
            >
              {t(S.team.workdayToday)}
            </SectionTitle>
            <div className="card divide-y divide-hairline-soft">
              {sessions.length ? (
                sessions.slice(0, 8).map((s) => (
                  // На телефоне строка отметки переносится, а не режется.
                  <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                    <StatusDot
                      color={s.endedAt ? "var(--color-status-deal)" : "var(--color-status-progress)"}
                    />
                    <span className="t-body-sm w-24 flex-none">{f.shortDate(s.date)}</span>
                    <span className="t-caption t-num min-w-0 flex-1 text-ink-muted">
                      {f.time(s.startedAt)} — {s.endedAt ? f.time(s.endedAt) : "…"}
                    </span>
                    <span className="t-caption t-num flex-none">
                      {Math.floor(sessionMinutes(s) / 60)}:
                      {String(sessionMinutes(s) % 60).padStart(2, "0")}
                    </span>
                    <span className="t-micro w-16 flex-none text-right text-ink-faint">
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
                <span className="t-caption whitespace-nowrap text-ink-faint">
                  {f.plural(contacts.length, P.contacts)} · {f.plural(deals.length, P.deals)}
                </span>
              }
            >
              {t(S.crm.deals)}
            </SectionTitle>
            <div className="card divide-y divide-hairline-soft">
              {deals.length ? (
                deals.slice(0, 8).map((deal) => {
                  const stage = stageOf(pipelineById(deal.pipelineId), deal.stage);
                  const contact = contacts.find((c) => c.id === deal.studentId);
                  return (
                    <Link
                      key={deal.id}
                      href={`/crm/deals/${deal.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2"
                    >
                      <StatusDot color={stage?.color ?? "var(--color-ink-faint)"} />
                      <span className="min-w-0 flex-1">
                        <span className="t-body-sm block truncate">
                          {contact?.fullName ?? deal.id.toUpperCase()}
                        </span>
                        <span className="t-micro block truncate text-ink-faint">
                          {stage ? t(stage.label) : deal.stage}
                        </span>
                      </span>
                      <span className="t-caption t-num flex-none text-ink-muted">
                        {deal.contractValue ? f.som(deal.contractValue, { compact: true }) : "—"}
                      </span>
                    </Link>
                  );
                })
              ) : (
                <div className="t-body-sm px-5 py-8 text-center text-ink-muted">
                  {t(S.common.nothingFound)}
                </div>
              )}
            </div>
          </section>

          <section>
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
