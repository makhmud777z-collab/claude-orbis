"use client";

import { useState } from "react";
import {
  addPipelineAction, addStageAction, moveStageAction, removePipelineAction,
  removeStageAction, updatePipelineAction, updateStageAction,
} from "@/app/actions";
import { ColorPicker, Modal } from "./controls";
import { Check } from "./Check";
import { StatusDot } from "./ui";
import {
  IconArrowDown, IconArrowUp, IconPlus, IconTrash,
} from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

export interface StageDraft {
  key: string;
  labelRu: string;
  labelUz: string;
  color: string;
  hintRu: string;
  hintUz: string;
  final: "won" | "lost" | null;
  /** сколько карточек стоит на стадии — стадию с карточками удалять нельзя */
  cards: number;
  /** «2 карточки» — склонение считает сервер, где живут форматтеры */
  cardsLabel: string;
}

export interface PipelineDraft {
  id: string;
  nameRu: string;
  nameUz: string;
  entity: "lead" | "deal";
  isDefault: boolean;
  /** «10 стадий» — склонение считается на сервере, где есть форматтеры */
  stagesLabel: string;
  stages: StageDraft[];
  /** воронку с карточками нельзя удалить: сделкам некуда деться */
  used: boolean;
}

/**
 * Настройки воронок — рабочий экран, а не витрина.
 *
 * Здесь агентство делает всё, что обычно приходится просить у разработчика:
 * переименовывает и перекрашивает стадии, меняет их порядок, добавляет свои
 * и убирает лишние, назначает финальные «успех» и «провал», заводит вторую
 * воронку под другой продукт и выбирает основную.
 *
 * Два запрета зашиты в саму модель, потому что их нарушение ломает данные:
 * нельзя удалить стадию, на которой стоят карточки, и нельзя удалить
 * воронку, по которой уже идут сделки.
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
  const [stage, setStage] = useState<{ pipeline: PipelineDraft; stage: StageDraft } | null>(null);
  const [adding, setAdding] = useState<PipelineDraft | null>(null);
  const [newPipeline, setNewPipeline] = useState(false);

  return (
    <>
      <div className="space-y-6">
        {pipelines.map((pipeline) => (
          <section key={pipeline.id} className="card overflow-hidden">
            <PipelineHead pipeline={pipeline} locale={locale} canEdit={canEdit} />

            <div className="divide-y divide-hairline-soft">
              {pipeline.stages.map((item, index) => (
                <div key={item.key} className="flex items-center gap-3 px-5 py-3">
                  <span className="h-8 w-1 flex-none rounded-full" style={{ background: item.color }} />

                  <button
                    type="button"
                    data-stage={item.key}
                    disabled={!canEdit}
                    onClick={() => setStage({ pipeline, stage: item })}
                    className="min-w-0 flex-1 text-left"
                    style={{ cursor: canEdit ? "pointer" : "default" }}
                  >
                    <span className="t-body-sm flex items-center gap-2 truncate">
                      {item.labelRu}
                      {item.final ? (
                        <StatusDot
                          color={item.final === "won" ? "var(--color-status-deal)" : "var(--color-status-risk)"}
                        />
                      ) : null}
                    </span>
                    <span className="t-micro block truncate text-ink-faint">
                      {item.labelUz}
                      {item.cards ? ` · ${item.cardsLabel}` : ""}
                    </span>
                  </button>

                  {canEdit ? (
                    <span className="flex flex-none items-center gap-0.5">
                      <StageMove pipelineId={pipeline.id} stageKey={item.key} delta={-1} disabled={index === 0} label={t(S.common.moveUp)} />
                      <StageMove pipelineId={pipeline.id} stageKey={item.key} delta={1} disabled={index === pipeline.stages.length - 1} label={t(S.common.moveDown)} />
                      <form action={removeStageAction}>
                        <input type="hidden" name="pipelineId" value={pipeline.id} />
                        <input type="hidden" name="stageKey" value={item.key} />
                        <button
                          className="btn-icon h-7 w-7"
                          disabled={item.cards > 0 || pipeline.stages.length <= 2}
                          aria-label={t(S.pipelines.removeStage)}
                          title={item.cards > 0 ? t(S.pipelines.stageInUse) : t(S.pipelines.removeStage)}
                        >
                          <IconTrash size={13} />
                        </button>
                      </form>
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            {canEdit ? (
              <div className="border-t border-hairline-soft px-5 py-3.5">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdding(pipeline)}>
                  <IconPlus size={14} /> {t(S.pipelines.addStage)}
                </button>
              </div>
            ) : null}
          </section>
        ))}
      </div>

      {canEdit ? (
        <button type="button" className="btn btn-secondary mt-5" onClick={() => setNewPipeline(true)}>
          <IconPlus size={15} /> {t(S.pipelines.addPipeline)}
        </button>
      ) : null}

      {stage ? (
        <StageDialog
          key={`${stage.pipeline.id}_${stage.stage.key}`}
          pipelineId={stage.pipeline.id}
          stage={stage.stage}
          locale={locale}
          onClose={() => setStage(null)}
        />
      ) : null}

      {adding ? (
        <AddStageDialog pipeline={adding} locale={locale} onClose={() => setAdding(null)} />
      ) : null}

      {newPipeline ? (
        <AddPipelineDialog locale={locale} onClose={() => setNewPipeline(false)} />
      ) : null}
    </>
  );
}

function PipelineHead({
  pipeline,
  locale,
  canEdit,
}: {
  pipeline: PipelineDraft;
  locale: Locale;
  canEdit: boolean;
}) {
  const t = translator(locale);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form action={updatePipelineAction} className="card-head space-y-3">
        <input type="hidden" name="pipelineId" value={pipeline.id} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input name="nameRu" defaultValue={pipeline.nameRu} className="field text-[13px]" placeholder="RU" />
          <input name="nameUz" defaultValue={pipeline.nameUz} className="field text-[13px]" placeholder="UZ" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-primary btn-sm">{t(S.common.save)}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
            {t(S.common.cancel)}
          </button>
          {pipeline.isDefault ? null : (
            <button name="makeDefault" value="1" className="btn btn-ghost btn-sm">
              {t(S.pipelines.makeDefault)}
            </button>
          )}
        </div>
      </form>
    );
  }

  return (
    <div className="card-head flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="t-body-lg min-w-0 flex-1 truncate">{pipeline.nameRu}</span>
      <span className="chip">
        {t(pipeline.entity === "lead" ? S.pipelines.forLeads : S.pipelines.forDeals)}
      </span>
      {pipeline.isDefault ? <span className="chip chip-active">{t(S.pipelines.isDefault)}</span> : null}
      <span className="t-micro text-ink-faint">{pipeline.stagesLabel}</span>
      {canEdit ? (
        <span className="flex items-center gap-1">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
            {t(S.common.rename)}
          </button>
          <form action={removePipelineAction}>
            <input type="hidden" name="pipelineId" value={pipeline.id} />
            <button
              className="btn-icon h-7 w-7"
              disabled={pipeline.isDefault || pipeline.used}
              aria-label={t(S.pipelines.removePipeline)}
              title={t(S.pipelines.removePipeline)}
            >
              <IconTrash size={13} />
            </button>
          </form>
        </span>
      ) : null}
    </div>
  );
}

function StageMove({
  pipelineId, stageKey, delta, disabled, label,
}: {
  pipelineId: string;
  stageKey: string;
  delta: number;
  disabled: boolean;
  label: string;
}) {
  return (
    <form action={moveStageAction}>
      <input type="hidden" name="pipelineId" value={pipelineId} />
      <input type="hidden" name="stageKey" value={stageKey} />
      <input type="hidden" name="delta" value={delta} />
      <button className="btn-icon h-7 w-7" disabled={disabled} aria-label={label} title={label}>
        {delta < 0 ? <IconArrowUp size={13} /> : <IconArrowDown size={13} />}
      </button>
    </form>
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
  const [final, setFinal] = useState<"won" | "lost" | "">(stage.final ?? "");

  const finals: { value: "" | "won" | "lost"; label: string }[] = [
    { value: "", label: t(S.pipelines.finalNone) },
    { value: "won", label: t(S.pipelines.finalWon) },
    { value: "lost", label: t(S.pipelines.finalLost) },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={t(S.pipelines.editStage)}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t(S.common.cancel)}
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
        <input type="hidden" name="final" value={final} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.pipelines.rename)} · RU</span>
            <input name="labelRu" defaultValue={stage.labelRu} className="field text-[13px]" />
          </label>
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.pipelines.rename)} · UZ</span>
            <input name="labelUz" defaultValue={stage.labelUz} className="field text-[13px]" />
          </label>
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.pipelines.stageHint)} · RU</span>
            <input name="hintRu" defaultValue={stage.hintRu} className="field text-[13px]" />
          </label>
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.pipelines.stageHint)} · UZ</span>
            <input name="hintUz" defaultValue={stage.hintUz} className="field text-[13px]" />
          </label>
        </div>

        <div>
          <span className="t-micro mb-2 block text-ink-faint">{t(S.pipelines.color)}</span>
          <ColorPicker value={color} onChange={setColor} locale={locale} />
        </div>

        <div>
          <span className="t-micro mb-2 block text-ink-faint">{t(S.pipelines.stageFinal)}</span>
          <div className="flex flex-wrap gap-1.5">
            {finals.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFinal(item.value)}
                className={`chip ${final === item.value ? "chip-active" : ""}`}
              >
                <Check on={final === item.value} />
                {item.label}
              </button>
            ))}
          </div>
          <p className="t-micro mt-2 leading-relaxed text-ink-faint">{t(S.pipelines.finalHint)}</p>
        </div>
      </form>
    </Modal>
  );
}

function AddStageDialog({
  pipeline,
  locale,
  onClose,
}: {
  pipeline: PipelineDraft;
  locale: Locale;
  onClose: () => void;
}) {
  const t = translator(locale);
  const [color, setColor] = useState("#0a6ed1");

  return (
    <Modal
      open
      onClose={onClose}
      title={t(S.pipelines.addStage)}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t(S.common.cancel)}
          </button>
          <button type="submit" form="add-stage" className="btn btn-primary btn-sm">
            {t(S.common.add)}
          </button>
        </>
      }
    >
      <form
        id="add-stage"
        action={(data) => {
          onClose();
          return addStageAction(data);
        }}
        className="space-y-4"
      >
        <input type="hidden" name="pipelineId" value={pipeline.id} />
        <input type="hidden" name="color" value={color} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.pipelines.newStage)} · RU</span>
            <input autoFocus required name="labelRu" className="field text-[13px]" />
          </label>
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.pipelines.newStage)} · UZ</span>
            <input name="labelUz" className="field text-[13px]" />
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

function AddPipelineDialog({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const t = translator(locale);
  const [entity, setEntity] = useState<"lead" | "deal">("deal");

  return (
    <Modal
      open
      onClose={onClose}
      title={t(S.pipelines.addPipeline)}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t(S.common.cancel)}
          </button>
          <button type="submit" form="add-pipeline" className="btn btn-primary btn-sm">
            {t(S.common.add)}
          </button>
        </>
      }
    >
      <form
        id="add-pipeline"
        action={(data) => {
          onClose();
          return addPipelineAction(data);
        }}
        className="space-y-4"
      >
        <input type="hidden" name="entity" value={entity} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.pipelines.pipelineName)} · RU</span>
            <input autoFocus required name="nameRu" className="field text-[13px]" />
          </label>
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.pipelines.pipelineName)} · UZ</span>
            <input name="nameUz" className="field text-[13px]" />
          </label>
        </div>
        <div className="flex gap-1.5">
          {(["deal", "lead"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setEntity(key)}
              className={`chip ${entity === key ? "chip-active" : ""}`}
            >
              <Check on={entity === key} />
              {t(key === "lead" ? S.pipelines.forLeads : S.pipelines.forDeals)}
            </button>
          ))}
        </div>
        <p className="t-micro leading-relaxed text-ink-faint">{t(S.pipelines.subtitle)}</p>
      </form>
    </Modal>
  );
}
