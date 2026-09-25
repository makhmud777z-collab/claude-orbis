import { ContactsTable, type ContactRow } from "@/components/ContactsTable";
import { ExportButton } from "@/components/ExportButton";
import { SectionFilter } from "@/components/SectionFilter";
import { moduleGate } from "@/components/guard";
import { EmptyState, PageHeader } from "@/components/ui";
import { dossierProgress } from "@/lib/store";
import { userById } from "@/lib/data/users";
import { FILTER_TEXT, matchesFilter, readFilter, readQuery, type FilterRow } from "@/lib/filters";
import { translator } from "@/lib/i18n";
import { BRANCH_LABEL, CITY_LABEL, STUDENT_STATUS, ref } from "@/lib/labels";
import { scopedContacts, scopedDeals, scopedTeam } from "@/lib/queries";
import { allow } from "@/lib/rbac";
import {
  contactFields, contactPresets, customFilterFields, withCustom,
} from "@/lib/section-filters";
import { getSession } from "@/lib/session";
import { S } from "@/lib/strings";
import type { Student } from "@/lib/types";

/**
 * Контакты — единая база людей агентства. Отдельного раздела «Студенты» нет:
 * человек попадает сюда один раз, а его подачи в вузы живут в сделках.
 */
export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const t = translator(session.locale);
  const gate = moduleGate(session, "contacts", t(S.crm.contacts));
  if (gate) return gate;

  const team = scopedTeam(session);
  const fields = [...contactFields(team, t), ...customFilterFields(session.tenant.id, "contact")];
  const values = readFilter(params);
  const query = readQuery(params);

  const branches = new Map(session.tenant.branches.map((b) => [b.id, b]));
  const deals = scopedDeals(session);
  const all = scopedContacts(session);
  const rows: ContactRow[] = all
    .filter((s) => matchesFilter(withCustom(contactRow(s), session.tenant.id, "contact", s.id), fields, values, query))
    .map((s) => {
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
            <span>{all.length} {t(S.students.inScope)}</span>
            <span className="text-ink-faint">·</span>
            <span>{t(S.crm.contactsSubtitle)}</span>
          </>
        }
        actions={
          allow(session.tenant.id, session.role, "contacts", "export") ? (
            <ExportButton
              locale={session.locale}
              filename="orbis-kontakty"
              headers={[
                t(S.crm.contact), t(S.team.phoneWork), "Email", t(S.students.colCity),
                "TOPIK", t(S.students.colBudget), t(S.crm.owner), t(S.students.colStatus),
              ]}
              rows={rows.map((c) => [
                c.fullName, c.phone, c.email, t(ref(CITY_LABEL, c.city)),
                c.profile.topik || "", c.profile.budgetPerYear,
                userById(c.ownerId)?.name ?? "", t(STUDENT_STATUS[c.status].label),
              ])}
            />
          ) : null
        }
      />

      <SectionFilter
        scope="contacts"
        fields={fields}
        presets={contactPresets(session)}
        locale={session.locale}
        userId={session.user.id}
        total={all.length}
        shown={rows.length}
      />

      {rows.length ? (
        <ContactsTable rows={rows} locale={session.locale} />
      ) : (
        <EmptyState title={t(FILTER_TEXT.nothing)} />
      )}
    </>
  );
}

/** Плоское представление контакта для фильтра. */
function contactRow(s: Student): FilterRow {
  return {
    search: `${s.fullName} ${s.latinName} ${s.phone} ${s.email} ${s.city} ${s.passport ?? ""}`,
    status: s.status,
    ownerId: s.ownerId,
    topik: s.profile.topik,
    city: s.city,
    source: s.source,
    degreeLevel: s.profile.degreeLevel,
    budget: s.profile.budgetPerYear,
    createdAt: s.createdAt,
  };
}
