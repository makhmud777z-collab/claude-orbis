import Link from "next/link";
import { lockAdminAction } from "@/app/actions";
import { PageHeader, SectionTitle } from "@/components/ui";
import {
  IconApplications, IconChevronRight, IconLock, IconSettings, IconTeam,
} from "@/components/icons";
import { translator, type Loc } from "@/lib/i18n";
import { getSession } from "@/lib/session";
import { channelsOf, customFieldsOf, departmentsOf, pipelinesOf } from "@/lib/store";
import { S } from "@/lib/strings";

interface Item {
  href: string;
  title: Loc;
  hint: Loc;
  value: string;
}

/**
 * Пульт портала. Плитками, а не списком: настройка — редкое действие,
 * и важнее увидеть, что вообще можно настроить, чем плотно уместить всё.
 */
export default async function AdminHome() {
  const session = await getSession();
  const t = translator(session.locale);
  const tenant = session.tenant;

  const pipelines = [...pipelinesOf(tenant.id, "lead"), ...pipelinesOf(tenant.id, "deal")];
  const channels = channelsOf(tenant.id);
  const departments = departmentsOf(tenant.id);

  const groups: { label: Loc; icon: typeof IconSettings; items: Item[] }[] = [
    {
      label: S.admin.groupCrm,
      icon: IconApplications,
      items: [
        {
          href: "/admin/pipelines",
          title: S.pipelines.title,
          hint: S.pipelines.subtitle,
          value: String(pipelines.length),
        },
        {
          href: "/admin/channels",
          title: S.channels.title,
          hint: S.channels.subtitle,
          value: `${channels.filter((c) => c.status === "connected").length} / ${channels.length}`,
        },
        {
          href: "/admin/cards",
          title: S.pipelines.cardView,
          hint: S.pipelines.cardViewHint,
          value: "—",
        },
        {
          href: "/admin/fields",
          title: S.customFields.title,
          hint: S.customFields.hubHint,
          value: String(customFieldsOf(tenant.id).length),
        },
      ],
    },
    {
      label: S.admin.groupPeople,
      icon: IconTeam,
      items: [
        { href: "/admin/users", title: S.admin.users, hint: S.admin.seats, value: `${tenant.seatsUsed} / ${tenant.seatsLimit}` },
        { href: "/admin/permissions", title: S.admin.permissions, hint: S.admin.permissionsHint, value: "—" },
        { href: "/team/structure", title: S.admin.structure, hint: S.admin.structureHint, value: String(departments.length) },
      ],
    },
    {
      label: S.admin.groupPortal,
      icon: IconSettings,
      items: [
        { href: "/admin/portal", title: S.admin.portal, hint: S.settings.addressHint, value: tenant.slug },
        { href: "/admin/demo", title: S.admin.demo, hint: S.admin.demoHint, value: session.user.name.split(" ")[0] },
      ],
    },
  ];

  return (
    <>
      <PageHeader
        title={t(S.admin.title)}
        meta={<span>{t(S.admin.subtitle)}</span>}
        actions={
          <form action={lockAdminAction}>
            <button className="btn btn-secondary btn-sm">
              <IconLock size={14} /> {t(S.admin.lock)}
            </button>
          </form>
        }
      />

      {groups.map((group) => (
        <section key={group.label.ru}>
          <SectionTitle>{t(group.label)}</SectionTitle>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="card card-hover flex items-center gap-4 px-5 py-4"
              >
                <span
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px]"
                  style={{
                    background: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                    color: "var(--color-accent)",
                  }}
                >
                  <group.icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="t-body-sm block">{t(item.title)}</span>
                  <span className="t-micro mt-0.5 block text-ink-faint">{t(item.hint)}</span>
                </span>
                <span className="t-caption t-num flex-none text-ink-muted">{item.value}</span>
                <IconChevronRight size={15} className="flex-none text-ink-faint" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
