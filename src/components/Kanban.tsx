"use client";

import Link from "next/link";

import { moveCardAction } from "@/app/actions";
import { Board, BoardColumn } from "./BoardColumn";
import { useBoardDrag } from "./board";
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

  // Перетаскивание — общее для всех досок портала, см. board.ts.
  const { columnFor, columnProps, cardProps, dropIndex, over } = useBoardDrag(
    cards,
    (card) => card.stage,
    (id, stage) => {
      const data = new FormData();
      data.set("entity", entity);
      data.set("id", id);
      data.set("stage", stage);
      void moveCardAction(data);
    },
    canEdit,
  );
  const stageOf = (card: KanbanCard) => columnFor(card);

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
    <Board hint={canEdit ? t(S.pipelines.dragHint) : null}>
      {stages.map((stage, i) => {
        const list = cards.filter((c) => stageOf(c) === stage.key);
        const total = totalsByStage[i];
        const share = total ? Math.max(6, Math.round((total / maxTotal) * 100)) : 0;

        return (
          <BoardColumn
            key={stage.key}
            color={stage.color}
            title={stage.label}
            count={list.length}
            active={over === stage.key}
            dropAt={dropIndex(stage.key)}
            drop={columnProps(stage.key)}
            emptyLabel={t(S.common.empty)}
            meta={
              showTotals ? (
                <>
                  <div className="t-micro t-num mt-1.5 pl-3.5 text-ink-muted">
                    {total ? som(total, { compact: true, locale }) : "—"}
                  </div>
                  <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="bar-fill h-full rounded-full"
                      style={{ width: `${share}%`, background: stage.color, opacity: 0.6 }}
                    />
                  </div>
                </>
              ) : null
            }
            cards={list.map((card) => (
              <Card key={card.id} card={card} fields={fields} drag={cardProps(card.id)} />
            ))}
          />
        );
      })}
    </Board>
  );
}

function Card({
  card,
  fields,
  drag,
}: {
  card: KanbanCard;
  fields: string[];
  /** всё, что нужно карточке для переноса: см. useBoardDrag */
  drag: ReturnType<ReturnType<typeof useBoardDrag>["cardProps"]>;
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
      {...drag}
      className={`card card-hover relative block px-3.5 py-3 ${drag.className}`}
      style={{ cursor: drag.draggable ? "grab" : "pointer" }}
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
