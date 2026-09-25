import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowUpRight, IconMail, IconPhone, IconPlus } from "@/components/icons";
import { moduleGate } from "@/components/guard";
import {
  Avatar,
  Chip,
  Crumbs,
  Field,
  PageHeader,
  Progress,
  SectionTitle,
  StatusDot,
} from "@/components/ui";
import { EditableFields } from "@/components/EditableFields";
import { Timeline } from "@/components/Timeline";
import { UNIVERSITIES, universityById } from "@/lib/data/universities";
import { userById } from "@/lib/data/users";
import { age, formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import {
  CITY_LABEL,
  DEGREE_LABEL,
  DOCUMENT_STATUS,
  FIELD_LABEL,
  INTAKE_LABEL,
  OWNERSHIP_LABEL,
  ref,
  SOURCE_LABEL,
  STUDENT_STATUS,
} from "@/lib/labels";
import { matchStudent, verdictDot, verdictLabel } from "@/lib/matching";
import { scopedContacts, scopedDeals, scopedTasks } from "@/lib/queries";
import { allow } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import {
  customFieldsOf, customValuesOf, documentsOfStudent, dossierProgress, pipelineById, stageOf,
} from "@/lib/store";
import { CustomFieldsCard, type ContactCustomField } from "@/components/CustomFieldsCard";
import { P, S } from "@/lib/strings";
import { timelineItems } from "@/lib/timeline-view";

/**
 * Карточка контакта. Человек в системе один: сюда стекается его история,
 * а подачи в вузы живут отдельными сделками — их у одного контакта много.
 */
export default async function ContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const t = translator(session.locale);
  const f = formatters(session.locale);
  const rate = session.tenant.usdRate;

  const gate = moduleGate(session, "contacts", t(S.crm.contacts));
  if (gate) return gate;

  const student = scopedContacts(session).find((s) => s.id === id);
  if (!student) notFound();

  const canEdit = allow(session.tenant.id, session.role, "contacts", "edit");
  const owner = userById(student.ownerId);

  // Пользовательские поля агентства + значения этого контакта.
  const customValues = customValuesOf(student.id);
  const customFields: ContactCustomField[] = customFieldsOf(session.tenant.id).map((cf) => ({
    id: cf.id,
    label: t(cf.label),
    type: cf.type,
    options: cf.options ?? [],
    value: customValues[cf.id] ?? "",
  }));
  const apps = scopedDeals(session).filter((d) => d.studentId === student.id);
  const docs = documentsOfStudent(student.id);
  const dossier = dossierProgress(student.id);
  const status = STUDENT_STATUS[student.status];
  const tasks = scopedTasks(session).filter(
    (task) =>
      (task.relation?.type === "student" && task.relation.id === student.id) ||
      (task.relation?.type === "deal" &&
        apps.some((a) => a.id === task.relation?.id)),
  );
  const shortlist = matchStudent(student, UNIVERSITIES)
    .filter((m) => m.verdict !== "not_suitable")
    .slice(0, 4);

  return (
    <>
      <Crumbs back="/crm/contacts" backLabel={t(S.crm.contacts)} current={student.fullName} />

      <PageHeader
        title={student.fullName}
        meta={
          <>
            <span className="chip">
              <StatusDot color={status.dot} />
              {t(status.label)}
            </span>
            <span>
              {student.latinName} · {f.plural(age(student.birthDate), P.years)} ·{" "}
              {t(ref(CITY_LABEL, student.city))}
            </span>
            <span className="text-ink-faint">·</span>
            <span>
              {t(S.students.source)}: {t(SOURCE_LABEL[student.source])}
            </span>
          </>
        }
        actions={
          <>
            <a href={`tel:${student.phone}`} className="btn btn-secondary btn-sm">
              <IconPhone size={15} /> {t(S.students.call)}
            </a>
            <a href={`mailto:${student.email}`} className="btn btn-secondary btn-sm">
              <IconMail size={15} /> {t(S.students.write)}
            </a>
            <Link href="/universities" className="btn btn-primary btn-sm">
              <IconPlus size={15} /> {t(S.students.pickUniversity)}
            </Link>
          </>
        }
      />

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[340px_1fr]">
        <div className="space-y-5">
          <EditableFields
            entity="contact"
            id={student.id}
            title={t(S.crm.mainFields)}
            locale={session.locale}
            canEdit={canEdit}
            fields={[
              { name: "fullName", label: t(S.common.fullName), value: student.fullName, display: student.fullName },
              { name: "latinName", label: t(S.common.latinName), value: student.latinName, display: student.latinName },
              { name: "phone", label: t(S.crm.phone), value: student.phone, display: student.phone },
              { name: "email", label: "Email", value: student.email, display: student.email },
              {
                name: "birthDate",
                label: t(S.students.birthDate),
                value: student.birthDate,
                display: f.date(student.birthDate),
                kind: "date",
              },
              {
                name: "city",
                label: t(S.students.colStudent),
                value: student.city,
                display: t(ref(CITY_LABEL, student.city)),
              },
              {
                name: "passport",
                label: t(S.students.passport),
                value: student.passport ?? "",
                display: student.passport ?? "—",
              },
            ]}
          />

          <CustomFieldsCard
            studentId={student.id}
            fields={customFields}
            locale={session.locale}
            canEdit={canEdit}
          />

          <div className="card p-5">
            <Field label={t(S.students.education)} value={student.profile.education} />
            <Field label={t(S.students.gradYear)} value={student.profile.graduationYear} />
            <Field label={t(S.students.colCurator)} value={owner?.name ?? "—"} />
            <Field label={t(S.students.inBaseSince)} value={f.date(student.createdAt)} />
            <Field label={t(S.students.lastTouch)} value={f.date(student.lastTouchAt)} />
            {student.leadId ? (
              <Field
                label={t(S.crm.createdFromLead)}
                value={
                  <Link href={`/crm/leads/${student.leadId}`} className="hover:underline">
                    {student.leadId.toUpperCase()}
                  </Link>
                }
              />
            ) : null}
          </div>

          <Timeline
            entity="contact"
            entityId={student.id}
            items={timelineItems("contact", student.id, t)}
            locale={session.locale}
            canWrite={canEdit}
          />

          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              {t(S.students.portfolio)}
            </div>
            <Field
              label="TOPIK"
              value={student.profile.topik || t(S.students.noCertificate)}
            />
            <Field
              label={t(S.students.topikValidUntil)}
              value={f.date(student.profile.topikExpiresAt)}
            />
            <Field label="IELTS" value={student.profile.ielts ?? "—"} />
            <Field label="GPA" value={student.profile.gpa ?? "—"} />
            <Field
              label={t(S.students.budgetPerYear)}
              value={f.usdWithSom(student.profile.budgetPerYear, rate)}
            />
            <Field
              label={t(S.students.level)}
              value={t(DEGREE_LABEL[student.profile.degreeLevel])}
            />
            <Field
              label={t(S.students.intake)}
              value={t(ref(INTAKE_LABEL, student.profile.intake))}
            />
            <Field
              label={t(S.students.cities)}
              value={
                student.profile.preferredCities
                  .map((c) => t(ref(CITY_LABEL, c)))
                  .join(", ") || t(S.students.anyCity)
              }
            />
            <Field
              label={t(S.students.fields)}
              value={
                student.profile.preferredMajors
                  .map((m) => t(ref(FIELD_LABEL, m)))
                  .join(", ") || t(S.students.notChosen)
              }
            />
            <Field
              label={t(S.students.ownership)}
              value={student.profile.preferredOwnership
                .map((o) => t(OWNERSHIP_LABEL[o]))
                .join(", ")}
            />
            <Field
              label={t(S.students.dorm)}
              value={t(
                student.profile.needsDorm
                  ? S.students.dormNeeded
                  : S.students.dormNotNeeded,
              )}
            />
            <Field
              label={t(S.students.grant)}
              value={t(
                student.profile.needsScholarship
                  ? S.students.grantCritical
                  : S.students.grantPreferred,
              )}
            />
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <SectionTitle
              action={
                <span className="t-caption text-ink-faint">
                  {dossier.done} / {dossier.total} {t(S.students.verifiedOf)}
                </span>
              }
            >
              {t(S.students.dossierTitle)}
            </SectionTitle>
            <div className="card p-5">
              <Progress percent={dossier.percent} />
              <div className="mt-4 grid min-w-0 grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                {docs.map((d) => {
                  const st = DOCUMENT_STATUS[d.status];
                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 border-b border-hairline-soft py-2.5 last:border-b-0"
                    >
                      <StatusDot color={st.dot} />
                      <div className="min-w-0 flex-1">
                        <div className="t-body-sm truncate">{t(d.kind)}</div>
                        <div className="t-micro truncate text-ink-faint">
                          {d.fileName ?? t(S.students.fileMissing)}
                          {d.needsApostille ? ` · ${t(S.students.needsApostille)}` : ""}
                        </div>
                      </div>
                      <span className="t-micro flex-none text-ink-faint">{t(st.label)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section>
            <SectionTitle>{t(S.crm.dealsOfContact)}</SectionTitle>
            <div className="card divide-y divide-hairline-soft">
              {apps.length ? (
                apps.map((a) => {
                  const uni = universityById(a.universityId);
                  const stage = stageOf(pipelineById(a.pipelineId), a.stage);
                  return (
                    <Link
                      key={a.id}
                      href={`/crm/deals/${a.id}`}
                      className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2"
                    >
                      <div className="min-w-[220px] flex-1">
                        <div className="t-body-sm">{uni?.name ?? t(S.common.notSet)}</div>
                        <div className="t-micro text-ink-faint">
                          {uni?.programs.find((p) => p.id === a.programId)?.name ?? "—"} ·{" "}
                          {t(ref(INTAKE_LABEL, a.intake))}
                        </div>
                      </div>
                      <span className="chip">
                        <StatusDot color={stage?.color ?? "var(--color-ink-faint)"} />
                        {stage ? t(stage.label) : a.stage}
                      </span>
                      <div className="t-caption t-num w-28 text-right text-ink-muted">
                        {f.relativeDeadline(a.deadline)}
                      </div>
                      <div className="t-caption t-num w-36 whitespace-nowrap text-right">
                        {f.somPair(a.paid, a.contractValue)}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="t-body-sm px-5 py-8 text-center text-ink-muted">
                  {t(S.crm.noDeals)}
                </div>
              )}
            </div>
          </section>

          <section>
            <SectionTitle
              action={
                <Link href="/universities" className="t-caption text-ink-muted hover:text-ink">
                  {t(S.students.allUniversities)}{" "}
                  <IconArrowUpRight size={12} className="inline" />
                </Link>
              }
            >
              {t(S.students.recommended)}
            </SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {shortlist.map((m) => (
                <Link
                  key={`${m.university.id}_${m.program.id}`}
                  href={`/universities/${m.university.id}`}
                  className="card card-hover p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="t-body-sm truncate">{m.university.name}</div>
                      <div className="t-micro truncate text-ink-faint">
                        {m.program.name}
                      </div>
                    </div>
                    <span className="chip">
                      <StatusDot color={verdictDot(m.verdict)} />
                      {m.score}
                    </span>
                  </div>
                  <div className="t-micro mt-3 text-ink-muted">
                    {t(verdictLabel(m.verdict))} ·{" "}
                    {t(ref(CITY_LABEL, m.university.city))} ·{" "}
                    {f.usdWithSom(m.yearCost, rate)} {t(S.common.perYear)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.reasons.slice(0, 3).map((r) => (
                      <Chip
                        key={r.key}
                        dot={
                          r.level === "ok"
                            ? "var(--color-status-deal)"
                            : r.level === "warn"
                              ? "var(--color-status-progress)"
                              : "var(--color-status-risk)"
                        }
                      >
                        {t(r.label)}
                      </Chip>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>{t(S.students.relatedTasks)}</SectionTitle>
            <div className="card divide-y divide-hairline-soft">
              {tasks.length ? (
                tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="h-3.5 w-3.5 flex-none rounded-[5px] border border-hairline" />
                    <div className="min-w-0 flex-1">
                      <div className="t-body-sm truncate">{task.title}</div>
                      <div className="t-micro text-ink-faint">
                        {userById(task.assigneeId)?.name} · {f.shortDate(task.dueAt)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="t-body-sm px-5 py-8 text-center text-ink-muted">
                  {t(S.common.noTasks)}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
