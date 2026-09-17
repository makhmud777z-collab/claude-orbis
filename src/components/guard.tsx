import type { ReactNode } from "react";
import { NoAccess } from "./NoAccess";
import { NotInEdition } from "./NotInEdition";
import { hasModule, moduleEdition } from "@/lib/edition";
import { can, type Module } from "@/lib/rbac";
import type { Session } from "@/lib/session";

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
    return (
      <NotInEdition
        module={label}
        required={moduleEdition(module)}
        current={session.tenant.edition}
        locale={session.locale}
      />
    );
  }
  if (!can(session.role, module)) {
    return <NoAccess role={session.role} module={label} locale={session.locale} />;
  }
  return null;
}
