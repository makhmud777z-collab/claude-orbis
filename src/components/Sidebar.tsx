"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navChildren, navFor, type NavChild, type NavEntry } from "./nav";
import { IconChevron, IconLogo, IconPanel, IconPin } from "./icons";
import { Tooltip } from "./controls";
import { translator, type Locale, type Loc } from "@/lib/i18n";
import type { Module } from "@/lib/rbac";
import { S } from "@/lib/strings";

const OPEN_KEY = "orbis.nav.open";
const RAIL_KEY = "orbis.nav.collapsed";
const PIN_KEY = "orbis.nav.pinned";

/**
 * Левое меню портала — как в Битриксе.
 *
 * Три вещи, которых людям не хватало в прошлой версии:
 * 1. Разделы раскрываются независимо: открытый CRM не закрывается от того,
 *    что человек открыл «Задачи». Состояние переживает переходы, потому что
 *    лежит в localStorage, а не в памяти компонента.
 * 2. Рельсу можно свернуть до иконок и вернуть обратно — на ноутбуке это
 *    полтора десятка лишних сантиметров под доску.
 * 3. Нужную страницу можно закрепить в корне меню, чтобы не раскрывать
 *    раздел по десять раз в день.
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

  const [open, setOpen] = useStored<string[]>(OPEN_KEY, []);
  const [collapsed, setCollapsed] = useStored<boolean>(RAIL_KEY, false);
  const [pinned, setPinned] = useStored<string[]>(PIN_KEY, []);

  const children = navChildren(entries);
  const pins = pinned
    .map((href) => children.find((c) => c.href === href))
    .filter((c): c is NavChild & { parent: string; icon: NavEntry["icon"] } => Boolean(c));

  const togglePin = (href: string) =>
    setPinned(pinned.includes(href) ? pinned.filter((x) => x !== href) : [...pinned, href]);

  return (
    <aside
      className="sticky top-0 hidden h-screen flex-none flex-col border-r border-hairline py-5 lg:flex"
      style={{
        width: collapsed ? 72 : 244,
        paddingInline: collapsed ? 12 : 16,
        background: "var(--color-rail)",
        transition: "width 160ms ease, padding 160ms ease",
      }}
    >
      <div className="mb-6 flex items-center gap-2">
        <Link
          href={home}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-[10px] px-1 py-1"
        >
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent text-white">
            <IconLogo size={18} />
          </span>
          {collapsed ? null : (
            <span className="min-w-0">
              <span className="block text-[16px] font-semibold leading-tight tracking-[-0.5px]">Orbis</span>
              <span className="t-micro block truncate text-ink-faint">{host}</span>
            </span>
          )}
        </Link>
        {collapsed ? null : (
          <Tooltip text={t(S.nav.collapse)}>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="btn-icon h-7 w-7"
              aria-label={t(S.nav.collapse)}
            >
              <IconPanel size={15} />
            </button>
          </Tooltip>
        )}
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="btn-icon mb-3 h-9 w-9 self-center"
          aria-label={t(S.nav.expand)}
        >
          <IconPanel size={15} />
        </button>
      ) : null}

      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {pins.length && !collapsed ? (
          <div className="mb-3 space-y-0.5 border-b border-hairline-soft pb-3">
            {pins.map((child) => (
              <PinnedItem
                key={child.href}
                child={child}
                active={isActiveHref(pathname, child.href)}
                label={t(child.label)}
                onUnpin={() => togglePin(child.href)}
                hint={t(S.nav.unpin)}
              />
            ))}
          </div>
        ) : null}

        {entries.map((entry) => (
          <NavSection
            key={entry.key}
            entry={entry}
            pathname={pathname}
            locale={locale}
            collapsed={collapsed}
            expanded={open.includes(entry.key)}
            onToggle={() =>
              setOpen(open.includes(entry.key) ? open.filter((k) => k !== entry.key) : [...open, entry.key])
            }
            pinned={pinned}
            onPin={togglePin}
          />
        ))}
      </nav>

      {collapsed ? null : (
        <div className="mt-6 rounded-[10px] border border-hairline bg-surface-1 px-3 py-3">
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
      )}
    </aside>
  );
}

/**
 * Настройка меню принадлежит человеку, а не вкладке: раскрытые разделы,
 * ширина рельсы и закреплённые страницы переживают переход и перезагрузку.
 */
function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      /* приватное окно — работаем без сохранения */
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* приватное окно — работаем без сохранения */
    }
  }, [key, value, ready]);

  return [value, setValue] as const;
}

/** Точное совпадение для «/», префикс — для остальных разделов. */
export function isActiveHref(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function PinnedItem({
  child,
  active,
  label,
  onUnpin,
  hint,
}: {
  child: NavChild & { icon: NavEntry["icon"] };
  active: boolean;
  label: string;
  onUnpin: () => void;
  hint: string;
}) {
  const Icon = child.icon;
  return (
    <div className="group flex items-center">
      <Link href={child.href} className={`nav-item min-w-0 flex-1 ${active ? "nav-item-active" : ""}`}>
        <Icon size={16} />
        <span className="truncate">{label}</span>
      </Link>
      <button
        type="button"
        onClick={onUnpin}
        aria-label={hint}
        className="btn-icon h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <IconPin size={13} />
      </button>
    </div>
  );
}

function NavSection({
  entry,
  pathname,
  locale,
  collapsed,
  expanded,
  onToggle,
  pinned,
  onPin,
}: {
  entry: NavEntry;
  pathname: string;
  locale: Locale;
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
  pinned: string[];
  onPin: (href: string) => void;
}) {
  const t = translator(locale);
  const Icon = entry.icon;
  const children = entry.children ?? [];
  const inside = children.some((c) => isActiveHref(pathname, c.href));
  const active = isActiveHref(pathname, entry.href) || inside;

  if (collapsed) {
    return (
      <Tooltip text={t(entry.label)}>
        <Link
          href={entry.href}
          className={`nav-item justify-center px-0 ${active ? "nav-item-active" : ""}`}
          style={{ width: 44 }}
        >
          <Icon size={18} />
        </Link>
      </Tooltip>
    );
  }

  return (
    <div>
      <div className="flex items-center">
        <Link href={entry.href} className={`nav-item min-w-0 flex-1 ${active ? "nav-item-active" : ""}`}>
          <Icon size={17} />
          <span className="truncate">{t(entry.label)}</span>
        </Link>
        {children.length ? (
          <button
            type="button"
            onClick={onToggle}
            className="btn-icon h-7 w-7 flex-none"
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

      {children.length && expanded ? (
        <div className="ml-[22px] mt-0.5 space-y-0.5 border-l border-hairline-soft pl-2">
          {children.map((child) => {
            const on = isActiveHref(pathname, child.href);
            const isPinned = pinned.includes(child.href);
            return (
              <div key={child.href} className="group flex items-center">
                <Link
                  href={child.href}
                  className="t-caption min-w-0 flex-1 truncate rounded-[8px] px-2.5 py-1.5 transition-colors"
                  style={{
                    color: on ? "var(--color-accent)" : "var(--color-ink-muted)",
                    background: on ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
                    fontWeight: on ? 600 : 500,
                  }}
                >
                  {t(child.label)}
                </Link>
                <button
                  type="button"
                  onClick={() => onPin(child.href)}
                  aria-label={t(isPinned ? S.nav.unpin : S.nav.pin)}
                  className={`btn-icon h-6 w-6 flex-none transition-opacity ${
                    isPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                  style={isPinned ? { color: "var(--color-accent)" } : undefined}
                >
                  <IconPin size={12} />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
