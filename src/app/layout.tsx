import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "./globals.css";
import { PageTransition } from "@/components/PageTransition";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { openModules } from "@/components/guard";
import { navFor } from "@/components/nav";
import { editionMeta, homeHref } from "@/lib/edition";
import { roleLabel, roleTitle } from "@/lib/rbac";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { DEADLINE_KIND } from "@/lib/labels";
import { userById } from "@/lib/data/users";
import { noticesFor } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { breakSeconds, openSession, sessionSeconds, sweepRobots } from "@/lib/store";
import { ROOT_DOMAIN } from "@/lib/tenants";
import { accentValue } from "@/lib/accent";
import { backdropValue } from "@/lib/backdrop";

/**
 * Страницы без обвязки портала.
 *
 * Вход, регистрация и приглашение — потому что сотрудника ещё нет, и меню
 * показывать некому. Политика и удаление данных — потому что их читает не
 * сотрудник вовсе: проверяющий Meta и человек, оставивший заявку в рекламе.
 * Эти две обязаны открываться у кого угодно без входа, иначе приложение не
 * проходит проверку Meta.
 */
function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/privacy" ||
    pathname === "/data-deletion" ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/invite/")
  );
}

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Orbis System",
  description:
    "Портал для консалтинговых агентств: CRM, документы, задачи и проекты, сотрудники и подбор корейских вузов.",
};

/** Куда ведёт уведомление: к сделке, контакту или в список сроков. */
function deadlineHref(relation: { type: string; id: string } | null): string {
  if (relation?.type === "deal") return `/crm/deals/${relation.id}`;
  if (relation?.type === "student") return `/crm/contacts/${relation.id}`;
  return "/deadlines";
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const pathname = (await headers()).get("x-orbis-pathname") ?? "";

  /*
   * Роботы с задержкой. Настоящего планировщика в портале пока нет, и
   * откладывать их до перезапуска нельзя — агентство ждёт напоминание
   * «лид висит час», а не «лид висел час позавчера». Поэтому созревшие
   * разбираются при первом же обращении к порталу. Когда появится очередь,
   * эта строка уходит, а sweepRobots становится её обработчиком.
   */
  sweepRobots(session.tenant.id);

  if (isPublicPath(pathname)) {
    return (
      <html
        lang={session.locale}
        data-theme={session.theme}
        className={inter.variable}
        style={{ "--color-accent": accentValue(session.accent, session.theme) } as React.CSSProperties}
      >
        <body className="grain min-h-screen bg-canvas text-ink antialiased">{children}</body>
      </html>
    );
  }

  // Демо-агентство остаётся витриной без входа; реальное — нет: не
  // подтверждённая подписью кука отправляет на экран входа, а не тихо
  // подставляет владельца, как для демо.
  if (session.tenant.source === "signup" && !session.authenticated) {
    redirect("/login");
  }

  const host = session.host || `${session.tenant.slug}.${ROOT_DOMAIN}`;
  // Навигация = права роли ∩ модули версии продукта.
  const modules = openModules(session);
  // Дашборд есть не у всех ролей и не во всех версиях — логотип ведёт туда,
  // куда сотрудник реально может попасть.
  const home = modules.includes("dashboard")
    ? homeHref(session.tenant.edition)
    : (navFor(new Set(modules))[0]?.href ?? "/universities");

  const work = openSession(session.user.id);
  const t = translator(session.locale);
  const f = formatters(session.locale);

  return (
    /*
     * Цвет портала ставится прямо на <html> вместе с темой: переменную
     * видит вся страница, включая всплывающие окна в портале документа, а
     * сервер подставляет её сразу — страница не мигает чужим цветом.
     */
    <html
      lang={session.locale}
      data-theme={session.theme}
      /*
       * Фон на <html>, а не на <body>: отсюда его видят и карточки, которым
       * признак включает полупрозрачность, и отдельный слой под ними.
       */
      data-backdrop={session.backdrop === "none" ? undefined : session.backdrop}
      className={inter.variable}
      style={
        {
          "--color-accent": accentValue(session.accent, session.theme),
          "--orbis-backdrop": backdropValue(session.backdrop, session.theme) || "none",
        } as React.CSSProperties
      }
    >
      <body className="grain min-h-screen bg-canvas text-ink antialiased">
        <div className="flex min-h-screen">
          <Sidebar
            tenantName={session.tenant.name}
            tenantMark={session.tenant.mark}
            host={host}
            modules={modules}
            locale={session.locale}
            home={home}
            planLabel={`${editionMeta(session.tenant.edition).code} · ${session.tenant.plan.toUpperCase()}`}
            seatsUsed={session.tenant.seatsUsed}
            seatsLimit={session.tenant.seatsLimit}
          />
          <div className="relative z-10 flex min-w-0 flex-1 flex-col">
            <Topbar
              user={session.user}
              roleLabel={roleTitle(roleLabel(session.tenant.id, session.role), t)}
              showLogout={session.tenant.source === "signup"}
              canAdmin={modules.includes("admin")}
              notices={noticesFor(session).map((n) => ({
                id: n.id,
                href: deadlineHref(n.relation),
                title: t(n.title),
                hint: `${n.mine ? t(DEADLINE_KIND[n.kind].label) : (userById(n.ownerId)?.name ?? "—")} · ${f.relativeDeadline(n.date)}`,
                color: DEADLINE_KIND[n.kind].dot,
                overdue: n.overdue,
              }))}
              locale={session.locale}
              modules={modules}
              home={home}
              theme={session.theme}
              accent={session.accent}
              backdrop={session.backdrop}
              workday={{
                started: Boolean(work),
                onBreak: Boolean(work?.onBreakSince),
                startedAt: work ? work.startedAt.slice(11, 16) : null,
                seconds: work ? sessionSeconds(work) : 0,
                breakSeconds: work ? breakSeconds(work) : 0,
              }}
            />
            <PageTransition>{children}</PageTransition>
          </div>
        </div>
      </body>
    </html>
  );
}
