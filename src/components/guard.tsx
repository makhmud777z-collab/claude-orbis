import type { ReactNode } from "react";
import { NoAccess } from "./NoAccess";
import { NotInEdition } from "./NotInEdition";
import { NAV } from "./nav";
import { editionModules, hasModule, moduleEdition } from "@/lib/edition";
import { can, visibleModules, type Module } from "@/lib/rbac";
import type { Session } from "@/lib/session";
import { S } from "@/lib/strings";

/**
 * Два барьера перед разделом, в одном месте:
 * 1) версия продукта агентства — куплен ли модуль;
 * 2) роль сотрудника — есть ли у него права.
 * Возвращает экран-заглушку либо null, если проходить можно.
 */
export function moduleGate(
  session: Session,
  module: Module,
  label: string,
): ReactNode | null {
  if (!hasModule(session.tenant.edition, module)) {
    // Кнопка «назад» ведёт в первый раздел, доступный этой роли на этой версии,
    // иначе экран-заглушка отправляет сотрудника в другую заглушку.
    const inEdition = new Set(editionModules(session.tenant.edition));
    const open = visibleModules(session.role).filter((m) => inEdition.has(m));
    const fallback = NAV.find((n) => open.includes(n.module));
    return (
      <NotInEdition
        module={label}
        required={moduleEdition(module)}
        current={session.tenant.edition}
        locale={session.locale}
        home={fallback?.href ?? "/"}
        homeLabel={fallback?.label ?? S.common.toHome}
        canManageSettings={open.includes("settings") && can(session.role, "settings", "edit")}
      />
    );
  }
  if (!can(session.role, module)) {
    return <NoAccess role={session.role} module={label} locale={session.locale} />;
  }
  return null;
}
