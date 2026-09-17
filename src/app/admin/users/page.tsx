import Link from "next/link";
import { SectionFilter } from "@/components/SectionFilter";
import { moduleGate } from "@/components/guard";
import { UsersAdmin, type AdminUserRow } from "@/components/UsersAdmin";
import { IconPlus } from "@/components/icons";
import { EmptyState, PageHeader } from "@/components/ui";
import { FILTER_TEXT, matchesFilter, readFilter, readQuery, type FilterRow } from "@/lib/filters";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { CITY_LABEL, ref } from "@/lib/labels";
import { scopedTeam } from "@/lib/queries";
import { allow, ROLES, roleDef } from "@/lib/rbac";
import { simplePresets, teamFields } from "@/lib/section-filters";
import { getSession } from "@/lib/session";
import { departmentOf } from "@/lib/store";
import { S } from "@/lib/strings";
import type { User } from "@/lib/types";

/** Пользователи портала: кто имеет доступ, с какой ролью и зоной видимости. */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const t = translator(session.locale);
  const gate = moduleGate(session, "admin", t(S.admin.users));
  if (gate) return gate;

  const f = formatters(session.locale);
  const fields = teamFields(session, t);
  const values = readFilter(params);
  const query = readQuery(params);

  const all = scopedTeam(session);
  const team = all.filter((u) => matchesFilter(adminRow(u), fields, values, query));
  const branches = new Map(session.tenant.branches.map((b) => [b.id, b]));
  const owners = team.filter((u) => u.role === "owner");

  const scopeLabel = (scope: "tenant" | "branch" | "own") =>
    t(
      scope === "tenant"
        ? S.common.scopeTenant
        : scope === "branch"
          ? S.common.scopeBranch
          : S.common.scopeOwn,
    );

  const rows: AdminUserRow[] = team.map((u) => {
    const role = roleDef(u.role);
    const branch = branches.get(u.branchId);
    return {
      id: u.id,
      name: u.name,
      title: u.title,
      email: u.email,
      role: u.role,
      roleLabel: t(role.label),
      status: u.status,
      scopeLabel: scopeLabel(role.scope),
      branchLabel: branch ? t(ref(CITY_LABEL, branch.city)) : "—",
      joinedAt: f.date(u.joinedAt),
      isLastOwner: u.role === "owner" && owners.length === 1,
    };
  });

  return (
    <>
      <PageHeader
        title={t(S.admin.users)}
        meta={
          <>
            <span>
              {session.tenant.seatsUsed} {t(S.team.of)} {session.tenant.seatsLimit}{" "}
              {t(S.admin.seats)}
            </span>
            <span>·</span>
            <Link href="/admin/permissions" className="hover:text-ink">
              {t(S.admin.permissions)}
            </Link>
          </>
        }
        actions={
          allow(session.tenant.id, session.role, "admin", "create") ? (
            <button className="btn btn-primary btn-sm">
              <IconPlus size={15} /> {t(S.admin.invite)}
            </button>
          ) : null
        }
      />

      <SectionFilter
        scope="users"
        fields={fields}
        presets={simplePresets()}
        locale={session.locale}
        userId={session.user.id}
        total={all.length}
        shown={team.length}
      />

      {!team.length ? <EmptyState title={t(FILTER_TEXT.nothing)} /> : null}

      <UsersAdmin
        rows={rows}
        locale={session.locale}
        canEdit={allow(session.tenant.id, session.role, "admin", "edit")}
        roles={ROLES.map((r) => ({
          value: r.key,
          label: t(r.label),
          hint: scopeLabel(r.scope),
        }))}
      />
    </>
  );
}

/** Плоское представление пользователя портала для фильтра. */
function adminRow(u: User): FilterRow {
  return {
    search: `${u.name} ${u.title} ${u.email}`,
    role: u.role,
    branchId: u.branchId,
    status: u.status,
    departmentId: departmentOf(u.id) ?? "",
    joinedAt: u.joinedAt,
  };
}
