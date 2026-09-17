import type { Loc } from "@/lib/i18n";
import { S } from "@/lib/strings";
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
  label: Loc;
  icon: typeof IconDashboard;
  group: "work" | "base" | "admin";
}

export const NAV: NavEntry[] = [
  { module: "dashboard", href: "/", label: S.nav.dashboard, icon: IconDashboard, group: "work" },
  { module: "students", href: "/students", label: S.nav.students, icon: IconStudents, group: "work" },
  { module: "applications", href: "/applications", label: S.nav.applications, icon: IconApplications, group: "work" },
  { module: "documents", href: "/documents", label: S.nav.documents, icon: IconDocuments, group: "work" },
  { module: "tasks", href: "/tasks", label: S.nav.tasks, icon: IconTasks, group: "work" },
  { module: "deadlines", href: "/deadlines", label: S.nav.deadlines, icon: IconDeadline, group: "work" },
  { module: "universities", href: "/universities", label: S.nav.universities, icon: IconUniversity, group: "base" },
  { module: "finance", href: "/finance", label: S.nav.finance, icon: IconFinance, group: "base" },
  { module: "team", href: "/team", label: S.nav.team, icon: IconTeam, group: "admin" },
  { module: "settings", href: "/settings", label: S.nav.settings, icon: IconSettings, group: "admin" },
];

export const GROUP_LABEL: Record<NavEntry["group"], Loc> = {
  work: S.nav.groupWork,
  base: S.nav.groupBase,
  admin: S.nav.groupAdmin,
};
