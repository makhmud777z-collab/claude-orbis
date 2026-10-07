import { ChecklistAdmin, type ChecklistRow } from "@/components/ChecklistAdmin";
import { moduleGate } from "@/components/guard";
import { Banner, Crumbs, PageHeader } from "@/components/ui";
import { checklistKey } from "@/lib/labels";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { allow } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { checklistOf, documentsOfTenant } from "@/lib/store";
import { P, S } from "@/lib/strings";

/**
 * Чек-лист документов агентства.
 *
 * Раньше список был зашит в код — один на всех. Агентства собирают разное:
 * кому-то нужна справка о родстве, кто-то возит только на языковые курсы.
 */
export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const t = translator(session.locale);
  const gate = moduleGate(session, "admin", t(S.checklist.title));
  if (gate) return gate;

  const f = formatters(session.locale);
  const items = checklistOf(session.tenant.id);
  const documents = documentsOfTenant(session.tenant.id);

  const rows: ChecklistRow[] = items.map((item) => ({
    id: item.id,
    ru: item.kind.ru,
    uz: item.kind.uz,
    needsApostille: item.needsApostille,
    // Сколько досье уже держат этот пункт. Удаление их не тронет — пункты
    // досье живут своей жизнью, — но предупредить честнее, чем промолчать.
    used: documents.filter((d) => checklistKey(d.kind) === checklistKey(item.kind)).length,
  }));

  return (
    <>
      <Crumbs back="/admin" backLabel={t(S.admin.title)} current={t(S.checklist.title)} />
      <PageHeader
        title={t(S.checklist.title)}
        meta={<span>{f.plural(rows.length, P.checklistItems)}</span>}
      />

      <Banner>{t(S.checklist.intro)}</Banner>
      {/* Отказ в добавлении: диалог уже закрылся, и сказать об этом больше негде. */}
      {params.dup ? <Banner tone="warn">{t(S.checklist.dup)}</Banner> : null}

      <ChecklistAdmin
        rows={rows}
        locale={session.locale}
        canEdit={allow(session.tenant.id, session.role, "admin", "edit")}
      />
    </>
  );
}
