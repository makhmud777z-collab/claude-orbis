"use client";

import { useState } from "react";
import { updateAgencyAction } from "@/app/actions";
import { Field } from "./ui";
import { IconPencil } from "./icons";
import { LOCALES, translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

/**
 * Профиль агентства — редактируемый прямо в портале.
 *
 * Раньше имя, монограмма и язык были только для чтения: чтобы их поменять,
 * агентство писало разработчику. Теперь это обычная карточка с режимом
 * правки и явными «Готово / Отмена» — как остальные настройки портала.
 * Валюта, дата и подсказка про курс остаются справочными.
 */
export function AgencyProfileCard({
  name,
  legalName,
  mark,
  locale,
  usdRate,
  usdRateLabel,
  currencyLabel,
  createdLabel,
  rateHint,
  canEdit,
  uiLocale,
}: {
  name: string;
  legalName: string;
  mark: string;
  locale: Locale;
  usdRate: number;
  usdRateLabel: string;
  currencyLabel: string;
  createdLabel: string;
  rateHint: string;
  canEdit: boolean;
  uiLocale: Locale;
}) {
  const t = translator(uiLocale);
  const [editing, setEditing] = useState(false);
  const [pickedLocale, setPickedLocale] = useState<Locale>(locale);

  const heading = (
    <div className="mb-3 flex items-center justify-between gap-2">
      <span className="t-caption uppercase tracking-[0.07em] text-ink-faint">{t(S.settings.agency)}</span>
      {canEdit && !editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="btn btn-ghost btn-sm"
        >
          <IconPencil size={13} /> {t(S.common.edit)}
        </button>
      ) : null}
    </div>
  );

  if (!editing) {
    return (
      <div className="card p-5">
        {heading}
        <Field label={t(S.settings.name)} value={name} />
        <Field label={t(S.settings.legalName)} value={legalName} />
        <Field label={t(S.settings.monogram)} value={mark} />
        <Field
          label={t(S.settings.interfaceLanguage)}
          value={LOCALES.find((l) => l.key === locale)?.label ?? locale}
        />
        <Field label={t(S.settings.currency)} value={currencyLabel} />
        <Field label={t(S.settings.usdRate)} value={usdRateLabel} />
        <Field label={t(S.settings.inSystemSince)} value={createdLabel} />
        <p className="t-micro mt-3 leading-relaxed text-ink-faint">{rateHint}</p>
      </div>
    );
  }

  return (
    <form
      action={(data) => {
        setEditing(false);
        return updateAgencyAction(data);
      }}
      className="card p-5"
    >
      <input type="hidden" name="locale" value={pickedLocale} />
      {heading}

      <div className="space-y-3">
        <label className="block">
          <span className="t-micro mb-1 block text-ink-faint">{t(S.settings.name)}</span>
          <input name="name" required defaultValue={name} className="field text-[13px]" />
        </label>
        <label className="block">
          <span className="t-micro mb-1 block text-ink-faint">{t(S.settings.legalName)}</span>
          <input name="legalName" defaultValue={legalName} className="field text-[13px]" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.settings.monogram)}</span>
            <input name="mark" maxLength={2} defaultValue={mark} className="field text-[13px] uppercase" />
          </label>
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.settings.usdRate)}</span>
            <input
              name="usdRate"
              type="number"
              min={1}
              defaultValue={usdRate}
              className="field t-num text-[13px]"
            />
          </label>
        </div>
        <div>
          <span className="t-micro mb-1 block text-ink-faint">{t(S.settings.interfaceLanguage)}</span>
          <div className="flex gap-1.5">
            {LOCALES.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => setPickedLocale(l.key)}
                className={`chip flex-1 justify-center ${pickedLocale === l.key ? "chip-active" : ""}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-hairline-soft pt-4">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="btn btn-ghost btn-sm"
        >
          {t(S.common.cancel)}
        </button>
        <button className="btn btn-primary btn-sm">{t(S.common.done)}</button>
      </div>
    </form>
  );
}
