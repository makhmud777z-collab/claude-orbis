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
  // «Администрирование» — одна строка без раскрытия: внутри код, а за ним
  // все настройки портала. Сотруднику этого пункта не видно вовсе.
  {
    key: "admin", href: "/admin", label: loc("Администрирование", "Boshqaruv"),
    icon: IconSettings, group: "admin", module: "admin",
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
 */
export function navFor(allowed: Set<Module>): NavEntry[] {
  return NAV.map((entry) => {
    const children = entry.children?.filter((c) => allowed.has(c.module));
    if (entry.children) {
      if (!children?.length) return null;
      return { ...entry, children, href: children[0].href };
    }
    return entry.module && allowed.has(entry.module) ? entry : null;
  }).filter((x): x is NavEntry => x !== null);
}

/** Все подпункты одним списком — меню закрепляет их в корень. */
export function navChildren(entries: NavEntry[]) {
  return entries.flatMap((e) => (e.children ?? []).map((c) => ({ ...c, parent: e.key, icon: e.icon })));
}
