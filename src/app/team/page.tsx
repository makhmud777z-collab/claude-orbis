import { IconPlus } from "@/components/icons";
import { NoAccess } from "@/components/NoAccess";
import { Avatar, Chip, PageHeader, SectionTitle, StatusDot } from "@/components/ui";
import { formatDate, relativeTime } from "@/lib/format";
import { can, ROLES } from "@/lib/rbac";
import { scopedApplications, scopedStudents, scopedTasks, scopedTeam } from "@/lib/queries";
import { getSession } from "@/lib/session";

const MODULE_LABEL: Record<string, string> = {
  dashboard: "Дашборд",
  students: "Студенты",
  applications: "Заявки",
  universities: "Каталог",
  documents: "Документы",
  tasks: "Задачи",
  deadlines: "Дедлайны",
  team: "Сотрудники",
  finance: "Финансы",
  settings: "Настройки",
};

const MODULES = Object.keys(MODULE_LABEL);

export default async function TeamPage() {
  const session = await getSession();
  if (!can(session.role, "team")) {
    return <NoAccess role={session.role} module="Сотрудники" />;
  }

  const team = scopedTeam(session);
  const students = scopedStudents(session);
  const apps = scopedApplications(session);
  const tasks = scopedTasks(session);
  const branches = new Map(session.tenant.branches.map((b) => [b.id, b]));

  return (
    <>
      <PageHeader
        title="Сотрудники"
        meta={
          <>
            <span>
              {team.length} человек · {session.tenant.seatsUsed} из{" "}
              {session.tenant.seatsLimit} мест по тарифу
            </span>
            <span className="text-ink-faint">·</span>
            <span>роль определяет и права, и зону видимости данных</span>
          </>
        }
        actions={
          can(session.role, "team", "create") ? (
            <button className="btn btn-primary btn-sm">
              <IconPlus size={15} /> Пригласить
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
                  {u.status === "active" ? "активен" : u.status === "invited" ? "приглашён" : "заблокирован"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <Chip active>{role.label}</Chip>
                <Chip>
                  {role.scope === "tenant"
                    ? "всё агентство"
                    : role.scope === "branch"
                      ? "свой филиал"
                      : "только свои записи"}
                </Chip>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline-soft pt-4">
                <Stat label="студентов" value={myStudents} />
                <Stat label="заявок" value={myApps} />
                <Stat label="задач" value={myTasks} />
              </div>

              <div className="t-micro mt-4 text-ink-faint">
                {branches.get(u.branchId)?.city ?? "—"} · в системе с{" "}
                {formatDate(u.joinedAt)} · был {relativeTime(u.lastActiveAt)}
              </div>
            </article>
          );
        })}
      </div>

      <section className="mt-10">
        <SectionTitle>Матрица прав</SectionTitle>
        <div className="card overflow-hidden">
          <div className="scroll-x">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-hairline-soft">
                  <th className="t-micro px-5 py-3 text-left font-medium uppercase tracking-[0.07em] text-ink-faint">
                    Роль
                  </th>
                  {MODULES.map((m) => (
                    <th
                      key={m}
                      className="t-micro px-2 py-3 text-center font-medium uppercase tracking-[0.07em] text-ink-faint"
                    >
                      {MODULE_LABEL[m]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLES.map((r) => (
                  <tr key={r.key} className="border-b border-hairline-soft last:border-b-0">
                    <td className="px-5 py-3">
                      <div className="t-body-sm">{r.label}</div>
                      <div className="t-micro max-w-[260px] text-ink-faint">
                        {r.description}
                      </div>
                    </td>
                    {MODULES.map((m) => {
                      const perms = r.permissions[m as keyof typeof r.permissions];
                      const level = !perms
                        ? "—"
                        : perms.includes("delete")
                          ? "полный"
                          : perms.includes("edit")
                            ? "правка"
                            : "чтение";
                      return (
                        <td key={m} className="px-2 py-3 text-center">
                          <span
                            className="t-micro"
                            style={{
                              color:
                                level === "—"
                                  ? "var(--color-hairline)"
                                  : level === "чтение"
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
