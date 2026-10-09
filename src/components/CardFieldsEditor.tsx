"use client";

import { useState } from "react";
import { setCardFieldsAction } from "@/app/actions";
import { Check } from "./Check";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

/**
 * Какие поля показывать на карточке канбана. Раньше это жило в модалке
 * прямо над доской — и любой менеджер мог перекроить вид доски всему
 * агентству. Теперь настройка там же, где все остальные.
 */
export function CardFieldsEditor({
  fields,
  allFields,
  locale,
}: {
  fields: string[];
  allFields: { key: string; label: string }[];
  locale: Locale;
}) {
  const t = translator(locale);
  const [picked, setPicked] = useState(fields);
  const dirty = picked.join() !== fields.join();

  const toggle = (key: string) =>
    setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <form action={setCardFieldsAction} className="card overflow-hidden">
      <div className="card-head">
        <span className="t-caption">{t(S.pipelines.cardView)}</span>
        <span className="t-micro mt-0.5 block text-ink-faint">{t(S.pipelines.cardViewHint)}</span>
      </div>

      <div className="divide-y divide-hairline-soft">
        {allFields.map((field) => (
          <label
            key={field.key}
            className="flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2"
          >
            <Check on={picked.includes(field.key)} />
            <span className="t-body-sm flex-1">{field.label}</span>
            <input
              type="checkbox"
              name="field"
              value={field.key}
              checked={picked.includes(field.key)}
              onChange={() => toggle(field.key)}
              className="sr-only"
            />
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-hairline-soft px-5 py-4">
        <button
          type="button"
          onClick={() => setPicked(fields)}
          className="btn btn-ghost btn-sm"
          disabled={!dirty}
        >
          {t(S.common.cancel)}
        </button>
        <button className="btn btn-primary btn-sm" disabled={!dirty}>
          {t(S.common.save)}
        </button>
      </div>
    </form>
  );
}
