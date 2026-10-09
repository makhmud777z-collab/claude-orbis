"use client";

import { useState } from "react";
import {
  addChecklistItemAction, moveChecklistItemAction, removeChecklistItemAction,
  toggleChecklistApostilleAction, updateChecklistItemAction,
} from "@/app/actions";
import { Modal } from "./controls";
import { IconArrowDown, IconArrowUp, IconPencil, IconPlus, IconTrash } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

export interface ChecklistRow {
  id: string;
  ru: string;
  uz: string;
  needsApostille: boolean;
  /** в скольких досье этот пункт уже заведён — удаление их не тронет */
  used: number;
}

/**
 * Чек-лист документов агентства.
 *
 * Порядок пунктов — это порядок, в котором куратор их собирает, поэтому
 * он правится стрелками и сохраняется: список, который нельзя
 * переставить, рано или поздно перестают читать сверху вниз.
 *
 * Апостиль вынесен отдельным переключателем, а не спрятан в диалог: это
 * первое, что спрашивает семья, и видеть его нужно в самом списке.
 */
export function ChecklistAdmin({
  rows,
  locale,
  canEdit,
}: {
  rows: ChecklistRow[];
  locale: Locale;
  canEdit: boolean;
}) {
  const t = translator(locale);
  const [editing, setEditing] = useState<ChecklistRow | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <div className="card overflow-hidden">
        <div >
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="row-hover flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline-soft px-5 py-3 last:border-b-0 hover:bg-surface-2"
            >
              <span className="t-micro t-num w-5 flex-none text-ink-faint">{index + 1}</span>

              <div className="min-w-0 flex-1">
                <div className="t-body-sm truncate">{row.ru}</div>
                <div className="t-micro truncate text-ink-faint">{row.uz}</div>
              </div>

              {canEdit ? (
                <form action={toggleChecklistApostilleAction} className="flex-none">
                  <input type="hidden" name="itemId" value={row.id} />
                  <button
                    className={`chip ${row.needsApostille ? "chip-active" : ""}`}
                    title={t(S.checklist.apostilleHint)}
                  >
                    {t(S.checklist.apostille)}
                  </button>
                </form>
              ) : row.needsApostille ? (
                <span className="chip chip-active flex-none">{t(S.checklist.apostille)}</span>
              ) : null}

              {canEdit ? (
                <div className="flex flex-none items-center gap-0.5">
                  <form action={moveChecklistItemAction}>
                    <input type="hidden" name="itemId" value={row.id} />
                    <input type="hidden" name="delta" value="-1" />
                    <button
                      className="btn-icon h-7 w-7"
                      disabled={index === 0}
                      aria-label={t(S.checklist.up)}
                      title={t(S.checklist.up)}
                    >
                      <IconArrowUp size={13} />
                    </button>
                  </form>
                  <form action={moveChecklistItemAction}>
                    <input type="hidden" name="itemId" value={row.id} />
                    <input type="hidden" name="delta" value="1" />
                    <button
                      className="btn-icon h-7 w-7"
                      disabled={index === rows.length - 1}
                      aria-label={t(S.checklist.down)}
                      title={t(S.checklist.down)}
                    >
                      <IconArrowDown size={13} />
                    </button>
                  </form>
                  <button
                    type="button"
                    className="btn-icon h-7 w-7"
                    onClick={() => setEditing(row)}
                    aria-label={t(S.common.edit)}
                    title={t(S.common.edit)}
                  >
                    <IconPencil size={13} />
                  </button>
                  <form action={removeChecklistItemAction}>
                    <input type="hidden" name="itemId" value={row.id} />
                    <button
                      className="btn-icon h-7 w-7"
                      aria-label={t(S.common.delete)}
                      title={
                        row.used
                          ? `${t(S.checklist.usedHint)} ${row.used}`
                          : t(S.common.delete)
                      }
                    >
                      <IconTrash size={13} />
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {canEdit ? (
        <button type="button" className="btn btn-secondary btn-sm mt-4" onClick={() => setAdding(true)}>
          <IconPlus size={14} /> {t(S.checklist.add)}
        </button>
      ) : null}

      {adding ? <ItemDialog locale={locale} onClose={() => setAdding(false)} /> : null}
      {editing ? (
        <ItemDialog key={editing.id} row={editing} locale={locale} onClose={() => setEditing(null)} />
      ) : null}
    </>
  );
}

function ItemDialog({
  row,
  locale,
  onClose,
}: {
  row?: ChecklistRow;
  locale: Locale;
  onClose: () => void;
}) {
  const t = translator(locale);
  const [ru, setRu] = useState(row?.ru ?? "");

  return (
    <Modal
      open
      onClose={onClose}
      title={row ? t(S.checklist.edit) : t(S.checklist.add)}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t(S.common.cancel)}
          </button>
          <button
            type="submit"
            form="checklist-item"
            className="btn btn-primary btn-sm"
            disabled={!ru.trim()}
          >
            {t(S.common.save)}
          </button>
        </>
      }
    >
      <form
        id="checklist-item"
        action={row ? updateChecklistItemAction : addChecklistItemAction}
        onSubmit={onClose}
      >
        {row ? <input type="hidden" name="itemId" value={row.id} /> : null}

        <label className="mb-3.5 block">
          <span className="t-caption mb-1.5 block text-ink-muted">{t(S.checklist.nameRu)}</span>
          <input
            autoFocus
            name="ru"
            className="field w-full"
            value={ru}
            onChange={(e) => setRu(e.target.value)}
          />
        </label>

        <label className="mb-3.5 block">
          <span className="t-caption mb-1.5 flex items-baseline gap-2 text-ink-muted">
            {t(S.checklist.nameUz)}
            <span className="t-micro text-ink-faint">{t(S.checklist.nameUzHint)}</span>
          </span>
          <input name="uz" defaultValue={row?.uz ?? ""} className="field w-full" />
        </label>

        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            name="apostille"
            defaultChecked={row?.needsApostille ?? false}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          <span className="t-body-sm">{t(S.checklist.apostille)}</span>
          <span className="t-micro text-ink-faint">{t(S.checklist.apostilleHint)}</span>
        </label>
      </form>
    </Modal>
  );
}
