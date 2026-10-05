import { loc, type Loc } from "./i18n";
import { permissionOverrides, putRoles, storedRoles } from "./store";
import type { Role, TenantRole } from "./types";

/** Модули системы = разделы навигации + объекты прав, как в Битриксе. */
export type Module =
  | "dashboard"
  | "leads"
  | "deals"
  | "contacts"
  | "crmSettings"
  | "universities"
  | "documents"
  | "tasks"
  | "projects"
  | "deadlines"
  | "calendar"
  | "team"
  | "structure"
  | "staffReports"
  | "finance"
  | "admin"
  | "settings";

export type Action = "view" | "create" | "edit" | "delete" | "export" | "assign";

/** Область видимости данных для роли. */
export type Scope = "tenant" | "branch" | "own";

export interface RoleDefinition {
  key: Role;
  /** стартовый набор — его получает новое агентство */
  label: Loc;
  description: Loc;
  scope: Scope;
  permissions: Partial<Record<Module, Action[]>>;
}

const ALL: Action[] = ["view", "create", "edit", "delete", "export", "assign"];
const RW: Action[] = ["view", "create", "edit"];
const RO: Action[] = ["view"];

export const MODULE_LABEL: Record<Module, Loc> = {
  dashboard: loc("Дашборд", "Boshqaruv paneli"),
  leads: loc("Лиды", "Lidlar"),
  deals: loc("Сделки", "Bitimlar"),
  contacts: loc("Контакты", "Kontaktlar"),
  crmSettings: loc("Настройки CRM", "CRM sozlamalari"),
  universities: loc("Каталог вузов", "Universitetlar katalogi"),
  documents: loc("Документы", "Hujjatlar"),
  tasks: loc("Задачи", "Vazifalar"),
  projects: loc("Проекты", "Loyihalar"),
  deadlines: loc("Дедлайны", "Muddatlar"),
  calendar: loc("Календарь", "Kalendar"),
  team: loc("Сотрудники", "Xodimlar"),
  structure: loc("Структура компании", "Kompaniya tuzilmasi"),
  staffReports: loc("Отчётность", "Hisobot"),
  finance: loc("Финансы", "Moliya"),
  admin: loc("Администрирование", "Boshqaruv"),
  settings: loc("Настройки", "Sozlamalar"),
};

/**
 * Разделы матрицы прав. Группировка нужна, чтобы экран читался: семнадцать
 * модулей подряд — это стена, а по четыре-пять под заголовком видно сразу.
 */
export const MODULE_GROUPS: { id: string; title: Loc; modules: Module[] }[] = [
  { id: "general", title: loc("Общее", "Umumiy"), modules: ["dashboard", "universities"] },
  { id: "crm", title: loc("CRM", "CRM"), modules: ["leads", "deals", "contacts", "crmSettings"] },
  { id: "work", title: loc("Документы и задачи", "Hujjatlar va vazifalar"),
    modules: ["documents", "tasks", "projects", "deadlines", "calendar"] },
  { id: "people", title: loc("Люди и отчёты", "Odamlar va hisobotlar"),
    modules: ["team", "structure", "staffReports"] },
  { id: "portal", title: loc("Портал", "Portal"), modules: ["finance", "admin", "settings"] },
];

/**
 * Какие действия вообще имеют смысл в разделе. Показывать «Назначение»
 * у дашборда или «Выгрузку» у настроек — предлагать галочку, которая
 * ничего не делает.
 */
export const MODULE_ACTIONS: Record<Module, Action[]> = {
  dashboard: ["view"],
  leads: ["view", "create", "edit", "delete", "export"],
  deals: ["view", "create", "edit", "delete", "export"],
  contacts: ["view", "create", "edit", "delete", "export"],
  crmSettings: ["view", "edit"],
  universities: ["view", "create", "edit", "delete", "export"],
  documents: ["view", "create", "edit", "delete"],
  tasks: ["view", "create", "edit", "delete", "assign"],
  projects: ["view", "create", "edit", "delete"],
  deadlines: ["view", "edit"],
  calendar: ["view", "create", "edit", "delete"],
  team: ["view", "create", "edit", "assign"],
  structure: ["view", "edit"],
  staffReports: ["view", "export"],
  finance: ["view", "edit", "export"],
  admin: ["view", "edit"],
  settings: ["view", "edit"],
};

export const ACTION_LABEL: Record<Action, Loc> = {
  view: loc("Просмотр", "Ko‘rish"),
  create: loc("Создание", "Yaratish"),
  edit: loc("Изменение", "O‘zgartirish"),
  delete: loc("Удаление", "O‘chirish"),
  export: loc("Выгрузка", "Yuklab olish"),
  assign: loc("Назначение", "Tayinlash"),
};

/**
 * Стартовый набор ролей. Это шаблон для нового агентства, а не список
 * на все времена: дальше агентство правит роли само в «Правах доступа».
 */
