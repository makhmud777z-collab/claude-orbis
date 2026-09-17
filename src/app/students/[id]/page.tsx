import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowUpRight, IconMail, IconPhone, IconPlus } from "@/components/icons";
import { moduleGate } from "@/components/guard";
import {
  Avatar,
  Chip,
  Field,
  PageHeader,
  Progress,
  SectionTitle,
  StatusDot,
} from "@/components/ui";
import { applicationsOfStudent } from "@/lib/data/applications";
import { documentsOfStudent, dossierProgress } from "@/lib/data/documents";
import { TASKS } from "@/lib/data/tasks";
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
  stageMeta,
  STUDENT_STATUS,
} from "@/lib/labels";
import { matchStudent, verdictDot, verdictLabel } from "@/lib/matching";
import { scopedStudents } from "@/lib/queries";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { S } from "@/lib/strings";

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const t = translator(session.locale);
  const f = formatters(session.locale);
  const rate = session.tenant.usdRate;

  const gate = moduleGate(session, "students", t(S.nav.students));
  if (gate) return gate;

  const student = scopedStudents(session).find((s) => s.id === id);
  if (!student) notFound();

  const owner = userById(student.ownerId);
  const apps = applicationsOfStudent(student.id);
  const docs = documentsOfStudent(student.id);
  const dossier = dossierProgress(student.id);
  const status = STUDENT_STATUS[student.status];
  const tasks = TASKS.filter(
    (task) =>
      (task.relation?.type === "student" && task.relation.id === student.id) ||
      (task.relation?.type === "application" &&
        apps.some((a) => a.id === task.relation?.id)),
  );
  const shortlist = matchStudent(student, UNIVERSITIES)
    .filter((m) => m.verdict !== "not_suitable")
    .slice(0, 4);

  return (
    <>
      <div className="t-caption mb-4 flex items-center gap-2 text-ink-faint">
        <Link href="/students" className="hover:text-ink">
          {t(S.nav.students)}
        </Link>
        <span>/</span>
        <span className="text-ink-muted">{student.fullName}</span>
      </div>

      <PageHeader
        title={student.fullName}
        meta={
          <>
            <span className="chip">
              <StatusDot color={status.dot} />
              {t(status.label)}
            </span>
            <span>
              {student.latinName} · {age(student.birthDate)} {t(S.students.age)} ·{" "}
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

      <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <div className="space-y-5">
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={student.fullName} size={44} />
              <div className="min-w-0">
                <div className="t-body-sm truncate">{student.phone}</div>
                <div className="t-micro truncate text-ink-faint">{student.email}</div>
              </div>
            </div>
            <Field label={t(S.students.birthDate)} value={f.date(student.birthDate)} />
            <Field label={t(S.students.education)} value={student.profile.education} />
            <Field label={t(S.students.gradYear)} value={student.profile.graduationYear} />
            <Field label={t(S.students.colCurator)} value={owner?.name ?? "—"} />
            <Field label={t(S.students.inBaseSince)} value={f.date(student.createdAt)} />
            <Field label={t(S.students.lastTouch)} value={f.date(student.lastTouchAt)} />
          </div>

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
              <div className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2">
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
                      <span className="t-micro text-ink-faint">{t(st.label)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section>
            <SectionTitle>{t(S.students.applications)}</SectionTitle>
            <div className="card divide-y divide-hairline-soft">
              {apps.length ? (
                apps.map((a) => {
                  const uni = universityById(a.universityId);
                  const meta = stageMeta(a.stage);
                  return (
                    <Link
                      key={a.id}
                      href={`/applications/${a.id}`}
                      className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2"
                    >
                      <div className="min-w-[220px] flex-1">
                        <div className="t-body-sm">{uni?.name}</div>
                        <div className="t-micro text-ink-faint">
                          {uni?.programs.find((p) => p.id === a.programId)?.name} ·{" "}
                          {t(ref(INTAKE_LABEL, a.intake))}
                        </div>
                      </div>
                      <span className="chip">
                        <StatusDot color={meta.dot} />
                        {t(meta.label)}
                      </span>
                      <div className="t-caption t-num w-28 text-right text-ink-muted">
                        {f.relativeDeadline(a.deadline)}
                      </div>
                      <div className="t-caption t-num w-36 text-right">
                        {f.som(a.paid, { compact: true })} /{" "}
                        {f.som(a.contractValue, { compact: true })}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="t-body-sm px-5 py-8 text-center text-ink-muted">
                  {t(S.common.noApplications)}
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
            <div className="grid gap-4 md:grid-cols-2">
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
