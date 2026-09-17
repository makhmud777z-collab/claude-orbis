"use client";

import { useTransition } from "react";
import { moveCardAction } from "@/app/actions";
import { Tooltip } from "./controls";
import type { KanbanStage } from "./Kanban";

/**
 * Полоса стадий в карточке: тот же путь, что и на доске, но одним рядом.
 * Пройденные стадии залиты цветом своей стадии — это единственное место,
 * где цвет занимает площадь, и он приходит из настроек воронки.
 */
export function StageBar({
  entity,
  id,
  stages,
  current,
  canEdit,
}: {
  entity: "lead" | "deal";
  id: string;
  stages: KanbanStage[];
  current: string;
  canEdit: boolean;
}) {
  const [pending, start] = useTransition();
  const index = stages.findIndex((s) => s.key === current);

  const move = (stage: string) => {
    if (!canEdit || stage === current) return;
    const data = new FormData();
    data.set("entity", entity);
    data.set("id", id);
    data.set("stage", stage);
    start(() => {
      void moveCardAction(data);
    });
  };

  return (
    <div
      className="flex gap-1 overflow-x-auto pb-1"
      style={{ opacity: pending ? 0.6 : 1 }}
      role="group"
    >
      {stages.map((stage, i) => {
        const passed = i <= index;
        const active = stage.key === current;
        return (
          <Tooltip key={stage.key} text={stage.hint}>
            <button
              type="button"
              onClick={() => move(stage.key)}
              disabled={!canEdit}
              className="t-micro whitespace-nowrap rounded-[6px] px-2.5 py-1.5 transition-colors"
              style={{
                background: passed ? stage.color : "var(--color-surface-1)",
                color: passed ? "#10151c" : "var(--color-ink-faint)",
                fontWeight: active ? 600 : 500,
                opacity: passed && !active ? 0.55 : 1,
                cursor: canEdit ? "pointer" : "default",
              }}
            >
              {stage.label}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
