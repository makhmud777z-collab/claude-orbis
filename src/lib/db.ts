import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Tenant, User } from "./types";

/**
 * Постоянное хранилище для реальных агентств и сотрудников (регистрация,
 * приглашения, пароли). Демо-агентства из src/lib/data остаются моками —
 * это хранилище только для тех, кто прошёл /signup или /invite.
 *
 * Строки хранятся как JSON: тип Tenant/User уже описан в types.ts и меняется
 * чаще, чем нужно было бы менять SQL-схему под каждое новое поле. Когда
 * придёт время реального Postgres, эта колонка ляжет в JSONB без миграции.
 */

const DB_PATH = process.env.ORBIS_DB_PATH || join(process.cwd(), "data", "orbis.sqlite");

let instance: DatabaseSync | null = null;

function db(): DatabaseSync {
  if (instance) return instance;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  instance = new DatabaseSync(DB_PATH);
  instance.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      username TEXT NOT NULL,
      invite_token TEXT,
      json TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_username ON users(tenant_id, username);
    CREATE INDEX IF NOT EXISTS users_invite_token ON users(invite_token);
  `);
  return instance;
}

export function saveTenant(tenant: Tenant) {
  db()
    .prepare("INSERT OR REPLACE INTO tenants (id, slug, json) VALUES (?, ?, ?)")
    .run(tenant.id, tenant.slug, JSON.stringify(tenant));
}

export function saveUser(user: User) {
  db()
    .prepare(
      "INSERT OR REPLACE INTO users (id, tenant_id, username, invite_token, json) VALUES (?, ?, ?, ?, ?)",
    )
    .run(user.id, user.tenantId, user.username ?? "", user.inviteToken ?? null, JSON.stringify(user));
}

export function loadPersistedTenants(): Tenant[] {
  const rows = db().prepare("SELECT json FROM tenants").all() as { json: string }[];
  return rows.map((r) => JSON.parse(r.json) as Tenant);
}

export function loadPersistedUsers(): User[] {
  const rows = db().prepare("SELECT json FROM users").all() as { json: string }[];
  return rows.map((r) => JSON.parse(r.json) as User);
}

export function usernameTaken(tenantId: string, username: string): boolean {
  const row = db()
    .prepare("SELECT 1 FROM users WHERE tenant_id = ? AND username = ?")
    .get(tenantId, username);
  return Boolean(row);
}

/**
 * Подмешивает реальные агентства/сотрудников в общие массивы TENANTS/USERS
 * ровно один раз за жизнь процесса. Вызывается и из session.ts (обычные
 * запросы), и из onboarding.ts (регистрация/приглашение/вход) — оба пути
 * должны видеть одни и те же строки до первого обращения к массивам.
 */
let hydrated = false;
export function hydrate(tenants: Tenant[], users: User[]) {
  if (hydrated) return;
  hydrated = true;
  tenants.push(...loadPersistedTenants());
  users.push(...loadPersistedUsers());
}
