import type { Module } from "@/lib/rbac";
import {
  IconApplications,
  IconDashboard,
  IconDeadline,
  IconDocuments,
  IconFinance,
  IconSettings,
  IconStudents,
  IconTasks,
  IconTeam,
  IconUniversity,
} from "./icons";

export interface NavEntry {
  module: Module;
  href: string;
  label: string;
  icon: typeof IconDashboard;
  group: "work" | "base" | "admin";
}

export const NAV: NavEntry[] = [
  { module: "dashboard", href: "/", label: "Дашборд", icon: IconDashboard, group: "work" },
  { module: "students", href: "/students", label: "Студенты", icon: IconStudents, group: "work" },
  { module: "applications", href: "/applications", label: "Заявки", icon: IconApplications, group: "work" },
  { module: "documents", href: "/documents", label: "Документы", icon: IconDocuments, group: "work" },
  { module: "tasks", href: "/tasks", label: "Задачи", icon: IconTasks, group: "work" },
  { module: "deadlines", href: "/deadlines", label: "Дедлайны", icon: IconDeadline, group: "work" },
  { module: "universities", href: "/universities", label: "Каталог вузов", icon: IconUniversity, group: "base" },
  { module: "finance", href: "/finance", label: "Финансы", icon: IconFinance, group: "base" },
  { module: "team", href: "/team", label: "Сотрудники", icon: IconTeam, group: "admin" },
  { module: "settings", href: "/settings", label: "Настройки", icon: IconSettings, group: "admin" },
];

export const GROUP_LABEL: Record<NavEntry["group"], string> = {
  work: "Операционка",
  base: "База знаний",
  admin: "Агентство",
};
