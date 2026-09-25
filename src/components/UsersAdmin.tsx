"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { setUserAccessAction, setUserRoleAction, setUserStatusAction } from "@/app/actions";
import { Modal, Select } from "./controls";
import { IconEye, IconEyeOff } from "./icons";
import { Avatar, StatusDot } from "./ui";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

export interface AccessModule {
  key: string;
  label: string;
}

export interface AdminUserRow {
  id: string;
  name: string;
  title: string;
  email: string;
  role: string;
  roleLabel: string;
  status: "active" | "invited" | "suspended";
  scopeLabel: string;
  branchLabel: string;
  joinedAt: string;
  isLastOwner: boolean;
  /** ссылка на /invite/{token} для приглашённого сотрудника: почты нет, копирует админ */
  inviteUrl?: string | null;
  /** разделы, которые роль этого человека видит и которые можно ему закрыть */
  accessModules: AccessModule[];
  /** ключи разделов, уже закрытых лично этому сотруднику */
  restrictedModules: string[];
}

const STATUS_DOT: Record<AdminUserRow["status"], string> = {
  active: "var(--color-status-deal)",
  invited: "var(--color-status-progress)",
  suspended: "var(--color-status-hold)",
};

/**
 * Пользователи портала: роль и доступ меняются прямо в списке.
 * Последнего владельца понизить нельзя — иначе агентство останется
 * без доступа к тарифу и домену.
 */
