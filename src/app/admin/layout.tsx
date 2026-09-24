import { headers } from "next/headers";
import { AdminLock } from "@/components/AdminLock";
import { moduleGate } from "@/components/guard";
import { adminUnlocked } from "@/lib/admin-lock";
import { translator } from "@/lib/i18n";
import { getSession } from "@/lib/session";
import { S } from "@/lib/strings";

/**
 * Все настройки портала живут под этим слоем: сначала право на модуль,
 * затем код. Ни одна страница внутри не проверяет замок сама — оболочка
 * общая, и обойти её ссылкой нельзя.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const t = translator(session.locale);

  const gate = moduleGate(session, "admin", t(S.admin.title));
  if (gate) return gate;

  if (!(await adminUnlocked(session.tenant.id))) {
    // Код вводится один раз на сессию — после него человек должен попасть
    // туда, куда шёл (например /admin/users), а не всегда на /admin.
    const pathname = (await headers()).get("x-orbis-pathname") || "/admin";
    return <AdminLock locale={session.locale} next={pathname} failed={false} />;
  }
  return <>{children}</>;
}
