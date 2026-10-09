"use client";

import { useState, useTransition } from "react";
import {
  removeRobotAction, removeTriggerAction, saveRobotAction, saveTriggerAction,
  toggleRobotAction, toggleTriggerAction,
} from "@/app/actions";
import { Modal, Select } from "./controls";
import { StatusDot } from "./ui";
import { IconBolt, IconPencil, IconPlus, IconRobot, IconTrash } from "./icons";
import {
  actionSpec, DELAYS, delayLabel, EVENT_KINDS, PRIORITIES, ROBOT_ACTIONS,
  TARGETS, TARGET_OWNER, triggerSpec, triggersFor,
} from "@/lib/automation";
import { translator, type Loc, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";
import type { Robot, RobotAction, Trigger } from "@/lib/types";

export interface StageCol {
  key: string;
  label: Loc;
  color: string;
}

export interface PipelineCol {
  id: string;
  name: Loc;
  entity: "lead" | "deal";
  stages: StageCol[];
}

export interface StaffOption {
  id: string;
  name: string;
  title: string;
}

/**
 * Роботы и триггеры — автоматика воронки, разложенная по её же стадиям.
 *
 * Колонки здесь те же и в том же порядке, что на доске CRM и в настройках
 * воронки: автоматика описывает путь карточки, и смотреть на неё нужно в
 * том порядке, в каком карточка этот путь проходит. Список действий из
 * плоского перечня настроек ничего не сказал бы о том, когда что случится.
 *
 * В каждой колонке два блока. Триггеры сверху — это вход на стадию
 * («случилось вот это — поставь карточку сюда»). Роботы ниже — выход
 * («карточка здесь — сделай вот это»). Порядок блоков повторяет порядок
 * событий во времени.
 */
export function Automation({
  pipelines,
  robots,
  triggers,
  staff,
  locale,
  canEdit,
}: {
  pipelines: PipelineCol[];
  robots: Robot[];
  triggers: Trigger[];
  staff: StaffOption[];
  locale: Locale;
  canEdit: boolean;
}) {
  const t = translator(locale);
  const [editing, setEditing] = useState<{ pipeline: PipelineCol; stage: StageCol; robot: Robot | null } | null>(null);
  const [newTrigger, setNewTrigger] = useState<{ pipeline: PipelineCol; stage: StageCol } | null>(null);

  return (
    <>
      <div className="space-y-8">
        {pipelines.map((pipeline) => (
          <section key={pipeline.id} className="card overflow-hidden">
            <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-hairline-soft bg-surface-2 px-5 py-3.5">
              <span className="t-body-sm font-semibold">{t(pipeline.name)}</span>
              <span className="t-micro text-ink-faint">
                {pipeline.entity === "lead" ? t(S.crm.leads) : t(S.crm.deals)}
              </span>
            </header>

            <div className="px-4 py-4">
              <div className="-mx-4 overflow-x-auto px-4 pb-1">
                <div className="flex min-w-max items-stretch gap-3">
                  {pipeline.stages.map((stage) => (
                    <StageColumn
                      key={stage.key}
                      pipeline={pipeline}
                      stage={stage}
                      robots={robots.filter((r) => r.pipelineId === pipeline.id && r.stage === stage.key)}
                      triggers={triggers.filter((x) => x.pipelineId === pipeline.id && x.stage === stage.key)}
                      staff={staff}
                      locale={locale}
                      canEdit={canEdit}
                      onAddRobot={() => setEditing({ pipeline, stage, robot: null })}
                      onEditRobot={(robot) => setEditing({ pipeline, stage, robot })}
                      onAddTrigger={() => setNewTrigger({ pipeline, stage })}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {editing ? (
        <RobotDialog
          key={editing.robot?.id ?? `new_${editing.pipeline.id}_${editing.stage.key}`}
          pipeline={editing.pipeline}
          stage={editing.stage}
          robot={editing.robot}
          staff={staff}
          locale={locale}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {newTrigger ? (
        <TriggerDialog
          pipeline={newTrigger.pipeline}
          stage={newTrigger.stage}
          taken={triggers.filter((x) => x.pipelineId === newTrigger.pipeline.id)}
          locale={locale}
          onClose={() => setNewTrigger(null)}
        />
      ) : null}
    </>
  );
}

/* ── колонка стадии ──────────────────────────────────────────── */

function StageColumn({
  pipeline, stage, robots, triggers, staff, locale, canEdit,
  onAddRobot, onEditRobot, onAddTrigger,
}: {
  pipeline: PipelineCol;
  stage: StageCol;
  robots: Robot[];
  triggers: Trigger[];
  staff: StaffOption[];
  locale: Locale;
  canEdit: boolean;
  onAddRobot: () => void;
  onEditRobot: (robot: Robot) => void;
  onAddTrigger: () => void;
}) {
  const t = translator(locale);

  return (
    <section
      className="stage-col flex w-[248px] flex-none flex-col overflow-hidden rounded-[16px] border border-hairline bg-surface-2"
    >
      <div className="h-[3px] w-full flex-none" style={{ background: stage.color }} />

      <header className="px-3.5 pb-2.5 pt-3">
        <div className="t-body-sm truncate font-medium">{t(stage.label)}</div>
      </header>

      {/* Триггеры: чем карточка сюда попадает помимо руки менеджера. */}
      <div className="px-3.5 pb-3">
        <div className="t-micro mb-1.5 flex items-center gap-1.5 uppercase tracking-[0.07em] text-ink-faint">
          <IconBolt size={11} /> {t(S.automation.triggers)}
        </div>

        {triggers.map((trigger) => (
          <TriggerCard key={trigger.id} trigger={trigger} locale={locale} canEdit={canEdit} />
        ))}

        {canEdit ? (
          <button type="button" className="btn btn-ghost btn-xs mt-1 w-full justify-center" onClick={onAddTrigger}>
            <IconPlus size={11} /> {t(S.automation.addTrigger)}
          </button>
        ) : triggers.length ? null : (
          <div className="t-micro text-ink-faint">—</div>
        )}
      </div>

      <div className="mx-3.5 border-t border-hairline-soft" />

      {/* Роботы: что портал делает, когда карточка уже здесь. */}
      <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
        <div className="t-micro mb-1.5 flex items-center gap-1.5 uppercase tracking-[0.07em] text-ink-faint">
          <IconRobot size={11} /> {t(S.automation.robots)}
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          {robots.map((robot) => (
            <RobotCard
              key={robot.id}
              robot={robot}
              pipeline={pipeline}
              staff={staff}
              locale={locale}
              canEdit={canEdit}
              onEdit={() => onEditRobot(robot)}
            />
          ))}

          {!robots.length ? <div className="t-micro text-ink-faint">{t(S.automation.noRobots)}</div> : null}
        </div>

        {canEdit ? (
          <button type="button" className="btn btn-secondary btn-xs mt-2.5 w-full justify-center" onClick={onAddRobot}>
            <IconPlus size={11} /> {t(S.automation.addRobot)}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function TriggerCard({ trigger, locale, canEdit }: { trigger: Trigger; locale: Locale; canEdit: boolean }) {
  const t = translator(locale);
  const spec = triggerSpec(trigger.event);
  if (!spec) return null;

  return (
    <div
      className="row-hover mb-1.5 flex items-start gap-1.5 rounded-[9px] border border-hairline bg-surface-1 px-2.5 py-2"
      style={{ opacity: trigger.enabled ? 1 : 0.5 }}
    >
      <div className="min-w-0 flex-1">
        <div className="t-micro truncate font-medium" title={t(spec.label)}>{t(spec.label)}</div>
        <div className="t-micro truncate text-ink-faint">
          {trigger.enabled ? t(S.automation.moves) : t(S.automation.off)}
        </div>
      </div>

      {canEdit ? (
        <div className="flex flex-none gap-0.5">
          <form action={toggleTriggerAction}>
            <input type="hidden" name="triggerId" value={trigger.id} />
            <button
              className="btn-icon h-6 w-6"
              title={trigger.enabled ? t(S.automation.turnOff) : t(S.automation.turnOn)}
              aria-label={trigger.enabled ? t(S.automation.turnOff) : t(S.automation.turnOn)}
            >
              <StatusDot color={trigger.enabled ? "var(--color-status-deal)" : "var(--color-ink-faint)"} />
            </button>
          </form>
          <form action={removeTriggerAction}>
            <input type="hidden" name="triggerId" value={trigger.id} />
            <button className="btn-icon h-6 w-6" title={t(S.automation.remove)} aria-label={t(S.automation.remove)}>
              <IconTrash size={11} />
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function RobotCard({
  robot, pipeline, staff, locale, canEdit, onEdit,
}: {
  robot: Robot;
  pipeline: PipelineCol;
  staff: StaffOption[];
  locale: Locale;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const t = translator(locale);
  const spec = actionSpec(robot.action);

  // Вторая строка карточки — то, что робот сделает на самом деле: текст
  // задачи, имя нового ответственного, название стадии. Без неё десяток
  // роботов «Поставить задачу» неразличимы между собой.
  const detail =
    robot.action === "move"
      ? t(pipeline.stages.find((s) => s.key === robot.param)?.label ?? { ru: robot.param, uz: robot.param })
      : robot.action === "assign"
        ? targetName(robot.target, staff, locale)
        : robot.text;

  return (
    <div
      className="row-hover rounded-[9px] border border-hairline bg-surface-1 px-2.5 py-2"
      style={{ opacity: robot.enabled ? 1 : 0.5 }}
    >
      <div className="flex items-start gap-1.5">
        <span className="mt-[3px] flex-none" style={{ color: spec.tone }}>
          <IconRobot size={12} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="t-micro truncate font-medium">{t(spec.label)}</div>
          {detail ? (
            // Колонка узкая, и длинный текст задачи здесь не помещается:
            // полный остаётся в подсказке, иначе робота не отличить от робота.
            <div className="t-micro truncate text-ink-muted" title={detail}>{detail}</div>
          ) : null}
          <div className="t-micro mt-0.5 truncate text-ink-faint">
            {t(delayLabel(robot.delayMinutes))}
            {spec.needsTarget ? ` · ${targetName(robot.target, staff, locale)}` : ""}
            {robot.enabled ? "" : ` · ${t(S.automation.off)}`}
          </div>
        </div>
      </div>

      {canEdit ? (
        <div className="mt-1.5 flex justify-end gap-0.5">
          <form action={toggleRobotAction}>
            <input type="hidden" name="robotId" value={robot.id} />
            <button
              className="btn-icon h-6 w-6"
              title={robot.enabled ? t(S.automation.turnOff) : t(S.automation.turnOn)}
              aria-label={robot.enabled ? t(S.automation.turnOff) : t(S.automation.turnOn)}
            >
              <StatusDot color={robot.enabled ? "var(--color-status-deal)" : "var(--color-ink-faint)"} />
            </button>
          </form>
          <button type="button" className="btn-icon h-6 w-6" onClick={onEdit} title={t(S.automation.editRobot)} aria-label={t(S.automation.editRobot)}>
            <IconPencil size={11} />
          </button>
          <form action={removeRobotAction}>
            <input type="hidden" name="robotId" value={robot.id} />
            <button className="btn-icon h-6 w-6" title={t(S.automation.remove)} aria-label={t(S.automation.remove)}>
              <IconTrash size={11} />
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

/** Подпись получателя: роль в карточке или имя конкретного сотрудника. */
function targetName(target: string, staff: StaffOption[], locale: Locale): string {
  const t = translator(locale);
  const known = TARGETS.find((x) => x.id === target);
  if (known) return t(known.label);
  return staff.find((u) => u.id === target)?.name ?? target;
}

/* ── диалоги ─────────────────────────────────────────────────── */

/** Осмысленное значение второго параметра для действия. */
function defaultParam(action: RobotAction, pipeline: PipelineCol, stage: StageCol): string {
  const spec = actionSpec(action);
  if (spec.param === "stage") return pipeline.stages.find((s) => s.key !== stage.key)?.key ?? "";
  if (spec.param === "priority") return "normal";
  if (spec.param === "eventKind") return "call";
  return "";
}

function RobotDialog({
  pipeline, stage, robot, staff, locale, onClose,
}: {
  pipeline: PipelineCol;
  stage: StageCol;
  robot: Robot | null;
  staff: StaffOption[];
  locale: Locale;
  onClose: () => void;
}) {
  const t = translator(locale);
  const [, startTransition] = useTransition();

  const [action, setAction] = useState<RobotAction>(robot?.action ?? "task");
  const [delay, setDelay] = useState(String(robot?.delayMinutes ?? 0));
  const [target, setTarget] = useState(robot?.target ?? TARGET_OWNER);
  const [text, setText] = useState(robot?.text ?? "");
  // У нового робота параметр обязан быть осмысленным с самого начала:
  // пустая «важность» показывает прочерк там, где выбор уже сделан.
  const [param, setParam] = useState(robot?.param || defaultParam(action, pipeline, stage));

  const spec = actionSpec(action);

  /*
   * Второй параметр у каждого действия свой, и при смене действия старое
   * значение становится бессмыслицей: «важность high» в поле стадии.
   * Поэтому параметр сбрасывается на осмысленный по умолчанию.
   */
  const changeAction = (value: string) => {
    const next = value as RobotAction;
    setAction(next);
    setParam(defaultParam(next, pipeline, stage));
  };

  const ready = (!spec.needsText || text.trim().length > 0) && (spec.param !== "stage" || Boolean(param));

  const submit = () => {
    if (!ready) return;
    const data = new FormData();
    if (robot) data.set("robotId", robot.id);
    data.set("pipelineId", pipeline.id);
    data.set("stage", stage.key);
    data.set("action", action);
    data.set("delayMinutes", delay);
    data.set("target", target);
    data.set("text", text.trim());
    data.set("param", param);
    startTransition(() => {
      void saveRobotAction(data);
    });
    onClose();
  };

  const targetOptions = [
    ...TARGETS.map((x) => ({ value: x.id, label: t(x.label) })),
    ...staff.map((u) => ({ value: u.id, label: u.name, hint: u.title })),
  ];

  const paramOptions =
    spec.param === "stage"
      ? pipeline.stages.filter((s) => s.key !== stage.key).map((s) => ({ value: s.key, label: t(s.label) }))
      : spec.param === "priority"
        ? PRIORITIES.map((p) => ({ value: p.id, label: t(p.label) }))
        : spec.param === "eventKind"
          ? EVENT_KINDS.map((k) => ({ value: k.id, label: t(k.label) }))
          : [];

  const paramLabel =
    spec.param === "stage" ? S.automation.fStage
      : spec.param === "priority" ? S.automation.fPriority
        : S.automation.fEventKind;

  return (
    <Modal
      open
      onClose={onClose}
      title={robot ? t(S.automation.editRobot) : t(S.automation.newRobot)}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t(S.common.cancel)}
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!ready} onClick={submit}>
            {t(S.common.save)}
          </button>
        </>
      }
    >
      <div className="t-caption mb-4 flex items-center gap-2 text-ink-muted">
        <StatusDot color={stage.color} />
        {t(pipeline.name)} · {t(stage.label)}
      </div>

      <Row label={t(S.automation.fAction)}>
        <Select
          locale={locale}
          width="100%"
          value={action}
          options={ROBOT_ACTIONS.map((a) => ({ value: a.id, label: t(a.label), hint: t(a.hint) }))}
          onChange={changeAction}
        />
      </Row>

      <Row label={t(S.automation.fWhen)}>
        <Select
          locale={locale}
          width="100%"
          value={delay}
          options={DELAYS.map((d) => ({ value: String(d.minutes), label: t(d.label) }))}
          onChange={setDelay}
        />
      </Row>

      {spec.needsTarget ? (
        <Row label={t(S.automation.fWho)}>
          <Select locale={locale} width="100%" value={target} options={targetOptions} onChange={setTarget} />
        </Row>
      ) : null}

      {spec.param !== "none" ? (
        <Row label={t(paramLabel)}>
          <Select locale={locale} width="100%" value={param} options={paramOptions} onChange={setParam} />
        </Row>
      ) : null}

      {spec.needsText ? (
        <Row label={t(S.automation.fText)} hint={t(S.automation.textHint)}>
          <input
            autoFocus
            className="field w-full"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </Row>
      ) : null}

      <div className="t-micro mt-4 text-ink-faint">{t(spec.hint)}</div>
    </Modal>
  );
}

function TriggerDialog({
  pipeline, stage, taken, locale, onClose,
}: {
  pipeline: PipelineCol;
  stage: StageCol;
  taken: Trigger[];
  locale: Locale;
  onClose: () => void;
}) {
  const t = translator(locale);
  const [, startTransition] = useTransition();

  const choices = triggersFor(pipeline.entity);
  const [event, setEvent] = useState<string>(choices[0]?.id ?? "");

  // Событие уже занято другой стадией этой воронки: предупреждаем до
  // сохранения, иначе прежний триггер молча исчезнет.
  const busy = taken.find((x) => x.event === event && x.stage !== stage.key);
  const busyStage = busy ? pipeline.stages.find((s) => s.key === busy.stage) : undefined;

  const submit = () => {
    const data = new FormData();
    data.set("pipelineId", pipeline.id);
    data.set("stage", stage.key);
    data.set("event", event);
    startTransition(() => {
      void saveTriggerAction(data);
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t(S.automation.newTrigger)}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t(S.common.cancel)}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={submit}>
            {t(S.common.save)}
          </button>
        </>
      }
    >
      <div className="t-caption mb-4 flex items-center gap-2 text-ink-muted">
        <StatusDot color={stage.color} />
        {t(pipeline.name)} · {t(stage.label)}
      </div>

      <Row label={t(S.automation.fEvent)}>
        <Select
          locale={locale}
          width="100%"
          value={event}
          options={choices.map((e) => ({ value: e.id, label: t(e.label), hint: t(e.hint) }))}
          onChange={setEvent}
        />
      </Row>

      {busy && busyStage ? (
        <div className="t-caption mt-3" style={{ color: "var(--color-status-progress)" }}>
          {t(S.automation.moves)}: {t(busyStage.label)} → {t(stage.label)}
        </div>
      ) : null}
    </Modal>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="mb-3.5 block">
      <span className="t-caption mb-1.5 flex items-baseline gap-2 text-ink-muted">
        {label}
        {hint ? <span className="t-micro text-ink-faint">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
