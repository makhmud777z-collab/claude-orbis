"use client";

import { useState } from "react";
import { switchTenant, switchUser } from "@/app/actions";
import { IconBell, IconChevron, IconMail, IconSearch } from "./icons";
import { Avatar } from "./ui";
import type { Tenant, User } from "@/lib/types";

/**
 * Шапка. Переключатели агентства и сотрудника существуют только в демо-режиме —
 * они показывают, как одна и та же система выглядит на разных поддоменах и ролях.
 */
export function Topbar({
  user,
  roleLabel,
  tenants,
  tenant,
  staff,
}: {
  user: User;
  roleLabel: string;
  tenants: Pick<Tenant, "slug" | "name">[];
  tenant: Tenant;
  staff: User[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline-soft bg-canvas/85 px-5 backdrop-blur-xl">
      <label className="relative hidden max-w-[320px] flex-1 items-center sm:flex">
        <span className="pointer-events-none absolute left-3 text-ink-faint">
          <IconSearch size={15} />
        </span>
        <input
          className="field h-9 rounded-full pl-9 text-[13px]"
          placeholder="Поиск студента, заявки, вуза…"
        />
      </label>

      <div className="flex-1" />

      <button className="btn-icon" aria-label="Почта">
        <IconMail size={17} />
      </button>
      <button className="btn-icon relative" aria-label="Уведомления">
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
            <span className="t-micro block leading-tight text-ink-faint">{roleLabel}</span>
          </span>
          <IconChevron size={14} className="text-ink-faint" />
        </button>

        {open ? (
          <div className="card-raised absolute right-0 top-11 z-40 w-[300px] p-4">
            <div className="t-micro mb-2 uppercase tracking-[0.08em] text-ink-faint">
              Рабочее пространство
            </div>
            <form action={switchTenant} className="mb-4">
              <select
                name="tenant"
                defaultValue={tenant.slug}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="field text-[13px]"
              >
                {tenants.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name} · {t.slug}
                  </option>
                ))}
              </select>
            </form>

            <div className="t-micro mb-2 uppercase tracking-[0.08em] text-ink-faint">
              Войти как сотрудник
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
