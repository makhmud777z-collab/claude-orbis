"use client";

import { motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { deleteFilterAction, saveFilterAction } from "@/app/actions";
import { DatePicker, Modal, Select, Tooltip } from "./controls";
import { IconChevron, IconPlus, IconSearch, IconSettings } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import {
  FIELDS_KEY, FILTER_PREFIX, FILTER_TEXT, PRESET_KEY, QUERY_KEY,
  type FilterOption, type FilterValues,
} from "@/lib/filters";
import { S } from "@/lib/strings";
import { slideUpVariants } from "@/lib/animations";

/** Поле фильтра с уже переведёнными подписями — компонент клиентский. */
export interface ClientField {
  key: string;
  label: string;
  kind: "text" | "select" | "multiselect" | "date" | "number";
  options?: FilterOption[];
  base?: boolean;
  range?: boolean;
}

export interface ClientPreset {
  key: string;
  label: string;
  query: string;
}

export interface ClientSaved {
  id: string;
  name: string;
  query: string;
}

/**
 * Умный фильтр раздела — один на весь портал.
 *
 * Устроен как в Битриксе: строка поиска раскрывается в панель, слева —
 * готовые срезы и свои сохранённые, справа — поля, которые сотрудник
 * набирает сам. Условия применяются по «Найти», а не на каждое нажатие:
 * иначе список дёргается, пока человек ещё думает.
 */
export function SmartFilter({
  scope,
  fields,
  presets,
  saved,
  locale,
  total,
  shown,
}: {
  scope: string;
  fields: ClientField[];
  presets: ClientPreset[];
  saved: ClientSaved[];
  locale: Locale;
  total: number;
  shown: number;
}) {
  const t = translator(locale);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const box = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Черновик правится в панели и уходит в адрес только по «Найти».
  const readValues = (): FilterValues => {
    const values: FilterValues = {};
    params.forEach((value, key) => {
      if (key.startsWith(FILTER_PREFIX) && value) values[key.slice(FILTER_PREFIX.length)] = value;
    });
    return values;
  };
  const readShown = (): string[] => {
    const extra = (params.get(FIELDS_KEY) ?? "").split(",").filter(Boolean);
    const base = fields.filter((f) => f.base).map((f) => f.key);
    return [...base, ...extra.filter((k) => !base.includes(k) && fields.some((f) => f.key === k))];
  };

  const [query, setQuery] = useState(params.get(QUERY_KEY) ?? "");
  const [values, setValues] = useState<FilterValues>(readValues);
  const [visible, setVisible] = useState<string[]>(readShown);
  const preset = params.get(PRESET_KEY) ?? "";

  // Адрес поменялся (пресет, ссылка коллеги, «назад») — черновик идёт за ним.
  const search = params.toString();
  useEffect(() => {
    setQuery(params.get(QUERY_KEY) ?? "");
    setValues(readValues());
    setVisible(readShown());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (box.current?.contains(target)) return;
      // выпадающие списки и календарь живут в портале, вне панели
      if (target.closest("[data-select],[data-date],[role='dialog']")) return;
      setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const buildQuery = (next: FilterValues, nextQuery: string, nextVisible: string[]) => {
    const out = new URLSearchParams();
    // всё, что не относится к фильтру (воронка, вкладка), остаётся в адресе
    params.forEach((value, key) => {
      if (key === QUERY_KEY || key === FIELDS_KEY || key === PRESET_KEY) return;
      if (key.startsWith(FILTER_PREFIX)) return;
      out.set(key, value);
    });
    if (nextQuery.trim()) out.set(QUERY_KEY, nextQuery.trim());
    for (const [key, value] of Object.entries(next)) {
      if (value) out.set(FILTER_PREFIX + key, value);
    }
    const base = fields.filter((f) => f.base).map((f) => f.key);
    const extra = nextVisible.filter((k) => !base.includes(k));
    if (extra.length) out.set(FIELDS_KEY, extra.join(","));
    return out.toString();
  };

  const apply = () => {
    const q = buildQuery(values, query, visible);
    router.push(q ? `${pathname}?${q}` : pathname);
    setOpen(false);
  };
  const reset = () => {
    setValues({});
    setQuery("");
    setVisible(fields.filter((f) => f.base).map((f) => f.key));
    router.push(pathname);
    setOpen(false);
  };
  const goPreset = (item: ClientPreset) => {
    router.push(item.query ? `${pathname}?${item.query}` : pathname);
    setOpen(false);
  };

  const set = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const activeChips = fields.flatMap((field) => {
    if (field.range) {
      const from = values[`${field.key}From`];
      const to = values[`${field.key}To`];
      if (!from && !to) return [];
      return [{ key: field.key, label: `${field.label}: ${from || "…"} — ${to || "…"}`, keys: [`${field.key}From`, `${field.key}To`] }];
    }
    const value = values[field.key];
    if (!value) return [];
    const text = field.kind === "multiselect"
      ? value.split(",").map((v) => field.options?.find((o) => o.value === v)?.label ?? v).join(", ")
      : field.options?.find((o) => o.value === value)?.label ?? value;
    return [{ key: field.key, label: `${field.label}: ${text}`, keys: [field.key] }];
  });

  const dropChip = (keys: string[]) => {
    const next = { ...values };
    for (const key of keys) delete next[key];
    setValues(next);
    const q = buildQuery(next, query, visible);
    router.push(q ? `${pathname}?${q}` : pathname);
  };

  const hidden = fields.filter((f) => !visible.includes(f.key));

  return (
    <motion.div className="relative mb-5" ref={box} initial="hidden" animate="visible" variants={slideUpVariants}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="field flex h-10 min-w-0 flex-1 items-center gap-2.5 text-left"
          style={{ borderRadius: 100, minWidth: 220 }}
          aria-expanded={open}
        >
          <span className="text-ink-faint">
            <IconSearch size={15} />
          </span>
          <span className="t-body-sm min-w-0 flex-1 truncate" style={{ color: query ? undefined : "var(--color-ink-faint)" }}>
            {query || t(FILTER_TEXT.placeholder)}
          </span>
          {activeChips.length ? (
            <span
              className="t-micro t-num rounded-full px-2 py-0.5"
              style={{ background: "color-mix(in srgb, var(--color-accent) 16%, transparent)", color: "var(--color-accent)" }}
            >
              {activeChips.length}
            </span>
          ) : null}
          <IconChevron size={14} className="flex-none text-ink-faint" />
        </button>

        <span className="t-caption t-num whitespace-nowrap text-ink-muted">
          {shown === total ? total : `${shown} / ${total}`}
        </span>
      </div>

      {activeChips.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => dropChip(chip.keys)}
              className="chip chip-active"
              title={t(FILTER_TEXT.clearAll)}
            >
              {chip.label}
              <span aria-hidden>×</span>
            </button>
          ))}
          <button type="button" onClick={reset} className="t-micro text-ink-faint hover:text-ink">
            {t(FILTER_TEXT.clearAll)}
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="pop-in card-raised absolute left-0 top-12 z-50 flex w-full max-w-[860px] flex-col overflow-hidden sm:flex-row">
          {/* срезы: готовые слева, как в портале */}
          <aside className="w-full flex-none border-b border-hairline-soft bg-surface-2 p-3 sm:w-[240px] sm:border-b-0 sm:border-r">
            <div className="t-micro mb-2 px-2 uppercase tracking-[0.08em] text-ink-faint">
              {t(FILTER_TEXT.savedFilters)}
            </div>
            <div className="space-y-0.5">
              {presets.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => goPreset(item)}
                  className="t-caption block w-full truncate rounded-[8px] px-2.5 py-1.5 text-left transition-colors hover:bg-surface-1"
                  style={{
                    color: preset === item.key ? "var(--color-accent)" : "var(--color-ink-muted)",
                    background: preset === item.key ? "var(--color-surface-1)" : "transparent",
                    fontWeight: preset === item.key ? 600 : 500,
                  }}
                >
                  {item.label}
                </button>
              ))}

              {saved.map((item) => (
                <span key={item.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => goPreset({ key: item.id, label: item.name, query: item.query })}
                    className="t-caption min-w-0 flex-1 truncate rounded-[8px] px-2.5 py-1.5 text-left text-ink-muted transition-colors hover:bg-surface-1"
                  >
                    {item.name}
                  </button>
                  <form action={deleteFilterAction}>
                    <input type="hidden" name="scope" value={scope} />
                    <input type="hidden" name="id" value={item.id} />
                    <button className="t-micro px-1 text-ink-faint hover:text-ink" aria-label="×">
                      ×
                    </button>
                  </form>
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSaving(true)}
              className="t-caption mt-3 flex items-center gap-1.5 px-2.5 text-ink-faint hover:text-ink"
            >
              <IconPlus size={13} /> {t(FILTER_TEXT.saveFilter)}
            </button>
          </aside>

          {/* поля */}
          <div className="min-w-0 flex-1 p-4">
            <label className="mb-3 block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.common.searchShort)}</span>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && apply()}
                className="field text-[13px]"
              />
            </label>

            <div className="max-h-[46vh] space-y-3 overflow-y-auto pr-1">
              {visible.map((key) => {
                const field = fields.find((f) => f.key === key);
                if (!field) return null;
                return (
                  <label key={field.key} className="block">
                    <span className="t-micro mb-1 block text-ink-faint">{field.label}</span>

                    {field.range ? (
                      <span className="flex items-center gap-2">
                        {field.kind === "date" ? (
                          <>
                            <DatePicker
                              locale={locale}
                              width="100%"
                              value={values[`${field.key}From`] ?? ""}
                              placeholder={t(FILTER_TEXT.from)}
                              onChange={(v) => set(`${field.key}From`, v)}
                            />
                            <DatePicker
                              locale={locale}
                              width="100%"
                              value={values[`${field.key}To`] ?? ""}
                              placeholder={t(FILTER_TEXT.to)}
                              onChange={(v) => set(`${field.key}To`, v)}
                            />
                          </>
                        ) : (
                          <>
                            <input
                              inputMode="numeric"
                              placeholder={t(FILTER_TEXT.from)}
                              value={values[`${field.key}From`] ?? ""}
                              onChange={(e) => set(`${field.key}From`, e.target.value)}
                              className="field text-[13px]"
                            />
                            <input
                              inputMode="numeric"
                              placeholder={t(FILTER_TEXT.to)}
                              value={values[`${field.key}To`] ?? ""}
                              onChange={(e) => set(`${field.key}To`, e.target.value)}
                              className="field text-[13px]"
                            />
                          </>
                        )}
                      </span>
                    ) : field.kind === "select" ? (
                      <Select
                        locale={locale}
                        width="100%"
                        value={values[field.key] ?? ""}
                        options={[{ value: "", label: t(FILTER_TEXT.any) }, ...(field.options ?? [])]}
                        onChange={(v) => set(field.key, v)}
                      />
                    ) : field.kind === "multiselect" ? (
                      <span className="flex flex-wrap gap-1.5">
                        {(field.options ?? []).map((option) => {
                          const picked = (values[field.key] ?? "").split(",").filter(Boolean);
                          const on = picked.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                set(
                                  field.key,
                                  (on ? picked.filter((v) => v !== option.value) : [...picked, option.value]).join(","),
                                )
                              }
                              className={`chip ${on ? "chip-active" : ""}`}
                            >
                              {option.color ? <span className="dot" style={{ background: option.color }} /> : null}
                              {option.label}
                            </button>
                          );
                        })}
                      </span>
                    ) : field.kind === "date" ? (
                      <DatePicker
                        locale={locale}
                        width="100%"
                        value={values[field.key] ?? ""}
                        onChange={(v) => set(field.key, v)}
                      />
                    ) : (
                      <input
                        value={values[field.key] ?? ""}
                        onChange={(e) => set(field.key, e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && apply()}
                        className="field text-[13px]"
                      />
                    )}
                  </label>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {hidden.length ? (
                <span className="relative">
                  <button
                    type="button"
                    onClick={() => setAddOpen((v) => !v)}
                    className="t-caption text-accent hover:underline"
                  >
                    {t(FILTER_TEXT.addField)}
                  </button>
                  {addOpen ? (
                    <span className="card-raised absolute bottom-7 left-0 z-10 max-h-[240px] w-[220px] overflow-y-auto py-1">
                      {hidden.map((field) => (
                        <button
                          key={field.key}
                          type="button"
                          onClick={() => {
                            setVisible((v) => [...v, field.key]);
                            setAddOpen(false);
                          }}
                          className="t-caption block w-full px-3 py-2 text-left transition-colors hover:bg-surface-2"
                        >
                          {field.label}
                        </button>
                      ))}
                    </span>
                  ) : null}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setVisible(fields.filter((f) => f.base).map((f) => f.key))}
                className="t-caption text-ink-faint hover:text-ink"
              >
                {t(FILTER_TEXT.restoreFields)}
              </button>

              <span className="ml-auto flex items-center gap-2">
                <Tooltip text={t(FILTER_TEXT.restoreFields)}>
                  <span className="btn-icon h-8 w-8 text-ink-faint">
                    <IconSettings size={15} />
                  </span>
                </Tooltip>
                <button type="button" onClick={reset} className="btn btn-secondary btn-sm">
                  {t(FILTER_TEXT.reset)}
                </button>
                <button type="button" onClick={apply} className="btn btn-primary btn-sm">
                  <IconSearch size={14} /> {t(FILTER_TEXT.find)}
                </button>
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <Modal open={saving} onClose={() => setSaving(false)} title={t(FILTER_TEXT.saveFilter)} width={420}>
        <form
          action={(data) => {
            setSaving(false);
            return saveFilterAction(data);
          }}
        >
          <input type="hidden" name="scope" value={scope} />
          <input type="hidden" name="query" value={buildQuery(values, query, visible)} />
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(FILTER_TEXT.filterName)}</span>
            <input name="name" required autoFocus className="field text-[13px]" />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSaving(false)}>
              {t(S.common.reset)}
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              {t(S.common.save)}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
