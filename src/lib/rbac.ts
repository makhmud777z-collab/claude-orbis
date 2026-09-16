import type { Role } from "./types";

/** Модули системы = разделы навигации + объекты прав. */
export type Module =
  | "dashboard"
  | "students"
  | "applications"
  | "universities"
  | "documents"
  | "tasks"
  | "deadlines"
  | "team"
  | "finance"
  | "settings";

export type Action = "view" | "create" | "edit" | "delete" | "export" | "assign";

/** Область видимости данных для роли. */
export type Scope = "tenant" | "branch" | "own";

export interface RoleDefinition {
  key: Role;
  label: string;
  description: string;
  scope: Scope;
  permissions: Partial<Record<Module, Action[]>>;
}

const ALL: Action[] = ["view", "create", "edit", "delete", "export", "assign"];
const RW: Action[] = ["view", "create", "edit"];
const RO: Action[] = ["view"];

export const ROLES: RoleDefinition[] = [
  {
    key: "owner",
    label: "Владелец",
    description:
      "Полный доступ, включая тариф, домен агентства и удаление данных.",
    scope: "tenant",
    permissions: {
      dashboard: RO,
      students: ALL,
      applications: ALL,
      universities: ALL,
      documents: ALL,
      tasks: ALL,
      deadlines: ALL,
      team: ALL,
      finance: ALL,
      settings: ALL,
    },
  },
  {
    key: "director",
    label: "Директор",
    description:
      "Вся операционка и аналитика агентства, настройки без биллинга и домена.",
    scope: "tenant",
    permissions: {
      dashboard: RO,
      students: ALL,
      applications: ALL,
      universities: [...RW, "export"],
      documents: ALL,
      tasks: ALL,
      deadlines: ALL,
      team: [...RW, "assign"],
      finance: [...RO, "export"],
      settings: RW,
    },
  },
  {
    key: "branch_manager",
    label: "Руководитель филиала",
    description: "Те же права, что у директора, но только по своему филиалу.",
    scope: "branch",
    permissions: {
      dashboard: RO,
      students: [...RW, "assign", "export"],
      applications: [...RW, "assign", "export"],
      universities: RO,
      documents: RW,
      tasks: [...RW, "assign", "delete"],
      deadlines: RO,
      team: RO,
      finance: RO,
      settings: RO,
    },
  },
  {
    key: "sales_manager",
    label: "Менеджер по продажам",
    description:
      "Работает с лидами и своими студентами: первичная консультация, договор, передача куратору.",
    scope: "own",
    permissions: {
      dashboard: RO,
      students: RW,
      applications: RW,
      universities: RO,
      documents: RO,
      tasks: RW,
      deadlines: RO,
    },
  },
  {
    key: "case_manager",
    label: "Куратор (оператор)",
    description:
      "Ведёт заявку от подбора вуза до выезда: подбор, документы, подача, переписка с вузом.",
    scope: "own",
    permissions: {
      dashboard: RO,
      students: RW,
      applications: RW,
      universities: RO,
      documents: RW,
      tasks: RW,
      deadlines: RO,
    },
  },
  {
    key: "document_specialist",
    label: "Специалист по документам",
    description:
      "Проверка, апостиль, переводы, сроки годности справок и сертификатов.",
    scope: "branch",
    permissions: {
      dashboard: RO,
      students: RO,
      applications: RO,
      documents: [...RW, "delete"],
      tasks: RW,
      deadlines: RO,
    },
  },
  {
    key: "finance",
    label: "Финансы",
    description: "Платежи, договоры, сверка оплат. Профили студентов — только чтение.",
    scope: "tenant",
    permissions: {
      dashboard: RO,
      students: RO,
      applications: RO,
      finance: [...RW, "export"],
      tasks: RO,
      deadlines: RO,
    },
  },
  {
    key: "partner",
    label: "Агент-партнёр",
    description:
      "Внешний партнёр: видит только приведённых им студентов и статус их заявок.",
    scope: "own",
    permissions: {
      students: RO,
      applications: RO,
      tasks: RO,
    },
  },
];

const BY_KEY = new Map(ROLES.map((r) => [r.key, r]));

export function roleDef(role: Role): RoleDefinition {
  const def = BY_KEY.get(role);
  if (!def) throw new Error(`Неизвестная роль: ${role}`);
  return def;
}

export function roleLabel(role: Role): string {
  return roleDef(role).label;
}

export function can(role: Role, module: Module, action: Action = "view"): boolean {
  return roleDef(role).permissions[module]?.includes(action) ?? false;
}

export function visibleModules(role: Role): Module[] {
  const def = roleDef(role);
  return (Object.keys(def.permissions) as Module[]).filter((m) =>
    can(role, m, "view"),
  );
}
