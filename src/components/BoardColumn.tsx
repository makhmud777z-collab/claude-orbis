import type { ReactNode } from "react";
import { StatusDot } from "./ui";

/**
 * Колонка доски — одна на весь портал.
 *
 * Досок в системе четыре: лиды, сделки, задачи, проекты (и срезы дедлайнов).
 * Раньше доска задач рисовалась сеткой на всю ширину, а канбан CRM — рядом
 * колонок по 280 пикселей, и одинаковыми они только казались: промежутки
 * между столбцами отличались вдвое. Общая колонка закрывает такую
 * возможность — расстояние задано в одном месте.
 */
export function Board({ hint, children }: { hint?: string | null; children: ReactNode }) {
  return (
    <>
      {hint ? <div className="t-micro mb-3 text-ink-faint">{hint}</div> : null}

      {/* Доска уезжает под края страницы: колонки не сжимаются, а прокручиваются.
          Справа всегда остаётся воздух — место под новую стадию. */}
      <div className="-mx-5 overflow-x-auto px-5 pb-2 lg:-mx-8 lg:px-8">
        <div className="flex min-w-max items-start gap-4">{children}</div>
      </div>
    </>
  );
}

export function BoardColumn({
  color,
  title,
  count,
  meta,
  active,
  dropAt,
  cards,
  emptyLabel,
  drop,
}: {
  color: string;
  title: string;
  count: number;
  /** сумма колонки и доля воронки — только там, где это осмысленно */
  meta?: ReactNode;
  /** курсор держит карточку над этой колонкой */
  active?: boolean;
  /** место, где карточка окажется после того, как её отпустят */
  dropAt?: number | null;
  cards: ReactNode[];
  emptyLabel: string;
  /**
   * Приём карточки. Необязателен: на доске дедлайнов двигать нечего — срок
   * живёт в самой сделке, документе или задаче, и доска его только
   * раскладывает по срочности.
   */
  drop?: {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
  };
}) {
  const slot = (
    <div className="kan-slot" style={{ color }} aria-hidden />
  );

  return (
    <section
      {...drop}
      className="kan-col relative flex w-[280px] flex-none flex-col overflow-hidden rounded-[18px] border border-hairline bg-surface-2 transition-colors duration-150"
      style={{
        background: active
          ? `color-mix(in srgb, ${color} 6%, var(--color-surface-2))`
          : undefined,
      }}
    >
      {/* Цвет стадии сверху — тонкая полоса вместо заливки всей колонки. */}
      <div className="h-[3px] w-full flex-none" style={{ background: color }} />

      {active ? (
        <span
          aria-hidden
          className="kan-drop-ring pointer-events-none absolute inset-0 rounded-[18px]"
          style={{ boxShadow: `inset 0 0 0 2px ${color}` }}
        />
      ) : null}

      <header className="flex-none border-b border-hairline-soft bg-surface-1 px-3.5 pb-3 pt-3">
        <div className="flex items-center gap-2">
          <StatusDot color={color} />
          <span className="t-caption min-w-0 flex-1 truncate font-semibold" style={{ color }}>
            {title}
          </span>
          <span className="t-micro t-num rounded-full bg-surface-3 px-1.5 py-0.5 font-semibold text-ink-muted">
            {count}
          </span>
        </div>
        {meta}
      </header>

      <div className="flex flex-1 flex-col gap-2.5 p-2.5">
        {cards.map((card, i) => (
          // Ключ — позиция: карточки приходят готовыми узлами со своими
          // ключами внутри, здесь важен только порядок вместе с чертой.
          <div key={i} className="contents">
            {dropAt === i ? slot : null}
            {card}
          </div>
        ))}
        {dropAt === cards.length ? slot : null}

        {!cards.length ? (
          <div className="t-micro rounded-[12px] border border-dashed border-hairline px-3 py-7 text-center text-ink-faint">
            {emptyLabel}
          </div>
        ) : null}
      </div>
    </section>
  );
}
