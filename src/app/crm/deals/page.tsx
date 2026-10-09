import Link from "next/link";
import { ListColumns } from "@/components/ListColumns";
import { Kanban } from "@/components/Kanban";
import {
  BarCell, ContactsCell, NumCell, PersonCell, RecordList, TagCell, TextCell,
} from "@/components/RecordList";
import { PipelinePicker } from "@/components/PipelinePicker";
import { SectionFilter } from "@/components/SectionFilter";
import { ViewSwitch } from "@/components/ViewSwitch";
import { moduleGate } from "@/components/guard";
import { IconPlus } from "@/components/icons";
import { Crumbs, EmptyState, PageHeader } from "@/components/ui";
import { boardStages, dealCard } from "@/lib/crm";
import { universityById } from "@/lib/data/universities";
import { userById } from "@/lib/data/users";
import { FILTER_TEXT, matchesFilter, readFilter, readQuery, type FilterRow } from "@/lib/filters";
import { DEFAULT_LIST_COLUMNS, listCatalog, listColumns } from "@/lib/list-columns";
import { TODAY_ISO, formatters, idleDays, isPast, STALE_DAYS } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { scopedContacts, scopedDeals, scopedTeam } from "@/lib/queries";
import { allow } from "@/lib/rbac";
import { customFilterFields, dealFields, dealPresets, withCustom } from "@/lib/section-filters";
import { getSession } from "@/lib/session";
import {
  cardFieldsOf, defaultPipeline, dossierProgress, listFieldsOf, pipelineById, pipelinesOf, stageOf,
} from "@/lib/store";
import { INTAKE_LABEL, ref } from "@/lib/labels";
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
  const fields = [...dealFields(team, pipeline, t), ...customFilterFields(session.tenant.id, "deal")];
  const values = readFilter(params);
  const query = readQuery(params);

  const contacts = new Map(scopedContacts(session).map((s) => [s.id, s]));
  const all = scopedDeals(session).filter((d) => d.pipelineId === pipeline?.id);
  const deals = all.filter((d) =>
    matchesFilter(withCustom(dealRow(d, contacts.get(d.studentId)), session.tenant.id, "deal", d.id), fields, values, query),
  );
  const view = readView(params);
  const picked = listFieldsOf(session.user.id, "deals", DEFAULT_LIST_COLUMNS.deals);
  const columns = listColumns("deals", picked, t);
  // В шапке — вся воронка, а не текущий срез: сколько показано из скольких,
  // говорит сам фильтр («0 / 22»), и дублировать его цифрой «0 сделок» значит
  // показывать пустой раздел там, где данные есть.
  const total = all.reduce((sum, d) => sum + d.contractValue, 0);

  return (
    <>
      <Crumbs back="/" backLabel={t(S.nav.dashboard)} current={t(S.crm.deals)} />
      <PageHeader
        title={t(S.crm.deals)}
        meta={
          <>
            <span>{f.plural(all.length, P.deals)}</span>
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
            {view === "list" ? (
              <ListColumns
                section="deals"
                catalog={listCatalog("deals", t)}
                picked={picked}
                defaults={DEFAULT_LIST_COLUMNS.deals}
                locale={session.locale}
              />
            ) : null}
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
        <RecordList
          nameLabel={t(S.crm.contact)}
          noColumnsNote={t(S.list.noColumns)}
          columns={columns}
          rows={deals.map((deal) => {
            const stage = stageOf(pipelineById(deal.pipelineId), deal.stage);
            const contact = contacts.get(deal.studentId);
            const idle = idleDays(deal.stageEnteredAt);
            const dossier = contact ? dossierProgress(contact.id) : null;
            const overdue = Boolean(deal.deadline && isPast(deal.deadline));
            const university = universityById(deal.universityId)?.name ?? "—";

            return {
              id: deal.id,
              href: `/crm/deals/${deal.id}`,
              title: contact?.fullName ?? deal.id.toUpperCase(),
              subtitle: university,
              // Тот же язык, что на карточке доски: просрочка важнее приоритета.
              flag: overdue
                ? "var(--color-status-risk)"
                : deal.priority === "high"
                  ? "var(--color-status-progress)"
                  : null,
              cells: {
                stage: (
                  <TagCell
                    label={stage ? t(stage.label) : deal.stage}
                    color={stage?.color ?? "var(--color-ink-faint)"}
                    note={
                      !stage?.final && idle >= STALE_DAYS ? `${t(S.crm.idle)} ${idle}` : null
                    }
                  />
                ),
                owner: <PersonCell name={userById(deal.ownerId)?.name ?? "—"} />,
                amount: deal.contractValue
                  ? <NumCell value={f.som(deal.contractValue, { compact: true })} />
                  : null,
                deadline: deal.deadline
                  ? (
                      <NumCell
                        value={f.shortDate(deal.deadline)}
                        hint={f.relativeDeadline(deal.deadline)}
                        accent={overdue ? "var(--color-status-risk)" : null}
                      />
                    )
                  : null,
                university: <TextCell value={university} />,
                intake: <TextCell value={t(ref(INTAKE_LABEL, deal.intake))} />,
                dossier: dossier ? <BarCell percent={dossier.percent} /> : null,
                contacts: (
                  <ContactsCell
                    phone={contact?.phone ?? null}
                    email={contact?.email ?? null}
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
