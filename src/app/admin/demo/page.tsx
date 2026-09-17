import { switchTenant, switchUser } from "@/app/actions";
import { Avatar, Crumbs, PageHeader, SectionTitle } from "@/components/ui";
import { translator } from "@/lib/i18n";
import { usersOfTenant } from "@/lib/data/users";
import { roleDef } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { S } from "@/lib/strings";
import { TENANTS } from "@/lib/tenants";

/**
 * Показ портала. Раньше выбор агентства и сотрудника жил в шапке — там же,
 * где работает менеджер, и выглядел как часть продукта. Это настройка
 * демонстрации, поэтому её место здесь, за кодом.
 */
export default async function AdminDemoPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const staff = usersOfTenant(session.tenant.id);

  return (
    <>
      <Crumbs back="/admin" backLabel={t(S.admin.title)} current={t(S.admin.demo)} />
      <PageHeader title={t(S.admin.demo)} meta={<span>{t(S.admin.demoHint)}</span>} />

      <SectionTitle>{t(S.common.workspace)}</SectionTitle>
      <form action={switchTenant} className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {TENANTS.map((item) => {
          const on = item.id === session.tenant.id;
          return (
            <button
              key={item.id}
              name="tenant"
              value={item.slug}
              className="card card-hover flex items-center gap-3 px-4 py-3.5 text-left"
              style={on ? { borderColor: "var(--color-accent)" } : undefined}
            >
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[8px] bg-accent text-[13px] font-semibold text-white">
                {item.mark}
              </span>
              <span className="min-w-0">
                <span className="t-body-sm block truncate">{item.name}</span>
                <span className="t-micro block truncate text-ink-faint">
                  {item.slug} · {item.edition === "mvp" ? "01 / MVP" : "02 / CRM"}
                </span>
              </span>
            </button>
          );
        })}
      </form>

      <SectionTitle>{t(S.common.signInAs)}</SectionTitle>
      <form action={switchUser} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {staff.map((member) => {
          const on = member.id === session.user.id;
          return (
            <button
              key={member.id}
              name="userId"
              value={member.id}
              className="card card-hover flex items-center gap-3 px-4 py-3.5 text-left"
              style={on ? { borderColor: "var(--color-accent)" } : undefined}
            >
              <Avatar name={member.name} size={32} />
              <span className="min-w-0 flex-1">
                <span className="t-body-sm block truncate">{member.name}</span>
                <span className="t-micro block truncate text-ink-faint">
                  {t(roleDef(member.role).label)} · {member.title}
                </span>
              </span>
            </button>
          );
        })}
      </form>
    </>
  );
}
