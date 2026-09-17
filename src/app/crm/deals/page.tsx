import Link from "next/link";
import { Kanban } from "@/components/Kanban";
import { PipelinePicker } from "@/components/PipelinePicker";
import { SectionFilter } from "@/components/SectionFilter";
import { moduleGate } from "@/components/guard";
import { IconPlus } from "@/components/icons";
import { EmptyState, PageHeader } from "@/components/ui";
import { CARD_FIELD_LABEL, boardStages, dealCard } from "@/lib/crm";
import { universityById } from "@/lib/data/universities";
import { userById } from "@/lib/data/users";
import { FILTER_TEXT, matchesFilter, readFilter, readQuery, type FilterRow } from "@/lib/filters";
import { TODAY_ISO, formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { scopedContacts, scopedDeals, scopedTeam } from "@/lib/queries";
import { allow } from "@/lib/rbac";
import { dealFields, dealPresets } from "@/lib/section-filters";
import { getSession } from "@/lib/session";
import { CARD_FIELDS, cardFieldsOf, defaultPipeline, pipelineById, pipelinesOf } from "@/lib/store";
import { P, S } from "@/lib/strings";
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
            <Link href="/crm/settings" className="underline-offset-2 hover:underline">
              {t(S.admin.crmSettings)}
            </Link>
          </>
        }
        actions={
          <>
            <PipelinePicker
              locale={session.locale}
              current={pipeline?.id ?? ""}
              canEdit={allow(session.tenant.id, session.role, "crmSettings", "edit")}
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

      {deals.length ? (
        <Kanban
          entity="deal"
          locale={session.locale}
          canEdit={allow(session.tenant.id, session.role, "deals", "edit")}
          stages={boardStages(pipeline?.id, session.tenant.id, "deal", t)}
          cards={deals.map((d) => dealCard(d, contacts.get(d.studentId), t, f))}
          fields={cardFieldsOf(session.user.id)}
          allFields={CARD_FIELDS.map((key) => ({ key, label: t(CARD_FIELD_LABEL[key]) }))}
        />
      ) : (
        <EmptyState title={t(FILTER_TEXT.nothing)} />
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
