"use client";

import { useState } from "react";
import { setPermissionAction } from "@/app/actions";
import { Modal } from "./controls";
import { IconCheck } from "./icons";
import { StatusDot } from "./ui";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

export interface MatrixRole {
  key: string;
  label: string;
  description: string;
  scopeLabel: string;
}

export interface MatrixModule {
  key: string;
  label: string;
}

export interface MatrixAction {
  key: string;
  label: string;
}

/** Уровень доступа одной ячейки: какие действия открыты роли в разделе. */
export type Grid = Record<string, Record<string, string[]>>;

/**
 * Матрица прав, которую можно менять.
 * В Битриксе это отдельный экран настроек CRM; здесь тот же смысл:
 * директор агентства сам решает, кто видит финансы, а кто только свои сделки.
 * Изменения сразу отражаются в меню и в данных сотрудника.
 */
export function PermissionsMatrix({
  roles,
  modules,
  actions,
  grid,
  locale,
  canEdit,
}: {
  roles: MatrixRole[];
  modules: MatrixModule[];
  actions: MatrixAction[];
  grid: Grid;
  locale: Locale;
  canEdit: boolean;
}) {
  const t = translator(locale);
  const [cell, setCell] = useState<{ role: MatrixRole; module: MatrixModule } | null>(null);

  const level = (roleKey: string, moduleKey: string) => {
    const list = grid[roleKey]?.[moduleKey] ?? [];
    if (!list.length) return { text: "—", tone: "var(--color-hairline)" };
    if (list.includes("delete")) return { text: t(S.team.levelFull), tone: "var(--color-ink)" };
    if (list.includes("edit")) return { text: t(S.team.levelEdit), tone: "var(--color-ink-muted)" };
    return { text: t(S.team.levelRead), tone: "var(--color-ink-faint)" };
  };

  return (
    <>
      <div className="card overflow-hidden">
        <div className="scroll-x">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead>
              <tr className="border-b border-hairline-soft">
                <th className="t-micro sticky left-0 z-10 bg-surface-1 px-5 py-3 text-left font-medium uppercase tracking-[0.07em] text-ink-faint">
                  {t(S.team.role)}
                </th>
                {modules.map((module) => (
                  <th
                    key={module.key}
                    className="t-micro whitespace-nowrap px-2 py-3 text-center font-medium uppercase tracking-[0.07em] text-ink-faint"
                  >
                    {module.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.key} className="border-b border-hairline-soft last:border-b-0">
                  <td className="sticky left-0 z-10 bg-surface-1 px-5 py-3">
                    <div className="t-body-sm">{role.label}</div>
                    <div className="t-micro max-w-[260px] text-ink-faint">{role.scopeLabel}</div>
                  </td>
                  {modules.map((module) => {
                    const state = level(role.key, module.key);
                    return (
                      <td key={module.key} className="px-2 py-3 text-center">
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => setCell({ role, module })}
                          className="t-micro rounded-[7px] px-2 py-1.5 transition-colors hover:bg-surface-2"
                          style={{ color: state.tone, cursor: canEdit ? "pointer" : "default" }}
                        >
                          {state.text}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {cell ? (
        <CellDialog
          key={`${cell.role.key}_${cell.module.key}`}
          role={cell.role}
          module={cell.module}
          actions={actions}
          current={grid[cell.role.key]?.[cell.module.key] ?? []}
          locale={locale}
          onClose={() => setCell(null)}
        />
      ) : null}
    </>
  );
}

function CellDialog({
  role,
  module,
  actions,
  current,
  locale,
  onClose,
}: {
  role: MatrixRole;
  module: MatrixModule;
  actions: MatrixAction[];
  current: string[];
  locale: Locale;
  onClose: () => void;
}) {
  const t = translator(locale);
  const [picked, setPicked] = useState<string[]>(current);

  // Без просмотра остальные действия бессмысленны: раздел просто не виден.
  const toggle = (key: string) =>
    setPicked((prev) => {
      if (key === "view" && prev.includes("view")) return [];
      const next = prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key];
      return next.length && !next.includes("view") ? ["view", ...next] : next;
    });

  return (
    <Modal
      open
      onClose={onClose}
      title={`${role.label} · ${module.label}`}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t(S.common.reset)}
          </button>
          <button type="submit" form="permission-form" className="btn btn-primary btn-sm">
            {t(S.common.save)}
          </button>
        </>
      }
    >
      <p className="t-caption mb-4 text-ink-muted">{role.description}</p>

      <form
        id="permission-form"
        action={(data) => {
          onClose();
          return setPermissionAction(data);
        }}
        className="space-y-1"
      >
        <input type="hidden" name="role" value={role.key} />
        <input type="hidden" name="module" value={module.key} />

        {actions.map((action) => {
          const on = picked.includes(action.key);
          return (
            <label
              key={action.key}
              className="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 transition-colors hover:bg-surface-1"
            >
              <span
                className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] border transition-colors"
                style={{
                  borderColor: on ? "var(--color-ink)" : "var(--color-hairline)",
                  background: on ? "var(--color-ink)" : "transparent",
                  color: "#000",
                }}
              >
                {on ? <IconCheck size={11} strokeWidth={3.2} /> : null}
              </span>
              <span className="t-caption flex-1">{action.label}</span>
              {action.key === "view" ? (
                <StatusDot color="var(--color-accent)" />
              ) : null}
              <input
                type="checkbox"
                name="action"
                value={action.key}
                checked={on}
                onChange={() => toggle(action.key)}
                className="sr-only"
              />
            </label>
          );
        })}
      </form>
    </Modal>
  );
}
