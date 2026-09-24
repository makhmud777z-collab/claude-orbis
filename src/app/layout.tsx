import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { openModules } from "@/components/guard";
import { navFor } from "@/components/nav";
import { homeHref } from "@/lib/edition";
import { roleLabel } from "@/lib/rbac";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { DEADLINE_KIND } from "@/lib/labels";
import { userById } from "@/lib/data/users";
import { noticesFor } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { breakSeconds, openSession, sessionSeconds } from "@/lib/store";
import { ROOT_DOMAIN } from "@/lib/tenants";

/** /login, /signup, /invite/* показываются без обвязки портала: там ещё нет
 * ни сотрудника, ни его меню — раньше эти роуты просто не существовали. */
function isPublicAuthPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/signup") || pathname.startsWith("/invite/");
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

  if (isPublicAuthPath(pathname)) {
    return (
      <html lang={session.locale} data-theme={session.theme} className={inter.variable}>
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
    <html lang={session.locale} data-theme={session.theme} className={inter.variable}>
      <body className="grain min-h-screen bg-canvas text-ink antialiased">
        <div className="flex min-h-screen">
          <Sidebar
            tenantName={session.tenant.name}
            tenantMark={session.tenant.mark}
            host={host}
            modules={modules}
            roleLabel={roleLabel(session.role)}
            locale={session.locale}
            home={home}
          />
          <div className="relative z-10 flex min-w-0 flex-1 flex-col">
            <Topbar
              user={session.user}
              roleLabel={roleLabel(session.role)}
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
              workday={{
                started: Boolean(work),
                onBreak: Boolean(work?.onBreakSince),
                startedAt: work ? work.startedAt.slice(11, 16) : null,
                seconds: work ? sessionSeconds(work) : 0,
                breakSeconds: work ? breakSeconds(work) : 0,
              }}
            />
            <main className="page-in min-w-0 flex-1 px-5 py-7 lg:px-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
