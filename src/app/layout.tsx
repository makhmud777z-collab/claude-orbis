import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { openModules } from "@/components/guard";
import { navFor } from "@/components/nav";
import { homeHref } from "@/lib/edition";
import { roleLabel } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { breakSeconds, openSession, sessionSeconds } from "@/lib/store";
import { ROOT_DOMAIN } from "@/lib/tenants";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const host = session.host || `${session.tenant.slug}.${ROOT_DOMAIN}`;
  // Навигация = права роли ∩ модули версии продукта.
  const modules = openModules(session);
  // Дашборд есть не у всех ролей и не во всех версиях — логотип ведёт туда,
  // куда сотрудник реально может попасть.
  const home = modules.includes("dashboard")
    ? homeHref(session.tenant.edition)
    : (navFor(new Set(modules))[0]?.href ?? "/universities");

  const work = openSession(session.user.id);

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
              canAdmin={modules.includes("admin")}
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
