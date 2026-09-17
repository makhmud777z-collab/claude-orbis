"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { GROUP_LABEL, NAV, type NavEntry } from "./nav";
import { IconChevron, IconLogo } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import type { Module } from "@/lib/rbac";
import type { Loc } from "@/lib/i18n";

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
  const params = useSearchParams();
  const t = translator(locale);
  const [opened, setOpened] = useState<string | null>(null);
  const allowed = new Set(modules);
  const entries = NAV.filter((e) => allowed.has(e.module));
  const groups: NavEntry["group"][] = ["work", "base", "admin"];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const current = `${pathname}${params.toString() ? `?${params}` : ""}`;

  return (
    <aside className="sticky top-0 hidden h-screen w-[244px] flex-none flex-col border-r border-hairline-soft bg-canvas px-4 py-5 lg:flex">
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
                {items.map(({ href, label, icon: Icon, children }) => {
                  const active = isActive(href);
                  const expanded = children ? (opened ?? (active ? href : null)) === href : false;
                  return (
                    <div key={href}>
                      <div className="flex items-center">
                        <Link
                          href={href}
                          className={`nav-item flex-1 ${active ? "nav-item-active" : ""}`}
                        >
                          <Icon size={17} />
                          {t(label)}
                        </Link>
                        {children ? (
                          <button
                            onClick={() => setOpened(expanded ? "" : href)}
                            className="btn-icon h-7 w-7"
                            aria-label={t(label)}
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

                      {children && expanded ? (
                        <div className="ml-[22px] mt-0.5 space-y-0.5 border-l border-hairline-soft pl-3">
                          {children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="t-caption block rounded-[8px] px-2.5 py-1.5 transition-colors"
                              style={{
                                color:
                                  current === child.href
                                    ? "var(--color-ink)"
                                    : "var(--color-ink-faint)",
                                background:
                                  current === child.href
                                    ? "var(--color-surface-1)"
                                    : "transparent",
                              }}
                            >
                              {t(child.label)}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="mt-6 rounded-[10px] border border-hairline-soft bg-surface-1 px-3 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-ink text-[13px] font-semibold text-black">
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
