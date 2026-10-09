"use client";

import { useEffect, useRef, useState } from "react";
import { setListFieldsAction } from "@/app/actions";
import { Check } from "./Check";
import { IconPanel } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";
import type { ListColumn } from "@/lib/list-columns";

/**
 * Выбор колонок списка — как в Битриксе.
 *
 * Настройка стоит рядом со списком, а не в администрировании, и это
 * осознанно: карточка канбана — вид доски для всего агентства, а колонки
 * списка каждый подбирает под свою работу, прямо во время работы. Поэтому
 * выбор сохраняется на сотрудника, а не на арендатора.
 *
 * Панель закрывается по клику мимо и по Escape — иначе она перекрывает
 * первые строки списка, которые человек и пришёл смотреть.
 */
export function ListColumns({
  section,
  catalog,
  picked,
  defaults,
  locale,
}: {
  section: string;
  catalog: ListColumn[];
  picked: string[];
  defaults: string[];
  locale: Locale;
}) {
  const t = translator(locale);
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState(picked);
  const box = useRef<HTMLDivElement>(null);

  // Сервер ответил — его слово последнее: своё состояние панели подменяем
  // пришедшим набором, иначе галочки и список начнут расходиться.
  useEffect(() => setChosen(picked), [picked]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const toggle = (key: string) =>
    setChosen((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="btn btn-secondary btn-sm"
        title={t(S.list.columnsHint)}
      >
        <IconPanel size={14} />
        <span className="hidden sm:inline">{t(S.list.columns)}</span>
        <span className="t-num text-ink-faint">{chosen.length}</span>
      </button>

      {open ? (
        <form
          action={setListFieldsAction}
          onSubmit={() => setOpen(false)}
          /* На телефоне панель встаёт по центру кнопки: прижатая к её правому
             краю, она уезжала левее экрана и половина колонок пропадала. */
          className="pop-in card-raised absolute left-1/2 top-11 z-50 w-[260px] -translate-x-1/2 overflow-hidden sm:left-auto sm:right-0 sm:translate-x-0"
        >
          <input type="hidden" name="section" value={section} />

          <div className="t-micro border-b border-hairline-soft px-4 py-2.5 text-ink-faint">
            {t(S.list.columnsHint)}
          </div>

          <div className="max-h-[320px] overflow-y-auto py-1">
            {catalog.map((column) => (
              <label
                key={column.key}
                className="flex cursor-pointer items-center gap-2.5 px-4 py-2 transition-colors hover:bg-surface-2"
              >
                <Check on={chosen.includes(column.key)} />
                <span className="t-body-sm flex-1">{column.label}</span>
                <input
                  type="checkbox"
                  name="field"
                  value={column.key}
                  checked={chosen.includes(column.key)}
                  onChange={() => toggle(column.key)}
                  className="sr-only"
                />
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-hairline-soft px-4 py-3">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setChosen(defaults)}
            >
              {t(S.common.reset)}
            </button>
            <button className="btn btn-primary btn-sm">{t(S.common.done)}</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
