import { CardFieldsEditor } from "@/components/CardFieldsEditor";
import { Crumbs, PageHeader } from "@/components/ui";
import { CARD_FIELD_LABEL } from "@/lib/crm";
import { translator } from "@/lib/i18n";
import { getSession } from "@/lib/session";
import { CARD_FIELDS, cardFieldsOf } from "@/lib/store";
import { S } from "@/lib/strings";

export default async function AdminCardsPage() {
  const session = await getSession();
  const t = translator(session.locale);

  return (
    <>
      <Crumbs back="/admin" backLabel={t(S.admin.title)} current={t(S.pipelines.cardView)} />
      <PageHeader title={t(S.pipelines.cardView)} meta={<span>{t(S.pipelines.cardViewHint)}</span>} />
      <div className="max-w-[560px]">
        <CardFieldsEditor
          locale={session.locale}
          fields={[...cardFieldsOf(session.user.id)]}
          allFields={CARD_FIELDS.map((key) => ({ key, label: t(CARD_FIELD_LABEL[key]) }))}
        />
      </div>
    </>
  );
}
