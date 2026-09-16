import { roleLabel } from "@/lib/rbac";
import type { Role } from "@/lib/types";

export function NoAccess({ role, module }: { role: Role; module: string }) {
  return (
    <div className="card mx-auto mt-16 max-w-md px-8 py-12 text-center">
      <div className="t-headline">Раздел недоступен</div>
      <p className="t-body-sm mt-3 text-ink-muted">
        У роли «{roleLabel(role)}» нет прав на модуль «{module}». Попросите
        директора агентства расширить доступ в разделе «Сотрудники».
      </p>
    </div>
  );
}
