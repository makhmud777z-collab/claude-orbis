import { moduleGate } from "@/components/guard";
import { IconGlobe, IconMail, IconPhone } from "@/components/icons";
import { Banner, Chip, PageHeader, StatusDot } from "@/components/ui";
import { formatters } from "@/lib/format";
import { translator, type Loc } from "@/lib/i18n";
import { allow } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { channelsOf } from "@/lib/store";
import { S } from "@/lib/strings";
import type { Channel } from "@/lib/types";

const KIND_LABEL: Record<Channel["kind"], Loc> = {
  instagram: S.channels.instagram,
  telegram: S.channels.telegram,
  email: S.channels.email,
  phone: S.channels.phone,
};

const STATUS: Record<Channel["status"], { label: Loc; dot: string }> = {
  connected: { label: S.channels.connected, dot: "var(--color-status-deal)" },
  pending: { label: S.channels.pending, dot: "var(--color-status-progress)" },
  off: { label: S.channels.off, dot: "var(--color-ink-faint)" },
};

/**
 * Каналы продаж: Instagram, Telegram, почта и телефония.
 * Каждое обращение из канала становится лидом, а повторное — записью
 * в истории уже существующей карточки.
 */
export default async function ChannelsPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const gate = moduleGate(session, "crmSettings", t(S.channels.title));
  if (gate) return gate;

  const f = formatters(session.locale);
  const channels = channelsOf(session.tenant.id);
  const canEdit = allow(session.tenant.id, session.role, "crmSettings", "edit");
  const total = channels.reduce((sum, c) => sum + c.leadsPerMonth, 0);

  return (
    <>
      <PageHeader
        title={t(S.channels.title)}
        meta={
          <>
            <span>{t(S.channels.subtitle)}</span>
            <span>·</span>
            <span className="t-num">
              {total} {t(S.channels.leadsPerMonth)}
            </span>
          </>
        }
      />

      <Banner>{t(S.channels.stage2)}</Banner>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {channels.map((channel) => {
          const status = STATUS[channel.status];
          const Icon =
            channel.kind === "email" ? IconMail : channel.kind === "phone" ? IconPhone : IconGlobe;
          return (
            <article key={channel.id} className="card p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border border-hairline-soft bg-surface-2 text-ink-muted">
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="t-body-sm truncate">{channel.title}</div>
                  <div className="t-micro truncate text-ink-faint">{channel.handle}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className="chip">
                  <StatusDot color={status.dot} />
                  {t(status.label)}
                </span>
                <Chip>{t(KIND_LABEL[channel.kind])}</Chip>
              </div>

              <div className="t-micro mt-3 text-ink-faint">
                {channel.connectedAt ? f.date(channel.connectedAt) : t(S.common.notSet)} ·{" "}
                <span className="t-num">{channel.leadsPerMonth}</span>{" "}
                {t(S.channels.leadsPerMonth)}
              </div>

              {canEdit ? (
                <button className="btn btn-secondary btn-sm mt-4 w-full justify-center">
                  {channel.status === "connected"
                    ? t(S.channels.disconnect)
                    : t(S.channels.connect)}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </>
  );
}
