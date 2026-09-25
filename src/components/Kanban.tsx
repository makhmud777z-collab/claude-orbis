"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { moveCardAction } from "@/app/actions";
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
 *
 * Цвет стадии — акцент, а не заливка: сплошная пастельная подложка на весь
 * блок колонки превращала доску в светофор и спорила с карточками внутри.
 * Здесь цвет живёт в трёх местах — тонкая полоса сверху колонки, точка
 * с названием стадии и мини-индикатор доли суммы, — а сама колонка и
 * карточки остаются на нейтральной поверхности, как и весь остальной портал.
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

  // Доля колонки в общей сумме воронки — самая нагруженная колонка задаёт
  // 100% полоски, остальные показывают вес относительно неё.
  const totalsByStage = stages.map(
    (stage) =>
      cards
        .filter((c) => stageOf(c) === stage.key)
        .reduce((sum, c) => sum + (c.amount ?? 0), 0),
  );
  const maxTotal = Math.max(1, ...totalsByStage);

  return (
    <>
      {canEdit ? (
        <div className="t-micro mb-3 text-ink-faint">{t(S.pipelines.dragHint)}</div>
      ) : null}

      <div className="-mx-5 overflow-x-auto px-5 pb-2 lg:-mx-8 lg:px-8">
        <div className="flex min-w-max gap-4">
          {stages.map((stage, i) => {
            const list = cards.filter((c) => stageOf(c) === stage.key);
            const total = totalsByStage[i];
            const share = total ? Math.max(6, Math.round((total / maxTotal) * 100)) : 0;
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
                className="kan-col page-in relative flex w-[280px] flex-none flex-col overflow-hidden rounded-[18px] border border-hairline bg-surface-2 transition-colors duration-150"
                style={{
                  animationDelay: `${Math.min(i * 45, 270)}ms`,
                  background: active
                    ? `color-mix(in srgb, ${stage.color} 6%, var(--color-surface-2))`
                    : undefined,
                }}
              >
                {/* Цвет стадии сверху — тонкая полоса вместо заливки всей колонки. */}
                <div className="h-[3px] w-full flex-none" style={{ background: stage.color }} />

                {active ? (
                  <span
                    aria-hidden
                    className="kan-drop-ring pointer-events-none absolute inset-0 rounded-[18px]"
                    style={{ boxShadow: `inset 0 0 0 2px ${stage.color}` }}
                  />
                ) : null}

                {/* Шапка — нейтральная поверхность: цвет живёт только в точке,
                    названии и полоске доли суммы, не в фоне блока. */}
                <header className="flex-none border-b border-hairline-soft bg-surface-1 px-3.5 pb-3 pt-3">
                  <div className="flex items-center gap-2">
                    <StatusDot color={stage.color} />
                    <span
                      className="t-caption min-w-0 flex-1 truncate font-semibold"
                      style={{ color: stage.color }}
                    >
                      {stage.label}
                    </span>
                    <span className="t-micro t-num rounded-full bg-surface-3 px-1.5 py-0.5 font-semibold text-ink-muted">
                      {list.length}
                    </span>
                  </div>
                  {showTotals ? (
                    <>
                      <div className="t-micro t-num mt-1.5 pl-3.5 text-ink-muted">
                        {total ? som(total, { compact: true, locale }) : "—"}
                      </div>
                      <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-surface-3">
                        <div
                          className="h-full rounded-full transition-[width] duration-300"
                          style={{ width: `${share}%`, background: stage.color, opacity: 0.6 }}
                        />
                      </div>
                    </>
                  ) : null}
                </header>

                <div className="flex flex-1 flex-col gap-2.5 p-2.5">
                  {list.map((card) => (
                    <Card
                      key={card.id}
                      card={card}
                      fields={fields}
                      draggable={canEdit}
                      dragging={dragging === card.id}
                      landed={Boolean(moved[card.id])}
                      onDragStart={() => setDragging(card.id)}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                    />
                  ))}
                  {!list.length ? (
                    <div className="rounded-[12px] border border-dashed border-hairline px-3 py-7 text-center text-ink-faint t-micro">
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
  landed,
  onDragStart,
  onDragEnd,
}: {
  card: KanbanCard;
  fields: string[];
  draggable: boolean;
  dragging: boolean;
  /** карточка только что «приземлилась» на новую стадию — короткий отклик */
  landed: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  // Порядок строк задаёт настройка сотрудника, а не порядок в данных.
  // Пустые значения не показываем: столбик из прочерков ничего не сообщает.
  const lines = fields
    .map((key) => card.lines.find((l) => l.key === key))
    .filter((l): l is CardLine => Boolean(l) && Boolean(l!.value) && l!.value !== "—");

  // Сумма — главное число карточки сделки, поэтому у неё отдельная, более
  // заметная строка внизу, а не наравне с телефоном и стадией досье.
  const amountLine = lines.find((l) => l.key === "amount");
  const metaLines = lines.filter((l) => l.key !== "amount");

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
      className={`card card-hover relative block px-3.5 py-3${landed ? " just-landed" : ""}`}
      style={{ opacity: dragging ? 0.4 : 1, cursor: draggable ? "grab" : "pointer" }}
    >
      {card.flag ? (
        <span
          className="absolute left-1.5 top-3.5 h-6 w-[3px] rounded-full"
          style={{ background: card.flag }}
        />
      ) : null}

      <div className="flex items-start gap-2.5" style={{ paddingLeft: card.flag ? 8 : 0 }}>
        <span className="min-w-0 flex-1">
          <span className="t-body-sm block truncate font-semibold">{card.title}</span>
          <span className="t-micro mt-0.5 block truncate text-ink-faint">{card.subtitle}</span>
        </span>
        <Avatar name={card.ownerName} size={22} />
      </div>

      {metaLines.length || amountLine ? (
        <div
          className="mt-2.5 space-y-1 border-t border-hairline-soft pt-2.5"
          style={{ marginLeft: card.flag ? 8 : 0 }}
        >
          {metaLines.map((line) => (
            <div key={line.key} className="t-micro flex items-center gap-1.5 text-ink-muted">
              {line.accent ? <StatusDot color={line.accent} /> : null}
              <span className="truncate">{line.value}</span>
            </div>
          ))}
          {amountLine ? (
            <div
              className="t-num pt-0.5 text-right text-[13px] font-semibold"
              style={{ color: amountLine.accent ?? undefined }}
            >
              {amountLine.value}
            </div>
          ) : null}
        </div>
      ) : null}
    </Link>
  );
}
