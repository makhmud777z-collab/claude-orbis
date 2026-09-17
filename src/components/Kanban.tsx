"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { moveCardAction, setCardFieldsAction } from "@/app/actions";
import { IconMore } from "./icons";
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
  showTotals = true,
}: {
  entity: "lead" | "deal";
  stages: KanbanStage[];
  cards: KanbanCard[];
  locale: Locale;
  canEdit: boolean;
  /** какие поля сотрудник выбрал показывать */
  fields: string[];
  showTotals?: boolean;
}) {
  const t = translator(locale);
  const [, startTransition] = useTransition();
  const [moved, setMoved] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

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
      {canEdit ? (
        <div className="t-micro mb-3 text-ink-faint">{t(S.pipelines.dragHint)}</div>
      ) : null}

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
                className={`kan-col flex w-[272px] flex-none flex-col overflow-hidden rounded-[14px] border transition-[background-color,border-color,box-shadow] duration-150 ${active ? "is-over" : ""}`}
                style={{
                  borderColor: active
                    ? stage.color
                    : `color-mix(in srgb, ${stage.color} 22%, var(--color-hairline))`,
                  // Колонка окрашена своим цветом, но едва-едва: доска должна
                  // читаться с одного взгляда и не превращаться в светофор.
                  background: `color-mix(in srgb, ${stage.color} ${active ? 9 : 4}%, var(--color-surface-2))`,
                  boxShadow: active ? `0 0 0 2px color-mix(in srgb, ${stage.color} 35%, transparent)` : undefined,
                }}
              >
                {/* Шапка колонки — плотная плашка цвета стадии: именно она
                    даёт доске ритм, которого не хватало в чистом минимализме. */}
                <header
                  className="px-3 pb-2.5 pt-2.5"
                  style={{
                    background: `color-mix(in srgb, ${stage.color} 13%, var(--color-surface-1))`,
                    borderBottom: `1px solid color-mix(in srgb, ${stage.color} 26%, transparent)`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <StatusDot color={stage.color} />
                    <span className="t-caption min-w-0 flex-1 truncate font-semibold" style={{ color: stage.color }}>
                      {stage.label}
                    </span>
                    <span
                      className="t-micro t-num rounded-full px-1.5 py-0.5 font-semibold"
                      style={{
                        background: `color-mix(in srgb, ${stage.color} 18%, transparent)`,
                        color: stage.color,
                      }}
                    >
                      {list.length}
                    </span>
                  </div>
                  {showTotals ? (
                    <div className="t-micro t-num mt-1 pl-3.5 text-ink-muted">
                      {total ? som(total, { compact: true, locale }) : "—"}
                    </div>
                  ) : null}
                </header>

                <div className="flex flex-col gap-2 p-2">
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
                    <div
                      className="t-micro rounded-[10px] border border-dashed px-3 py-6 text-center text-ink-faint"
                      style={{ borderColor: `color-mix(in srgb, ${stage.color} 28%, transparent)` }}
                    >
                      {t(S.common.empty)}
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>

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
