"use client";

import { useEffect, useRef, useState } from "react";
import { switchLocale, switchTenant, switchTheme, switchUser } from "@/app/actions";
import { IconBell, IconChevron, IconMail, IconMoon, IconSearch, IconSun } from "./icons";
import { Select } from "./controls";
import { Avatar } from "./ui";
import { MobileNav } from "./MobileNav";
import { WorkdayPanel, WorkdayPill, type WorkdayState } from "./Workday";
import type { Module } from "@/lib/rbac";
import { LOCALES, translator, type Loc, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";
import { THEMES, type Theme } from "@/lib/theme";
import type { Tenant, User } from "@/lib/types";

/**
 * Шапка. Переключатели агентства и сотрудника существуют только в демо-режиме —
 * они показывают, как одна и та же система выглядит на разных поддоменах и ролях.
 * Язык интерфейса — настоящая настройка, а рабочий день — рабочий инструмент:
 * как в Битриксе, он начинается и завершается прямо из меню профиля.
 */
export function Topbar({
  user,
  roleLabel,
  tenants,
  tenant,
  staff,
  locale,
  modules,
  home,
  workday,
  theme,
}: {
  user: User;
  roleLabel: Loc;
  tenants: Pick<Tenant, "slug" | "name">[];
  tenant: Tenant;
  staff: User[];
  locale: Locale;
  modules: Module[];
  home: string;
  workday: WorkdayState;
  theme: Theme;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const t = translator(locale);

  // Клик мимо меню закрывает его — иначе панель висит поверх работы.
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const statusColor = workday.onBreak
    ? "var(--color-status-progress)"
    : workday.started
      ? "var(--color-status-deal)"
      : "var(--color-ink-faint)";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline px-5 backdrop-blur-xl"
      style={{ background: "color-mix(in srgb, var(--color-rail) 88%, transparent)" }}>
      <MobileNav modules={modules} locale={locale} tenantName={tenant.name} home={home} />

      <label className="relative hidden max-w-[320px] flex-1 items-center sm:flex">
        <span className="pointer-events-none absolute left-3 text-ink-faint">
          <IconSearch size={15} />
        </span>
        <input
          className="field h-9 rounded-full pl-9 text-[13px]"
          placeholder={t(S.common.search)}
        />
      </label>

      <div className="flex-1" />

      <form action={switchLocale} className="mr-1 hidden items-center gap-0.5 rounded-full bg-surface-1 p-0.5 sm:flex">
        {LOCALES.map((l) => (
          <button
            key={l.key}
            name="locale"
            value={l.key}
            className="t-micro rounded-full px-2.5 py-1.5 transition-colors"
            style={{
              background: l.key === locale ? "var(--color-surface-2)" : "transparent",
              color: l.key === locale ? "var(--color-ink)" : "var(--color-ink-faint)",
            }}
          >
            {l.short}
          </button>
        ))}
      </form>

      <WorkdayPill workday={workday} locale={locale} />

      <button className="btn-icon" aria-label={t(S.common.mail)}>
        <IconMail size={17} />
      </button>
      <button className="btn-icon relative" aria-label={t(S.common.notifications)}>
        <IconBell size={17} />
        <span
          className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--color-status-new)" }}
        />
      </button>

      <div className="mx-1 h-5 w-px bg-hairline" />

      <div className="relative" ref={box}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-surface-1"
        >
          <span className="relative">
            <Avatar name={user.name} size={28} />
            {/* точка статуса рабочего дня — видно, что день идёт, не открывая меню */}
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
              style={{ background: statusColor, borderColor: "var(--color-canvas)" }}
            />
          </span>
          <span className="hidden text-left md:block">
            <span className="t-caption block leading-tight">{user.name}</span>
            <span className="t-micro block leading-tight text-ink-faint">{t(roleLabel)}</span>
          </span>
          <IconChevron size={14} className="text-ink-faint" />
        </button>

        {open ? (
          <div className="card-raised absolute right-0 top-11 z-40 w-[320px] p-4">
            <div className="mb-4">
              <WorkdayPanel workday={workday} locale={locale} />
            </div>

            <div className="t-micro mb-2 uppercase tracking-[0.08em] text-ink-faint">
              {t(S.workday.theme)}
            </div>
            <form action={switchTheme} className="mb-4 flex gap-1.5">
              {THEMES.map((item) => (
                <button
                  key={item.key}
                  name="theme"
                  value={item.key}
                  className={`chip flex-1 justify-center ${item.key === theme ? "chip-active" : ""}`}
                >
                  {item.key === "light" ? <IconSun size={13} /> : <IconMoon size={13} />}
                  {t(item.label)}
                </button>
              ))}
            </form>

            <div className="t-micro mb-2 uppercase tracking-[0.08em] text-ink-faint">
              {t(S.common.workspace)}
            </div>
            <form action={switchTenant} className="mb-4">
              <TenantPicker tenants={tenants} current={tenant.slug} locale={locale} />
            </form>

            <div className="t-micro mb-2 uppercase tracking-[0.08em] text-ink-faint">
              {t(S.common.language)}
            </div>
            <form action={switchLocale} className="mb-4 flex gap-1.5">
              {LOCALES.map((l) => (
                <button
                  key={l.key}
                  name="locale"
                  value={l.key}
                  className={`chip flex-1 justify-center ${l.key === locale ? "chip-active" : ""}`}
                >
                  {l.label}
                </button>
              ))}
            </form>

            <div className="t-micro mb-2 uppercase tracking-[0.08em] text-ink-faint">
              {t(S.common.signInAs)}
            </div>
            <form action={switchUser} className="max-h-[220px] space-y-1 overflow-y-auto">
              {staff.map((member) => (
                <button
                  key={member.id}
                  name="userId"
                  value={member.id}
                  className={`flex w-full items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-left transition-colors hover:bg-surface-1 ${
                    member.id === user.id ? "bg-surface-1" : ""
                  }`}
                >
                  <Avatar name={member.name} size={24} />
                  <span className="min-w-0 flex-1">
                    <span className="t-caption block truncate">{member.name}</span>
                    <span className="t-micro block truncate text-ink-faint">{member.title}</span>
                  </span>
                </button>
              ))}
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}

/**
 * Выбор агентства собственным списком: нативный <select> рисует операционная
 * система, и на тёмном портале он выглядит чужеродно.
 */
function TenantPicker({
  tenants,
  current,
  locale,
}: {
  tenants: Pick<Tenant, "slug" | "name">[];
  current: string;
  locale: Locale;
}) {
  const [value, setValue] = useState(current);
  const form = useRef<HTMLInputElement>(null);

  return (
    <>
      <input ref={form} type="hidden" name="tenant" value={value} readOnly />
      <Select
        locale={locale}
        width="100%"
        value={value}
        options={tenants.map((item) => ({
          value: item.slug,
          label: item.name,
          hint: item.slug,
        }))}
        onChange={(next) => {
          setValue(next);
          // Сабмит после того, как значение попало в скрытое поле.
          requestAnimationFrame(() => form.current?.form?.requestSubmit());
        }}
      />
    </>
  );
}
