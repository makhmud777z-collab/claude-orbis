"use client";

import { useState } from "react";
import { updateCardAction } from "@/app/actions";
import { DatePicker, Select, type Option } from "./controls";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

export interface EditableField {
  name: string;
  label: string;
  /** значение для формы: то, что уйдёт на сервер */
  value: string;
  /** как показать поле, когда карточка не в режиме правки */
  display: string;
  kind?: "text" | "textarea" | "date" | "number" | "select";
  options?: Option[];
}

/**
 * Блок основных полей карточки с кнопкой «Изменить» — как в Битриксе:
 * обычно карточка читается, а правка включается на месте и целым блоком,
 * чтобы не сохранять по одному полю и не терять связанные значения.
 */
export function EditableFields({
  entity,
  id,
  title,
  fields,
  locale,
  canEdit,
}: {
  entity: "lead" | "deal" | "contact";
  id: string;
  title: string;
  fields: EditableField[];
  locale: Locale;
  canEdit: boolean;
}) {
  const t = translator(locale);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const valueOf = (field: EditableField) => draft[field.name] ?? field.value;

  if (!editing) {
    return (
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="t-headline">{title}</div>
          {canEdit ? (
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
              {t(S.crm.edit)}
            </button>
          ) : null}
        </div>
        <dl>
          {fields.map((field) => (
            <div
              key={field.name}
              className="flex items-baseline justify-between gap-4 border-b border-hairline-soft py-2.5 last:border-b-0"
            >
              <dt className="t-caption text-ink-muted">{field.label}</dt>
              <dd className="t-body-sm min-w-0 text-right">{field.display || "—"}</dd>
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
        setDraft({});
        return updateCardAction(data);
      }}
      className="card p-4"
    >
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="t-headline">{title}</div>
        <div className="flex gap-1.5">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setEditing(false);
              setDraft({});
            }}
          >
            {t(S.common.reset)}
          </button>
          <button type="submit" className="btn btn-primary btn-sm">
            {t(S.common.save)}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {fields.map((field) => (
          <label key={field.name} className="block">
            <span className="t-micro mb-1 block text-ink-faint">{field.label}</span>
            {field.kind === "select" ? (
              <>
                <input type="hidden" name={field.name} value={valueOf(field)} />
                <Select
                  locale={locale}
                  width="100%"
                  value={valueOf(field)}
                  options={field.options ?? []}
                  onChange={(next) => setDraft((prev) => ({ ...prev, [field.name]: next }))}
                />
              </>
            ) : field.kind === "date" ? (
              <DatePicker
                name={field.name}
                value={valueOf(field)}
                locale={locale}
                onChange={(next) => setDraft((prev) => ({ ...prev, [field.name]: next }))}
              />
            ) : field.kind === "textarea" ? (
              <textarea
                name={field.name}
                defaultValue={field.value}
                rows={3}
                className="field resize-none text-[13px]"
              />
            ) : (
              <input
                name={field.name}
                inputMode={field.kind === "number" ? "numeric" : undefined}
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
