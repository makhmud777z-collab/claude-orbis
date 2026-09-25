"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  addPipelineAction, addStageAction, moveStageAction, removePipelineAction,
  removeStageAction, reorderStageAction, updatePipelineAction, updateStageAction,
} from "@/app/actions";
import { ColorPicker, Modal } from "./controls";
import { Check } from "./Check";
import { StatusDot } from "./ui";
import {
  IconChevronRight, IconDrag, IconPlus, IconTrash,
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
 * Стадии показаны так же, как их видит менеджер на доске CRM: колонками
 * слева направо. Колонку можно перетащить мышью на новое место (как
 * карточку на канбане) — порядок стадий это и есть порядок работы. На
 * телефоне, где перетаскивание ненадёжно, тот же порядок меняется
 * стрелками в шапке колонки.
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
      <div className="space-y-8">
        {pipelines.map((pipeline) => (
          <section key={pipeline.id} className="card overflow-hidden">
            <PipelineHead pipeline={pipeline} locale={locale} canEdit={canEdit} />
            <PipelineBoard
              pipeline={pipeline}
              locale={locale}
              canEdit={canEdit}
              onEditStage={(s) => setStage({ pipeline, stage: s })}
              onAddStage={() => setAdding(pipeline)}
            />
          </section>
        ))}
      </div>

      {canEdit ? (
        <button type="button" className="btn btn-secondary mt-6" onClick={() => setNewPipeline(true)}>
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

/**
 * Доска одной воронки: стадии-колонки с перетаскиванием.
 *
 * Порядок держим оптимистично в локальном состоянии, иначе перетаскивание
 * ждёт ответа сервера и ощущается как зависание. Когда сервер присылает
 * свежие данные (revalidate после сохранения), сигнатура стадий меняется —
 * и локальная догадка сбрасывается на правду.
 */
function PipelineBoard({
  pipeline,
  locale,
  canEdit,
  onEditStage,
  onAddStage,
}: {
  pipeline: PipelineDraft;
  locale: Locale;
  canEdit: boolean;
  onEditStage: (stage: StageDraft) => void;
  onAddStage: () => void;
}) {
  const t = translator(locale);
  const [, startTransition] = useTransition();
  const byKey = new Map(pipeline.stages.map((s) => [s.key, s]));
  const signature = pipeline.stages.map((s) => s.key).join(",");

  const [order, setOrder] = useState<string[]>(pipeline.stages.map((s) => s.key));
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const lastSignature = useRef(signature);

  useEffect(() => {
    if (lastSignature.current !== signature) {
      lastSignature.current = signature;
      setOrder(pipeline.stages.map((s) => s.key));
    }
  }, [signature, pipeline.stages]);

  const stages = order.map((k) => byKey.get(k)).filter((s): s is StageDraft => Boolean(s));

  const persist = (stageKey: string, toIndex: number) => {
    const data = new FormData();
    data.set("pipelineId", pipeline.id);
    data.set("stageKey", stageKey);
    data.set("toIndex", String(toIndex));
    startTransition(() => {
      void reorderStageAction(data);
    });
  };

  const drop = (targetKey: string) => {
    const from = dragging;
    setOver(null);
    setDragging(null);
    if (!from || !canEdit || from === targetKey) return;
    const current = [...order];
    const fromIndex = current.indexOf(from);
    const targetIndex = current.indexOf(targetKey);
    if (fromIndex < 0 || targetIndex < 0) return;
    current.splice(fromIndex, 1);
    current.splice(targetIndex, 0, from);
    setOrder(current);
    persist(from, targetIndex);
  };

  // Стрелки — запасной путь для телефона: там нативного перетаскивания нет.
  const nudge = (stageKey: string, delta: number) => {
    const current = [...order];
    const i = current.indexOf(stageKey);
    const to = i + delta;
    if (i < 0 || to < 0 || to >= current.length) return;
    current.splice(i, 1);
    current.splice(to, 0, stageKey);
    setOrder(current);
    persist(stageKey, to);
  };

  return (
    <div className="px-4 py-4">
      {canEdit ? (
        <div className="t-micro mb-3 text-ink-faint">{t(S.pipelines.dragStageHint)}</div>
      ) : null}

      <div className="-mx-4 overflow-x-auto px-4 pb-1">
        <div className="flex min-w-max items-stretch gap-3">
          {stages.map((item, index) => {
            const active = over === item.key && dragging !== item.key;
            return (
              <section
                key={item.key}
                onDragOver={(e) => {
                  if (!canEdit || !dragging) return;
                  e.preventDefault();
                  setOver(item.key);
                }}
                onDragLeave={() => setOver((v) => (v === item.key ? null : v))}
                onDrop={(e) => {
                  e.preventDefault();
                  drop(item.key);
                }}
                className="stage-col page-in relative flex w-[220px] flex-none flex-col overflow-hidden rounded-[16px] border border-hairline bg-surface-2"
                style={{
                  animationDelay: `${Math.min(index * 40, 240)}ms`,
                  opacity: dragging === item.key ? 0.4 : 1,
                  background: active
                    ? `color-mix(in srgb, ${item.color} 7%, var(--color-surface-2))`
                    : undefined,
                }}
              >
                <div className="h-[3px] w-full flex-none" style={{ background: item.color }} />

                {active ? (
                  <span
                    aria-hidden
                    className="kan-drop-ring pointer-events-none absolute inset-0 rounded-[16px]"
                    style={{ boxShadow: `inset 0 0 0 2px ${item.color}` }}
                  />
                ) : null}

                <header
                  draggable={canEdit}
                  onDragStart={(e) => {
                    if (!canEdit) return;
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", item.key);
                    setDragging(item.key);
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                  className="flex items-center gap-1.5 border-b border-hairline-soft bg-surface-1 px-2.5 py-2"
                  style={{ cursor: canEdit ? "grab" : "default" }}
                >
                  {canEdit ? <IconDrag size={14} className="flex-none text-ink-faint" /> : null}
                  <StatusDot color={item.color} />
                  <span className="t-caption min-w-0 flex-1 truncate font-semibold" style={{ color: item.color }}>
                    {item.labelRu}
                  </span>
                  {item.final ? (
                    <span
                      className="t-micro flex-none rounded-full px-1.5 py-0.5 font-medium"
                      style={{
                        background: item.final === "won"
                          ? "color-mix(in srgb, var(--color-status-deal) 16%, transparent)"
                          : "color-mix(in srgb, var(--color-status-risk) 16%, transparent)",
                        color: item.final === "won" ? "var(--color-status-deal)" : "var(--color-status-risk)",
                      }}
                    >
                      {t(item.final === "won" ? S.pipelines.finalWon : S.pipelines.finalLost)}
                    </span>
                  ) : null}
                </header>

                <button
                  type="button"
                  data-stage={item.key}
                  disabled={!canEdit}
                  onClick={() => onEditStage(item)}
                  className="flex flex-1 flex-col gap-1 px-3 py-3 text-left transition-colors hover:bg-surface-1"
                  style={{ cursor: canEdit ? "pointer" : "default" }}
                >
                  <span className="t-micro truncate text-ink-muted">{item.labelUz || "—"}</span>
                  <span className="t-micro truncate text-ink-faint">
                    {item.cards ? item.cardsLabel : t(S.pipelines.stageEmpty)}
                  </span>
                </button>

                {canEdit ? (
                  <div className="flex items-center gap-0.5 border-t border-hairline-soft px-2 py-1.5">
                    <button
                      type="button"
                      className="btn-icon h-7 w-7 disabled:opacity-30"
                      disabled={index === 0}
                      aria-label={t(S.common.moveUp)}
                      title={t(S.common.moveUp)}
                      onClick={() => nudge(item.key, -1)}
                    >
                      <IconChevronRight size={13} style={{ transform: "rotate(180deg)" }} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon h-7 w-7 disabled:opacity-30"
                      disabled={index === stages.length - 1}
                      aria-label={t(S.common.moveDown)}
                      title={t(S.common.moveDown)}
                      onClick={() => nudge(item.key, 1)}
                    >
                      <IconChevronRight size={13} />
                    </button>
                    <span className="flex-1" />
                    <form action={removeStageAction}>
                      <input type="hidden" name="pipelineId" value={pipeline.id} />
                      <input type="hidden" name="stageKey" value={item.key} />
                      <button
                        className="btn-icon h-7 w-7"
                        disabled={item.cards > 0 || stages.length <= 2}
                        aria-label={t(S.pipelines.removeStage)}
                        title={item.cards > 0 ? t(S.pipelines.stageInUse) : t(S.pipelines.removeStage)}
                      >
                        <IconTrash size={13} />
                      </button>
                    </form>
                  </div>
                ) : null}
              </section>
            );
          })}

          {canEdit ? (
            <button
              type="button"
              onClick={onAddStage}
              className="stage-add flex w-[220px] flex-none flex-col items-center justify-center gap-1.5 rounded-[16px] border border-dashed border-hairline text-ink-faint transition-colors hover:border-accent hover:text-accent"
              style={{ minHeight: 132 }}
            >
              <IconPlus size={18} />
              <span className="t-caption">{t(S.pipelines.addStage)}</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
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
