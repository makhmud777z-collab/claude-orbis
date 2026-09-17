import { cookies } from "next/headers";
import { passcodeOverride } from "./store";
import type { Tenant } from "./types";

/**
 * Замок на разделе «Администрирование».
 *
 * Всё, что настраивает портал — воронки, каналы, права, пользователи,
 * домен, тариф, — живёт за одним входом с кодом. Менеджер и оператор
 * работают в портале и не видят ни одной настройки: так меньше шансов
 * сломать воронку случайным кликом, а сопровождение остаётся у владельца.
 *
 * Код хранится у агентства (`Tenant.adminPasscode`) и меняется в самом
 * разделе. Сессия открытого замка живёт в cookie до закрытия браузера.
 */
export const ADMIN_COOKIE = "orbis_admin";

/** Код по умолчанию для демо-агентств; настоящий задаётся в настройках. */
export const DEFAULT_PASSCODE = "7777";

export function passcodeOf(tenant: Tenant): string {
  return (passcodeOverride(tenant.id) ?? tenant.adminPasscode)?.trim() || DEFAULT_PASSCODE;
}

/** Замок открыт, если в cookie лежит отметка ровно для этого агентства. */
export async function adminUnlocked(tenantId: string): Promise<boolean> {
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === tenantId;
}

/**
 * Код верный? Сравнение без учёта пробелов по краям: человек набирает код
 * на телефоне, и лишний пробел — не повод не пустить его в свой портал.
 */
export function passcodeMatches(tenant: Tenant, input: string): boolean {
  return input.trim() === passcodeOf(tenant);
}
