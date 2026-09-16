import { ApplicationsBoard, type BoardCard } from "@/components/ApplicationsBoard";
import { IconExport, IconPlus } from "@/components/icons";
import { NoAccess } from "@/components/NoAccess";
import { PageHeader } from "@/components/ui";
import { dossierProgress } from "@/lib/data/documents";
import { studentById } from "@/lib/data/students";
import { universityById } from "@/lib/data/universities";
import { userById } from "@/lib/data/users";
import { relativeTime } from "@/lib/format";
import { can } from "@/lib/rbac";
import { scopedApplications, scopedTeam } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const session = await getSession();
  if (!can(session.role, "applications")) {
    return <NoAccess role={session.role} module="Заявки" />;
  }

  const { stage } = await searchParams;
  const apps = scopedApplications(session);

  const cards: BoardCard[] = apps.map((a) => {
    const student = studentById(a.studentId);
    const uni = universityById(a.universityId);
    return {
      id: a.id,
      stage: a.stage,
      studentId: a.studentId,
      studentName: student?.fullName ?? "—",
      studentPhone: student?.phone ?? "",
      universityName: uni?.name ?? "—",
      programName: uni?.programs.find((p) => p.id === a.programId)?.name ?? "—",
      city: uni?.city ?? "—",
      intake: a.intake,
      ownerId: a.ownerId,
      ownerName: userById(a.ownerId)?.name ?? "—",
      priority: a.priority,
      deadline: a.deadline,
      dossierPercent: dossierProgress(a.studentId).percent,
      contractValue: a.contractValue,
      paid: a.paid,
      updatedLabel: `на этапе ${relativeTime(a.stageEnteredAt)}`,
    };
  });

  const intakes = [...new Set(apps.map((a) => a.intake))].sort();

  return (
    <>
      <PageHeader
        title="Заявки"
        meta={
          <>
            <span>{cards.length} заявок</span>
            <span className="text-ink-faint">·</span>
            <span>воронка от первого звонка до вылета</span>
          </>
        }
        actions={
          <>
            {can(session.role, "applications", "export") ? (
              <button className="btn btn-secondary btn-sm">
                <IconExport size={15} /> Экспорт
              </button>
            ) : null}
            {can(session.role, "applications", "create") ? (
              <button className="btn btn-primary btn-sm">
                <IconPlus size={15} /> Новая заявка
              </button>
            ) : null}
          </>
        }
      />
      <ApplicationsBoard
        cards={cards}
        owners={scopedTeam(session).map((u) => ({ id: u.id, name: u.name }))}
        intakes={intakes}
        initialStage={stage}
      />
    </>
  );
}
