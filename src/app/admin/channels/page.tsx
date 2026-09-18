import { toggleChannelAction } from "@/app/actions";
import { moduleGate } from "@/components/guard";
import { IconInstagram, IconMail, IconPhone, IconTelegram } from "@/components/icons";
import { Banner, Chip, PageHeader, StatusDot } from "@/components/ui";
import { formatters } from "@/lib/format";
import { translator, type Loc } from "@/lib/i18n";
import { allow } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { channelsOf } from "@/lib/store";
import { P, S } from "@/lib/strings";
import type { Channel } from "@/lib/types";

const KIND_LABEL: Record<Channel["kind"], Loc> = {
  instagram: S.channels.instagram,
  telegram: S.channels.telegram,
  email: S.channels.email,
  phone: S.channels.phone,
};

/** Канал узнают по значку: глобус на месте Instagram выглядит заглушкой. */
const CHANNEL_ICON = {
  instagram: IconInstagram,
  telegram: IconTelegram,
  email: IconMail,
  phone: IconPhone,
} as const;

/** Фирменный оттенок канала — единственное место, где цвет не статусный. */
const CHANNEL_TINT: Record<Channel["kind"], string> = {
  instagram: "#d6249f",
  telegram: "#29a9eb",
  email: "var(--color-status-violet)",
  phone: "var(--color-status-deal)",
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
              {f.plural(total, P.leads)} {t(S.channels.perMonth)}
            </span>
          </>
        }
      />

      <Banner>{t(S.channels.stage2)}</Banner>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {channels.map((channel) => {
          const status = STATUS[channel.status];
          const Icon = CHANNEL_ICON[channel.kind];
          const tint = CHANNEL_TINT[channel.kind];
          return (
            <article key={channel.id} className="card p-5">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] border"
                  style={{
                    borderColor: `color-mix(in srgb, ${tint} 30%, transparent)`,
                    background: `color-mix(in srgb, ${tint} 12%, transparent)`,
                    color: tint,
                  }}
                >
                  <Icon size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="t-body-sm truncate">{channel.title}</div>
                  <div className="t-micro truncate text-ink-faint">{channel.handle}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="chip">
                  <StatusDot color={status.dot} />
                  {t(status.label)}
                </span>
                <Chip>{t(KIND_LABEL[channel.kind])}</Chip>
              </div>

              <div className="t-micro mt-3 text-ink-faint">
                {channel.connectedAt ? f.date(channel.connectedAt) : t(S.common.notSet)} ·{" "}
                <span className="t-num">
                  {f.plural(channel.leadsPerMonth, P.leads)}
                </span>{" "}
                {t(S.channels.perMonth)}
              </div>

              {canEdit ? (
                <form action={toggleChannelAction} className="mt-4">
                  <input type="hidden" name="channelId" value={channel.id} />
                  <button className="btn btn-secondary btn-sm w-full justify-center">
                    {channel.status === "connected"
                      ? t(S.channels.disconnect)
                      : t(S.channels.connect)}
                  </button>
                </form>
              ) : null}
            </article>
          );
        })}
      </div>
    </>
  );
}
