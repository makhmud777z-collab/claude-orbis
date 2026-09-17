"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { moveCardAction, setCardFieldsAction } from "@/app/actions";
import { Modal, Tooltip } from "./controls";
import { IconMore, IconSettings } from "./icons";
import { Avatar, StatusDot } from "./ui";
import { translator, type Locale } from "@/lib/i18n";
import { som } from "@/lib/format";
import { S } from "@/lib/strings";

/** Одно поле на карточке: подпись нужна в настройках, значение — на доске. */
export interface CardLine {
  key: string;
  label: string;
  value: string;
  accent?: string;
}

export interface KanbanCard {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  stage: string;
  /** сумма договора в сумах — из неё считается итог колонки */
  amount: number | null;
  ownerName: string;
  /** цвет-флажок слева: приоритет или просрочка */
  flag: string | null;
  lines: CardLine[];
}

export interface KanbanStage {
  key: string;
  label: string;
  color: string;
  hint: string;
}

export interface FieldOption {
  key: string;
  label: string;
}

/**
 * Канбан-доска CRM.
 *
 * Карточку можно перетащить мышью на другую стадию — как в Битриксе.
 * Перенос сразу уходит на сервер и попадает в историю карточки, а доска
 * не ждёт ответа: колонка перерисовывается оптимистично, иначе перетаскивание
 * ощущается как зависание.
 */
