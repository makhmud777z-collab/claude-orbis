import { IconPlus } from "@/components/icons";
import { NoAccess } from "@/components/NoAccess";
import { Avatar, Chip, PageHeader, SectionTitle, StatusDot } from "@/components/ui";
import { formatters } from "@/lib/format";
import { translator, type Loc } from "@/lib/i18n";
import { CITY_LABEL, ref } from "@/lib/labels";
import { can, ROLES } from "@/lib/rbac";
import { scopedApplications, scopedStudents, scopedTasks, scopedTeam } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { S } from "@/lib/strings";

const MODULE_LABEL: Record<string, Loc> = {
  dashboard: S.nav.dashboard,
  students: S.nav.students,
  applications: S.nav.applications,
  universities: S.nav.universities,
  documents: S.nav.documents,
  tasks: S.nav.tasks,
  deadlines: S.nav.deadlines,
  team: S.nav.team,
  finance: S.nav.finance,
  settings: S.nav.settings,
};

const MODULES = Object.keys(MODULE_LABEL);

export default async function TeamPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const f = formatters(session.locale);
  if (!can(session.role, "team")) {
    return (
      <NoAccess role={session.role} module={t(S.nav.team)} locale={session.locale} />
    );
  }

  const team = scopedTeam(session);
  const students = scopedStudents(session);
  const apps = scopedApplications(session);
  const tasks = scopedTasks(session);
  const branches = new Map(session.tenant.branches.map((b) => [b.id, b]));

  return (
    <>
      <PageHeader
        title={t(S.team.title)}
        meta={
          <>
            <span>
              {team.length} {t(S.team.people)} · {session.tenant.seatsUsed}{" "}
              {t(S.team.of)} {session.tenant.seatsLimit} {t(S.team.seats)}
            </span>
            <span className="text-ink-faint">·</span>
            <span>{t(S.team.subtitle)}</span>
          </>
        }
        actions={
          can(session.role, "team", "create") ? (
            <button className="btn btn-primary btn-sm">
              <IconPlus size={15} /> {t(S.team.invite)}
            </button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {team.map((u) => {
          const role = ROLES.find((r) => r.key === u.role)!;
          const myStudents = students.filter((s) => s.ownerId === u.id).length;
          const myApps = apps.filter((a) => a.ownerId === u.id).length;
          const myTasks = tasks.filter(
            (t) => t.assigneeId === u.id && t.status !== "done",
          ).length;
          return (
            <article key={u.id} className="card card-hover p-5">
              <div className="flex items-start gap-3">
                <Avatar name={u.name} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="t-body-sm truncate">{u.name}</div>
                  <div className="t-micro truncate text-ink-faint">{u.title}</div>
                </div>
                <span className="chip">
                  <StatusDot
                    color={
                      u.status === "active"
                        ? "var(--color-status-deal)"
                        : u.status === "invited"
                          ? "var(--color-status-progress)"
                          : "var(--color-status-hold)"
                    }
                  />
                  {t(
                    u.status === "active"
                      ? S.team.active
                      : u.status === "invited"
                        ? S.team.invited
                        : S.team.suspended,
                  )}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <Chip active>{t(role.label)}</Chip>
                <Chip>
                  {t(
                    role.scope === "tenant"
                      ? S.common.scopeTenant
                      : role.scope === "branch"
                        ? S.common.scopeBranch
                        : S.common.scopeOwn,
                  )}
                </Chip>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline-soft pt-4">
                <Stat label={t(S.team.studentsShort)} value={myStudents} />
                <Stat label={t(S.team.applicationsShort)} value={myApps} />
                <Stat label={t(S.team.tasksShort)} value={myTasks} />
              </div>

              <div className="t-micro mt-4 text-ink-faint">
                {branches.get(u.branchId)
                  ? t(ref(CITY_LABEL, branches.get(u.branchId)!.city))
                  : "—"}{" "}
                · {t(S.team.inSystemSince)} {f.date(u.joinedAt)} · {t(S.team.lastSeen)}{" "}
                {f.relativeTime(u.lastActiveAt)}
              </div>
            </article>
          );
        })}
      </div>

      <section className="mt-10">
        <SectionTitle>{t(S.team.matrix)}</SectionTitle>
        <div className="card overflow-hidden">
          <div className="scroll-x">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-hairline-soft">
                  <th className="t-micro px-5 py-3 text-left font-medium uppercase tracking-[0.07em] text-ink-faint">
                    {t(S.team.role)}
                  </th>
                  {MODULES.map((m) => (
                    <th
                      key={m}
                      className="t-micro px-2 py-3 text-center font-medium uppercase tracking-[0.07em] text-ink-faint"
                    >
                      {t(MODULE_LABEL[m])}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLES.map((r) => (
                  <tr key={r.key} className="border-b border-hairline-soft last:border-b-0">
                    <td className="px-5 py-3">
                      <div className="t-body-sm">{t(r.label)}</div>
                      <div className="t-micro max-w-[260px] text-ink-faint">
                        {t(r.description)}
                      </div>
                    </td>
                    {MODULES.map((m) => {
                      const perms = r.permissions[m as keyof typeof r.permissions];
                      const level = !perms
                        ? "—"
                        : perms.includes("delete")
                          ? t(S.team.levelFull)
                          : perms.includes("edit")
                            ? t(S.team.levelEdit)
                            : t(S.team.levelRead);
                      return (
                        <td key={m} className="px-2 py-3 text-center">
                          <span
                            className="t-micro"
                            style={{
                              color:
                                level === "—"
                                  ? "var(--color-hairline)"
                                  : level === t(S.team.levelRead)
                                    ? "var(--color-ink-faint)"
                                    : "var(--color-ink-muted)",
                            }}
                          >
                            {level}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="t-num text-[18px] font-medium tracking-[-0.6px]">{value}</div>
      <div className="t-micro text-ink-faint">{label}</div>
    </div>
  );
}
