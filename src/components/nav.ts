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

export interface NavChild {
  href: string;
  label: Loc;
}

export interface NavEntry {
  module: Module;
  href: string;
  label: Loc;
  icon: typeof IconDashboard;
  group: "work" | "base" | "admin";
  /** быстрые срезы раздела: раскрываются под пунктом меню */
  children?: NavChild[];
}

export const NAV: NavEntry[] = [
  { module: "dashboard", href: "/", label: S.nav.dashboard, icon: IconDashboard, group: "work" },
  {
    module: "students",
    href: "/students",
    label: S.nav.students,
    icon: IconStudents,
    group: "work",
    children: [
      { href: "/students?status=lead", label: S.students.filterLead },
      { href: "/students?status=active", label: S.students.filterActive },
      { href: "/students?status=enrolled", label: S.students.filterEnrolled },
    ],
  },
  {
    module: "applications",
    href: "/applications",
    label: S.nav.applications,
    icon: IconApplications,
    group: "work",
    children: [
      { href: "/applications?stage=documents", label: S.applications.collectingShort },
      { href: "/applications?stage=submitted", label: S.applications.submittedShort },
      { href: "/applications?stage=visa", label: S.applications.visaShort },
    ],
  },
  { module: "documents", href: "/documents", label: S.nav.documents, icon: IconDocuments, group: "work" },
  { module: "tasks", href: "/tasks", label: S.nav.tasks, icon: IconTasks, group: "work" },
  { module: "deadlines", href: "/deadlines", label: S.nav.deadlines, icon: IconDeadline, group: "work" },
  {
    module: "universities",
    href: "/universities",
    label: S.nav.universities,
    icon: IconUniversity,
    group: "base",
    children: [{ href: "/universities/compare", label: S.shortlist.title }],
  },
  { module: "finance", href: "/finance", label: S.nav.finance, icon: IconFinance, group: "base" },
  { module: "team", href: "/team", label: S.nav.team, icon: IconTeam, group: "admin" },
  { module: "settings", href: "/settings", label: S.nav.settings, icon: IconSettings, group: "admin" },
];

export const GROUP_LABEL: Record<NavEntry["group"], Loc> = {
  work: S.nav.groupWork,
  base: S.nav.groupBase,
  admin: S.nav.groupAdmin,
};
