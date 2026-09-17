"use client";

import { useState } from "react";
import { switchLocale, switchTenant, switchUser } from "@/app/actions";
import { IconBell, IconChevron, IconMail, IconSearch } from "./icons";
import { Avatar } from "./ui";
import { LOCALES, translator, type Loc, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";
import type { Tenant, User } from "@/lib/types";

/**
 * Шапка. Переключатели агентства и сотрудника существуют только в демо-режиме —
 * они показывают, как одна и та же система выглядит на разных поддоменах и ролях.
 * Язык интерфейса — настоящая настройка: сотрудник выбирает себе русский или узбекский.
 */
export function Topbar({
  user,
  roleLabel,
  tenants,
  tenant,
  staff,
  locale,
}: {
  user: User;
  roleLabel: Loc;
  tenants: Pick<Tenant, "slug" | "name">[];
  tenant: Tenant;
  staff: User[];
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const t = translator(locale);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline-soft bg-canvas/85 px-5 backdrop-blur-xl">
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
            title={l.label}
          >
            {l.short}
          </button>
        ))}
      </form>

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

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-surface-1"
        >
          <Avatar name={user.name} size={28} />
          <span className="hidden text-left md:block">
            <span className="t-caption block leading-tight">{user.name}</span>
            <span className="t-micro block leading-tight text-ink-faint">{t(roleLabel)}</span>
          </span>
          <IconChevron size={14} className="text-ink-faint" />
        </button>

        {open ? (
          <div className="card-raised absolute right-0 top-11 z-40 w-[300px] p-4">
            <div className="t-micro mb-2 uppercase tracking-[0.08em] text-ink-faint">
              {t(S.common.workspace)}
            </div>
            <form action={switchTenant} className="mb-4">
              <select
                name="tenant"
                defaultValue={tenant.slug}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="field text-[13px]"
              >
                {tenants.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.name} · {item.slug}
                  </option>
                ))}
              </select>
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
            <form action={switchUser} className="space-y-1">
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
                    <span className="t-micro block truncate text-ink-faint">
                      {member.title}
                    </span>
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
