import Link from "next/link";
import { Kanban } from "@/components/Kanban";
import { moduleGate } from "@/components/guard";
import { IconPlus } from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { CARD_FIELD_LABEL, boardStages, dealCard } from "@/lib/crm";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { allow } from "@/lib/rbac";
import { scopedContacts, scopedDeals } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { CARD_FIELDS, cardFieldsOf, defaultPipeline } from "@/lib/store";
import { P, S } from "@/lib/strings";

/**
 * Сделки — бывший раздел «Заявки». Одна сделка = одна подача в один вуз,
 * поэтому у контакта их может быть несколько, а карточка контакта — одна.
 */
export default async function DealsPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const gate = moduleGate(session, "deals", t(S.crm.deals));
  if (gate) return gate;

  const f = formatters(session.locale);
  const deals = scopedDeals(session);
  const contacts = new Map(scopedContacts(session).map((s) => [s.id, s]));
  const pipeline = defaultPipeline(session.tenant.id, "deal");
  const stages = boardStages(pipeline?.id, session.tenant.id, "deal", t);
  const canEdit = allow(session.tenant.id, session.role, "deals", "edit");
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
            <Link href="/crm/pipelines" className="underline-offset-2 hover:underline">
              {pipeline ? t(pipeline.name) : t(S.pipelines.title)}
            </Link>
          </>
        }
        actions={
          allow(session.tenant.id, session.role, "deals", "create") ? (
            <Link href="/crm/leads" className="btn btn-primary btn-sm">
              <IconPlus size={15} /> {t(S.crm.newDeal)}
            </Link>
          ) : null
        }
      />

      <Kanban
        entity="deal"
        locale={session.locale}
        canEdit={canEdit}
        stages={stages}
        cards={deals.map((d) => dealCard(d, contacts.get(d.studentId), t, f))}
        fields={cardFieldsOf(session.user.id)}
        allFields={CARD_FIELDS.map((key) => ({ key, label: t(CARD_FIELD_LABEL[key]) }))}
      />
    </>
  );
}
