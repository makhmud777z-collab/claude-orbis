import Link from "next/link";
import { translator } from "@/lib/i18n";
import { getSession } from "@/lib/session";
import { homeHref } from "@/lib/edition";
import { S } from "@/lib/strings";

/**
 * 404 — в том числе когда запись существует, но лежит вне зоны видимости
 * сотрудника: система не подтверждает и не отрицает её существование.
 */
export default async function NotFound() {
  const session = await getSession();
  const t = translator(session.locale);

  return (
    <div className="card mx-auto mt-16 max-w-md px-8 py-12 text-center">
      <div className="t-display-sm t-num text-ink-faint">404</div>
      <div className="t-headline mt-3">{t(S.common.notFoundTitle)}</div>
      <p className="t-body-sm mt-3 text-ink-muted">{t(S.common.notFoundHint)}</p>
      <Link
        href={homeHref(session.tenant.edition)}
        className="btn btn-primary btn-sm mt-7"
      >
        {t(S.common.toHome)}
      </Link>
    </div>
  );
}
