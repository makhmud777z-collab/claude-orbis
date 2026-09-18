import { moduleGate } from "@/components/guard";
import { DocumentsExplorer, type DossierFolder } from "@/components/DocumentsExplorer";
import { SectionFilter } from "@/components/SectionFilter";
import { RequestDocumentDialog } from "@/components/RequestDocumentDialog";
import { EmptyState, PageHeader } from "@/components/ui";
import { userById } from "@/lib/data/users";
import { FILTER_TEXT, matchesFilter, readFilter, readQuery, type FilterRow } from "@/lib/filters";
import { formatters } from "@/lib/format";
import { translator, type Translate } from "@/lib/i18n";
import { allow } from "@/lib/rbac";
import { checklistKey, DOCUMENT_CHECKLIST } from "@/lib/labels";
import { documentFields, simplePresets } from "@/lib/section-filters";
import { P, S } from "@/lib/strings";
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
  const f = formatters(session.locale);
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

  // Шапка описывает раздел целиком: сколько досье и документов у агентства
  // и сколько из них требуют внимания. Сколько показано из скольких — задача
  // строки фильтра, иначе под срезом раздел выглядит пустым.
  const allFolderIds = new Set(allDocs.map((d) => d.studentId));
  const problems = allDocs.filter((d) =>
    ["missing", "rejected", "expiring"].includes(d.status),
  ).length;

  const canCreate = allow(session.tenant.id, session.role, "documents", "create");
  const canEdit = allow(session.tenant.id, session.role, "documents", "edit");
  // Диалог запроса работает по всей базе контактов, а не только по тем,
  // у кого досье уже заведено: запросить документ можно и у нового студента.
  const studentOptions = [...contacts.values()].map((s) => ({
    value: s.id,
    label: s.fullName,
    hint: s.phone,
  }));
  const kindOptions = DOCUMENT_CHECKLIST.map((item) => ({
    value: checklistKey(item.kind),
    label: t(item.kind),
  }));
  // Какие пункты запрашивать уже незачем. «Нет файла» и «возвращён» —
  // как раз то, что куратор и просит у студента, поэтому они остаются в
  // списке; скрываем только то, что уже в работе или проверено.
  // Считаем по всем документам, а не по отфильтрованным: фильтр раздела
  // прячет пункты, но в досье они остаются.
  const settled: Record<string, string[]> = {};
  for (const doc of allDocs) {
    if (doc.status === "missing" || doc.status === "rejected") continue;
    (settled[doc.studentId] ??= []).push(checklistKey(doc.kind));
  }

  return (
    <>
      <PageHeader
        title={t(S.documents.title)}
        meta={
          <>
            <span>
              {f.plural(allFolderIds.size, P.folders)} {t(S.documents.ofStudents)}
            </span>
            <span className="text-ink-faint">·</span>
            <span>
              {f.plural(allDocs.length, P.documents)}
            </span>
            <span className="text-ink-faint">·</span>
            <span>
              {problems} {t(S.documents.needAttention)}
            </span>
          </>
        }
        actions={
          canCreate ? (
            <RequestDocumentDialog
              locale={session.locale}
              students={studentOptions}
              kinds={kindOptions}
              existing={settled}
            />
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
        <DocumentsExplorer
          folders={folders}
          locale={session.locale}
          canEdit={canEdit}
          request={
            canCreate
              ? { students: studentOptions, kinds: kindOptions, existing: settled }
              : null
          }
        />
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
