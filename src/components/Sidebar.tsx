"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navChildren, navFor, type NavChild, type NavEntry } from "./nav";
import {
  IconChevron, IconEye, IconEyeOff, IconLogo, IconPanel, IconPin, IconSettings,
} from "./icons";
import { Modal, Tooltip } from "./controls";
import { translator, type Locale, type Loc } from "@/lib/i18n";
import type { Module } from "@/lib/rbac";
import { S } from "@/lib/strings";

const OPEN_KEY = "orbis.nav.open";
const RAIL_KEY = "orbis.nav.collapsed";
const PIN_KEY = "orbis.nav.pinned";
const ORDER_KEY = "orbis.nav.order";
const HIDDEN_KEY = "orbis.nav.hidden";

/** Порядок разделов с учётом сохранённого — новые разделы уходят в конец,
 * а не пропадают, если появились после того, как человек настроил меню. */
function orderedEntries(entries: NavEntry[], order: string[]): NavEntry[] {
  if (!order.length) return entries;
  const byKey = new Map(entries.map((e) => [e.key, e] as const));
  const result: NavEntry[] = [];
  for (const key of order) {
    const e = byKey.get(key);
    if (e) {
      result.push(e);
      byKey.delete(key);
    }
  }
  return [...result, ...byKey.values()];
}

/**
 * Левое меню портала — как в Битриксе.
 *
 * Четыре вещи, которых людям не хватало в прошлой версии:
 * 1. Разделы раскрываются независимо: открытый CRM не закрывается от того,
 *    что человек открыл «Задачи». Состояние переживает переходы, потому что
 *    лежит в localStorage, а не в памяти компонента.
 * 2. Рельсу можно свернуть до иконок и вернуть обратно — на ноутбуке это
 *    полтора десятка лишних сантиметров под доску.
 * 3. Нужную страницу можно закрепить в корне меню, чтобы не раскрывать
 *    раздел по десять раз в день.
 * 4. Меню собирает под себя каждый сотрудник: лишние разделы скрываются,
 *    нужные — поднимаются стрелками наверх. Права роли это не меняет —
 *    только то, что видно лично ему.
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
  const allEntries = navFor(new Set(modules));

  const [open, setOpen] = useStored<string[]>(OPEN_KEY, []);
  const [collapsed, setCollapsed] = useStored<boolean>(RAIL_KEY, false);
  const [pinned, setPinned] = useStored<string[]>(PIN_KEY, []);
  const [order, setOrder] = useStored<string[]>(ORDER_KEY, []);
  const [hidden, setHidden] = useStored<string[]>(HIDDEN_KEY, []);
  const [customizing, setCustomizing] = useState(false);

  const sorted = orderedEntries(allEntries, order);
  const entries = sorted.filter((e) => !hidden.includes(e.key));

  const children = navChildren(entries);
  const pins = pinned
    .map((href) => children.find((c) => c.href === href))
    .filter((c): c is NavChild & { parent: string; icon: NavEntry["icon"] } => Boolean(c));

  const togglePin = (href: string) =>
    setPinned(pinned.includes(href) ? pinned.filter((x) => x !== href) : [...pinned, href]);

  return (
    <>
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
          <>
            <Tooltip text={t(S.nav.customize)}>
              <button
                type="button"
                onClick={() => setCustomizing(true)}
                className="btn-icon relative h-7 w-7"
                aria-label={t(S.nav.customize)}
              >
                <IconSettings size={14} />
                {/* Точка напоминает, что меню отличается от того, что видят
                    остальные, — иначе про скрытые разделы легко забыть. */}
                {hidden.length ? (
                  <span
                    className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--color-accent)" }}
                  />
                ) : null}
              </button>
            </Tooltip>
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
          </>
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

    <MenuCustomizer
      open={customizing}
      onClose={() => setCustomizing(false)}
      entries={sorted}
      hidden={hidden}
      onToggleHidden={(key) =>
        setHidden(hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key])
      }
      onMove={(key, dir) => {
        const keys = sorted.map((e) => e.key);
        const i = keys.indexOf(key);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= keys.length) return;
        [keys[i], keys[j]] = [keys[j], keys[i]];
        setOrder(keys);
      }}
      onReset={() => {
        setOrder([]);
        setHidden([]);
      }}
      locale={locale}
    />
    </>
  );
}

/** Настройка меню: показать/скрыть раздел и переставить его стрелками. */
function MenuCustomizer({
  open,
  onClose,
  entries,
  hidden,
  onToggleHidden,
  onMove,
  onReset,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  entries: NavEntry[];
  hidden: string[];
  onToggleHidden: (key: string) => void;
  onMove: (key: string, dir: -1 | 1) => void;
  onReset: () => void;
  locale: Locale;
}) {
  const t = translator(locale);
  return (
    <Modal open={open} onClose={onClose} title={t(S.nav.customizeTitle)} width={420}>
      <p className="t-caption mb-4 leading-relaxed text-ink-faint">{t(S.nav.customizeHint)}</p>
      <div className="space-y-1">
        {entries.map((entry, i) => {
          const Icon = entry.icon;
          const isHidden = hidden.includes(entry.key);
          return (
            <div
              key={entry.key}
              className="flex items-center gap-2 rounded-[10px] px-2 py-1.5"
              style={{ opacity: isHidden ? 0.5 : 1 }}
            >
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[8px] bg-surface-2 text-ink-muted">
                <Icon size={14} />
              </span>
              <span className="t-caption min-w-0 flex-1 truncate">{t(entry.label)}</span>
              <div className="flex flex-none items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onMove(entry.key, -1)}
                  disabled={i === 0}
                  aria-label={t(S.common.moveUp)}
                  className="btn-icon h-6 w-6 disabled:opacity-30"
                >
                  <IconChevron size={12} style={{ transform: "rotate(180deg)" }} />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(entry.key, 1)}
                  disabled={i === entries.length - 1}
                  aria-label={t(S.common.moveDown)}
                  className="btn-icon h-6 w-6 disabled:opacity-30"
                >
                  <IconChevron size={12} />
                </button>
                <Tooltip text={t(isHidden ? S.nav.showSection : S.nav.hideSection)}>
                  <button
                    type="button"
                    onClick={() => onToggleHidden(entry.key)}
                    aria-label={t(isHidden ? S.nav.showSection : S.nav.hideSection)}
                    className="btn-icon h-6 w-6"
                    style={isHidden ? { color: "var(--color-accent)" } : undefined}
                  >
                    {isHidden ? <IconEyeOff size={13} /> : <IconEye size={13} />}
                  </button>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-hairline-soft pt-4">
        <button type="button" onClick={onReset} className="t-micro text-ink-faint hover:text-ink">
          {t(S.nav.resetOrder)}
        </button>
        <button type="button" onClick={onClose} className="btn btn-primary btn-sm">
          {t(S.common.done)}
        </button>
      </div>
    </Modal>
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
        <div className="pop-in ml-[22px] mt-0.5 space-y-0.5 border-l border-hairline-soft pl-2">
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
