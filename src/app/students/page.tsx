import { moduleGate } from "@/components/guard";
import { IconExport, IconPlus } from "@/components/icons";
import { StudentsTable, type StudentRow } from "@/components/StudentsTable";
import { PageHeader } from "@/components/ui";
import { applicationsOfStudent } from "@/lib/data/applications";
import { dossierProgress } from "@/lib/data/documents";
import { userById } from "@/lib/data/users";
import { translator } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { BRANCH_LABEL, CITY_LABEL, ref } from "@/lib/labels";
import { S } from "@/lib/strings";
import { scopedStudents, scopedTeam } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  const { status } = await searchParams;
  const t = translator(session.locale);
  const gate = moduleGate(session, "students", t(S.nav.students));
  if (gate) return gate;

  const branches = new Map(session.tenant.branches.map((b) => [b.id, b]));
  const rows: StudentRow[] = scopedStudents(session).map((s) => ({
    ...s,
    ownerName: userById(s.ownerId)?.name ?? "—",
    branchName: branches.get(s.branchId)
      ? `${t(ref(BRANCH_LABEL, branches.get(s.branchId)!.name))}, ${t(ref(CITY_LABEL, branches.get(s.branchId)!.city))}`
      : "—",
    applicationsCount: applicationsOfStudent(s.id).length,
    dossierPercent: dossierProgress(s.id).percent,
  }));

  return (
    <>
      <PageHeader
        title={t(S.students.title)}
        meta={
          <>
            <span>
              {rows.length} {t(S.students.inScope)}
            </span>
            <span className="text-ink-faint">·</span>
            <span>
              {t(S.students.scopeLabel)}:{" "}
              {t(
                session.scope === "tenant"
                  ? S.common.scopeTenant
                  : session.scope === "branch"
                    ? S.common.scopeBranch
                    : S.common.scopeOwn,
              )}
            </span>
          </>
        }
        actions={
          <>
            {can(session.role, "students", "export") ? (
              <button className="btn btn-secondary btn-sm">
                <IconExport size={15} /> {t(S.common.export)}
              </button>
            ) : null}
            {can(session.role, "students", "create") ? (
              <button className="btn btn-primary btn-sm">
                <IconPlus size={15} /> {t(S.students.add)}
              </button>
            ) : null}
          </>
        }
      />
      <StudentsTable
        rows={rows}
        owners={scopedTeam(session).map((u) => ({ id: u.id, name: u.name }))}
        locale={session.locale}
        initialStatus={status}
      />
    </>
  );
}
