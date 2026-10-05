"use client";

import { useTransition } from "react";
import { setMetaFieldAction, setMetaFormOwnerAction } from "@/app/actions";
import { Select } from "./controls";
import { Avatar } from "./ui";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

export interface MetaFormRow {
  pageId: string;
  formId: string;
  formName: string;
  ownerId: string | null;
  /** поле формы Meta → куда класть; порядок как пришёл из формы */
  fields: { name: string; target: string }[];
  updatedAt: string;
}

export interface OwnerOption {
  id: string;
  name: string;
  title: string;
}

/**
 * Раскладка полей формы Meta по карточке лида.
 *
 * Поля показываются те, что реально пришли из формы, — Orbis узнаёт их
 * из самого лида, а не из настроек. Поэтому до первого обращения
 * показывать нечего, и это честнее, чем предлагать выдуманный список.
 */
export function MetaForms({
  forms,
  owners,
  locale,
  canEdit,
}: {
  forms: MetaFormRow[];
  owners: OwnerOption[];
  locale: Locale;
  canEdit: boolean;
}) {
  const t = translator(locale);
  const [, startTransition] = useTransition();

  const send = (action: (d: FormData) => Promise<void>, data: FormData) =>
    startTransition(() => {
      void action(data);
    });

  const targets = [
    { value: "", label: t(S.meta.skip), hint: t(S.meta.skipHint) },
    { value: "name", label: t(S.meta.tName) },
    { value: "phone", label: t(S.meta.tPhone) },
    { value: "email", label: t(S.meta.tEmail) },
    { value: "comment", label: t(S.meta.tComment) },
  ];

  const ownerOptions = [
    { value: "", label: t(S.meta.ownerAuto) },
    ...owners.map((o) => ({ value: o.id, label: o.name, hint: o.title })),
  ];

  return (
    <div className="stagger-in flex flex-col gap-4">
      {forms.map((form) => {
        // Без телефона и почты лид создать не из чего — предупреждаем здесь,
        // а не после того, как заявки начнут молча пропадать.
        const reachable = form.fields.some((f) => f.target === "phone" || f.target === "email");

        return (
          <article key={`${form.pageId}_${form.formId}`} className="card overflow-hidden">
            <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline-soft bg-surface-2 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="t-body-sm truncate font-semibold">{form.formName}</div>
                <div className="t-micro t-num truncate text-ink-faint">ID {form.formId}</div>
              </div>
              <label className="flex items-center gap-2">
                <span className="t-micro whitespace-nowrap text-ink-faint">{t(S.meta.owner)}</span>
                <Select
                  locale={locale}
                  width={200}
                  value={form.ownerId ?? ""}
                  options={ownerOptions}
                  onChange={(v) => {
                    if (!canEdit) return;
                    const data = new FormData();
                    data.set("pageId", form.pageId);
                    data.set("formId", form.formId);
                    data.set("ownerId", v);
                    send(setMetaFormOwnerAction, data);
                  }}
                />
              </label>
            </header>

            {!reachable ? (
              <div
                className="t-caption flex items-start gap-2.5 border-b border-hairline-soft px-5 py-3"
                style={{
                  background: "color-mix(in srgb, var(--color-status-risk) 7%, transparent)",
                  color: "var(--color-ink-muted)",
                }}
              >
                <span aria-hidden style={{ color: "var(--color-status-risk)" }}>!</span>
                <span>{t(S.meta.needPhone)}</span>
              </div>
            ) : null}

            <div className="scroll-x">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr className="border-b border-hairline-soft">
                    <th className="t-micro px-5 py-2.5 text-left font-medium uppercase tracking-[0.07em] text-ink-faint">
                      {t(S.meta.field)}
                    </th>
                    <th className="t-micro px-5 py-2.5 text-left font-medium uppercase tracking-[0.07em] text-ink-faint">
                      {t(S.meta.target)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {form.fields.map((field) => (
                    <tr
                      key={field.name}
                      className="row-hover border-b border-hairline-soft last:border-b-0 hover:bg-surface-2"
                    >
                      <td className="px-5 py-2.5">
                        <span className="t-body-sm break-words">{field.name}</span>
                      </td>
                      <td className="px-5 py-2.5">
                        <Select
                          locale={locale}
                          width={210}
                          value={field.target}
                          options={targets}
                          onChange={(v) => {
                            if (!canEdit) return;
                            const data = new FormData();
                            data.set("pageId", form.pageId);
                            data.set("formId", form.formId);
                            data.set("field", field.name);
                            data.set("target", v);
                            send(setMetaFieldAction, data);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/** Кто сейчас получает лиды формы — показываем рядом, чтобы было видно лицо. */
export function OwnerChip({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2">
      <Avatar name={name} size={22} />
      <span className="t-caption text-ink-muted">{name}</span>
    </span>
  );
}
