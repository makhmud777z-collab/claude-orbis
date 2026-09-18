import Link from "next/link";
import { moduleGate } from "@/components/guard";
import { IconPlus } from "@/components/icons";
import { SectionFilter } from "@/components/SectionFilter";
import { Avatar, Chip, EmptyState, PageHeader, StatusDot } from "@/components/ui";
import { FILTER_TEXT, matchesFilter, readFilter, readQuery, type FilterRow } from "@/lib/filters";
import { age, formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { CITY_LABEL, ref } from "@/lib/labels";
import { scopedContacts, scopedDeals, scopedTasks, scopedTeam } from "@/lib/queries";
import { allow, ROLES } from "@/lib/rbac";
import { simplePresets, teamFields } from "@/lib/section-filters";
import { getSession } from "@/lib/session";
import { departmentOf, departmentsOf, openSession, sessionMinutes } from "@/lib/store";
import { S } from "@/lib/strings";
import type { User } from "@/lib/types";

/**
 * Сотрудники агентства. Карточка каждого — отдельная страница: там личные
 * данные, подразделение, рабочие дни и нагрузка. Матрица прав живёт
 * в «Администрировании», потому что там её можно менять, а не только смотреть.
 */
export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const t = translator(session.locale);
  const f = formatters(session.locale);
  const gate = moduleGate(session, "team", t(S.nav.team));
  if (gate) return gate;

  const fields = teamFields(session, t);
  const values = readFilter(params);
  const query = readQuery(params);

  const all = scopedTeam(session);
  const team = all.filter((u) => matchesFilter(teamRow(u), fields, values, query));
  const contacts = scopedContacts(session);
  const deals = scopedDeals(session);
  const tasks = scopedTasks(session);
  const branches = new Map(session.tenant.branches.map((b) => [b.id, b]));
  const departments = new Map(departmentsOf(session.tenant.id).map((d) => [d.id, d]));

  return (
    <>
      <PageHeader
        title={t(S.team.title)}
        meta={
          <>
            <span>
              {all.length} {t(S.team.people)} · {session.tenant.seatsUsed} {t(S.team.of)}{" "}
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

      <SectionFilter
        scope="team"
        fields={fields}
        presets={simplePresets()}
        locale={session.locale}
        userId={session.user.id}
        total={all.length}
        shown={team.length}
      />

      {!team.length ? <EmptyState title={t(FILTER_TEXT.nothing)} /> : null}

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
                    className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2"
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

/** Плоское представление сотрудника для фильтра. */
function teamRow(u: User): FilterRow {
  return {
    search: `${u.name} ${u.title} ${u.email} ${u.phone}`,
    role: u.role,
    branchId: u.branchId,
    status: u.status,
    departmentId: departmentOf(u.id) ?? "",
    joinedAt: u.joinedAt,
  };
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="t-num text-[18px] font-medium tracking-[-0.6px]">{value}</div>
      <div className="t-micro text-ink-faint">{label}</div>
    </div>
  );
}
