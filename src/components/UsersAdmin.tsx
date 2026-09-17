"use client";

import Link from "next/link";
import { useRef } from "react";
import { setUserRoleAction, setUserStatusAction } from "@/app/actions";
import { Select } from "./controls";
import { Avatar, StatusDot } from "./ui";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

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
