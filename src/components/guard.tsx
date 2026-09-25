import type { ReactNode } from "react";
import { NoAccess } from "./NoAccess";
import { NotInEdition } from "./NotInEdition";
import { navFor } from "./nav";
import { editionModules, hasModule, moduleEdition } from "@/lib/edition";
import { allow, visibleModules, type Module } from "@/lib/rbac";
import type { Session } from "@/lib/session";
import { S } from "@/lib/strings";

/**
 * Модули, которые реально открыты сотруднику:
 * права роли ∩ версия продукта − персональные ограничения от админа.
 */
export function openModules(session: Session): Module[] {
  const inEdition = new Set(editionModules(session.tenant.edition));
  const restricted = new Set(session.user.restrictedModules ?? []);
  return visibleModules(session.tenant.id, session.role).filter(
    (m) => inEdition.has(m) && !restricted.has(m),
  );
}

/**
 * Два барьера перед разделом, в одном месте:
 * 1) версия продукта агентства — куплен ли модуль;
 * 2) роль сотрудника — есть ли у него права (с учётом настроек агентства).
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
    const open = openModules(session);
    const fallback = navFor(new Set(open))[0];
    return (
      <NotInEdition
        module={label}
        required={moduleEdition(module)}
        current={session.tenant.edition}
        locale={session.locale}
        home={fallback?.href ?? "/"}
        homeLabel={fallback?.label ?? S.common.toHome}
        canManageSettings={
          open.includes("settings") && allow(session.tenant.id, session.role, "settings", "edit")
        }
      />
    );
  }
  // Персональный запрет админа блокирует и прямой заход по ссылке, а не
  // только прячет пункт из меню.
  const restricted = session.user.restrictedModules ?? [];
  if (restricted.includes(module) || !allow(session.tenant.id, session.role, module)) {
    return <NoAccess role={session.role} module={label} locale={session.locale} />;
  }
  return null;
}