export function Kanban({
  entity,
  stages,
  cards,
  locale,
  canEdit,
  fields,
  allFields,
  showTotals = true,
}: {
  entity: "lead" | "deal";
  stages: KanbanStage[];
  cards: KanbanCard[];
  locale: Locale;
  canEdit: boolean;
  /** какие поля сотрудник выбрал показывать */
  fields: string[];
  allFields: FieldOption[];
  showTotals?: boolean;
}) {
  const t = translator(locale);
  const [, startTransition] = useTransition();
  const [moved, setMoved] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);

  // Пришли свежие данные с сервера — локальные догадки больше не нужны.
  useEffect(() => setMoved({}), [cards]);

  const stageOf = (card: KanbanCard) => moved[card.id] ?? card.stage;

  const drop = (stageKey: string) => {
    setOver(null);
    const id = dragging;
    setDragging(null);
    if (!id || !canEdit) return;
    const card = cards.find((c) => c.id === id);
    if (!card || stageOf(card) === stageKey) return;

    setMoved((prev) => ({ ...prev, [id]: stageKey }));
    const data = new FormData();
    data.set("entity", entity);
    data.set("id", id);
    data.set("stage", stageKey);
    startTransition(() => {
      void moveCardAction(data);
    });
  };

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="t-micro text-ink-faint">
          {canEdit ? t(S.pipelines.dragHint) : t(S.pipelines.cardViewHint)}
        </div>
        <Tooltip text={t(S.pipelines.cardView)}>
          <button className="btn-icon" onClick={() => setSettings(true)} aria-label={t(S.pipelines.cardView)}>
            <IconSettings size={16} />
          </button>
        </Tooltip>
      </div>

      <div className="-mx-5 overflow-x-auto px-5 pb-2 lg:-mx-8 lg:px-8">
        <div className="flex min-w-max gap-3">
          {stages.map((stage) => {
            const list = cards.filter((c) => stageOf(c) === stage.key);
            const total = list.reduce((sum, c) => sum + (c.amount ?? 0), 0);
            const active = over === stage.key;

            return (
              <section
                key={stage.key}
                onDragOver={(e) => {
                  if (!canEdit) return;
                  e.preventDefault();
                  setOver(stage.key);
                }}
                onDragLeave={() => setOver((v) => (v === stage.key ? null : v))}
                onDrop={(e) => {
                  e.preventDefault();
                  drop(stage.key);
                }}
                className="flex w-[264px] flex-none flex-col rounded-[12px] border p-2 transition-colors"
                style={{
                  borderColor: active ? stage.color : "var(--color-hairline-soft)",
                  background: active ? "var(--color-surface-1)" : "transparent",
                }}
              >
                <header className="px-1.5 pb-2 pt-1">
                  <div className="flex items-center gap-2">
                    <StatusDot color={stage.color} />
                    <span className="t-caption min-w-0 flex-1 truncate">{stage.label}</span>
                    <span className="t-micro t-num text-ink-faint">{list.length}</span>
                  </div>
                  {showTotals ? (
                    <div className="t-micro t-num mt-1 pl-3.5 text-ink-faint">
                      {total ? som(total, { compact: true, locale }) : "—"}
                    </div>
                  ) : null}
                  {/* тонкая линия цвета стадии — единственная заливка цветом на доске */}
                  <div
                    className="mt-2 h-[2px] rounded-full"
                    style={{ background: stage.color, opacity: list.length ? 0.9 : 0.25 }}
                  />
                </header>

                <div className="flex flex-col gap-2">
                  {list.map((card) => (
                    <Card
                      key={card.id}
                      card={card}
                      fields={fields}
                      draggable={canEdit}
                      dragging={dragging === card.id}
                      onDragStart={() => setDragging(card.id)}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                    />
                  ))}
                  {!list.length ? (
                    <div className="t-micro rounded-[10px] border border-dashed border-hairline-soft px-3 py-6 text-center text-ink-faint">
                      {t(S.common.empty)}
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <CardSettings
        open={settings}
        onClose={() => setSettings(false)}
        fields={fields}
        allFields={allFields}
        locale={locale}
      />
    </>
  );
}

function Card({
  card,
  fields,
  draggable,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  card: KanbanCard;
  fields: string[];
  draggable: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  // Порядок строк задаёт настройка сотрудника, а не порядок в данных.
  // Пустые значения не показываем: столбик из прочерков ничего не сообщает.
  const lines = fields
    .map((key) => card.lines.find((l) => l.key === key))
    .filter((l): l is CardLine => Boolean(l) && Boolean(l!.value) && l!.value !== "—");

  return (
    <Link
      href={card.href}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", card.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className="card card-hover relative block px-3 py-2.5"
      style={{ opacity: dragging ? 0.4 : 1, cursor: draggable ? "grab" : "pointer" }}
    >
      {card.flag ? (
        <span
          className="absolute left-0 top-3 h-6 w-[2px] rounded-r-full"
          style={{ background: card.flag }}
        />
      ) : null}

      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="t-body-sm block truncate font-medium">{card.title}</span>
          <span className="t-micro block truncate text-ink-faint">{card.subtitle}</span>
        </span>
        <Avatar name={card.ownerName} size={22} />
      </div>

      {lines.length ? (
        <div className="mt-2 space-y-1">
          {lines.map((line) => (
            <div key={line.key} className="t-micro flex items-center gap-1.5 text-ink-muted">
              {line.accent ? <StatusDot color={line.accent} /> : null}
              <span className="truncate">{line.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Link>
  );
}

/** «Карточка просмотра»: набор полей на карточке настраивает сам сотрудник. */
function CardSettings({
  open,
  onClose,
  fields,
  allFields,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  fields: string[];
  allFields: FieldOption[];
  locale: Locale;
}) {
  const t = translator(locale);
  const [picked, setPicked] = useState(fields);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => setPicked(fields), [fields, open]);

  const toggle = (key: string) =>
    setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(S.pipelines.cardView)}
      footer={
        <>
          <button className="btn btn-ghost btn-sm" onClick={onClose} type="button">
            {t(S.common.reset)}
          </button>
          <button
            className="btn btn-primary btn-sm"
            type="button"
            onClick={() => {
              form.current?.requestSubmit();
              onClose();
            }}
          >
            {t(S.common.save)}
          </button>
        </>
      }
    >
      <p className="t-caption mb-4 text-ink-muted">{t(S.pipelines.cardViewHint)}</p>
      <form ref={form} action={setCardFieldsAction} className="space-y-1">
        {allFields.map((field) => {
          const on = picked.includes(field.key);
          return (
            <label
              key={field.key}
              className="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 transition-colors hover:bg-surface-1"
            >
              {/* свой переключатель вместо системного чекбокса */}
              <span
                className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] border transition-colors"
                style={{
                  borderColor: on ? "var(--color-ink)" : "var(--color-hairline)",
                  background: on ? "var(--color-ink)" : "transparent",
                }}
              >
                {on ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m4.5 12.5 5 5 10-11" />
                  </svg>
                ) : null}
              </span>
              <span className="t-caption flex-1">{field.label}</span>
              <input
                type="checkbox"
                name="field"
                value={field.key}
                checked={on}
                onChange={() => toggle(field.key)}
                className="sr-only"
              />
              <IconMore size={14} className="text-ink-faint" />
            </label>
          );
        })}
      </form>
    </Modal>
  );
}
