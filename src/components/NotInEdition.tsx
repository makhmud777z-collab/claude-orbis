import Link from "next/link";
import { editionMeta, type Edition } from "@/lib/edition";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

/**
 * Модуль есть в системе, но не входит в версию агентства.
 * Показываем честно: что это, в какой версии открывается и куда идти сейчас.
 */
export function NotInEdition({
  module,
  required,
  current,
  locale,
}: {
  module: string;
  required: Edition;
  current: Edition;
  locale: Locale;
}) {
  const t = translator(locale);
  const req = editionMeta(required);
  const now = editionMeta(current);

  return (
    <div className="card mx-auto mt-16 max-w-lg px-8 py-12 text-center">
      <div className="t-micro uppercase tracking-[0.12em] text-ink-faint">
        {req.code}
      </div>
      <div className="t-headline mt-3">{module}</div>
      <p className="t-body-sm mt-3 text-ink-muted">{t(S.edition.notIncluded)}</p>
      <p className="t-caption mt-4 text-ink-faint">
        {t(S.edition.yourEdition)}: {now.code} · {t(now.goal)}
      </p>
      <div className="mt-7 flex items-center justify-center gap-2">
        <Link href="/universities" className="btn btn-secondary btn-sm">
          {t(S.nav.universities)}
        </Link>
        <Link href="/settings" className="btn btn-primary btn-sm">
          {t(S.edition.upgrade)}
        </Link>
      </div>
    </div>
  );
}
