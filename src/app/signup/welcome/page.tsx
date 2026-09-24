import { getSession } from "@/lib/session";
import { translator } from "@/lib/i18n";

/**
 * Показывается один раз сразу после регистрации: код входа в
 * «Администрирование» больше нигде не хранится в открытом виде — если его
 * не сохранить сейчас, останется только сброс через код доступа в базе.
 */
export default async function SignupWelcomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = Array.isArray(params.code) ? params.code[0] : (params.code ?? "");
  const session = await getSession();
  const t = translator(session.locale);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-[420px] p-8 text-center">
        <h1 className="t-headline">{t({ ru: "Портал открыт", uz: "Portal ochildi" })}</h1>
        <p className="t-caption mt-2.5 leading-relaxed text-ink-muted">
          {t({
            ru: "Сохраните код входа в «Администрирование» — там настройки CRM, права и тариф. Код нигде больше не показывается.",
            uz: "«Boshqaruv» bo‘limiga kirish kodini saqlang — u boshqa hech qayerda ko‘rsatilmaydi.",
          })}
        </p>

        <div
          className="t-display-sm num mt-6 rounded-[10px] py-4 tracking-[0.3em]"
          style={{ background: "var(--color-surface-2)" }}
        >
          {code}
        </div>

        <a href="/" className="btn btn-primary mt-6 w-full" style={{ height: 40 }}>
          {t({ ru: "Перейти в портал", uz: "Portalga o‘tish" })}
        </a>
      </div>
    </div>
  );
}
