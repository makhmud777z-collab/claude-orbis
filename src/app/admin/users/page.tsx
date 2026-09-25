import Link from "next/link";
import { SectionFilter } from "@/components/SectionFilter";
import { InviteDialog } from "@/components/InviteDialog";
import { moduleGate } from "@/components/guard";
import { UsersAdmin, type AdminUserRow } from "@/components/UsersAdmin";
import { Crumbs, EmptyState, PageHeader } from "@/components/ui";
import { FILTER_TEXT, matchesFilter, readFilter, readQuery, type FilterRow } from "@/lib/filters";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { BRANCH_LABEL, CITY_LABEL, ref } from "@/lib/labels";
import { editionModules } from "@/lib/edition";
import { scopedTeam } from "@/lib/queries";
import { allow, MODULE_LABEL, ROLES, roleDef, visibleModules, type Module } from "@/lib/rbac";
import { simplePresets, teamFields } from "@/lib/section-filters";
import { getSession } from "@/lib/session";
import { departmentOf } from "@/lib/store";
import { S } from "@/lib/strings";
import type { User } from "@/lib/types";

/** Разделы, которые нельзя прятать лично: дашборд-дом и само администрирование. */
const NON_RESTRICTABLE: Module[] = ["dashboard", "admin"];

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

  // Прятать можно только то, что роль вообще видит на этой версии продукта,
  // и не системные разделы (дом, администрирование).
  const editionSet = new Set(editionModules(session.tenant.edition));
  const restrictable = new Set(NON_RESTRICTABLE);
  const accessModulesFor = (role: User["role"]) =>
    visibleModules(session.tenant.id, role)
      .filter((m) => editionSet.has(m) && !restrictable.has(m))
      .map((m) => ({ key: m, label: t(MODULE_LABEL[m]) }));

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
      inviteUrl: u.inviteToken ? `/invite/${u.inviteToken}` : null,
      accessModules: u.role === "owner" ? [] : accessModulesFor(u.role),
      restrictedModules: u.restrictedModules ?? [],
    };
  });

  return (
    <>
      <Crumbs back="/admin" backLabel={t(S.admin.title)} current={t(S.admin.users)} />
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
            <InviteDialog
              locale={session.locale}
              defaultBranchId={session.user.branchId}
              roles={ROLES.map((r) => ({ value: r.key, label: t(r.label), hint: t(r.description) }))}
              branches={session.tenant.branches.map((b) => ({
                value: b.id,
                label: `${t(ref(BRANCH_LABEL, b.name))} · ${t(ref(CITY_LABEL, b.city))}`,
              }))}
            />
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
