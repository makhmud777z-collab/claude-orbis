"use client";

import { useState } from "react";
import { inviteUserAction } from "@/app/actions";
import { Modal, Select } from "./controls";
import { IconPlus } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

/**
 * Приглашение сотрудника. В демо карточка появляется сразу со статусом
 * «приглашён»; в бою на этом месте письмо со ссылкой на регистрацию,
 * но набор полей и права те же.
 */
export function InviteDialog({
  locale,
  roles,
  branches,
  defaultBranchId,
}: {
  locale: Locale;
  roles: { value: string; label: string; hint?: string }[];
  branches: { value: string; label: string }[];
  defaultBranchId: string;
}) {
  const t = translator(locale);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(roles[0]?.value ?? "sales_manager");
  const [branch, setBranch] = useState(defaultBranchId);

  return (
    <>
      <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        <IconPlus size={15} /> {t(S.admin.invite)}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t(S.admin.invite)} width={480}>
        <form
          action={(data) => {
            setOpen(false);
            return inviteUserAction(data);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="branchId" value={branch} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.team.fullName)}</span>
              <input name="name" required autoFocus className="field text-[13px]" />
            </label>
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">Email</span>
              <input name="email" type="email" required className="field text-[13px]" />
            </label>
          </div>

          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.team.position)}</span>
            <input name="title" className="field text-[13px]" />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.admin.changeRole)}</span>
              <Select locale={locale} width="100%" value={role} options={roles} onChange={setRole} />
            </label>
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.settings.branches)}</span>
              <Select locale={locale} width="100%" value={branch} options={branches} onChange={setBranch} />
            </label>
          </div>

          <p className="t-micro leading-relaxed text-ink-faint">{t(S.admin.inviteHint)}</p>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>
              {t(S.common.cancel)}
            </button>
            <button type="submit" className="btn btn-primary btn-sm">{t(S.admin.invite)}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
