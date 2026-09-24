import { randomInt } from "node:crypto";
import { hashPassword, newId, newInviteToken, usernameFrom, verifyPassword } from "./auth";
import { hydrate, saveTenant, saveUser, usernameTaken } from "./db";
import { TENANTS } from "./tenants";
import { USERS } from "./data/users";
import type { Role, Tenant, User } from "./types";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

hydrate(TENANTS, USERS);

function uniqueUsername(tenantId: string, name: string): string {
  const base = usernameFrom(name);
  let candidate = base;
  let n = 1;
  while (
    USERS.some((u) => u.tenantId === tenantId && u.username === candidate) ||
    usernameTaken(tenantId, candidate)
  ) {
    candidate = `${base}${++n}`;
  }
  return candidate;
}

/**
 * Новое агентство: владелец получает полные права сразу, без отдельного
 * шага «выдать права» — он и так один в новом портале. Дальше он
 * приглашает сотрудников уже с ролью по умолчанию (inviteEmployee).
 */
export function createTenant(input: {
  agencyName: string;
  slug: string;
  adminName: string;
  email: string;
  password: string;
  locale?: "ru" | "uz";
}): { tenant: Tenant; user: User } {
  const branchId = newId("b");
  const tenant: Tenant = {
    id: newId("t"),
    slug: input.slug,
    name: input.agencyName,
    legalName: input.agencyName,
    customDomain: null,
    customDomainStatus: "none",
    plan: "trial",
    edition: "crm",
    locale: input.locale ?? "ru",
    currency: "UZS",
    usdRate: 12900,
    rateUpdatedAt: new Date().toISOString().slice(0, 10),
    mark: input.agencyName.trim().slice(0, 1).toUpperCase() || "A",
    seatsUsed: 1,
    seatsLimit: 3,
    branches: [{ id: branchId, name: "Головной офис", city: "" }],
    adminPasscode: String(randomInt(1000, 10000)),
    createdAt: new Date().toISOString(),
    source: "signup",
  };

  const owner: User = {
    id: newId("u"),
    tenantId: tenant.id,
    name: input.adminName,
    role: "owner",
    email: input.email,
    phone: "",
    phone2: null,
    birthDate: "",
    branchId,
    title: "Владелец",
    status: "active",
    lastActiveAt: new Date().toISOString(),
    joinedAt: new Date().toISOString().slice(0, 10),
    username: uniqueUsername(tenant.id, input.adminName || input.email),
    passwordHash: hashPassword(input.password),
    inviteToken: null,
    inviteExpiresAt: null,
  };

  TENANTS.push(tenant);
  USERS.push(owner);
  saveTenant(tenant);
  saveUser(owner);

  return { tenant, user: owner };
}

/**
 * Приглашение сотрудника: запись создаётся сразу (видна в «Сотрудниках»
 * со статусом «приглашён»), пароль появится, когда сотрудник откроет
 * ссылку-приглашение. Почты нет — ссылку админ копирует и отправляет сам.
 */
export function inviteEmployee(input: {
  tenantId: string;
  name: string;
  email: string;
  title: string;
  role: Role;
  branchId: string;
}): User {
  const user: User = {
    id: newId("u"),
    tenantId: input.tenantId,
    name: input.name,
    role: input.role,
    email: input.email,
    phone: "",
    phone2: null,
    birthDate: "",
    branchId: input.branchId,
    title: input.title,
    status: "invited",
    lastActiveAt: new Date().toISOString(),
    joinedAt: new Date().toISOString().slice(0, 10),
    username: uniqueUsername(input.tenantId, input.name || input.email),
    passwordHash: null,
    inviteToken: newInviteToken(),
    inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
  };
  USERS.push(user);
  saveUser(user);
  return user;
}

export function inviteLinkPath(user: User): string | null {
  return user.inviteToken ? `/invite/${user.inviteToken}` : null;
}

export function userByInviteToken(token: string): User | undefined {
  return USERS.find((u) => u.inviteToken === token);
}

/** Принять приглашение: сотрудник задаёт свой пароль и входит впервые. */
export function acceptInvite(token: string, password: string): { user: User; tenant: Tenant } | null {
  const user = USERS.find((u) => u.inviteToken === token);
  if (!user) return null;
  if (!user.inviteExpiresAt || new Date(user.inviteExpiresAt).getTime() < Date.now()) return null;

  user.status = "active";
  user.passwordHash = hashPassword(password);
  user.inviteToken = null;
  user.inviteExpiresAt = null;
  saveUser(user);

  const tenant = TENANTS.find((t) => t.id === user.tenantId);
  if (!tenant) return null;
  return { user, tenant };
}

/** Вход сотрудника: логин + пароль в рамках уже определённого по Host арендатора. */
export function authenticate(input: { tenantId: string; username: string; password: string }): User | null {
  const login = input.username.trim().toLowerCase();
  const user = USERS.find(
    (u) => u.tenantId === input.tenantId && u.username?.toLowerCase() === login && u.status === "active",
  );
  if (!user || !verifyPassword(input.password, user.passwordHash)) return null;
  return user;
}
