import { NewLeadDialog } from "@/components/NewLeadDialog";
import { Kanban } from "@/components/Kanban";
import { moduleGate } from "@/components/guard";
import { PageHeader } from "@/components/ui";
import { CARD_FIELD_LABEL, boardStages, leadCard } from "@/lib/crm";
import { formatters } from "@/lib/format";
import { translator, type Loc } from "@/lib/i18n";
import { SOURCE_LABEL } from "@/lib/labels";
import { allow } from "@/lib/rbac";
import { scopedLeads } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { CARD_FIELDS, cardFieldsOf, channelsOf } from "@/lib/store";
import { P, S } from "@/lib/strings";
import { scopedTeam } from "@/lib/queries";
import { isActiveLead } from "@/lib/data/leads";

/**
 * Лиды — первая колонка воронки агентства: всё, что пришло из Instagram,
 * Telegram, с сайта или из офиса, но ещё не стало контактом.
 */
export default async function LeadsPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const gate = moduleGate(session, "leads", t(S.crm.leads));
  if (gate) return gate;

  const f = formatters(session.locale);
  const leads = scopedLeads(session);
  const stages = boardStages(undefined, session.tenant.id, "lead", t);
  const canEdit = allow(session.tenant.id, session.role, "leads", "edit");

  return (
    <>
      <PageHeader
        title={t(S.crm.leads)}
        meta={
          <>
            <span>{f.plural(leads.length, P.leads)}</span>
            <span>·</span>
            <span>{leads.filter(isActiveLead).length} {t(S.crm.inWork)}</span>
            <span>·</span>
            <span>{t(session.scope === "tenant" ? S.common.scopeTenant : session.scope === "branch" ? S.common.scopeBranch : S.common.scopeOwn)}</span>
          </>
        }
        actions={
          allow(session.tenant.id, session.role, "leads", "create") ? (
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
              owners={scopedTeam(session).map((u) => ({ value: u.id, label: u.name, hint: u.title }))}
            />
          ) : null
        }
      />

      <Kanban
        entity="lead"
        locale={session.locale}
        canEdit={canEdit}
        showTotals={false}
        stages={stages}
        cards={leads.map((l) => leadCard(l, t, f))}
        fields={cardFieldsOf(session.user.id).filter((key) =>
          ["phone", "source", "comment", "owner"].includes(key),
        )}
        allFields={CARD_FIELDS.filter((key) =>
          ["phone", "source", "comment", "owner"].includes(key),
        ).map((key) => ({ key, label: t(CARD_FIELD_LABEL[key]) }))}
      />
    </>
  );
}
