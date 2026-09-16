import { DocumentsExplorer, type DossierFolder } from "@/components/DocumentsExplorer";
import { IconPlus } from "@/components/icons";
import { NoAccess } from "@/components/NoAccess";
import { PageHeader } from "@/components/ui";
import { userById } from "@/lib/data/users";
import { can } from "@/lib/rbac";
import { scopedDocuments, scopedStudents } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function DocumentsPage() {
  const session = await getSession();
  if (!can(session.role, "documents")) {
    return <NoAccess role={session.role} module="Документы" />;
  }

  const docs = scopedDocuments(session);
  const folders: DossierFolder[] = scopedStudents(session)
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
        title="Документы"
        meta={
          <>
            <span>{folders.length} папок студентов</span>
            <span className="text-ink-faint">·</span>
            <span>{docs.length} документов</span>
            <span className="text-ink-faint">·</span>
            <span>{problems} требуют внимания</span>
          </>
        }
        actions={
          can(session.role, "documents", "create") ? (
            <button className="btn btn-primary btn-sm">
              <IconPlus size={15} /> Загрузить документ
            </button>
          ) : null
        }
      />
      <DocumentsExplorer folders={folders} />
    </>
  );
}
