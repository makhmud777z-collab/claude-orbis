"use client";

import { useEffect, useState, useTransition } from "react";

/**
 * Перетаскивание по доске — одно на все доски портала.
 *
 * Досок в портале три: лиды, сделки, задачи. Раньше перетаскивание было
 * написано только в одной из них, и доска задач просто не двигалась —
 * колонки рисовались, карточки нет. Общий механизм закрывает такую
 * возможность: добавить доску и забыть про перенос больше нельзя.
 *
 * Карточка переезжает в колонку сразу, не дожидаясь сервера. Ждать ответа
 * здесь нельзя: человек тянет карточку рукой, и она обязана оказаться там,
 * куда он её привёл, в тот же момент. Серверная правка идёт следом, а
 * свежие данные с сервера сбрасывают локальную догадку.
 */
export function useBoardDrag<T extends { id: string }>(
  items: T[],
  columnOf: (item: T) => string,
  persist: (id: string, column: string) => void,
  canEdit: boolean,
) {
  const [, startTransition] = useTransition();
  /** куда карточка уехала по мнению интерфейса, пока сервер не ответил */
  const [moved, setMoved] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  /** карточки, которые только что приземлились: по ним играет движение */
  const [landed, setLanded] = useState<Record<string, number>>({});

  // Пришли свежие данные с сервера — локальные догадки больше не нужны.
  useEffect(() => setMoved({}), [items]);

  const columnFor = (item: T) => moved[item.id] ?? columnOf(item);

  const drop = (column: string) => {
    setOver(null);
    const id = dragging;
    setDragging(null);
    if (!id || !canEdit) return;

    const item = items.find((x) => x.id === id);
    if (!item || columnFor(item) === column) return;

    setMoved((prev) => ({ ...prev, [id]: column }));
    // Метка приземления своя на каждый перенос: вернул карточку обратно —
    // движение должно сыграть заново, а не промолчать из-за того, что
    // значение не изменилось.
    setLanded((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    startTransition(() => persist(id, column));
  };

  /**
   * Где в колонке окажется карточка, если её отпустить сейчас.
   *
   * Порядок внутри колонки задают данные, а не рука: карточка встанет туда,
   * где ей место в общем списке раздела. Поэтому место вставки не угадывается
   * по курсору, а считается — собираем колонку так, будто карточка уже в ней,
   * и смотрим, какой она там по счёту. Черта на этом месте не обманывает.
   *
   * Над своей же колонкой черты нет: отпускать там нечего.
   */
  const dropIndex = (column: string): number | null => {
    if (!dragging || over !== column) return null;
    const card = items.find((x) => x.id === dragging);
    if (!card || columnFor(card) === column) return null;
    const list = items.filter((x) => x.id === dragging || columnFor(x) === column);
    const at = list.findIndex((x) => x.id === dragging);
    return at < 0 ? null : at;
  };

  /** Свойства колонки: подсветка под курсором и приём карточки. */
  const columnProps = (column: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!canEdit) return;
      e.preventDefault();
      setOver(column);
    },
    onDragLeave: () => setOver((v) => (v === column ? null : v)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      drop(column);
    },
  });

  /** Свойства карточки: взятие, возврат и класс приземления. */
  const cardProps = (id: string) => ({
    draggable: canEdit,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
      setDragging(id);
    },
    onDragEnd: () => {
      setDragging(null);
      setOver(null);
    },
    "data-landed": landed[id] || undefined,
    className: dragging === id ? "kan-lifted" : landed[id] ? "kan-landed" : "",
  });

  return { columnFor, columnProps, cardProps, dropIndex, over, dragging, landed };
}
