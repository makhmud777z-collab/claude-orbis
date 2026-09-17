import { cookies, headers } from "next/headers";
import { USERS, usersOfTenant } from "./data/users";
import { isLocale, type Locale } from "./i18n";
import { isTheme, type Theme } from "./theme";
import { roleDef, type Scope } from "./rbac";
import { tenantBySlug } from "./tenants";
import type { Role, Tenant, User } from "./types";

export interface Session {
  tenant: Tenant;
  user: User;
  role: Role;
  scope: Scope;
  /** Host, по которому пришёл запрос — показываем в шапке настроек. */
  host: string;
  /** язык интерфейса: выбор сотрудника поверх языка агентства */
  locale: Locale;
  /** тема оформления: каждый сотрудник настраивает портал под себя */
  theme: Theme;
}

/**
 * Сессия = (арендатор из Host) + (сотрудник из cookie).
 * В демо роль переключается в шапке; в бою сюда встаёт провайдер аутентификации,
 * а арендатор остаётся тем же, что определил middleware.
 */
export async function getSession(): Promise<Session> {
  const [h, c] = await Promise.all([headers(), cookies()]);

  const tenant = tenantBySlug(h.get("x-orbis-tenant") || c.get("orbis_tenant")?.value);
  const staff = usersOfTenant(tenant.id);
  const requested = c.get("orbis_user")?.value;

  const user =
    staff.find((u) => u.id === requested) ??
    staff.find((u) => u.role === "owner") ??
    staff[0] ??
    USERS[0];

  const requestedLocale = c.get("orbis_locale")?.value;
  const requestedTheme = c.get("orbis_theme")?.value;

  return {
    tenant,
    user,
    role: user.role,
    scope: roleDef(user.role).scope,
    host: h.get("x-orbis-host") ?? "",
    locale: isLocale(requestedLocale) ? requestedLocale : tenant.locale,
    theme: isTheme(requestedTheme) ? requestedTheme : "light",
  };
}
