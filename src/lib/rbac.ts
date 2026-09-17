import { loc, type Loc } from "./i18n";
import { permissionOverrides } from "./store";
import type { Role } from "./types";

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
  team: loc("Сотрудники", "Xodimlar"),
  structure: loc("Структура компании", "Kompaniya tuzilmasi"),
  staffReports: loc("Отчётность", "Hisobot"),
  finance: loc("Финансы", "Moliya"),
  admin: loc("Администрирование", "Boshqaruv"),
  settings: loc("Настройки", "Sozlamalar"),
};

export const ACTION_LABEL: Record<Action, Loc> = {
  view: loc("Просмотр", "Ko‘rish"),
  create: loc("Создание", "Yaratish"),
  edit: loc("Изменение", "O‘zgartirish"),
  delete: loc("Удаление", "O‘chirish"),
  export: loc("Выгрузка", "Yuklab olish"),
  assign: loc("Назначение", "Tayinlash"),
};

export const ROLES: RoleDefinition[] = [
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
      team: ALL, structure: ALL, staffReports: ALL, finance: ALL, admin: ALL, settings: ALL,
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
      deadlines: ALL, team: [...RW, "assign"], structure: RW, staffReports: [...RO, "export"],
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
      tasks: [...RW, "assign", "delete"], projects: RW, deadlines: RO,
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
      documents: RO, tasks: RW, projects: RO, deadlines: RO,
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
      documents: RW, tasks: RW, projects: RO, deadlines: RO,
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
      tasks: RW, projects: RO, deadlines: RO,
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
      tasks: RO, deadlines: RO, staffReports: RO,
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

const BY_KEY = new Map(ROLES.map((r) => [r.key, r]));

export function roleDef(role: Role): RoleDefinition {
  const def = BY_KEY.get(role);
  if (!def) throw new Error(`Неизвестная роль: ${role}`);
  return def;
}

export function roleLabel(role: Role): Loc {
  return roleDef(role).label;
}

/**
 * Права роли с учётом настроек агентства: администратор меняет матрицу
 * в разделе «Права доступа», её переопределения лежат в хранилище.
 */
export function effectivePermissions(
  tenantId: string,
  role: Role,
): Partial<Record<Module, Action[]>> {
  return { ...roleDef(role).permissions, ...(permissionOverrides(tenantId)[role] ?? {}) };
}

/** Проверка по умолчанию, без настроек агентства. */
export function can(role: Role, module: Module, action: Action = "view"): boolean {
  return roleDef(role).permissions[module]?.includes(action) ?? false;
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
