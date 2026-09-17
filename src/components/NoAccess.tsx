import { translator, type Locale } from "@/lib/i18n";
import { roleLabel } from "@/lib/rbac";
import { S } from "@/lib/strings";
import type { Role } from "@/lib/types";

export function NoAccess({
  role,
  module,
  locale,
}: {
  role: Role;
  module: string;
  locale: Locale;
}) {
  const t = translator(locale);
  return (
    <div className="card mx-auto mt-16 max-w-md px-8 py-12 text-center">
      <div className="t-headline">{t(S.common.accessDenied)}</div>
      <p className="t-body-sm mt-3 text-ink-muted">
        {t(roleLabel(role))} · {module}
      </p>
      <p className="t-body-sm mt-2 text-ink-muted">{t(S.common.accessDeniedHint)}</p>
    </div>
  );
}
