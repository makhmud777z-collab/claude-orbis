"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { GROUP_LABEL, navFor, type NavEntry } from "./nav";
import { IconChevron, IconLogo } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import type { Module } from "@/lib/rbac";
import type { Loc } from "@/lib/i18n";

/**
 * Левое меню портала. Структура повторяет Битрикс24: крупные разделы
 * (CRM, Задачи и проекты, Сотрудники, Администрирование) раскрываются
 * в список страниц. Раздел с активной страницей раскрыт сам.
 */
export function Sidebar({
  tenantName,
  tenantMark,
  host,
  modules,
  roleLabel,
  locale,
  home,
}: {
  tenantName: string;
  tenantMark: string;
  host: string;
  modules: Module[];
  roleLabel: Loc;
  locale: Locale;
  /** куда ведёт логотип: у MVP и у ролей без дашборда это не «/» */
  home: string;
}) {
  const pathname = usePathname();
  const t = translator(locale);
  const entries = navFor(new Set(modules));
  const groups: NavEntry["group"][] = ["work", "base", "admin"];

  return (
    <aside className="sticky top-0 hidden h-screen w-[244px] flex-none flex-col border-r border-hairline px-4 py-5 lg:flex"
      style={{ background: "var(--color-rail)" }}>
      <Link href={home} className="mb-7 flex items-center gap-3 px-2">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ink text-canvas">
          <IconLogo size={18} />
        </span>
        <span className="min-w-0">
          <span className="block text-[16px] font-semibold tracking-[-0.5px]">Orbis</span>
          <span className="t-micro block truncate text-ink-faint">{host}</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto">
        {groups.map((group) => {
          const items = entries.filter((e) => e.group === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              <div className="t-micro mb-2 px-3 uppercase tracking-[0.08em] text-ink-faint">
                {t(GROUP_LABEL[group])}
              </div>
              <div className="space-y-0.5">
                {items.map((entry) => (
                  <NavSection key={entry.key} entry={entry} pathname={pathname} locale={locale} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="mt-6 rounded-[10px] border border-hairline-soft bg-surface-1 px-3 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-accent text-[13px] font-semibold text-white">
            {tenantMark}
          </span>
          <span className="min-w-0">
            <span className="t-caption block truncate">{tenantName}</span>
            <span className="t-micro block truncate text-ink-faint">{t(roleLabel)}</span>
          </span>
        </div>
      </div>
    </aside>
  );
}

/** Точное совпадение для «/», префикс — для остальных разделов. */
export function isActiveHref(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavSection({
  entry,
  pathname,
  locale,
}: {
  entry: NavEntry;
  pathname: string;
  locale: Locale;
}) {
  const t = translator(locale);
  const Icon = entry.icon;
  const children = entry.children ?? [];
  const inside = children.some((c) => isActiveHref(pathname, c.href));
  const active = isActiveHref(pathname, entry.href) || inside;
  // Раздел с активной страницей открыт по умолчанию; дальше решает сотрудник.
  const [open, setOpen] = useState<boolean | null>(null);
  const expanded = children.length > 0 && (open ?? inside);

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={entry.href}
          className={`nav-item flex-1 ${active ? "nav-item-active" : ""}`}
        >
          <Icon size={17} />
          {t(entry.label)}
        </Link>
        {children.length ? (
          <button
            type="button"
            onClick={() => setOpen(!expanded)}
            className="btn-icon h-7 w-7"
            aria-label={t(entry.label)}
            aria-expanded={expanded}
          >
            <IconChevron
              size={13}
              style={{
                transform: expanded ? "rotate(180deg)" : "none",
                transition: "transform 160ms ease",
              }}
            />
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="ml-[22px] mt-0.5 space-y-0.5 border-l border-hairline-soft pl-3">
          {children.map((child) => {
            const on = isActiveHref(pathname, child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                className="t-caption block rounded-[8px] px-2.5 py-1.5 transition-colors"
                style={{
                  color: on ? "var(--color-ink)" : "var(--color-ink-faint)",
                  background: on ? "var(--color-surface-1)" : "transparent",
                }}
              >
                {t(child.label)}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
