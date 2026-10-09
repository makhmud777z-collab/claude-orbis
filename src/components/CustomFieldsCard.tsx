"use client";

import { useState } from "react";
import { setCustomValuesAction } from "@/app/actions";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

export interface ContactCustomField {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options: string[];
  value: string;
}

/**
 * Пользовательские поля на карточке контакта. Набор задаёт агентство в
 * администрировании; здесь сотрудник заполняет значения. Правится блоком
 * целиком с «Отмена / Готово», как основные поля карточки.
 */
export function CustomFieldsCard({
  entity,
  entityId,
  fields,
  locale,
  canEdit,
}: {
  entity: "contact" | "lead" | "deal";
  entityId: string;
  fields: ContactCustomField[];
  locale: Locale;
  canEdit: boolean;
}) {
  const t = translator(locale);
  const [editing, setEditing] = useState(false);

  if (!fields.length) return null;

  const displayValue = (field: ContactCustomField) => field.value || "—";

  if (!editing) {
    return (
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="t-headline">{t(S.customFields.cardTitle)}</div>
          {canEdit ? (
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
              {t(S.common.edit)}
            </button>
          ) : null}
        </div>
        <dl>
          {fields.map((field) => (
            <div
              key={field.id}
              className="flex items-baseline justify-between gap-4 border-b border-hairline-soft py-2.5 last:border-b-0"
            >
              <dt className="t-caption text-ink-muted">{field.label}</dt>
              <dd className="t-body-sm min-w-0 text-right">{displayValue(field)}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <form
      action={(data) => {
        setEditing(false);
        return setCustomValuesAction(data);
      }}
      className="card p-4"
    >
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="entityId" value={entityId} />

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="t-headline">{t(S.customFields.cardTitle)}</div>
        <div className="flex gap-1.5">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
            {t(S.common.cancel)}
          </button>
          <button type="submit" className="btn btn-primary btn-sm">
            {t(S.common.done)}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {fields.map((field) => (
          <label key={field.id} className="block">
            <span className="t-micro mb-1 block text-ink-faint">{field.label}</span>
            {field.type === "select" ? (
              <select name={`cf_${field.id}`} defaultValue={field.value} className="field text-[13px]">
                <option value="">—</option>
                {field.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                name={`cf_${field.id}`}
                type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                defaultValue={field.value}
                className="field text-[13px]"
              />
            )}
          </label>
        ))}
      </div>
    </form>
  );
}
