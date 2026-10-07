import Link from "next/link";
import { lockAdminAction } from "@/app/actions";
import { Crumbs, PageHeader } from "@/components/ui";
import {
  IconApplications, IconChevronRight, IconDocuments, IconLock, IconRobot,
  IconSettings, IconTeam,
} from "@/components/icons";
import { translator, type Loc } from "@/lib/i18n";
import { visibleModules, type Module } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import {
  channelsOf, checklistOf, customFieldsOf, departmentsOf, metaPagesOf,
  pipelinesOf, robotsOf, triggersOf,
} from "@/lib/store";
import { S } from "@/lib/strings";

interface Item {
  href: string;
  title: Loc;
  hint: Loc;
  /** что показать справа: счётчик настроенного, а не слово «настроить» */
  value: string;
  /**
   * Модуль, которым закрыт экран. Если роли он не виден, плитки на пульте
   * быть не должно: иначе человек нажимает и упирается в «нет доступа» —
   * то самое обещание, которого экран за ней как раз не даёт.
   */
  module?: Module;
}

interface Group {
  label: Loc;
  hint: Loc;
  icon: typeof IconSettings;
  items: Item[];
}

/**
 * Пульт портала.
 *
 * Группы идут в том порядке, в каком агентство к ним приходит: сначала
 * путь заявки по воронке, потом работа со студентом, потом откуда заявки
 * берутся, потом люди, и в конце сам портал. Раньше всё лежало тремя
 * кучами без подписей, и «чек-лист документов» было негде искать.
 *
 * У каждой плитки справа счётчик настроенного — так видно, где ещё пусто,
 * не заходя внутрь.
 */
export default async function AdminHome() {
  const session = await getSession();
  const t = translator(session.locale);
  const tenant = session.tenant;

  const pipelines = [...pipelinesOf(tenant.id, "lead"), ...pipelinesOf(tenant.id, "deal")];
  const channels = channelsOf(tenant.id);
  const departments = departmentsOf(tenant.id);
  const robots = robotsOf(tenant.id);
  const pages = metaPagesOf(tenant.id);

  // Что роли вообще видно: пульт не должен обещать экраны, закрытые правами.
  const open = new Set(visibleModules(tenant.id, session.role));

  const groups: Group[] = [
    {
      label: S.admin.groupCrm,
      hint: S.admin.groupCrmHint,
      icon: IconApplications,
      items: [
        {
          href: "/admin/pipelines",
          module: "crmSettings",
          title: S.pipelines.title,
          hint: S.pipelines.subtitle,
          value: String(pipelines.length),
        },
        {
          href: "/admin/automation",
          module: "crmSettings",
          title: S.automation.title,
          hint: S.automation.hubHint,
          value: `${robots.filter((r) => r.enabled).length} + ${triggersOf(tenant.id).length}`,
        },
        {
          href: "/admin/cards",
          title: S.pipelines.cardView,
          hint: S.pipelines.cardViewHint,
          value: "—",
        },
      ],
    },
    {
      label: S.admin.groupWork,
      hint: S.admin.groupWorkHint,
      icon: IconDocuments,
      items: [
        {
          href: "/admin/checklist",
          title: S.checklist.title,
          hint: S.checklist.hubHint,
          value: String(checklistOf(tenant.id).length),
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
      label: S.admin.groupLeads,
      hint: S.admin.groupLeadsHint,
      icon: IconRobot,
      items: [
        {
          href: "/admin/meta",
          title: S.meta.title,
          hint: S.meta.hubHint,
          value: String(pages.length),
        },
        {
          href: "/admin/channels",
          module: "crmSettings",
          title: S.channels.title,
          hint: S.channels.subtitle,
          value: `${channels.filter((c) => c.status === "connected").length} / ${channels.length}`,
        },
      ],
    },
    {
      label: S.admin.groupPeople,
      hint: S.admin.groupPeopleHint,
      icon: IconTeam,
      items: [
        {
          href: "/admin/users",
          title: S.admin.users,
          hint: S.admin.seats,
          value: `${tenant.seatsUsed} / ${tenant.seatsLimit}`,
        },
        {
          href: "/admin/permissions",
          title: S.admin.permissions,
          hint: S.admin.permissionsHint,
          value: "—",
        },
        {
          href: "/team/structure",
          title: S.admin.structure,
          hint: S.admin.structureHint,
          value: String(departments.length),
        },
      ],
    },
    {
      label: S.admin.groupPortal,
      hint: S.admin.groupPortalHint,
      icon: IconSettings,
      items: [
        {
          href: "/admin/portal",
          module: "settings",
          title: S.admin.portal,
          hint: S.settings.addressHint,
          value: tenant.slug,
        },
        {
          href: "/admin/demo",
          title: S.admin.demo,
          hint: S.admin.demoHint,
          value: session.user.name.split(" ")[0],
        },
      ],
    },
  ];

  return (
    <>
      <Crumbs back="/" backLabel={t(S.nav.dashboard)} current={t(S.admin.title)} />
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

      {groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.module || open.has(item.module)),
        }))
        // Группа без единой доступной плитки — пустой заголовок, и только.
        .filter((group) => group.items.length > 0)
        .map((group) => (
        <section key={group.label.ru} className="mb-9 last:mb-0">
          {/*
            Подпись группы с пояснением: «CRM» ни о чём не говорит человеку,
            который ищет, где поменять набор документов.
          */}
          <div className="mb-3.5 flex items-start gap-3">
            <span
              className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-[9px]"
              style={{
                background: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                color: "var(--color-accent)",
              }}
            >
              <group.icon size={16} />
            </span>
            <div className="min-w-0">
              <h2 className="t-headline">{t(group.label)}</h2>
              <p className="t-caption mt-0.5 text-ink-faint">{t(group.hint)}</p>
            </div>
          </div>

          <div className="stagger-in grid grid-cols-1 gap-3 md:grid-cols-2">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="card card-hover flex items-center gap-4 px-5 py-4"
              >
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
