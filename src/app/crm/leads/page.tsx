import { NewLeadDialog } from "@/components/NewLeadDialog";
import { Kanban } from "@/components/Kanban";
import { PipelinePicker } from "@/components/PipelinePicker";
import { SectionFilter } from "@/components/SectionFilter";
import { moduleGate } from "@/components/guard";
import { EmptyState, PageHeader } from "@/components/ui";
import { CARD_FIELD_LABEL, boardStages, leadCard } from "@/lib/crm";
import { isActiveLead } from "@/lib/data/leads";
import { userById } from "@/lib/data/users";
import { FILTER_TEXT, matchesFilter, readFilter, readQuery, type FilterRow } from "@/lib/filters";
import { formatters } from "@/lib/format";
import { translator, type Loc } from "@/lib/i18n";
import { SOURCE_LABEL } from "@/lib/labels";
import { scopedLeads, scopedTeam } from "@/lib/queries";
import { allow } from "@/lib/rbac";
import { leadFields, leadPresets } from "@/lib/section-filters";
import { getSession } from "@/lib/session";
import { CARD_FIELDS, cardFieldsOf, channelsOf, defaultPipeline } from "@/lib/store";
import { P, S } from "@/lib/strings";
import type { Lead } from "@/lib/types";

/**
 * Лиды — первая колонка воронки агентства: всё, что пришло из Instagram,
 * Telegram, с сайта или из офиса, но ещё не стало контактом.
 */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const t = translator(session.locale);
  const gate = moduleGate(session, "leads", t(S.crm.leads));
  if (gate) return gate;

  const f = formatters(session.locale);
  const pipeline = defaultPipeline(session.tenant.id, "lead");
  const team = scopedTeam(session);
  const fields = leadFields(session, team, pipeline, t);
  const values = readFilter(params);
  const query = readQuery(params);

  const all = scopedLeads(session);
  const leads = all.filter((lead) => matchesFilter(leadRow(lead), fields, values, query));
  const canEdit = allow(session.tenant.id, session.role, "leads", "edit");

  return (
    <>
      <PageHeader
        title={t(S.crm.leads)}
        meta={
          <>
            <span>{f.plural(all.length, P.leads)}</span>
            <span>·</span>
            <span>{all.filter(isActiveLead).length} {t(S.crm.inWork)}</span>
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
            <PipelinePicker
              locale={session.locale}
              current={pipeline?.id ?? ""}
              canEdit={allow(session.tenant.id, session.role, "crmSettings", "edit")}
              pipelines={[{ id: pipeline?.id ?? "", name: pipeline ? t(pipeline.name) : "" }]}
            />
            {allow(session.tenant.id, session.role, "leads", "create") ? (
              <NewLeadDialog
                locale={session.locale}
                defaultOwnerId={session.user.id}
                sources={Object.entries(SOURCE_LABEL).map(([value, label]) => ({
                  value,
                  label: t(label as Loc),
                }))}
                channels={channelsOf(session.tenant.id).map((c) => ({
                  value: c.id,
                  label: c.title,
                  hint: c.handle,
                }))}
                owners={team.map((u) => ({ value: u.id, label: u.name, hint: u.title }))}
              />
            ) : null}
          </>
        }
      />

      <SectionFilter
        scope="leads"
        fields={fields}
        presets={leadPresets(session)}
        locale={session.locale}
        userId={session.user.id}
        total={all.length}
        shown={leads.length}
      />

      {leads.length ? (
        <Kanban
          entity="lead"
          locale={session.locale}
          canEdit={canEdit}
          showTotals={false}
          stages={boardStages(pipeline?.id, session.tenant.id, "lead", t)}
          cards={leads.map((l) => leadCard(l, t, f))}
          fields={cardFieldsOf(session.user.id).filter((key) =>
            ["phone", "source", "comment", "owner"].includes(key),
          )}
          allFields={CARD_FIELDS.filter((key) =>
            ["phone", "source", "comment", "owner"].includes(key),
          ).map((key) => ({ key, label: t(CARD_FIELD_LABEL[key]) }))}
        />
      ) : (
        <EmptyState title={t(FILTER_TEXT.nothing)} />
      )}
    </>
  );
}

/** Плоское представление лида — только то, по чему его фильтруют. */
function leadRow(lead: Lead): FilterRow {
  return {
    search: `${lead.name} ${lead.phone} ${lead.email ?? ""} ${lead.comment}`,
    stage: lead.stage,
    ownerId: lead.ownerId,
    source: lead.source,
    channelId: lead.channelId,
    name: lead.name,
    phone: lead.phone,
    createdAt: lead.createdAt,
    owner: userById(lead.ownerId)?.name ?? "",
  };
}
