import type { Channel } from "../types";

/** Каналы продаж: откуда приходят лиды. Сами интеграции подключаются на этапе 2. */
export const CHANNELS: Channel[] = [
  { id: "ch_sw_ig", tenantId: "t_seoulway", kind: "instagram", title: "Seoul Way Education", handle: "@seoulway.uz", status: "connected", connectedAt: "2026-01-15", leadsPerMonth: 42 },
  { id: "ch_sw_tg", tenantId: "t_seoulway", kind: "telegram", title: "Seoul Way Bot", handle: "@seoulway_bot", status: "connected", connectedAt: "2026-02-02", leadsPerMonth: 18 },
  { id: "ch_sw_mail", tenantId: "t_seoulway", kind: "email", title: "Почта агентства", handle: "info@seoulway.uz", status: "pending", connectedAt: null, leadsPerMonth: 0 },
  { id: "ch_sw_phone", tenantId: "t_seoulway", kind: "phone", title: "Телефония", handle: "+998 71 200-30-40", status: "off", connectedAt: null, leadsPerMonth: 0 },
  { id: "ch_ax_ig", tenantId: "t_agencyx", kind: "instagram", title: "Agency X", handle: "@agencyx.kz", status: "connected", connectedAt: "2026-03-10", leadsPerMonth: 27 },
  { id: "ch_ax_tg", tenantId: "t_agencyx", kind: "telegram", title: "Agency X Bot", handle: "@agencyx_bot", status: "pending", connectedAt: null, leadsPerMonth: 0 },
  { id: "ch_hb_ig", tenantId: "t_hanbridge", kind: "instagram", title: "Hanbridge", handle: "@hanbridge.kg", status: "connected", connectedAt: "2026-09-01", leadsPerMonth: 9 },
];

export const channelsOfTenant = (tenantId: string) => CHANNELS.filter((c) => c.tenantId === tenantId);
export const channelById = (id: string | null) => (id ? CHANNELS.find((c) => c.id === id) : undefined);
