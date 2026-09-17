"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GROUP_LABEL, NAV, type NavEntry } from "./nav";
import { IconLogo } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import type { Module } from "@/lib/rbac";

/** Навигация для телефона: на узких экранах боковая рельса скрыта. */
export function MobileNav({
  modules,
  locale,
  tenantName,
  home,
}: {
  modules: Module[];
  locale: Locale;
  tenantName: string;
  home: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const t = translator(locale);

  useEffect(() => setMounted(true), []);

  // Переход по ссылке закрывает панель — иначе она перекрывает новый экран.
  useEffect(() => setOpen(false), [pathname]);

  // Пока панель открыта, страница под ней не прокручивается.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const allowed = new Set(modules);
  const entries = NAV.filter((e) => allowed.has(e.module));
  const groups: NavEntry["group"][] = ["work", "base", "admin"];
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-icon lg:hidden"
        aria-label="Меню"
        aria-expanded={open}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      </button>

      {/*
        Оверлей уходит в портал: у шапки есть backdrop-blur, а он создаёт
        containing block для position: fixed — панель обрезалась бы по её высоте.
      */}
      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
              />
              <nav className="absolute left-0 top-0 flex h-full w-[264px] flex-col overflow-y-auto border-r border-hairline bg-canvas px-4 py-5">
                <Link href={home} className="mb-7 flex items-center gap-3 px-2">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ink text-canvas">
                    <IconLogo size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[16px] font-semibold tracking-[-0.5px]">
                      Orbis
                    </span>
                    <span className="t-micro block truncate text-ink-faint">
                      {tenantName}
                    </span>
                  </span>
                </Link>

                <div className="space-y-6">
                  {groups.map((group) => {
                    const items = entries.filter((e) => e.group === group);
                    if (!items.length) return null;
                    return (
                      <div key={group}>
                        <div className="t-micro mb-2 px-3 uppercase tracking-[0.08em] text-ink-faint">
                          {t(GROUP_LABEL[group])}
                        </div>
                        <div className="space-y-0.5">
                          {items.map(({ href, label, icon: Icon }) => (
                            <Link
                              key={href}
                              href={href}
                              className={`nav-item ${isActive(href) ? "nav-item-active" : ""}`}
                            >
                              <Icon size={17} />
                              {t(label)}
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </nav>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