export function UsersAdmin({
  rows,
  roles,
  locale,
  canEdit,
}: {
  rows: AdminUserRow[];
  roles: { value: string; label: string; hint: string }[];
  locale: Locale;
  canEdit: boolean;
}) {
  const t = translator(locale);

  return (
    <div className="card overflow-hidden">
      <div className="scroll-x">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="border-b border-hairline-soft">
              {[
                S.staffReports.employee,
                S.team.role,
                S.admin.scope,
                S.team.status,
                S.team.hiredAt,
              ].map((head) => (
                <th
                  key={head.ru}
                  className="t-micro whitespace-nowrap px-5 py-3 text-left font-medium uppercase tracking-[0.07em] text-ink-faint"
                >
                  {t(head)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-hairline-soft last:border-b-0">
                <td className="px-5 py-3.5">
                  <Link href={`/team/${row.id}`} className="flex items-center gap-3">
                    <Avatar name={row.name} size={30} />
                    <span className="min-w-0">
                      <span className="t-body-sm block truncate">{row.name}</span>
                      <span className="t-micro block truncate text-ink-faint">{row.email}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-3.5">
                  {canEdit && !row.isLastOwner ? (
                    <RolePicker userId={row.id} role={row.role} roles={roles} locale={locale} />
                  ) : (
                    <span className="t-caption">{row.roleLabel}</span>
                  )}
                </td>
                <td className="t-caption px-5 py-3.5 text-ink-muted">
                  {row.scopeLabel}
                  <span className="t-micro block text-ink-faint">{row.branchLabel}</span>
                  {canEdit && row.role !== "owner" && row.accessModules.length ? (
                    <AccessControl row={row} locale={locale} />
                  ) : null}
                </td>
                <td className="px-5 py-3.5">
                  <span className="chip">
                    <StatusDot color={STATUS_DOT[row.status]} />
                    {t(
                      row.status === "active"
                        ? S.team.active
                        : row.status === "invited"
                          ? S.team.invited
                          : S.team.suspended,
                    )}
                  </span>
                  {row.status === "invited" && row.inviteUrl ? (
                    <CopyInviteLink url={row.inviteUrl} locale={locale} />
                  ) : null}
                </td>
                <td className="px-5 py-3.5">
                  <div className="t-caption t-num whitespace-nowrap">{row.joinedAt}</div>
                  {canEdit && !row.isLastOwner ? (
                    <form action={setUserStatusAction} className="mt-1.5">
                      <input type="hidden" name="userId" value={row.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={row.status === "suspended" ? "active" : "suspended"}
                      />
                      <button className="t-micro text-ink-faint underline-offset-2 hover:text-ink hover:underline">
                        {t(row.status === "suspended" ? S.admin.unblock : S.admin.block)}
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Персональный доступ сотрудника. Админ отмечает разделы, которые этому
 * человеку видеть не нужно — глазом «скрыт»/«виден». Это сужение поверх
 * роли: список показывает только то, что роль вообще открывает.
 */
function AccessControl({ row, locale }: { row: AdminUserRow; locale: Locale }) {
  const t = translator(locale);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState<string[]>(row.restrictedModules);

  const toggle = (key: string) =>
    setHidden((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const hiddenCount = row.restrictedModules.length;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setHidden(row.restrictedModules);
          setOpen(true);
        }}
        className="t-micro mt-1.5 block text-ink-faint underline-offset-2 hover:text-ink hover:underline"
      >
        {hiddenCount
          ? `${t(S.access.title)} · ${t(S.access.hiddenCount)} ${hiddenCount}`
          : t(S.access.manage)}
      </button>

      {open ? (
        <Modal
          open
          onClose={() => setOpen(false)}
          title={`${t(S.access.title)} · ${row.name}`}
          footer={
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
                {t(S.common.cancel)}
              </button>
              <button type="submit" form={`access-${row.id}`} className="btn btn-primary btn-sm">
                {t(S.common.done)}
              </button>
            </>
          }
        >
          <p className="t-caption mb-4 leading-relaxed text-ink-muted">{t(S.access.hint)}</p>
          <form
            id={`access-${row.id}`}
            action={(data) => {
              setOpen(false);
              return setUserAccessAction(data);
            }}
            className="space-y-1"
          >
            <input type="hidden" name="userId" value={row.id} />
            {hidden.map((key) => (
              <input key={key} type="hidden" name="hidden" value={key} />
            ))}
            {row.accessModules.map((m) => {
              const isHidden = hidden.includes(m.key);
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => toggle(m.key)}
                  className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-surface-1"
                  style={{ opacity: isHidden ? 0.55 : 1 }}
                >
                  <span
                    className="flex h-7 w-7 flex-none items-center justify-center rounded-[8px]"
                    style={{
                      background: isHidden ? "var(--color-surface-2)" : "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                      color: isHidden ? "var(--color-ink-faint)" : "var(--color-accent)",
                    }}
                  >
                    {isHidden ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                  </span>
                  <span className="t-caption flex-1">{m.label}</span>
                  <span className="t-micro text-ink-faint">
                    {t(isHidden ? S.access.hidden : S.access.visible)}
                  </span>
                </button>
              );
            })}
          </form>
        </Modal>
      ) : null}
    </>
  );
}

/** Почты нет — ссылку на /invite/{token} админ копирует и отправляет сам. */
function CopyInviteLink({ url, locale }: { url: string; locale: Locale }) {
  const t = translator(locale);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* буфер обмена недоступен (нет разрешения/протокола) — молча не показываем «скопировано» */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="t-micro mt-1.5 block text-accent underline-offset-2 hover:underline"
    >
      {copied ? t(S.admin.linkCopied) : t(S.admin.copyInviteLink)}
    </button>
  );
}

function RolePicker({
  userId,
  role,
  roles,
  locale,
}: {
  userId: string;
  role: string;
  roles: { value: string; label: string; hint: string }[];
  locale: Locale;
}) {
  const field = useRef<HTMLInputElement>(null);

  return (
    <form action={setUserRoleAction}>
      <input type="hidden" name="userId" value={userId} />
      <input ref={field} type="hidden" name="role" defaultValue={role} />
      <Select
        locale={locale}
        width={210}
        value={role}
        options={roles}
        onChange={(next) => {
          if (field.current) field.current.value = next;
          field.current?.form?.requestSubmit();
        }}
      />
    </form>
  );
}
