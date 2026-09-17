import Link from "next/link";
import { moduleGate } from "@/components/guard";
import { UsersAdmin, type AdminUserRow } from "@/components/UsersAdmin";
import { IconPlus } from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { CITY_LABEL, ref } from "@/lib/labels";
import { scopedTeam } from "@/lib/queries";
import { allow, ROLES, roleDef } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { S } from "@/lib/strings";

/** Пользователи портала: кто имеет доступ, с какой ролью и зоной видимости. */
export default async function AdminUsersPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const gate = moduleGate(session, "admin", t(S.admin.users));
  if (gate) return gate;

  const f = formatters(session.locale);
  const team = scopedTeam(session);
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
