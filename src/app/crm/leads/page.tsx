import { NewLeadDialog } from "@/components/NewLeadDialog";
import { ListColumns } from "@/components/ListColumns";
import { Kanban } from "@/components/Kanban";
import {
  ContactsCell, NumCell, PersonCell, RecordList, TagCell, TextCell,
} from "@/components/RecordList";
import { PipelinePicker } from "@/components/PipelinePicker";
import { SectionFilter } from "@/components/SectionFilter";
import { ViewSwitch } from "@/components/ViewSwitch";
import { moduleGate } from "@/components/guard";
import { Crumbs, EmptyState, PageHeader } from "@/components/ui";
import { boardStages, leadCard } from "@/lib/crm";
import { isActiveLead } from "@/lib/data/leads";
import { userById } from "@/lib/data/users";
import { FILTER_TEXT, matchesFilter, readFilter, readQuery, type FilterRow } from "@/lib/filters";
import { DEFAULT_LIST_COLUMNS, listCatalog, listColumns } from "@/lib/list-columns";
import { formatters, idleDays, STALE_DAYS } from "@/lib/format";
import { translator, type Loc } from "@/lib/i18n";
import { ref, SOURCE_LABEL } from "@/lib/labels";
import { scopedLeads, scopedTeam } from "@/lib/queries";
import { allow } from "@/lib/rbac";
import { customFilterFields, leadFields, leadPresets, withCustom } from "@/lib/section-filters";
import { getSession } from "@/lib/session";
import {
  cardFieldsOf, channelById, channelsOf, defaultPipeline, listFieldsOf, stageOf,
} from "@/lib/store";
import { P, S } from "@/lib/strings";
import { readView } from "@/lib/view";
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
  const fields = [...leadFields(session, team, pipeline, t), ...customFilterFields(session.tenant.id, "lead")];
  const values = readFilter(params);
  const query = readQuery(params);

  const all = scopedLeads(session);
  const leads = all.filter((lead) =>
    matchesFilter(withCustom(leadRow(lead), session.tenant.id, "lead", lead.id), fields, values, query),
  );
  const canEdit = allow(session.tenant.id, session.role, "leads", "edit");
  const view = readView(params);
  const picked = listFieldsOf(session.user.id, "leads", DEFAULT_LIST_COLUMNS.leads);
  const columns = listColumns("leads", picked, t);

  return (
    <>
      <Crumbs back="/" backLabel={t(S.nav.dashboard)} current={t(S.crm.leads)} />
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
            <ViewSwitch view={view} locale={session.locale} />
            {view === "list" ? (
              <ListColumns
                section="leads"
                catalog={listCatalog("leads", t)}
                picked={picked}
                defaults={DEFAULT_LIST_COLUMNS.leads}
                locale={session.locale}
              />
            ) : null}
            <PipelinePicker
              locale={session.locale}
              current={pipeline?.id ?? ""}
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

      {!leads.length ? (
        <EmptyState title={t(FILTER_TEXT.nothing)} />
      ) : view === "list" ? (
        <RecordList
          nameLabel={t(S.crm.lead)}
          noColumnsNote={t(S.list.noColumns)}
          columns={columns}
          rows={leads.map((lead) => {
            const stage = stageOf(pipeline, lead.stage);
            const idle = idleDays(lead.stageEnteredAt);
            const channel = channelById(lead.channelId);

            return {
              id: lead.id,
              href: `/crm/leads/${lead.id}`,
              title: lead.name,
              subtitle: lead.phone,
              cells: {
                stage: (
                  <TagCell
                    label={stage ? t(stage.label) : lead.stage}
                    color={stage?.color ?? "var(--color-ink-faint)"}
                    note={
                      isActiveLead(lead) && idle >= STALE_DAYS ? `${t(S.crm.idle)} ${idle}` : null
                    }
                  />
                ),
                owner: <PersonCell name={team.find((u) => u.id === lead.ownerId)?.name ?? "—"} />,
                created: <NumCell value={f.shortDate(lead.createdAt)} />,
                source: <TextCell value={t(ref(SOURCE_LABEL, lead.source))} />,
                channel: channel ? <TextCell value={channel.title} hint={channel.handle} /> : null,
                comment: lead.comment ? <TextCell value={lead.comment} /> : null,
                contacts: (
                  <ContactsCell
                    phone={lead.phone}
                    email={lead.email}
                    callLabel={t(S.students.call)}
                    writeLabel={t(S.students.write)}
                  />
                ),
              },
            };
          })}
        />
      ) : (
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
        />
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
