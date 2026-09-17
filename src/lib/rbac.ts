import { loc, type Loc } from "./i18n";
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
  label: Loc;
  description: Loc;
  scope: Scope;
  permissions: Partial<Record<Module, Action[]>>;
}

const ALL: Action[] = ["view", "create", "edit", "delete", "export", "assign"];
const RW: Action[] = ["view", "create", "edit"];
const RO: Action[] = ["view"];

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
    label: loc("Директор", "Direktor"),
    description: loc(
      "Вся операционка и аналитика агентства, настройки без биллинга и домена.",
      "Butun operatsion ish va tahlil; sozlamalar, tarif va domendan tashqari.",
    ),
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
    label: loc("Руководитель филиала", "Filial rahbari"),
    description: loc(
      "Те же права, что у директора, но только по своему филиалу.",
      "Direktor bilan bir xil huquq, faqat o‘z filiali doirasida.",
    ),
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
    label: loc("Менеджер по продажам", "Sotuv menejeri"),
    description: loc(
      "Лиды и свои студенты: консультация, договор, передача куратору. Документы — только просмотр.",
      "Lidlar va o‘z talabalari: konsultatsiya, shartnoma, kuratorga topshirish. Hujjatlar — faqat ko‘rish.",
    ),
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
    label: loc("Куратор (оператор)", "Kurator (operator)"),
    description: loc(
      "Ведёт заявку от подбора вуза до выезда: подбор, документы, подача, переписка с вузом.",
      "Arizani tanlovdan jo‘nashgacha olib boradi: tanlov, hujjatlar, topshirish, yozishmalar.",
    ),
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
    label: loc("Специалист по документам", "Hujjatlar bo‘yicha mutaxassis"),
    description: loc(
      "Проверка, апостиль, переводы, сроки годности справок и сертификатов.",
      "Tekshiruv, apostil, tarjimalar, ma’lumotnoma va sertifikat muddatlari.",
    ),
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
    label: loc("Финансы", "Moliyachi"),
    description: loc(
      "Платежи, договоры, сверка оплат. Профили студентов — только чтение.",
      "To‘lovlar, shartnomalar, solishtirish. Talaba profillari — faqat o‘qish.",
    ),
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
    label: loc("Агент-партнёр", "Hamkor agent"),
    description: loc(
      "Внешний партнёр: видит только приведённых им студентов и статус их заявок.",
      "Tashqi hamkor: faqat o‘zi olib kelgan talabalarni va ularning holatini ko‘radi.",
    ),
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

export function roleLabel(role: Role): Loc {
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
