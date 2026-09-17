import type { Tenant } from "./types";

/** Корневой домен платформы. Каждое агентство живёт на {slug}.{ROOT_DOMAIN}. */
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "orbisystem.us";

/** Поддомены платформы, которые никогда не отдаются агентствам. */
export const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "auth",
  "cdn",
  "static",
  "status",
  "docs",
  "mail",
  "help",
  "orbis",
]);

export const TENANTS: Tenant[] = [
  {
    id: "t_seoulway",
    slug: "seoulway",
    name: "Seoul Way Education",
    legalName: 'ООО "Сеул Вэй Эдьюкейшн"',
    customDomain: null,
    customDomainStatus: "none",
    plan: "pro",
    edition: "crm",
    locale: "ru",
    currency: "UZS",
    usdRate: 12900,
    rateUpdatedAt: "2026-09-15",
    mark: "S",
    seatsUsed: 9,
    seatsLimit: 15,
    branches: [
      { id: "b_tas", name: "Головной офис", city: "Ташкент" },
      { id: "b_sam", name: "Филиал", city: "Самарканд" },
    ],
    createdAt: "2025-11-04",
  },
  {
    id: "t_agencyx",
    slug: "agencyx",
    name: "Agency X",
    legalName: "Agency X LLC",
    customDomain: "crm.agencyx.uz",
    customDomainStatus: "verified",
    plan: "standard",
    edition: "crm",
    locale: "ru",
    currency: "UZS",
    usdRate: 12900,
    rateUpdatedAt: "2026-09-15",
    mark: "X",
    seatsUsed: 4,
    seatsLimit: 10,
    branches: [{ id: "b_alm", name: "Головной офис", city: "Алматы" }],
    createdAt: "2026-02-18",
  },
  {
    id: "t_hanbridge",
    slug: "hanbridge",
    name: "Hanbridge Consulting",
    legalName: "Hanbridge Consulting Co.",
    customDomain: null,
    customDomainStatus: "pending",
    plan: "trial",
    edition: "mvp",
    locale: "uz",
    currency: "UZS",
    usdRate: 12900,
    rateUpdatedAt: "2026-09-15",
    mark: "H",
    seatsUsed: 2,
    seatsLimit: 5,
    branches: [{ id: "b_bis", name: "Головной офис", city: "Бишкек" }],
    createdAt: "2026-08-30",
  },
];

export const DEFAULT_TENANT_SLUG = "seoulway";

export function tenantBySlug(slug: string | null | undefined): Tenant {
  return (
    TENANTS.find((t) => t.slug === slug) ??
    TENANTS.find((t) => t.slug === DEFAULT_TENANT_SLUG)!
  );
}

/**
 * Достаёт slug арендатора из Host.
 * agencyx.orbisystem.us → agencyx · agencyx.localhost:3000 → agencyx
 * crm.agencyx.uz → по таблице собственных доменов.
 */
export function slugFromHost(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();

  const byCustomDomain = TENANTS.find((t) => t.customDomain === hostname);
  if (byCustomDomain) return byCustomDomain.slug;

  const base = hostname.endsWith(".localhost")
    ? "localhost"
    : ROOT_DOMAIN.split(":")[0];

  if (hostname === base || hostname === `www.${base}`) return null;
  if (!hostname.endsWith(`.${base}`)) return null;

  const sub = hostname.slice(0, -1 * (base.length + 1));
  const first = sub.split(".")[0];
  if (!first || RESERVED_SLUGS.has(first)) return null;
  return first;
}

/** Проверка slug при регистрации агентства. */
export function validateSlug(slug: string): { ok: boolean; reason?: string } {
  if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug))
    return { ok: false, reason: "3–32 символа: латиница, цифры, дефис" };
  if (RESERVED_SLUGS.has(slug)) return { ok: false, reason: "Зарезервирован платформой" };
  if (TENANTS.some((t) => t.slug === slug)) return { ok: false, reason: "Уже занят" };
  return { ok: true };
}

export function tenantUrl(slug: string): string {
  return `https://${slug}.${ROOT_DOMAIN}`;
}
