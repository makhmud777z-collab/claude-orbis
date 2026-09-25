import { CustomFieldsAdmin, type CustomFieldRow } from "@/components/CustomFieldsAdmin";
import { moduleGate } from "@/components/guard";
import { Crumbs, PageHeader } from "@/components/ui";
import { translator } from "@/lib/i18n";
import { allow } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { customFieldsOf } from "@/lib/store";
import { S } from "@/lib/strings";

const TYPE_LABEL = {
  text: S.customFields.typeText,
  number: S.customFields.typeNumber,
  date: S.customFields.typeDate,
  select: S.customFields.typeSelect,
} as const;

/** Пользовательские поля контакта: агентство ведёт их само, без разработчика. */
export default async function AdminFieldsPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const gate = moduleGate(session, "admin", t(S.customFields.title));
  if (gate) return gate;

  const rows: CustomFieldRow[] = customFieldsOf(session.tenant.id).map((f) => ({
    id: f.id,
    labelRu: f.label.ru,
    labelUz: f.label.uz,
    type: f.type,
    typeLabel: t(TYPE_LABEL[f.type]),
    options: f.options ?? [],
  }));

  return (
    <>
      <Crumbs back="/admin" backLabel={t(S.admin.title)} current={t(S.customFields.title)} />
      <PageHeader title={t(S.customFields.title)} meta={<span>{t(S.customFields.subtitle)}</span>} />
      <div className="max-w-[640px]">
        <CustomFieldsAdmin
          rows={rows}
          locale={session.locale}
          canEdit={allow(session.tenant.id, session.role, "admin", "edit")}
        />
      </div>
    </>
  );
}
