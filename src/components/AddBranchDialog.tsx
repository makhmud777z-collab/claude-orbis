"use client";

import { useState } from "react";
import { addBranchAction } from "@/app/actions";
import { Modal } from "./controls";
import { IconPlus } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

/** Новый филиал агентства: город и название — то, что видно в карточках. */
export function AddBranchDialog({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn btn-secondary btn-sm mt-4 w-full" onClick={() => setOpen(true)}>
        <IconPlus size={14} /> {t(S.settings.addBranch)}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t(S.settings.addBranch)} width={420}>
        <form
          action={(data) => {
            setOpen(false);
            return addBranchAction(data);
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.settings.branchName)}</span>
            <input name="name" required autoFocus className="field text-[13px]" />
          </label>
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.students.colCity)}</span>
            <input name="city" required className="field text-[13px]" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>
              {t(S.common.cancel)}
            </button>
            <button type="submit" className="btn btn-primary btn-sm">{t(S.common.add)}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
