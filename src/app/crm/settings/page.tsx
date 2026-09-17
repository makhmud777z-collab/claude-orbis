import Link from "next/link";
import { moduleGate } from "@/components/guard";
import { IconChevronRight } from "@/components/icons";
import { Banner, PageHeader, StatusDot } from "@/components/ui";
import { translator, type Loc } from "@/lib/i18n";
import { getSession } from "@/lib/session";
import { channelsOf, pipelinesOf } from "@/lib/store";
import { S } from "@/lib/strings";

/** Настройки CRM — одна точка входа во всё, что настраивается в воронке. */
export default async function CrmSettingsPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const gate = moduleGate(session, "crmSettings", t(S.admin.title));
  if (gate) return gate;

  const leadPipelines = pipelinesOf(session.tenant.id, "lead");
  const dealPipelines = pipelinesOf(session.tenant.id, "deal");
  const channels = channelsOf(session.tenant.id);

  const items: { href: string; title: Loc; hint: Loc; value: string }[] = [
    {
      href: "/crm/pipelines",
      title: S.pipelines.title,
      hint: S.pipelines.subtitle,
      value: String(leadPipelines.length + dealPipelines.length),
    },
    {
      href: "/crm/channels",
      title: S.channels.title,
      hint: S.channels.subtitle,
      value: `${channels.filter((c) => c.status === "connected").length} / ${channels.length}`,
    },
    {
      href: "/crm/deals",
      title: S.pipelines.cardView,
      hint: S.pipelines.cardViewHint,
      value: "—",
    },
  ];

  return (
    <>
      <PageHeader title={t(S.admin.crmSettings)} meta={<span>{t(S.pipelines.subtitle)}</span>} />

      <Banner>{t(S.crm.duplicateHint)}</Banner>

      <div className="card divide-y divide-hairline-soft">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2"
          >
            <StatusDot color="var(--color-accent)" />
            <span className="min-w-0 flex-1">
              <span className="t-body-sm block">{t(item.title)}</span>
              <span className="t-micro block text-ink-faint">{t(item.hint)}</span>
            </span>
            <span className="t-caption t-num flex-none text-ink-muted">{item.value}</span>
            <IconChevronRight size={14} className="flex-none text-ink-faint" />
          </Link>
        ))}
      </div>
    </>
  );
}
