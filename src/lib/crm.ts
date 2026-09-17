import { channelById } from "./data/channels";
import { dossierProgress } from "./data/documents";
import { userById } from "./data/users";
import { programById, universityById } from "./data/universities";
import { isPast, isSoon, type Formatters } from "./format";
import { loc, type Loc, type Translate } from "./i18n";
import { INTAKE_LABEL, PRIORITY_LABEL, ref, SOURCE_LABEL } from "./labels";
import { S } from "./strings";
import * as store from "./store";
import type { CardField } from "./store";
import type { Deal, Lead, Student } from "./types";
import type { CardLine, KanbanCard, KanbanStage } from "@/components/Kanban";

/**
 * Сборка карточек для канбана.
 *
 * Держится отдельно от страниц: доска лидов и доска сделок показывают разные
 * сущности, но одинаково — набором полей, который сотрудник настраивает сам.
 */

export const CARD_FIELD_LABEL: Record<CardField, Loc> = {
  phone: S.pipelines.fieldPhone,
  source: S.pipelines.fieldSource,
  comment: S.pipelines.fieldComment,
  university: S.pipelines.fieldUniversity,
  program: S.pipelines.fieldProgram,
  intake: S.pipelines.fieldIntake,
  dossier: S.pipelines.fieldDossier,
  amount: S.pipelines.fieldAmount,
  deadline: S.pipelines.fieldDeadline,
  owner: S.pipelines.fieldOwner,
};

/** Колонки доски: финальные стадии показываем последними, но не прячем. */
export function boardStages(
  pipelineId: string | undefined,
  tenantId: string,
  entity: "lead" | "deal",
  t: Translate,
): KanbanStage[] {
  const pipeline = (pipelineId && store.pipelineById(pipelineId)) || store.defaultPipeline(tenantId, entity);
  return (pipeline?.stages ?? []).map((s) => ({
    key: s.key,
    label: t(s.label),
    color: s.color,
    hint: t(s.hint),
  }));
}

const line = (key: CardField, value: string, accent?: string): CardLine => ({
  key,
  label: key,
  value,
  accent,
});

export function leadCard(lead: Lead, t: Translate, f: Formatters): KanbanCard {
  const owner = userById(lead.ownerId);
  const channel = channelById(lead.channelId);
  const source = t(ref(SOURCE_LABEL as Record<string, Loc>, lead.source));

  return {
    id: lead.id,
    href: `/crm/leads/${lead.id}`,
    title: lead.name,
    subtitle: f.date(lead.createdAt),
    stage: lead.stage,
    amount: null,
    ownerName: owner?.name ?? "—",
    flag: null,
    lines: [
      line("phone", lead.phone),
      line("source", channel ? `${source} · ${channel.handle}` : source),
      line("comment", lead.comment),
      line("owner", owner?.name ?? "—"),
    ],
  };
}

export function dealCard(
  deal: Deal,
  contact: Student | undefined,
  t: Translate,
  f: Formatters,
): KanbanCard {
  const owner = userById(deal.ownerId);
  const university = universityById(deal.universityId);
  const program = programById(deal.programId);
  const dossier = contact ? dossierProgress(contact.id) : null;

  // Флажок слева: просроченный дедлайн важнее высокого приоритета.
  const flag =
    deal.deadline && isPast(deal.deadline)
      ? "var(--color-status-risk)"
      : deal.priority === "high"
        ? "var(--color-status-progress)"
        : null;

  const deadlineAccent = deal.deadline
    ? isPast(deal.deadline)
      ? "var(--color-status-risk)"
      : isSoon(deal.deadline, 14)
        ? "var(--color-status-progress)"
        : undefined
    : undefined;

  return {
    id: deal.id,
    href: `/crm/deals/${deal.id}`,
    title: contact?.fullName ?? "—",
    subtitle: university?.name ?? t(S.common.notSet),
    stage: deal.stage,
    amount: deal.contractValue || null,
    ownerName: owner?.name ?? "—",
    flag,
    lines: [
      line("phone", contact?.phone ?? "—"),
      line("source", contact ? t(ref(SOURCE_LABEL as Record<string, Loc>, contact.source)) : "—"),
      line("comment", deal.note),
      line("university", university?.name ?? "—"),
      line("program", program?.name ?? "—"),
      line("intake", t(ref(INTAKE_LABEL, deal.intake))),
      line(
        "dossier",
        dossier
          ? `${t(S.pipelines.fieldDossier)} ${dossier.percent}%`
          : "—",
        dossier && dossier.percent < 50 ? "var(--color-status-progress)" : undefined,
      ),
      line("amount", deal.contractValue ? f.som(deal.contractValue, { compact: true }) : "—"),
      line(
        "deadline",
        deal.deadline ? `${f.shortDate(deal.deadline)} · ${f.relativeDeadline(deal.deadline)}` : "—",
        deadlineAccent,
      ),
      line("owner", `${owner?.name ?? "—"} · ${t(PRIORITY_LABEL[deal.priority])}`),
    ],
  };
}

/** Понятная подпись дубля для интерфейса: по чему именно совпало. */
export function duplicateReason(matchedBy: store.DuplicateHit["matchedBy"]): Loc {
  if (matchedBy === "email") return S.crm.duplicateByEmail;
  if (matchedBy === "passport") return S.crm.duplicateByPassport;
  return S.crm.duplicateByPhone;
}

export const dealTitle = (contact: Student | undefined, universityName: string | undefined): Loc =>
  loc(
    `${contact?.fullName ?? "—"} — ${universityName ?? "вуз не выбран"}`,
    `${contact?.fullName ?? "—"} — ${universityName ?? "universitet tanlanmagan"}`,
  );
