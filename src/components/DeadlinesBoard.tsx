import Link from "next/link";
import { Board, BoardColumn } from "./BoardColumn";
import { Avatar, StatusDot } from "./ui";

export interface DeadlineCard {
  id: string;
  href: string;
  title: string;
  kindLabel: string;
  kindColor: string;
  ownerName: string;
  dateLabel: string;
  leftLabel: string;
  /** срок уже прошёл: читается раньше названия */
  overdue: boolean;
}

export interface DeadlineGroup {
  key: string;
  title: string;
  color: string;
  cards: DeadlineCard[];
}

/**
 * Доска дедлайнов.
 *
 * Столбцы — не стадии, а срочность: просрочено, сегодня, неделя, месяц,
 * позже. Карточки здесь не двигаются рукой, и это не упущение: дедлайн не
 * самостоятельная запись, его дату держит сделка, документ или задача.
 * Перенос карточки по доске означал бы «перенести срок», а срок переносят
 * там, где он живёт, — в самой записи, на которую карточка и ведёт.
 */
export function DeadlinesBoard({
  groups,
  emptyLabel,
}: {
  groups: DeadlineGroup[];
  emptyLabel: string;
}) {
  return (
    <Board>
      {groups.map((group) => (
        <BoardColumn
          key={group.key}
          color={group.color}
          title={group.title}
          count={group.cards.length}
          emptyLabel={emptyLabel}
          cards={group.cards.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className="card card-hover relative block px-3.5 py-3"
              style={
                card.overdue
                  ? { background: "color-mix(in srgb, var(--color-status-risk) 6%, var(--color-surface-1))" }
                  : undefined
              }
            >
              <div className="flex items-start gap-2">
                <span className="mt-1 flex-none">
                  <StatusDot color={card.overdue ? "var(--color-status-risk)" : card.kindColor} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="t-body-sm block">{card.title}</span>
                  <span className="t-micro mt-0.5 block truncate text-ink-faint">
                    {card.kindLabel}
                  </span>
                </span>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-hairline-soft pt-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar name={card.ownerName} size={22} />
                  <span className="t-micro truncate text-ink-faint">{card.ownerName}</span>
                </span>
                <span className="flex-none text-right">
                  <span className="t-micro t-num block whitespace-nowrap">{card.dateLabel}</span>
                  <span
                    className="t-micro block whitespace-nowrap"
                    style={{
                      color: card.overdue ? "var(--color-status-risk)" : "var(--color-ink-faint)",
                      fontWeight: card.overdue ? 600 : undefined,
                    }}
                  >
                    {card.leftLabel}
                  </span>
                </span>
              </div>
            </Link>
          ))}
        />
      ))}
    </Board>
  );
}
