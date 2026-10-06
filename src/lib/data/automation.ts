import type { Robot, Trigger } from "../types";

/**
 * Демо-автоматика Seoul Way. Показывает, ради чего роботы вообще нужны:
 * новая заявка не ждёт, пока менеджер до неё доберётся, а документы не
 * зависают в тишине.
 *
 * Настоящие агентства собирают свои наборы в «Роботах и триггерах»; эти
 * записи — такие же данные арендатора, просто заведённые заранее.
 */
export const ROBOTS: Robot[] = [
  {
    id: "rb_sw_new_task",
    tenantId: "t_seoulway",
    pipelineId: "pl_sw_leads",
    stage: "new",
    action: "task",
    delayMinutes: 0,
    target: "owner",
    text: "Позвонить новому лиду",
    param: "high",
    order: 0,
    enabled: true,
  },
  {
    id: "rb_sw_new_notify",
    tenantId: "t_seoulway",
    pipelineId: "pl_sw_leads",
    stage: "new",
    action: "notify",
    delayMinutes: 60,
    target: "head",
    text: "Лид висит в «Новых» больше часа",
    param: "",
    order: 1,
    enabled: true,
  },
  {
    id: "rb_sw_qual_event",
    tenantId: "t_seoulway",
    pipelineId: "pl_sw_leads",
    stage: "qualification",
    action: "event",
    delayMinutes: 0,
    target: "owner",
    text: "Консультация по учёбе в Корее",
    param: "call",
    order: 0,
    enabled: true,
  },
  {
    id: "rb_sw_docs_task",
    tenantId: "t_seoulway",
    pipelineId: "pl_sw_main",
    stage: "documents",
    action: "task",
    delayMinutes: 0,
    target: "owner",
    text: "Собрать апостиль и переводы",
    param: "normal",
    order: 0,
    enabled: true,
  },
  {
    id: "rb_sw_docs_remind",
    tenantId: "t_seoulway",
    pipelineId: "pl_sw_main",
    stage: "documents",
    action: "notify",
    delayMinutes: 4320,
    target: "owner",
    text: "Документы собираются третий день — проверьте, что мешает",
    param: "",
    order: 1,
    enabled: true,
  },
  {
    id: "rb_sw_offer_note",
    tenantId: "t_seoulway",
    pipelineId: "pl_sw_main",
    stage: "offer",
    action: "note",
    delayMinutes: 0,
    target: "owner",
    text: "Получен offer — пора готовить пакет на визу",
    param: "",
    order: 0,
    enabled: true,
  },
];

export const TRIGGERS: Trigger[] = [
  {
    id: "tg_sw_meta",
    tenantId: "t_seoulway",
    pipelineId: "pl_sw_leads",
    stage: "new",
    event: "meta_lead",
    enabled: true,
  },
  {
    id: "tg_sw_activity",
    tenantId: "t_seoulway",
    pipelineId: "pl_sw_leads",
    stage: "qualification",
    event: "activity",
    enabled: true,
  },
];
