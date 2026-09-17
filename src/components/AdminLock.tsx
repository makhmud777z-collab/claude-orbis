import { unlockAdminAction } from "@/app/actions";
import { IconLock } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

/**
 * Экран замка. Настройки портала — не раздел меню, а отдельная зона
 * ответственности: сюда заходит тот, кто портал ведёт, и делает это
 * осознанно, набрав код.
 */
export function AdminLock({
  locale,
  next,
  failed,
}: {
  locale: Locale;
  next: string;
  failed: boolean;
}) {
  const t = translator(locale);
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="card w-full max-w-[420px] p-8 text-center">
        <span
          className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)", color: "var(--color-accent)" }}
        >
          <IconLock size={20} />
        </span>
        <h1 className="t-headline">{t(S.adminLock.title)}</h1>
        <p className="t-caption mt-2.5 leading-relaxed text-ink-muted">{t(S.adminLock.hint)}</p>

        <form action={unlockAdminAction} className="mt-6">
          <input type="hidden" name="next" value={next} />
          <input
            autoFocus
            name="code"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder={t(S.adminLock.placeholder)}
            className="field t-num text-center tracking-[0.4em]"
            style={{ height: 44 }}
          />
          {failed ? (
            <p className="t-caption mt-2.5" style={{ color: "var(--color-status-risk)" }}>
              {t(S.adminLock.wrong)}
            </p>
          ) : null}
          <button className="btn btn-primary mt-4 w-full" style={{ height: 40 }}>
            {t(S.adminLock.enter)}
          </button>
        </form>
      </div>
    </div>
  );
}
