import { signupAction } from "@/app/actions";
import { getSession } from "@/lib/session";
import { ROOT_DOMAIN } from "@/lib/tenants";
import { translator } from "@/lib/i18n";

const ERRORS: Record<string, { ru: string; uz: string }> = {
  fields: { ru: "Заполните все поля", uz: "Barcha maydonlarni to‘ldiring" },
  password: { ru: "Пароль — от 8 символов", uz: "Parol — kamida 8 belgi" },
  slug: { ru: "Адрес портала занят или недопустим (латиница, цифры, дефис)", uz: "Portal manzili band yoki noto‘g‘ri" },
};

/**
 * Регистрация нового агентства: владелец получает портал со своим
 * поддоменом и полными правами сразу — дальше он сам приглашает команду.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const t = translator(session.locale);
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const error = str(params.e);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-[440px] p-8">
        <h1 className="t-headline">{t({ ru: "Новый портал агентства", uz: "Yangi agentlik portali" })}</h1>
        <p className="t-caption mt-2.5 leading-relaxed text-ink-muted">
          {t({
            ru: "Вы получите права владельца: полный доступ ко всем разделам и настройкам. Дальше приглашаете сотрудников — им достаются права по умолчанию.",
            uz: "Sizga egasi huquqi beriladi: barcha bo‘lim va sozlamalarga to‘liq kirish. Keyin xodimlarni taklif qilasiz.",
          })}
        </p>

        <form action={signupAction} className="mt-6 grid gap-3.5">
          <label>
            <span className="t-micro mb-1.5 block text-ink-muted">{t({ ru: "Название агентства", uz: "Agentlik nomi" })}</span>
            <input name="agencyName" defaultValue={str(params.agencyName)} required className="field" autoFocus />
          </label>
          <label>
            <span className="t-micro mb-1.5 block text-ink-muted">{t({ ru: "Адрес портала", uz: "Portal manzili" })}</span>
            <div className="flex items-center gap-2">
              <input
                name="slug"
                defaultValue={str(params.slug)}
                required
                pattern="[a-z0-9][-a-z0-9]{1,30}[a-z0-9]"
                className="field"
                placeholder="myagency"
              />
              <span className="t-caption whitespace-nowrap text-ink-faint">.{ROOT_DOMAIN}</span>
            </div>
          </label>
          <label>
            <span className="t-micro mb-1.5 block text-ink-muted">{t({ ru: "Ваше имя", uz: "Ismingiz" })}</span>
            <input name="adminName" defaultValue={str(params.adminName)} required className="field" />
          </label>
          <label>
            <span className="t-micro mb-1.5 block text-ink-muted">{t({ ru: "Почта", uz: "Pochta" })}</span>
            <input name="email" type="email" defaultValue={str(params.email)} required className="field" />
          </label>
          <label>
            <span className="t-micro mb-1.5 block text-ink-muted">{t({ ru: "Пароль", uz: "Parol" })}</span>
            <input name="password" type="password" required minLength={8} className="field" autoComplete="new-password" />
          </label>

          {error ? (
            <p className="t-caption" style={{ color: "var(--color-status-risk)" }}>
              {t(ERRORS[error] ?? { ru: "Что-то пошло не так", uz: "Xatolik yuz berdi" })}
            </p>
          ) : null}

          <button className="btn btn-primary mt-1" style={{ height: 40 }}>
            {t({ ru: "Открыть портал", uz: "Portalni ochish" })}
          </button>
        </form>

        <p className="t-caption mt-5 text-center text-ink-faint">
          {t({ ru: "Уже есть портал?", uz: "Portal allaqachon bormi?" })}{" "}
          <a href="/login" className="text-accent hover:underline">
            {t({ ru: "Войти", uz: "Kirish" })}
          </a>
        </p>
      </div>
    </div>
  );
}
