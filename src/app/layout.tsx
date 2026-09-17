import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { usersOfTenant } from "@/lib/data/users";
import { editionModules } from "@/lib/edition";
import { roleLabel, visibleModules } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { ROOT_DOMAIN, TENANTS } from "@/lib/tenants";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Orbis System",
  description:
    "Система для консалтинговых агентств: студенты, заявки, документы, задачи, дедлайны и подбор корейских вузов.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const host = session.host || `${session.tenant.slug}.${ROOT_DOMAIN}`;
  // Навигация = права роли ∩ модули версии продукта.
  const allowed = new Set(editionModules(session.tenant.edition));
  const modules = visibleModules(session.role).filter((m) => allowed.has(m));

  return (
    <html lang={session.locale} className={inter.variable}>
      <body className="grain min-h-screen bg-canvas text-ink antialiased">
        <div className="flex min-h-screen">
          <Sidebar
            tenantName={session.tenant.name}
            tenantMark={session.tenant.mark}
            host={host}
            modules={modules}
            roleLabel={roleLabel(session.role)}
            locale={session.locale}
          />
          <div className="relative z-10 flex min-w-0 flex-1 flex-col">
            <Topbar
              user={session.user}
              roleLabel={roleLabel(session.role)}
              tenant={session.tenant}
              tenants={TENANTS.map((t) => ({ slug: t.slug, name: t.name }))}
              staff={usersOfTenant(session.tenant.id)}
              locale={session.locale}
            />
            <main className="flex-1 px-5 py-7 lg:px-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