export const SEED_ROLES: RoleDefinition[] = [
  {
    key: "owner",
    label: loc("Владелец", "Egasi"),
    description: loc(
      "Полный доступ, включая тариф, домен агентства и удаление данных.",
      "To‘liq huquq: tarif, agentlik domeni va ma’lumotlarni o‘chirish.",
    ),
    scope: "tenant",
    permissions: {
      dashboard: RO, leads: ALL, deals: ALL, contacts: ALL, crmSettings: ALL,
      universities: ALL, documents: ALL, tasks: ALL, projects: ALL, deadlines: ALL,
      calendar: ALL, team: ALL, structure: ALL, staffReports: ALL, finance: ALL,
      admin: ALL, settings: ALL,
    },
  },
  {
    key: "director",
    label: loc("Директор", "Direktor"),
    description: loc(
      "Вся операционка и аналитика агентства, настройки без биллинга и домена.",
      "Butun operatsion ish va tahlil; sozlamalar, tarif va domendan tashqari.",
    ),
    scope: "tenant",
    permissions: {
      dashboard: RO, leads: ALL, deals: ALL, contacts: ALL, crmSettings: ALL,
      universities: [...RW, "export"], documents: ALL, tasks: ALL, projects: ALL,
      deadlines: ALL, calendar: ALL, team: [...RW, "assign"], structure: RW,
      staffReports: [...RO, "export"],
      finance: [...RO, "export"], admin: RW, settings: RW,
    },
  },
  {
    key: "branch_manager",
    label: loc("Руководитель филиала", "Filial rahbari"),
    description: loc(
      "Те же права, что у директора, но только по своему филиалу.",
      "Direktor bilan bir xil huquq, faqat o‘z filiali doirasida.",
    ),
    scope: "branch",
    permissions: {
      dashboard: RO, leads: [...RW, "assign"], deals: [...RW, "assign", "export"],
      contacts: [...RW, "assign", "export"], universities: RO, documents: RW,
      tasks: [...RW, "assign", "delete"], projects: RW, deadlines: RO, calendar: ALL,
      team: RO, structure: RO, staffReports: RO, finance: RO, settings: RO,
    },
  },
  {
    key: "sales_manager",
    label: loc("Менеджер по продажам", "Sotuv menejeri"),
    description: loc(
      "Лиды и свои контакты: обращение, квалификация, договор, передача куратору. Документы — только просмотр.",
      "Lidlar va o‘z kontaktlari: murojaat, malaka, shartnoma, kuratorga topshirish.",
    ),
    scope: "own",
    permissions: {
      dashboard: RO, leads: RW, deals: RW, contacts: RW, universities: RO,
      documents: RO, tasks: RW, projects: RO, deadlines: RO, calendar: ALL,
    },
  },
  {
    key: "case_manager",
    label: loc("Куратор (оператор)", "Kurator (operator)"),
    description: loc(
      "Ведёт сделку от подбора вуза до выезда: подбор, документы, подача, переписка с вузом.",
      "Bitimni tanlovdan jo‘nashgacha olib boradi.",
    ),
    scope: "own",
    permissions: {
      dashboard: RO, leads: RO, deals: RW, contacts: RW, universities: RO,
      documents: RW, tasks: RW, projects: RO, deadlines: RO, calendar: ALL,
    },
  },
  {
    key: "document_specialist",
    label: loc("Специалист по документам", "Hujjatlar bo‘yicha mutaxassis"),
    description: loc(
      "Проверка, апостиль, переводы, сроки годности справок и сертификатов.",
      "Tekshiruv, apostil, tarjimalar, hujjat muddatlari.",
    ),
    scope: "branch",
    permissions: {
      dashboard: RO, deals: RO, contacts: RO, documents: [...RW, "delete"],
      tasks: RW, projects: RO, deadlines: RO, calendar: ALL,
    },
  },
  {
    key: "finance",
    label: loc("Финансы", "Moliyachi"),
    description: loc(
      "Платежи, договоры, сверка оплат. Карточки контактов — только чтение.",
      "To‘lovlar, shartnomalar, solishtirish. Kontaktlar — faqat o‘qish.",
    ),
    scope: "tenant",
    permissions: {
      dashboard: RO, deals: RO, contacts: RO, finance: [...RW, "export"],
      tasks: RO, deadlines: RO, calendar: ALL, staffReports: RO,
    },
  },
  {
    key: "partner",
    label: loc("Агент-партнёр", "Hamkor agent"),
    description: loc(
      "Внешний партнёр: видит только приведённых им студентов и статус их сделок.",
      "Tashqi hamkor: faqat o‘zi olib kelgan talabalarni ko‘radi.",
    ),
    scope: "own",
    permissions: { contacts: RO, deals: RO, tasks: RO },
  },
];

