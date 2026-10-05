"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createRoleAction, deleteRoleAction, renameRoleAction,
  setRoleActionAction, setRoleScopeAction,
} from "@/app/actions";
import { IconPlus } from "./icons";
import { Avatar } from "./ui";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

export interface MatrixRole {
  id: string;
  name: string;
  scope: "tenant" | "branch" | "own";
  /** владельца агентство не правит: иначе можно закрыть себе вход в админку */
  system: boolean;
  staff: string[];
}

export interface MatrixRow {
  /** «модуль.действие» — ключ ячейки */
  key: string;
  module: string;
  action: string;
  label: string;
}

export interface MatrixSection {
  id: string;
  title: string;
  rows: MatrixRow[];
}

/** Что открыто роли: roleId → множество ключей «модуль.действие». */
export type Grid = Record<string, string[]>;

const SCOPES = ["tenant", "branch", "own"] as const;

/**
 * Права доступа агентства.
 *
 * Роли стоят колонками, права — строками: так матрицу читают сравнением
 * ролей между собой («у кого ещё открыты финансы»), а это главный вопрос
 * к этому экрану. Состав ролей нигде не зашит — агентство заводит свои
 * и называет как хочет, поэтому колонку можно добавить прямо здесь.
 */
export function PermissionsMatrix({
  roles,
  sections,
  grid,
  scopeLabels,
  locale,
  canEdit,
}: {
  roles: MatrixRole[];
  sections: MatrixSection[];
  grid: Grid;
  scopeLabels: Record<string, string>;
  locale: Locale;
  canEdit: boolean;
}) {
  const t = translator(locale);
  const [, startTransition] = useTransition();

  // Первый раздел открыт, остальные свёрнуты: экран должен открываться
  // обозримым, а не полотном на шестьдесят строк.
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((s, i) => [s.id, i === 0])),
  );

  // Тумблер переключается сразу, не дожидаясь сервера — иначе щелчок
  // ощущается как зависание. Свежие данные с сервера сбрасывают догадки.
  const [draft, setDraft] = useState<Grid>({});
  const [scopes, setScopes] = useState<Record<string, string>>({});
  useEffect(() => {
    setDraft({});
    setScopes({});
  }, [grid, roles]);

  const openKeys = (roleId: string) => draft[roleId] ?? grid[roleId] ?? [];
  const has = (roleId: string, key: string) => openKeys(roleId).includes(key);
  const scopeOf = (role: MatrixRole) => scopes[role.id] ?? role.scope;

  const send = (action: (d: FormData) => Promise<void>, data: FormData) =>
    startTransition(() => {
      void action(data);
    });

  const toggle = (role: MatrixRole, row: MatrixRow) => {
    if (!canEdit || role.system) return;
    const on = !has(role.id, row.key);
    const current = openKeys(role.id);
    // Сняли просмотр — остальные действия по разделу теряют смысл.
    const next = on
      ? [...current, row.key]
      : current.filter((k) =>
          row.action === "view" ? !k.startsWith(`${row.module}.`) : k !== row.key,
        );
    setDraft((prev) => ({ ...prev, [role.id]: next }));

    const data = new FormData();
    data.set("role", role.id);
    data.set("module", row.module);
    data.set("action", row.action);
    data.set("on", on ? "1" : "0");
    send(setRoleActionAction, data);
  };

  const cycleScope = (role: MatrixRole) => {
    if (!canEdit || role.system) return;
    const next = SCOPES[(SCOPES.indexOf(scopeOf(role) as typeof SCOPES[number]) + 1) % SCOPES.length];
    setScopes((prev) => ({ ...prev, [role.id]: next }));

    const data = new FormData();
    data.set("role", role.id);
    data.set("scope", next);
    send(setRoleScopeAction, data);
  };

  const rename = (role: MatrixRole, name: string) => {
    const clean = name.trim();
    if (!canEdit || role.system || !clean || clean === role.name) return;
    const data = new FormData();
    data.set("role", role.id);
    data.set("name", clean);
    send(renameRoleAction, data);
  };

  const total = sections.reduce((n, s) => n + s.rows.length, 0);

  return (
    <div className="card overflow-hidden">
      <div className="scroll-x">
        <table className="w-full border-collapse" style={{ minWidth: 260 + roles.length * 162 }}>
          <thead>
            <tr className="border-b border-hairline">
              <th
                className="sticky left-0 z-20 bg-surface-1 px-5 py-3 text-left align-top"
                style={{ minWidth: 260 }}
              >
                <div className="t-body-sm font-semibold">{t(S.team.role)}</div>
                <div className="t-micro t-num mt-1 text-ink-faint">
                  {roles.length} · {total} {t(S.admin.permissionsCount).toLowerCase()}
                </div>
              </th>

              {roles.map((role) => (
                <th
                  key={role.id}
                  className="border-l border-hairline-soft px-3 py-3 text-center align-top"
                  style={{ minWidth: 162 }}
                >
                  <input
                    defaultValue={role.name}
                    disabled={!canEdit || role.system}
                    aria-label={t(S.team.role)}
                    title={role.name}
                    onBlur={(e) => rename(role, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    className="t-body-sm w-full rounded-[7px] bg-transparent px-1.5 py-1 text-center font-semibold transition-colors hover:bg-surface-2 focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-accent)_35%,transparent)] disabled:cursor-default disabled:hover:bg-transparent"
                  />
                  <div className="mt-2 flex items-center justify-center gap-1">
                    {role.staff.slice(0, 3).map((name) => (
                      <Avatar key={name} name={name} size={22} />
                    ))}
                    {role.staff.length > 3 ? (
                      <span className="t-micro t-num text-ink-faint">+{role.staff.length - 3}</span>
                    ) : null}
                    {role.system ? (
                      <span className="text-ink-faint" title={t(S.admin.roleLocked)} aria-label={t(S.admin.roleLocked)}>
                        <LockIcon />
                      </span>
                    ) : canEdit ? (
                      <DeleteRole role={role} locale={locale} send={send} />
                    ) : null}
                  </div>
                </th>
              ))}

              {canEdit ? (
                <th className="border-l border-hairline-soft px-3 py-3 align-top" style={{ width: 64 }}>
                  <AddRole locale={locale} send={send} />
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {/* Зона видимости — не галочка, а выбор из трёх: столько их умеет
                сама выборка данных. Поэтому ячейка здесь ссылка, не тумблер. */}
            <tr className="border-b border-hairline-soft">
              <td className="sticky left-0 z-10 bg-surface-1 px-5 py-2.5">
                <span className="t-body-sm">{t(S.admin.roleScope)}</span>
              </td>
              {roles.map((role) => (
                <td key={role.id} className="border-l border-hairline-soft px-3 py-2.5 text-center">
                  <button
                    type="button"
                    disabled={!canEdit || role.system}
                    onClick={() => cycleScope(role)}
                    title={role.system ? t(S.admin.roleLocked) : t(S.admin.roleScopeHint)}
                    className="t-micro rounded-[6px] px-2 py-1 text-accent underline decoration-dashed underline-offset-4 transition-colors hover:bg-surface-2 disabled:cursor-default disabled:text-ink-muted disabled:no-underline disabled:hover:bg-transparent"
                  >
                    {scopeLabels[scopeOf(role)]}
                  </button>
                </td>
              ))}
              {canEdit ? <td className="border-l border-hairline-soft" /> : null}
            </tr>

            {sections.map((section) => {
              const on = open[section.id];
              return (
                <Section
                  key={section.id}
                  section={section}
                  open={on}
                  onToggle={() => setOpen((p) => ({ ...p, [section.id]: !p[section.id] }))}
                  roles={roles}
                  canEdit={canEdit}
                  has={has}
                  toggle={toggle}
                  span={roles.length + (canEdit ? 2 : 1)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Section({
  section, open, onToggle, roles, canEdit, has, toggle, span,
}: {
  section: MatrixSection;
  open: boolean;
  onToggle: () => void;
  roles: MatrixRole[];
  canEdit: boolean;
  has: (roleId: string, key: string) => boolean;
  toggle: (role: MatrixRole, row: MatrixRow) => void;
  span: number;
}) {
  return (
    <>
      <tr className="border-b border-hairline-soft">
        <td colSpan={span} className="p-0" style={{ background: "var(--color-surface-2)" }}>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="flex w-full items-center gap-2 px-5 py-2.5 text-left transition-colors hover:bg-surface-3"
          >
            <span
              className="flex text-ink-faint transition-transform duration-150"
              style={{ transform: open ? undefined : "rotate(-90deg)" }}
              aria-hidden
            >
              <ChevronIcon />
            </span>
            <span className="t-caption font-semibold">{section.title}</span>
            <span className="t-micro t-num ml-auto text-ink-faint">{section.rows.length}</span>
          </button>
        </td>
      </tr>

      {open
        ? section.rows.map((row) => (
            <tr key={row.key} className="row-hover border-b border-hairline-soft hover:bg-surface-2">
              <td className="sticky left-0 z-10 bg-surface-1 px-5 py-2">
                <span className="t-body-sm">{row.label}</span>
              </td>
              {roles.map((role) => (
                <td key={role.id} className="border-l border-hairline-soft px-3 py-2 text-center">
                  <Toggle
                    on={has(role.id, row.key)}
                    disabled={!canEdit || role.system}
                    label={`${row.label} — ${role.name}`}
                    onClick={() => toggle(role, row)}
                  />
                </td>
              ))}
              {canEdit ? <td className="border-l border-hairline-soft" /> : null}
            </tr>
          ))
        : null}
    </>
  );
}

function Toggle({
  on, disabled, label, onClick,
}: {
  on: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="relative inline-block h-[19px] w-[34px] rounded-full align-middle transition-colors disabled:opacity-50"
      style={{ background: on ? "var(--color-accent)" : "var(--color-surface-3)" }}
    >
      <span
        aria-hidden
        className="absolute left-[2px] top-[2px] h-[15px] w-[15px] rounded-full bg-white transition-transform duration-150"
        style={{
          transform: on ? "translateX(15px)" : undefined,
          boxShadow: "0 1px 2px rgb(16 24 40 / 0.25)",
        }}
      />
    </button>
  );
}

function AddRole({
  locale, send,
}: {
  locale: Locale;
  send: (a: (d: FormData) => Promise<void>, d: FormData) => void;
}) {
  const t = translator(locale);
  return (
    <button
      type="button"
      title={t(S.admin.roleAdd)}
      aria-label={t(S.admin.roleAdd)}
      onClick={() => {
        const data = new FormData();
        data.set("name", t(S.admin.roleNew));
        send(createRoleAction, data);
      }}
      className="btn-icon mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-hairline"
    >
      <IconPlus size={15} />
    </button>
  );
}

function DeleteRole({
  role, locale, send,
}: {
  role: MatrixRole;
  locale: Locale;
  send: (a: (d: FormData) => Promise<void>, d: FormData) => void;
}) {
  const t = translator(locale);
  // Пока на роли есть люди, удаление закрыто: иначе у них останется ссылка
  // в никуда, а тихо пересадить их на другую роль — тихо поменять им права.
  const busy = role.staff.length > 0;
  return (
    <button
      type="button"
      disabled={busy}
      title={busy ? t(S.admin.roleBusy) : t(S.admin.roleDelete)}
      aria-label={busy ? t(S.admin.roleBusy) : t(S.admin.roleDelete)}
      onClick={() => {
        if (busy) return;
        const data = new FormData();
        data.set("role", role.id);
        send(deleteRoleAction, data);
      }}
      className="t-micro rounded-[5px] px-1.5 py-0.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-[var(--color-status-risk)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-ink-faint"
    >
      ✕
    </button>
  );
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 6.5L8 10.5L12 6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.75 7V5a2.25 2.25 0 0 1 4.5 0v2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
