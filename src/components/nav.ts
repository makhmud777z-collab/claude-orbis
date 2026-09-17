import type { Loc } from "@/lib/i18n";
import { loc } from "@/lib/i18n";
import type { Module } from "@/lib/rbac";
import {
  IconApplications, IconCalendar, IconDashboard, IconDeadline, IconDocuments,
  IconFinance, IconSettings, IconTasks, IconTeam, IconUniversity,
} from "./icons";

export interface NavChild {
  href: string;
  label: Loc;
  module: Module;
}

export interface NavEntry {
  key: string;
  href: string;
  label: Loc;
  icon: typeof IconDashboard;
  group: "work" | "base" | "admin";
  /** модуль самого пункта; у раздела-контейнера его нет — права берутся у детей */
  module?: Module;
  children?: NavChild[];
}

/** Структура меню повторяет портал Битрикс24: разделы с раскрывающимися пунктами. */
export const NAV: NavEntry[] = [
  {
    key: "dashboard", href: "/", label: loc("Дашборд", "Boshqaruv paneli"),
    icon: IconDashboard, group: "work", module: "dashboard",
  },
  {
    key: "crm", href: "/crm/deals", label: loc("CRM", "CRM"),
    icon: IconApplications, group: "work",
    children: [
      { href: "/crm/leads", label: loc("Лиды", "Lidlar"), module: "leads" },
      { href: "/crm/deals", label: loc("Сделки", "Bitimlar"), module: "deals" },
      { href: "/crm/contacts", label: loc("Контакты", "Kontaktlar"), module: "contacts" },
      { href: "/crm/channels", label: loc("Каналы продаж", "Sotuv kanallari"), module: "crmSettings" },
      { href: "/crm/settings", label: loc("Настройки CRM", "CRM sozlamalari"), module: "crmSettings" },
    ],
  },
  {
    key: "tasks", href: "/tasks", label: loc("Задачи и проекты", "Vazifalar va loyihalar"),
    icon: IconTasks, group: "work", module: "tasks",
    children: [
      { href: "/tasks", label: loc("Задачи", "Vazifalar"), module: "tasks" },
      { href: "/tasks/projects", label: loc("Проекты", "Loyihalar"), module: "projects" },
      { href: "/tasks/reports", label: loc("Отчёты", "Hisobotlar"), module: "tasks" },
    ],
  },
  {
    key: "documents", href: "/documents", label: loc("Документы", "Hujjatlar"),
    icon: IconDocuments, group: "work", module: "documents",
  },
  {
    key: "calendar", href: "/calendar", label: loc("Календарь", "Kalendar"),
    icon: IconCalendar, group: "work", module: "calendar",
  },
  {
    key: "deadlines", href: "/deadlines", label: loc("Дедлайны", "Muddatlar"),
    icon: IconDeadline, group: "work", module: "deadlines",
  },
  {
    key: "universities", href: "/universities", label: loc("Каталог вузов", "Universitetlar katalogi"),
    icon: IconUniversity, group: "base", module: "universities",
    children: [
      { href: "/universities", label: loc("Каталог", "Katalog"), module: "universities" },
      { href: "/universities/compare", label: loc("Шорт-лист", "Qisqa ro‘yxat"), module: "universities" },
    ],
  },
  {
    key: "finance", href: "/finance", label: loc("Финансы", "Moliya"),
    icon: IconFinance, group: "base", module: "finance",
  },
  {
    key: "team", href: "/team", label: loc("Сотрудники", "Xodimlar"),
    icon: IconTeam, group: "admin", module: "team",
    children: [
      { href: "/team", label: loc("Сотрудники", "Xodimlar"), module: "team" },
      { href: "/team/structure", label: loc("Структура компании", "Kompaniya tuzilmasi"), module: "structure" },
      { href: "/team/reports", label: loc("Отчётность", "Hisobot"), module: "staffReports" },
    ],
  },
  {
    key: "admin", href: "/admin/users", label: loc("Администрирование", "Boshqaruv"),
    icon: IconSettings, group: "admin",
    children: [
      { href: "/admin/users", label: loc("Пользователи", "Foydalanuvchilar"), module: "admin" },
      { href: "/admin/permissions", label: loc("Права доступа", "Kirish huquqlari"), module: "admin" },
      { href: "/settings", label: loc("Настройки портала", "Portal sozlamalari"), module: "settings" },
    ],
  },
  {
    key: "settings", href: "/settings", label: loc("Настройки", "Sozlamalar"),
    icon: IconSettings, group: "admin", module: "settings",
  },
];

export const GROUP_LABEL: Record<NavEntry["group"], Loc> = {
  work: loc("Операционка", "Kundalik ish"),
  base: loc("База знаний", "Bilimlar bazasi"),
  admin: loc("Агентство", "Agentlik"),
};

/**
 * Пункты меню для сотрудника: пересечение прав роли и модулей версии продукта.
 * Раздел-контейнер остаётся, если доступен хотя бы один его пункт.
 * Отдельный пункт «Настройки» показывается только там, где нет раздела
 * «Администрирование» — иначе портал дублировал бы одну и ту же страницу.
 */
export function navFor(allowed: Set<Module>): NavEntry[] {
  const visible = NAV.map((entry) => {
    const children = entry.children?.filter((c) => allowed.has(c.module));
    if (entry.children) {
      if (!children?.length) return null;
      return { ...entry, children, href: children[0].href };
    }
    return entry.module && allowed.has(entry.module) ? entry : null;
  }).filter((x): x is NavEntry => x !== null);

  const hasAdmin = visible.some((e) => e.key === "admin");
  return visible.filter((e) => !(hasAdmin && e.key === "settings"));
}
