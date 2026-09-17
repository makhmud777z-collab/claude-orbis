"use client";

import { useEffect, useState } from "react";
import { updateStageAction } from "@/app/actions";
import { ColorPicker, Modal } from "./controls";
import { StatusDot } from "./ui";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

export interface StageDraft {
  key: string;
  labelRu: string;
  labelUz: string;
  color: string;
  hint: string;
  final: "won" | "lost" | null;
}

export interface PipelineDraft {
  id: string;
  name: string;
  entity: "lead" | "deal";
  /** «10 стадий» — склонение считается на сервере, где есть форматтеры */
  stagesLabel: string;
  stages: StageDraft[];
}

/**
 * Настройки воронки: имя стадии на двух языках и её цвет.
 * Цвет выбирается из палитры или вводится HEX-кодом — как в Битриксе,
 * потому что агентства подгоняют доску под свои привычные цвета.
 */
export function PipelineEditor({
  pipelines,
  locale,
  canEdit,
}: {
  pipelines: PipelineDraft[];
  locale: Locale;
  canEdit: boolean;
}) {
  const t = translator(locale);
  const [open, setOpen] = useState<{ pipeline: PipelineDraft; stage: StageDraft } | null>(null);

  return (
    <>
      <div className="space-y-6">
        {pipelines.map((pipeline) => (
          <section key={pipeline.id} className="card p-5">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="t-headline">{pipeline.name}</h2>
              <span className="t-micro text-ink-faint">{pipeline.stagesLabel}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {pipeline.stages.map((stage) => (
                <button
                  key={stage.key}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setOpen({ pipeline, stage })}
                  className="card card-hover flex items-center gap-2.5 px-3 py-2.5 text-left"
                  style={{ cursor: canEdit ? "pointer" : "default", minWidth: 190 }}
                >
                  <span
                    className="h-7 w-1 flex-none rounded-full"
                    style={{ background: stage.color }}
                  />
                  <span className="min-w-0">
                    <span className="t-caption block truncate">{stage.labelRu}</span>
                    <span className="t-micro block truncate text-ink-faint">{stage.labelUz}</span>
                  </span>
                  {stage.final ? (
                    <StatusDot
                      color={
                        stage.final === "won"
                          ? "var(--color-status-deal)"
                          : "var(--color-status-risk)"
                      }
                    />
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {open ? (
        <StageDialog
          key={`${open.pipeline.id}_${open.stage.key}`}
          pipelineId={open.pipeline.id}
          stage={open.stage}
          locale={locale}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}

function StageDialog({
  pipelineId,
  stage,
  locale,
  onClose,
}: {
  pipelineId: string;
  stage: StageDraft;
  locale: Locale;
  onClose: () => void;
}) {
  const t = translator(locale);
  const [color, setColor] = useState(stage.color);

  useEffect(() => setColor(stage.color), [stage.color]);

  return (
    <Modal
      open
      onClose={onClose}
      title={t(S.pipelines.editStage)}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t(S.common.reset)}
          </button>
          <button type="submit" form="stage-form" className="btn btn-primary btn-sm">
            {t(S.common.save)}
          </button>
        </>
      }
    >
      <form
        id="stage-form"
        action={(data) => {
          onClose();
          return updateStageAction(data);
        }}
        className="space-y-4"
      >
        <input type="hidden" name="pipelineId" value={pipelineId} />
        <input type="hidden" name="stageKey" value={stage.key} />
        <input type="hidden" name="color" value={color} />

        <p className="t-caption text-ink-muted">{stage.hint}</p>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.pipelines.rename)} · RU</span>
            <input name="labelRu" defaultValue={stage.labelRu} className="field text-[13px]" />
          </label>
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.pipelines.rename)} · UZ</span>
            <input name="labelUz" defaultValue={stage.labelUz} className="field text-[13px]" />
          </label>
        </div>

        <div>
          <span className="t-micro mb-2 block text-ink-faint">{t(S.pipelines.color)}</span>
          <ColorPicker value={color} onChange={setColor} locale={locale} />
        </div>
      </form>
    </Modal>
  );
}
