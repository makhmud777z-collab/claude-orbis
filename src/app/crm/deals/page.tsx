import Link from "next/link";
import { CrmList } from "@/components/CrmList";
import { Kanban } from "@/components/Kanban";
import { PipelinePicker } from "@/components/PipelinePicker";
import { SectionFilter } from "@/components/SectionFilter";
import { ViewSwitch } from "@/components/ViewSwitch";
import { moduleGate } from "@/components/guard";
import { IconPlus } from "@/components/icons";
import { EmptyState, PageHeader } from "@/components/ui";
import { CARD_FIELD_LABEL, boardStages, dealCard } from "@/lib/crm";
import { universityById } from "@/lib/data/universities";
import { userById } from "@/lib/data/users";
import { FILTER_TEXT, matchesFilter, readFilter, readQuery, type FilterRow } from "@/lib/filters";
import { TODAY_ISO, formatters, idleDays, STALE_DAYS } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { scopedContacts, scopedDeals, scopedTeam } from "@/lib/queries";
import { allow } from "@/lib/rbac";
import { dealFields, dealPresets } from "@/lib/section-filters";
import { getSession } from "@/lib/session";
import { CARD_FIELDS, cardFieldsOf, defaultPipeline, pipelineById, pipelinesOf, stageOf } from "@/lib/store";
import { P, S } from "@/lib/strings";
import { readView } from "@/lib/view";
import type { Deal, Student } from "@/lib/types";

/**
 * Сделки — бывший раздел «Заявки». Одна сделка = одна подача в один вуз,
 * поэтому у контакта их может быть несколько, а карточка контакта — одна.
 */
export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const t = translator(session.locale);
  const gate = moduleGate(session, "deals", t(S.crm.deals));
  if (gate) return gate;

  const f = formatters(session.locale);
  const pipelines = pipelinesOf(session.tenant.id, "deal");
  const requested = typeof params.pipeline === "string" ? params.pipeline : "";
  const pipeline = pipelineById(requested) ?? defaultPipeline(session.tenant.id, "deal");

  const team = scopedTeam(session);
  const fields = dealFields(team, pipeline, t);
  const values = readFilter(params);
  const query = readQuery(params);

  const contacts = new Map(scopedContacts(session).map((s) => [s.id, s]));
  const all = scopedDeals(session).filter((d) => d.pipelineId === pipeline?.id);
  const deals = all.filter((d) => matchesFilter(dealRow(d, contacts.get(d.studentId)), fields, values, query));
  const view = readView(params);
  const total = deals.reduce((sum, d) => sum + d.contractValue, 0);

  return (
    <>
      <PageHeader
        title={t(S.crm.deals)}
        meta={
          <>
            <span>{f.plural(deals.length, P.deals)}</span>
            <span>·</span>
            <span className="t-num">{f.som(total, { compact: true })}</span>
            <span>·</span>
            <span>
              {t(
                session.scope === "tenant"
                  ? S.common.scopeTenant
                  : session.scope === "branch"
                    ? S.common.scopeBranch
                    : S.common.scopeOwn,
              )}
            </span>
          </>
        }
        actions={
          <>
            <ViewSwitch view={view} locale={session.locale} />
            <PipelinePicker
              locale={session.locale}
              current={pipeline?.id ?? ""}
              pipelines={pipelines.map((p) => ({ id: p.id, name: t(p.name) }))}
            />
            {allow(session.tenant.id, session.role, "deals", "create") ? (
              <Link href="/crm/leads" className="btn btn-primary btn-sm">
                <IconPlus size={15} /> {t(S.crm.newDeal)}
              </Link>
            ) : null}
          </>
        }
      />

      <SectionFilter
        scope="deals"
        fields={fields}
        presets={dealPresets(session, TODAY_ISO)}
        locale={session.locale}
        userId={session.user.id}
        total={all.length}
        shown={deals.length}
      />

      {!deals.length ? (
        <EmptyState title={t(FILTER_TEXT.nothing)} />
      ) : view === "list" ? (
        <CrmList
          locale={session.locale}
          valueLabel={t(S.applications.contract)}
          rows={deals.map((deal) => {
            const stage = stageOf(pipelineById(deal.pipelineId), deal.stage);
            const contact = contacts.get(deal.studentId);
            const idle = idleDays(deal.stageEnteredAt);
            return {
              id: deal.id,
              href: `/crm/deals/${deal.id}`,
              title: contact?.fullName ?? deal.id.toUpperCase(),
              subtitle: universityById(deal.universityId)?.name ?? "—",
              stageLabel: stage ? t(stage.label) : deal.stage,
              stageColor: stage?.color ?? "var(--color-ink-faint)",
              ownerName: userById(deal.ownerId)?.name ?? "—",
              value: deal.contractValue ? f.som(deal.contractValue, { compact: true }) : "—",
              valueHint: deal.deadline ? f.relativeDeadline(deal.deadline) : null,
              phone: contact?.phone ?? null,
              email: contact?.email ?? null,
              idleDays: idle,
              stale: !stage?.final && idle >= STALE_DAYS,
            };
          })}
        />
      ) : (
        <Kanban
          entity="deal"
          locale={session.locale}
          canEdit={allow(session.tenant.id, session.role, "deals", "edit")}
          stages={boardStages(pipeline?.id, session.tenant.id, "deal", t)}
          cards={deals.map((d) => dealCard(d, contacts.get(d.studentId), t, f))}
          fields={cardFieldsOf(session.user.id)}
        />
      )}
    </>
  );
}

/** Плоское представление сделки для фильтра. */
function dealRow(deal: Deal, contact: Student | undefined): FilterRow {
  const owner = userById(deal.ownerId)?.name ?? "";
  const university = universityById(deal.universityId)?.name ?? "";
  return {
    search: `${contact?.fullName ?? ""} ${contact?.phone ?? ""} ${university} ${deal.note} ${owner}`,
    stage: deal.stage,
    idle: idleDays(deal.stageEnteredAt),
    ownerId: deal.ownerId,
    contractValue: deal.contractValue,
    deadline: deal.deadline,
    universityId: deal.universityId,
    intake: deal.intake,
    degreeLevel: deal.degreeLevel,
    priority: deal.priority,
    contact: contact?.fullName ?? "",
  };
}
