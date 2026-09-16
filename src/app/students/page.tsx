import { IconExport, IconPlus } from "@/components/icons";
import { NoAccess } from "@/components/NoAccess";
import { StudentsTable, type StudentRow } from "@/components/StudentsTable";
import { PageHeader } from "@/components/ui";
import { applicationsOfStudent } from "@/lib/data/applications";
import { dossierProgress } from "@/lib/data/documents";
import { userById } from "@/lib/data/users";
import { can } from "@/lib/rbac";
import { scopedStudents, scopedTeam } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function StudentsPage() {
  const session = await getSession();
  if (!can(session.role, "students")) {
    return <NoAccess role={session.role} module="Студенты" />;
  }

  const branches = new Map(session.tenant.branches.map((b) => [b.id, b]));
  const rows: StudentRow[] = scopedStudents(session).map((s) => ({
    ...s,
    ownerName: userById(s.ownerId)?.name ?? "—",
    branchName: `${branches.get(s.branchId)?.name ?? ""}, ${branches.get(s.branchId)?.city ?? ""}`,
    applicationsCount: applicationsOfStudent(s.id).length,
    dossierPercent: dossierProgress(s.id).percent,
  }));

  return (
    <>
      <PageHeader
        title="Студенты"
        meta={
          <>
            <span>{rows.length} в вашей зоне видимости</span>
            <span className="text-ink-faint">·</span>
            <span>
              область доступа:{" "}
              {session.scope === "tenant"
                ? "всё агентство"
                : session.scope === "branch"
                  ? "свой филиал"
                  : "только свои студенты"}
            </span>
          </>
        }
        actions={
          <>
            {can(session.role, "students", "export") ? (
              <button className="btn btn-secondary btn-sm">
                <IconExport size={15} /> Экспорт
              </button>
            ) : null}
            {can(session.role, "students", "create") ? (
              <button className="btn btn-primary btn-sm">
                <IconPlus size={15} /> Добавить студента
              </button>
            ) : null}
          </>
        }
      />
      <StudentsTable
        rows={rows}
        owners={scopedTeam(session).map((u) => ({ id: u.id, name: u.name }))}
      />
    </>
  );
}
