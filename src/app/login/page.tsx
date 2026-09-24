import { loginAction } from "@/app/actions";
import { getSession } from "@/lib/session";
import { translator } from "@/lib/i18n";

/** Вход сотрудника: агентство уже определено поддоменом, здесь только логин и пароль. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const t = translator(session.locale);
  const failed = Boolean(params.e);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-[380px] p-8">
        <span
          className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-semibold text-white"
          style={{ background: "var(--color-accent)" }}
        >
          {session.tenant.mark}
        </span>
        <h1 className="t-headline text-center">{session.tenant.name}</h1>
        <p className="t-caption mt-2 text-center text-ink-muted">
          {t({ ru: "Войдите под своим логином", uz: "O‘z login va parolingiz bilan kiring" })}
        </p>

        <form action={loginAction} className="mt-6 grid gap-3.5">
          <label>
            <span className="t-micro mb-1.5 block text-ink-muted">{t({ ru: "Логин", uz: "Login" })}</span>
            <input name="username" required autoFocus autoComplete="username" className="field" />
          </label>
          <label>
            <span className="t-micro mb-1.5 block text-ink-muted">{t({ ru: "Пароль", uz: "Parol" })}</span>
            <input name="password" type="password" required autoComplete="current-password" className="field" />
          </label>

          {failed ? (
            <p className="t-caption" style={{ color: "var(--color-status-risk)" }}>
              {t({ ru: "Неверный логин или пароль", uz: "Login yoki parol noto‘g‘ri" })}
            </p>
          ) : null}

          <button className="btn btn-primary mt-1" style={{ height: 40 }}>
            {t({ ru: "Войти", uz: "Kirish" })}
          </button>
        </form>
      </div>
    </div>
  );
}
