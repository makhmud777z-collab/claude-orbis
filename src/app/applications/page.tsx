import { moduleGate } from "@/components/guard";
import { ApplicationsBoard, type BoardCard } from "@/components/ApplicationsBoard";
import { IconExport, IconPlus } from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { dossierProgress } from "@/lib/data/documents";
import { studentById } from "@/lib/data/students";
import { universityById } from "@/lib/data/universities";
import { userById } from "@/lib/data/users";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { S } from "@/lib/strings";
import { can } from "@/lib/rbac";
import { scopedApplications, scopedTeam } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const session = await getSession();
  const t = translator(session.locale);
  const f = formatters(session.locale);
  const gate = moduleGate(session, "applications", t(S.nav.applications));
  if (gate) return gate;

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
      updatedLabel: `${t(S.applications.onStage)} ${f.relativeTime(a.stageEnteredAt)}`,
    };
  });

  const intakes = [...new Set(apps.map((a) => a.intake))].sort();

  return (
    <>
      <PageHeader
        title={t(S.applications.title)}
        meta={
          <>
            <span>
              {cards.length} {t(S.applications.count)}
            </span>
            <span className="text-ink-faint">·</span>
            <span>{t(S.applications.subtitle)}</span>
          </>
        }
        actions={
          <>
            {can(session.role, "applications", "export") ? (
              <button className="btn btn-secondary btn-sm">
                <IconExport size={15} /> {t(S.common.export)}
              </button>
            ) : null}
            {can(session.role, "applications", "create") ? (
              <button className="btn btn-primary btn-sm">
                <IconPlus size={15} /> {t(S.dashboard.newApplication)}
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
        locale={session.locale}
      />
    </>
  );
}
