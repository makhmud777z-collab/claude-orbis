import { cookies, headers } from "next/headers";
import { verifySessionToken } from "./auth";
import { hydrate } from "./db";
import { USERS, usersOfTenant } from "./data/users";
import { isLocale, type Locale } from "./i18n";
import { isTheme, type Theme } from "./theme";
import { roleDef, type Scope } from "./rbac";
import { TENANTS, tenantBySlug } from "./tenants";
import type { Role, Tenant, User } from "./types";

/*
 * Реальные агентства и сотрудники живут в SQLite (см. db.ts) и подмешиваются
 * в те же массивы, что читает весь остальной код (tenantBySlug, usersOfTenant
 * и далее) — один раз за процесс, через db.hydrate(). session.ts — не
 * единственный вызывающий (onboarding.ts дёргает то же самое перед
 * регистрацией/входом), но именно этот модуль гарантированно не попадает в
 * клиентскую сборку (next/headers работает только на сервере): подгрузка
 * данных не может стоять в самих tenants.ts/data/users.ts, потому что их
 * читают клиентские компоненты (DomainCard, SectionFilter), а Turbopack тогда
 * пытается собрать node:sqlite для браузера.
 */

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
  /**
   * Сотрудник подтверждён подписанной кукой (реальный вход или демо-переключатель,
   * который её тоже подписывает). false — куки не было или она не прошла проверку:
   * для демо-агентства это подставляет владельца, а для реального — экран входа.
   */
  authenticated: boolean;
}

/**
 * Сессия = (арендатор из Host) + (сотрудник из подписанной куки).
 *
 * У демо-агентств (source: "seed") нет пароля — это витрина продукта, и не
 * подтверждённая кука тихо подставляет владельца, как раньше. У реальных
 * агентств (source: "signup") это уже не демонстрация, а чьи-то данные:
 * не подтверждённая кука тоже подставляет владельца, чтобы не уронить
 * рендер, но authenticated=false — вызывающий слой (layout) решает,
 * пускать дальше или отправлять на /login.
 */
export async function getSession(): Promise<Session> {
  hydrate(TENANTS, USERS);
  const [h, c] = await Promise.all([headers(), cookies()]);

  const tenant = tenantBySlug(h.get("x-orbis-tenant") || c.get("orbis_tenant")?.value);
  const staff = usersOfTenant(tenant.id);
  const verifiedUserId = verifySessionToken(c.get("orbis_user")?.value);

  const verifiedUser = verifiedUserId ? staff.find((u) => u.id === verifiedUserId) : undefined;
  const user =
    verifiedUser ??
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
    authenticated: Boolean(verifiedUser),
  };
}
