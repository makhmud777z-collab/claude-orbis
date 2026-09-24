import { acceptInviteAction } from "@/app/actions";
import { userByInviteToken } from "@/lib/onboarding";
import { getSession } from "@/lib/session";
import { roleDef } from "@/lib/rbac";
import { translator } from "@/lib/i18n";

/** Сотрудник открывает ссылку из /admin/users, задаёт пароль и сразу в портале. */
export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const session = await getSession();
  const t = translator(session.locale);
  const failed = Boolean(sp.e);

  const user = userByInviteToken(token);
  const expired =
    !user || !user.inviteExpiresAt || new Date(user.inviteExpiresAt).getTime() < Date.now();

  if (expired) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="card w-full max-w-[380px] p-8 text-center">
          <h1 className="t-headline">{t({ ru: "Ссылка недействительна", uz: "Havola yaroqsiz" })}</h1>
          <p className="t-caption mt-2.5 leading-relaxed text-ink-muted">
            {t({
              ru: "Приглашение устарело или уже использовано. Попросите администратора выслать новое.",
              uz: "Taklif eskirgan yoki allaqachon ishlatilgan. Administratordan yangisini so‘rang.",
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-[400px] p-8">
        <h1 className="t-headline">{t({ ru: "Добро пожаловать", uz: "Xush kelibsiz" })}, {user.name}</h1>
        <p className="t-caption mt-2.5 leading-relaxed text-ink-muted">
          {t({ ru: "Роль", uz: "Rol" })}: {t(roleDef(user.role).label)}
          {" · "}
          {t({ ru: "Осталось задать пароль", uz: "Faqat parol qo‘yish qoldi" })}
        </p>

        <form action={acceptInviteAction} className="mt-6 grid gap-3.5">
          <input type="hidden" name="token" value={token} />
          <label>
            <span className="t-micro mb-1.5 block text-ink-muted">{t({ ru: "Придумайте пароль", uz: "Parol o‘ylab toping" })}</span>
            <input name="password" type="password" required minLength={8} autoFocus autoComplete="new-password" className="field" />
          </label>

          {failed ? (
            <p className="t-caption" style={{ color: "var(--color-status-risk)" }}>
              {t({ ru: "Пароль — от 8 символов", uz: "Parol — kamida 8 belgi" })}
            </p>
          ) : null}

          <button className="btn btn-primary mt-1" style={{ height: 40 }}>
            {t({ ru: "Войти в портал", uz: "Portalga kirish" })}
          </button>
        </form>
      </div>
    </div>
  );
}
