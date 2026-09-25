"use client";

import { useState } from "react";
import { addCustomFieldAction, removeCustomFieldAction } from "@/app/actions";
import { Modal } from "./controls";
import { Check } from "./Check";
import { IconPlus, IconTrash } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

export type FieldEntity = "contact" | "lead" | "deal";

export interface CustomFieldRow {
  id: string;
  entity: FieldEntity;
  labelRu: string;
  labelUz: string;
  typeLabel: string;
  type: "text" | "number" | "date" | "select";
  options: string[];
}

const ENTITY_ORDER: FieldEntity[] = ["contact", "lead", "deal"];
const ENTITY_LABEL: Record<FieldEntity, typeof S.customFields.entityContact> = {
  contact: S.customFields.entityContact,
  lead: S.customFields.entityLead,
  deal: S.customFields.entityDeal,
};

/**
 * Пользовательские поля контакта — агентство ведёт их само.
 * Добавление через диалог с «Отмена / Готово»; удаление — сразу, но поле
 * с накопленными значениями просто исчезает из карточек, данные не портит.
 */
export function CustomFieldsAdmin({
  rows,
  locale,
  canEdit,
}: {
  rows: CustomFieldRow[];
  locale: Locale;
  canEdit: boolean;
}) {
  const t = translator(locale);
  const [adding, setAdding] = useState(false);

  const groups = ENTITY_ORDER.map((entity) => ({
    entity,
    label: t(ENTITY_LABEL[entity]),
    items: rows.filter((r) => r.entity === entity),
  })).filter((g) => g.items.length);

  return (
    <>
      {groups.length ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.entity}>
              <div className="t-micro mb-2 uppercase tracking-[0.07em] text-ink-faint">{group.label}</div>
              <div className="card divide-y divide-hairline-soft overflow-hidden">
                {group.items.map((row) => (
                  <div key={row.id} className="page-in flex items-center gap-3 px-5 py-3.5">
                    <span className="min-w-0 flex-1">
                      <span className="t-body-sm block truncate">{row.labelRu}</span>
                      <span className="t-micro block truncate text-ink-faint">
                        {row.labelUz}
                        {row.type === "select" && row.options.length ? ` · ${row.options.join(", ")}` : ""}
                      </span>
                    </span>
                    <span className="chip flex-none">{row.typeLabel}</span>
                    {canEdit ? (
                      <form action={removeCustomFieldAction}>
                        <input type="hidden" name="fieldId" value={row.id} />
                        <button className="btn-icon h-7 w-7" aria-label={t(S.customFields.remove)} title={t(S.customFields.remove)}>
                          <IconTrash size={13} />
                        </button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="card px-5 py-10 text-center">
          <p className="t-caption mx-auto max-w-[420px] leading-relaxed text-ink-muted">
            {t(S.customFields.empty)}
          </p>
        </div>
      )}

      {canEdit ? (
        <button type="button" className="btn btn-secondary mt-5" onClick={() => setAdding(true)}>
          <IconPlus size={15} /> {t(S.customFields.add)}
        </button>
      ) : null}

      {adding ? <AddFieldDialog locale={locale} onClose={() => setAdding(false)} /> : null}
    </>
  );
}

function AddFieldDialog({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const t = translator(locale);
  const [type, setType] = useState<CustomFieldRow["type"]>("text");
  const [entity, setEntity] = useState<FieldEntity>("contact");

  const types: { value: CustomFieldRow["type"]; label: string }[] = [
    { value: "text", label: t(S.customFields.typeText) },
    { value: "number", label: t(S.customFields.typeNumber) },
    { value: "date", label: t(S.customFields.typeDate) },
    { value: "select", label: t(S.customFields.typeSelect) },
  ];
  const entities: { value: FieldEntity; label: string }[] = ENTITY_ORDER.map((e) => ({
    value: e,
    label: t(ENTITY_LABEL[e]),
  }));

  return (
    <Modal
      open
      onClose={onClose}
      title={t(S.customFields.newField)}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t(S.common.cancel)}
          </button>
          <button type="submit" form="add-field" className="btn btn-primary btn-sm">
            {t(S.common.done)}
          </button>
        </>
      }
    >
      <form
        id="add-field"
        action={(data) => {
          onClose();
          return addCustomFieldAction(data);
        }}
        className="space-y-4"
      >
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="entity" value={entity} />

        <div>
          <span className="t-micro mb-2 block text-ink-faint">{t(S.customFields.entity)}</span>
          <div className="flex flex-wrap gap-1.5">
            {entities.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setEntity(item.value)}
                className={`chip ${entity === item.value ? "chip-active" : ""}`}
              >
                <Check on={entity === item.value} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.customFields.nameRu)}</span>
            <input autoFocus required name="labelRu" className="field text-[13px]" />
          </label>
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.customFields.nameUz)}</span>
            <input name="labelUz" className="field text-[13px]" />
          </label>
        </div>

        <div>
          <span className="t-micro mb-2 block text-ink-faint">{t(S.customFields.type)}</span>
          <div className="flex flex-wrap gap-1.5">
            {types.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setType(item.value)}
                className={`chip ${type === item.value ? "chip-active" : ""}`}
              >
                <Check on={type === item.value} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {type === "select" ? (
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.customFields.options)}</span>
            <textarea
              name="options"
              rows={4}
              className="field resize-none text-[13px]"
              placeholder={t(S.customFields.optionsHint)}
            />
            <span className="t-micro mt-1 block text-ink-faint">{t(S.customFields.optionsHint)}</span>
          </label>
        ) : null}
      </form>
    </Modal>
  );
}
