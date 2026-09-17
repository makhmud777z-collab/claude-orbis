import { ContactsTable, type ContactRow } from "@/components/ContactsTable";
import { moduleGate } from "@/components/guard";
import { IconExport } from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { dossierProgress } from "@/lib/data/documents";
import { userById } from "@/lib/data/users";
import { translator } from "@/lib/i18n";
import { BRANCH_LABEL, CITY_LABEL, ref } from "@/lib/labels";
import { scopedContacts, scopedDeals, scopedTeam } from "@/lib/queries";
import { allow } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { S } from "@/lib/strings";

/**
 * Контакты — единая база людей агентства. Отдельного раздела «Студенты» нет:
 * человек попадает сюда один раз, а его подачи в вузы живут в сделках.
 */
export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  const { status } = await searchParams;
  const t = translator(session.locale);
  const gate = moduleGate(session, "contacts", t(S.crm.contacts));
  if (gate) return gate;

  const branches = new Map(session.tenant.branches.map((b) => [b.id, b]));
  const deals = scopedDeals(session);
  const rows: ContactRow[] = scopedContacts(session).map((s) => {
    const branch = branches.get(s.branchId);
    return {
      ...s,
      ownerName: userById(s.ownerId)?.name ?? "—",
      branchName: branch
        ? `${t(ref(BRANCH_LABEL, branch.name))}, ${t(ref(CITY_LABEL, branch.city))}`
        : "—",
      dealsCount: deals.filter((d) => d.studentId === s.id).length,
      dossierPercent: dossierProgress(s.id).percent,
    };
  });

  return (
    <>
      <PageHeader
        title={t(S.crm.contactsTitle)}
        meta={
          <>
            <span>{rows.length} {t(S.students.inScope)}</span>
            <span className="text-ink-faint">·</span>
            <span>{t(S.crm.contactsSubtitle)}</span>
          </>
        }
        actions={
          allow(session.tenant.id, session.role, "contacts", "export") ? (
            <button className="btn btn-secondary btn-sm">
              <IconExport size={15} /> {t(S.common.export)}
            </button>
          ) : null
        }
      />
      <ContactsTable
        rows={rows}
        owners={scopedTeam(session).map((u) => ({ id: u.id, name: u.name }))}
        locale={session.locale}
        initialStatus={status}
      />
    </>
  );
}
