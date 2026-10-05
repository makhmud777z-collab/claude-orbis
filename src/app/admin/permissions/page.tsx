import Link from "next/link";
import { moduleGate } from "@/components/guard";
import {
  PermissionsMatrix, type Grid, type MatrixRole, type MatrixSection,
} from "@/components/PermissionsMatrix";
import { Banner, Crumbs, PageHeader } from "@/components/ui";
import { usersOfTenant } from "@/lib/data/users";
import { editionModules } from "@/lib/edition";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import {
  ACTION_LABEL, MODULE_ACTIONS, MODULE_GROUPS, MODULE_LABEL,
  allow, roleTitle, rolesOf, type Module,
} from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { P, S } from "@/lib/strings";

/**
 * Права доступа агентства.
 *
 * Состав ролей нигде не зашит: агентство заводит свои, называет как хочет
 * и раздаёт права тумблерами. Результат виден сразу — меню сотрудника
 * собирается из этих же галочек.
 */
export default async function PermissionsPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const f = formatters(session.locale);
  const gate = moduleGate(session, "admin", t(S.admin.permissions));
  if (gate) return gate;

  // Показываем только те разделы, что есть в версии продукта агентства:
  // настраивать права на неподключённый модуль бессмысленно.
  const open = new Set(editionModules(session.tenant.edition));
  const staff = usersOfTenant(session.tenant.id);
  const tenantRoles = rolesOf(session.tenant.id);

  const roles: MatrixRole[] = tenantRoles.map((r) => ({
    id: r.id,
    name: roleTitle(r.name, t),
    scope: r.scope,
    system: Boolean(r.system),
    staff: staff.filter((u) => u.role === r.id).map((u) => u.name),
  }));

  const sections: MatrixSection[] = MODULE_GROUPS.map((group) => ({
    id: group.id,
    title: t(group.title),
    rows: group.modules
      .filter((m) => open.has(m))
      .flatMap((m) =>
        MODULE_ACTIONS[m].map((a) => ({
          key: `${m}.${a}`,
          module: m as string,
          action: a as string,
          label: `${t(MODULE_LABEL[m as Module])} — ${t(ACTION_LABEL[a]).toLowerCase()}`,
        })),
      ),
  })).filter((s) => s.rows.length);

  const grid: Grid = Object.fromEntries(
    tenantRoles.map((r) => [
      r.id,
      Object.entries(r.permissions).flatMap(([m, actions]) =>
        open.has(m as Module) ? (actions ?? []).map((a) => `${m}.${a}`) : [],
      ),
    ]),
  );

  return (
    <>
      <Crumbs back="/admin" backLabel={t(S.admin.title)} current={t(S.admin.permissions)} />
      <PageHeader
        title={t(S.admin.permissions)}
        meta={
          <>
            <span>{f.plural(roles.length, P.roles)}</span>
            <span>·</span>
            <Link href="/admin/users" className="hover:text-ink">{t(S.admin.users)}</Link>
          </>
        }
      />

      <Banner>{t(S.admin.permissionsHint)}</Banner>

      <PermissionsMatrix
        locale={session.locale}
        canEdit={allow(session.tenant.id, session.role, "admin", "edit")}
        roles={roles}
        sections={sections}
        grid={grid}
        scopeLabels={{
          tenant: t(S.common.scopeTenant),
          branch: t(S.common.scopeBranch),
          own: t(S.common.scopeOwn),
        }}
      />
    </>
  );
}
