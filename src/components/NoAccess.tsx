import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

export function NoAccess({
  roleName,
  module,
  locale,
}: {
  /** название роли уже на языке сотрудника — разрешает вызывающий */
  roleName: string;
  module: string;
  locale: Locale;
}) {
  const t = translator(locale);
  return (
    <div className="card mx-auto mt-16 max-w-md px-8 py-12 text-center">
      <div className="t-headline">{t(S.common.accessDenied)}</div>
      <p className="t-body-sm mt-3 text-ink-muted">
        {roleName} · {module}
      </p>
      <p className="t-body-sm mt-2 text-ink-muted">{t(S.common.accessDeniedHint)}</p>
    </div>
  );
}
