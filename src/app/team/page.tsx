import Link from "next/link";
import { moduleGate } from "@/components/guard";
import { IconPlus } from "@/components/icons";
import { Avatar, Chip, PageHeader, StatusDot } from "@/components/ui";
import { DEPARTMENTS } from "@/lib/data/org";
import { age, formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { CITY_LABEL, ref } from "@/lib/labels";
import { scopedContacts, scopedDeals, scopedTasks, scopedTeam } from "@/lib/queries";
import { allow, ROLES } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { departmentOf, openSession, sessionMinutes } from "@/lib/store";
import { S } from "@/lib/strings";

/**
 * Сотрудники агентства. Карточка каждого — отдельная страница: там личные
 * данные, подразделение, рабочие дни и нагрузка. Матрица прав живёт
 * в «Администрировании», потому что там её можно менять, а не только смотреть.
 */
export default async function TeamPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const f = formatters(session.locale);
  const gate = moduleGate(session, "team", t(S.nav.team));
  if (gate) return gate;

  const team = scopedTeam(session);
  const contacts = scopedContacts(session);
  const deals = scopedDeals(session);
  const tasks = scopedTasks(session);
  const branches = new Map(session.tenant.branches.map((b) => [b.id, b]));
  const departments = new Map(DEPARTMENTS.map((d) => [d.id, d]));

  return (
    <>
      <PageHeader
        title={t(S.team.title)}
        meta={
          <>
            <span>
              {team.length} {t(S.team.people)} · {session.tenant.seatsUsed} {t(S.team.of)}{" "}
              {session.tenant.seatsLimit} {t(S.team.seats)}
            </span>
            <span className="text-ink-faint">·</span>
            <Link href="/team/structure" className="hover:text-ink">{t(S.structure.title)}</Link>
            <span className="text-ink-faint">·</span>
            <Link href="/team/reports" className="hover:text-ink">{t(S.staffReports.title)}</Link>
          </>
        }
        actions={
          allow(session.tenant.id, session.role, "team", "create") ? (
            <Link href="/admin/users" className="btn btn-primary btn-sm">
              <IconPlus size={15} /> {t(S.team.invite)}
            </Link>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {team.map((u) => {
          const role = ROLES.find((r) => r.key === u.role)!;
          const work = openSession(u.id);
          const department = departments.get(departmentOf(u.id) ?? "");
          return (
            <Link key={u.id} href={`/team/${u.id}`} className="card card-hover block p-5">
              <div className="flex items-start gap-3">
                <span className="relative flex-none">
                  <Avatar name={u.name} size={40} />
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
                    style={{
                      borderColor: "var(--color-surface-1)",
                      background: work
                        ? work.onBreakSince
                          ? "var(--color-status-progress)"
                          : "var(--color-status-deal)"
                        : "var(--color-hairline)",
                    }}
                  />
                </span>
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
                {department ? <Chip>{t(department.name)}</Chip> : null}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline-soft pt-4">
                <Stat
                  label={t(S.team.studentsShort)}
                  value={contacts.filter((s) => s.ownerId === u.id).length}
                />
                <Stat
                  label={t(S.team.dealsShort)}
                  value={deals.filter((d) => d.ownerId === u.id).length}
                />
                <Stat
                  label={t(S.team.tasksShort)}
                  value={tasks.filter((x) => x.assigneeId === u.id && x.status !== "done").length}
                />
              </div>

              <div className="t-micro mt-4 text-ink-faint">
                {branches.get(u.branchId)
                  ? t(ref(CITY_LABEL, branches.get(u.branchId)!.city))
                  : "—"}{" "}
                · {age(u.birthDate)} {t(S.students.age)} · {t(S.team.inSystemSince)}{" "}
                {f.date(u.joinedAt)}
                {work ? (
                  <>
                    {" · "}
                    <span className="t-num">
                      {Math.floor(sessionMinutes(work) / 60)}:
                      {String(sessionMinutes(work) % 60).padStart(2, "0")}
                    </span>{" "}
                    {t(S.staffReports.stillWorking)}
                  </>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
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
