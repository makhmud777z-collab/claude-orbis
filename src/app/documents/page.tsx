import { moduleGate } from "@/components/guard";
import { DocumentsExplorer, type DossierFolder } from "@/components/DocumentsExplorer";
import { SectionFilter } from "@/components/SectionFilter";
import { IconPlus } from "@/components/icons";
import { EmptyState, PageHeader } from "@/components/ui";
import { userById } from "@/lib/data/users";
import { FILTER_TEXT, matchesFilter, readFilter, readQuery, type FilterRow } from "@/lib/filters";
import { translator, type Translate } from "@/lib/i18n";
import { allow } from "@/lib/rbac";
import { documentFields, simplePresets } from "@/lib/section-filters";
import { S } from "@/lib/strings";
import { scopedDocuments, scopedContacts, scopedTeam } from "@/lib/queries";
import { getSession } from "@/lib/session";
import type { Student, StudentDocument } from "@/lib/types";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const t = translator(session.locale);
  const gate = moduleGate(session, "documents", t(S.nav.documents));
  if (gate) return gate;

  const fields = documentFields(scopedTeam(session), t);
  const values = readFilter(params);
  const query = readQuery(params);

  const contacts = new Map(scopedContacts(session).map((s) => [s.id, s]));
  const allDocs = scopedDocuments(session);
  // Фильтр раздела работает по документу, а папки собираются уже из того,
  // что прошло отбор: иначе «просроченные» показали бы и чистые досье.
  const docs = allDocs.filter((d) =>
    matchesFilter(documentRow(d, contacts.get(d.studentId), t), fields, values, query),
  );
  const folders: DossierFolder[] = [...contacts.values()]
    .map((s) => {
      const items = docs.filter((d) => d.studentId === s.id);
      const verified = items.filter((d) => d.status === "verified").length;
      const problems = items.filter((d) =>
        ["missing", "rejected", "expiring"].includes(d.status),
      ).length;
      return {
        studentId: s.id,
        studentName: s.fullName,
        ownerName: userById(s.ownerId)?.name ?? "—",
        total: items.length,
        verified,
        problems,
        percent: items.length ? Math.round((verified / items.length) * 100) : 0,
        updatedAt: items.map((d) => d.updatedAt).sort().at(-1) ?? s.lastTouchAt,
        items: items.map((d) => ({
          id: d.id,
          kind: d.kind,
          fileName: d.fileName,
          status: d.status,
          sizeKb: d.sizeKb,
          needsApostille: d.needsApostille,
          expiresAt: d.expiresAt,
          updatedAt: d.updatedAt,
        })),
      };
    })
    .filter((f) => f.total > 0)
    .sort((a, b) => b.problems - a.problems);

  const problems = folders.reduce((n, f) => n + f.problems, 0);

  return (
    <>
      <PageHeader
        title={t(S.documents.title)}
        meta={
          <>
            <span>
              {folders.length} {t(S.documents.folders)}
            </span>
            <span className="text-ink-faint">·</span>
            <span>
              {docs.length} {t(S.documents.documents)}
            </span>
            <span className="text-ink-faint">·</span>
            <span>
              {problems} {t(S.documents.needAttention)}
            </span>
          </>
        }
        actions={
          allow(session.tenant.id, session.role, "documents", "create") ? (
            <button className="btn btn-primary btn-sm">
              <IconPlus size={15} /> {t(S.documents.upload)}
            </button>
          ) : null
        }
      />
      <SectionFilter
        scope="documents"
        fields={fields}
        presets={simplePresets()}
        locale={session.locale}
        userId={session.user.id}
        total={allDocs.length}
        shown={docs.length}
      />

      {folders.length ? (
        <DocumentsExplorer folders={folders} locale={session.locale} />
      ) : (
        <EmptyState title={t(FILTER_TEXT.nothing)} />
      )}
    </>
  );
}

/** Плоское представление документа для фильтра. */
function documentRow(
  doc: StudentDocument,
  student: Student | undefined,
  t: Translate,
): FilterRow {
  return {
    search: `${t(doc.kind)} ${student?.fullName ?? ""} ${doc.fileName ?? ""}`,
    status: doc.status,
    kind: t(doc.kind),
    student: student?.fullName ?? "",
    uploadedById: doc.uploadedById,
    expiresAt: doc.expiresAt,
    needsApostille: doc.needsApostille ? "yes" : "no",
  };
}