/** Владелец — единственная роль, которую агентство не правит. */
export const OWNER_ROLE_ID = "owner";

/** Минимум для роли, которой больше нет: вход есть, данных не видно. */
const FALLBACK: TenantRole = {
  id: "unknown",
  tenantId: "",
  name: loc("Роль удалена", "Rol o‘chirilgan"),
  scope: "own",
  permissions: {},
};

function seedFor(tenantId: string): TenantRole[] {
  // Галочки, которые агентство уже меняло в прежней матрице, переносим
  // как есть: переезд не должен ничего отобрать у работающих агентств.
  const overrides = permissionOverrides(tenantId);
  return SEED_ROLES.map((r) => ({
    id: r.key,
    tenantId,
    name: r.label,
    description: r.description,
    scope: r.scope,
    permissions: { ...r.permissions, ...(overrides[r.key] ?? {}) },
    system: r.key === OWNER_ROLE_ID,
  }));
}

/** Роли агентства. Пока агентство их не правило — стартовый набор. */
export function rolesOf(tenantId: string): TenantRole[] {
  return storedRoles(tenantId) ?? seedFor(tenantId);
}

/** Первая правка переносит стартовый набор в хранилище целиком. */
function materialize(tenantId: string): TenantRole[] {
  const existing = storedRoles(tenantId);
  if (existing) return existing;
  const fresh = seedFor(tenantId);
  putRoles(tenantId, fresh);
  return fresh;
}

/**
 * Роль по идентификатору. Не бросает: роль могли удалить, пока сотрудник
 * сидел на странице, и падать из-за этого весь портал не должен.
 */
export function roleOf(tenantId: string, role: Role): TenantRole {
  return rolesOf(tenantId).find((r) => r.id === role) ?? FALLBACK;
}

/** Название роли: у стартовых — перевод, у заведённых агентством — строка. */
export function roleTitle(name: string | Loc, t: (l: Loc) => string): string {
  return typeof name === "string" ? name : t(name);
}

export function roleLabel(tenantId: string, role: Role): string | Loc {
  return roleOf(tenantId, role).name;
}

export function scopeOf(tenantId: string, role: Role): Scope {
  return roleOf(tenantId, role).scope;
}

/* ── правка ролей ────────────────────────────────────────────── */

export function createRole(tenantId: string, name: string): TenantRole {
  const roles = materialize(tenantId);
  const role: TenantRole = {
    id: `r_${Date.now().toString(36)}_${roles.length}`,
    tenantId,
    name,
    scope: "own",
    // Без дашборда новая роль упирается в пустой портал сразу после входа.
    permissions: { dashboard: ["view"] },
  };
  putRoles(tenantId, [...roles, role]);
  return role;
}

function edit(tenantId: string, role: Role, patch: (r: TenantRole) => TenantRole) {
  const roles = materialize(tenantId);
  putRoles(
    tenantId,
    roles.map((r) => (r.id === role && !r.system ? patch(r) : r)),
  );
}

export function renameRole(tenantId: string, role: Role, name: string) {
  edit(tenantId, role, (r) => ({ ...r, name }));
}

export function setRoleScope(tenantId: string, role: Role, scope: Scope) {
  edit(tenantId, role, (r) => ({ ...r, scope }));
}

/** Один тумблер: модуль + действие. */
export function setRoleAction(
  tenantId: string, role: Role, module: Module, action: Action, on: boolean,
) {
  edit(tenantId, role, (r) => {
    const current = r.permissions[module] ?? [];
    const next = on
      ? current.includes(action) ? current : [...current, action]
      : current.filter((a) => a !== action);
    // Сняли просмотр — остальные действия по разделу теряют смысл.
    const cleaned = on || action !== "view" ? next : [];
    return { ...r, permissions: { ...r.permissions, [module]: cleaned } };
  });
}

/** Роль с сотрудниками не удаляется: вызывающий проверяет, что их нет. */
export function removeRole(tenantId: string, role: Role) {
  const roles = materialize(tenantId);
  putRoles(tenantId, roles.filter((r) => r.id !== role || r.system));
}

/* ── проверки ────────────────────────────────────────────────── */

/** Права роли агентства. */
export function effectivePermissions(
  tenantId: string,
  role: Role,
): Partial<Record<Module, Action[]>> {
  return roleOf(tenantId, role).permissions as Partial<Record<Module, Action[]>>;
}

/** Проверка с учётом настроек агентства — её и следует использовать в разделах. */
export function allow(
  tenantId: string, role: Role, module: Module, action: Action = "view",
): boolean {
  return effectivePermissions(tenantId, role)[module]?.includes(action) ?? false;
}

export function visibleModules(tenantId: string, role: Role): Module[] {
  const perms = effectivePermissions(tenantId, role);
  return (Object.keys(perms) as Module[]).filter((m) => perms[m]?.includes("view"));
}
