import Link from "next/link";
import { moduleGate } from "@/components/guard";
import { PermissionsMatrix, type Grid } from "@/components/PermissionsMatrix";
import { Banner, Crumbs, PageHeader } from "@/components/ui";
import { editionModules } from "@/lib/edition";
import { translator } from "@/lib/i18n";
import {
  ACTION_LABEL, MODULE_LABEL, ROLES, allow, effectivePermissions, type Action, type Module,
} from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { S } from "@/lib/strings";

const ACTIONS: Action[] = ["view", "create", "edit", "delete", "export", "assign"];

/**
 * Права доступа агентства. Матрица переопределяет роли по умолчанию,
 * и результат виден сразу: меню сотрудника собирается из этих же прав.
 */
export default async function PermissionsPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const gate = moduleGate(session, "admin", t(S.admin.permissions));
  if (gate) return gate;

  // Показываем только те разделы, что есть в версии продукта агентства:
  // настраивать права на неподключённый модуль бессмысленно.
  const modules = editionModules(session.tenant.edition);

  const grid: Grid = {};
  for (const role of ROLES) {
    const perms = effectivePermissions(session.tenant.id, role.key);
    grid[role.key] = Object.fromEntries(
      modules.map((m) => [m, perms[m] ?? []]),
    ) as Record<string, string[]>;
  }

  const scopeLabel = (scope: "tenant" | "branch" | "own") =>
    t(
      scope === "tenant"
        ? S.common.scopeTenant
        : scope === "branch"
          ? S.common.scopeBranch
          : S.common.scopeOwn,
    );

  return (
    <>
      <Crumbs back="/admin" backLabel={t(S.admin.title)} current={t(S.admin.permissions)} />
      <PageHeader
        title={t(S.admin.permissions)}
        meta={
          <>
            <span>{t(S.admin.permissionsCount)}: {ROLES.length} × {modules.length}</span>
            <span>·</span>
            <Link href="/admin/users" className="hover:text-ink">{t(S.admin.users)}</Link>
          </>
        }
      />

      <Banner>{t(S.admin.permissionsHint)}</Banner>

      <PermissionsMatrix
        locale={session.locale}
        canEdit={allow(session.tenant.id, session.role, "admin", "edit")}
        grid={grid}
        roles={ROLES.map((r) => ({
          key: r.key,
          label: t(r.label),
          description: t(r.description),
          scopeLabel: scopeLabel(r.scope),
        }))}
        modules={modules.map((m) => ({ key: m, label: t(MODULE_LABEL[m as Module]) }))}
        actions={ACTIONS.map((a) => ({ key: a, label: t(ACTION_LABEL[a]) }))}
      />
    </>
  );
}
