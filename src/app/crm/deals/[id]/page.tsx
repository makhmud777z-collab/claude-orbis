import Link from "next/link";
import { notFound } from "next/navigation";
import { EditableFields } from "@/components/EditableFields";
import { StageBar } from "@/components/StageBar";
import { Timeline } from "@/components/Timeline";
import { moduleGate } from "@/components/guard";
import { Avatar, Crumbs, Field, PageHeader, Progress, StatusDot } from "@/components/ui";
import { boardStages } from "@/lib/crm";
import { userById } from "@/lib/data/users";
import { programById, universityById } from "@/lib/data/universities";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import {
  CITY_LABEL, DEGREE_LABEL, DOCUMENT_STATUS, INTAKE_LABEL, PRIORITY_LABEL, ref,
} from "@/lib/labels";
import { scopedContacts, scopedDeals, scopedTasks } from "@/lib/queries";
import { allow } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { documentsOfStudent, dossierProgress, pipelineById, stageOf } from "@/lib/store";
import { S } from "@/lib/strings";
import { timelineItems } from "@/lib/timeline-view";

/** Карточка сделки: одна подача в один вуз со всей её историей. */
export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;
  const t = translator(session.locale);
  const gate = moduleGate(session, "deals", t(S.crm.deals));
  if (gate) return gate;

  const deal = scopedDeals(session).find((d) => d.id === id);
  if (!deal) notFound();

  const f = formatters(session.locale);
  const contact = scopedContacts(session).find((s) => s.id === deal.studentId);
  const university = universityById(deal.universityId);
  const program = programById(deal.programId);
  const owner = userById(deal.ownerId);
  const pipeline = pipelineById(deal.pipelineId);
  const stage = stageOf(pipeline, deal.stage);
  const canEdit = allow(session.tenant.id, session.role, "deals", "edit");

  const docs = contact ? documentsOfStudent(contact.id) : [];
  const dossier = contact ? dossierProgress(contact.id) : { done: 0, total: 0, percent: 0 };
  const tasks = scopedTasks(session).filter(
    (task) => task.relation?.type === "deal" && task.relation.id === deal.id,
  );

  return (
    <>
      <Crumbs back="/crm/deals" backLabel={t(S.crm.deals)} current={contact?.fullName ?? deal.id.toUpperCase()} />
      <PageHeader
        title={contact?.fullName ?? "—"}
        meta={
          <>
            <span className="t-num">{deal.id.toUpperCase()}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5">
              <StatusDot color={stage?.color ?? "var(--color-ink-faint)"} />
              {stage ? t(stage.label) : deal.stage}
            </span>
            <span>·</span>
            <span>{university?.name ?? t(S.common.notSet)}</span>
          </>
        }
        actions={
          contact ? (
            <Link href={`/crm/contacts/${contact.id}`} className="btn btn-secondary btn-sm">
              <Avatar name={contact.fullName} size={20} /> {t(S.crm.contact)}
            </Link>
          ) : null
        }
      />

      <div className="mb-6">
        <StageBar
          entity="deal"
          id={deal.id}
          current={deal.stage}
          canEdit={canEdit}
          stages={boardStages(deal.pipelineId, session.tenant.id, "deal", t)}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="min-w-0 space-y-5">
          <EditableFields
            entity="deal"
            id={deal.id}
            title={t(S.crm.mainFields)}
            locale={session.locale}
            canEdit={canEdit}
            fields={[
              {
                name: "intake",
                label: t(S.pipelines.fieldIntake),
                value: deal.intake,
                display: t(ref(INTAKE_LABEL, deal.intake)),
                kind: "select",
                options: Object.keys(INTAKE_LABEL).map((key) => ({
                  value: key,
                  label: t(ref(INTAKE_LABEL, key)),
                })),
              },
              {
                name: "deadline",
                label: t(S.pipelines.fieldDeadline),
                value: deal.deadline ?? "",
                display: deal.deadline
                  ? `${f.date(deal.deadline)} · ${f.relativeDeadline(deal.deadline)}`
                  : "—",
                kind: "date",
              },
              {
                name: "priority",
                label: t(S.applications.priority),
                value: deal.priority,
                display: t(PRIORITY_LABEL[deal.priority]),
                kind: "select",
                options: (["low", "normal", "high"] as const).map((key) => ({
                  value: key,
                  label: t(PRIORITY_LABEL[key]),
                })),
              },
              {
                name: "contractValue",
                label: t(S.crm.contract),
                value: String(deal.contractValue),
                display: f.som(deal.contractValue),
                kind: "number",
              },
              {
                name: "paid",
                label: t(S.crm.paid),
                value: String(deal.paid),
                display: f.som(deal.paid),
                kind: "number",
              },
              {
                name: "note",
                label: t(S.crm.comment),
                value: deal.note,
                display: deal.note,
                kind: "textarea",
              },
            ]}
          />

          <div className="card p-4">
            <div className="t-headline mb-3">{t(S.pipelines.fieldUniversity)}</div>
            <Field
              label={t(S.pipelines.fieldUniversity)}
              value={
                university ? (
                  <Link href={`/universities/${university.id}`} className="hover:underline">
                    {university.name} · {t(ref(CITY_LABEL, university.city))}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <Field label={t(S.pipelines.fieldProgram)} value={program?.name ?? "—"} />
            <Field label={t(S.students.colGoal)} value={t(DEGREE_LABEL[deal.degreeLevel])} />
            <Field label={t(S.pipelines.fieldOwner)} value={owner?.name ?? "—"} />
          </div>

          <div className="card p-4">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <div className="t-headline">{t(S.applications.docsOfApplication)}</div>
              <span className="t-caption t-num text-ink-muted">
                {dossier.done} / {dossier.total}
              </span>
            </div>
            <Progress percent={dossier.percent} />
            <ul className="mt-3 space-y-1.5">
              {docs.slice(0, 8).map((doc) => {
                const meta = DOCUMENT_STATUS[doc.status];
                return (
                  <li key={doc.id} className="t-caption flex items-center gap-2">
                    <StatusDot color={meta.dot} />
                    <span className="min-w-0 flex-1 truncate">{t(doc.kind)}</span>
                    <span className="t-micro flex-none text-ink-faint">{t(meta.label)}</span>
                  </li>
                );
              })}
            </ul>
            <Link href="/documents" className="btn btn-ghost btn-sm mt-3">
              {t(S.nav.documents)}
            </Link>
          </div>

          {tasks.length ? (
            <div className="card p-4">
              <div className="t-headline mb-3">{t(S.applications.tasksOfApplication)}</div>
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <li key={task.id} className="t-caption flex items-center gap-2.5">
                    <Avatar name={userById(task.assigneeId)?.name ?? "—"} size={20} />
                    <span className="min-w-0 flex-1 truncate">{task.title}</span>
                    <span className="t-micro flex-none text-ink-faint">
                      {f.relativeDeadline(task.dueAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          <Timeline
            entity="deal"
            entityId={deal.id}
            items={timelineItems("deal", deal.id, t)}
            locale={session.locale}
            canWrite={canEdit}
          />
        </div>
      </div>
    </>
  );
}
