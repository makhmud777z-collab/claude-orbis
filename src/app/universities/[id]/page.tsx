import { moduleGate } from "@/components/guard";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Chip,
  Field,
  PageHeader,
  SectionTitle,
  StatusDot,
} from "@/components/ui";
import { UNIVERSITIES, universityById } from "@/lib/data/universities";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import {
  CITY_LABEL,
  DEGREE_LABEL,
  INTAKE_LABEL,
  OWNERSHIP_LABEL,
  PROGRAM_LANGUAGE,
  ref,
  REGION_LABEL,
  VISA_GRADE_LABEL,
} from "@/lib/labels";
import { matchProgram, verdictDot, verdictLabel } from "@/lib/matching";
import { can } from "@/lib/rbac";
import { scopedApplications, scopedStudents } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { NO_STUDENT } from "@/lib/shortlist";
import { shortlistFor } from "@/lib/shortlist.server";
import { toggleShortlist } from "@/app/actions";
import { S } from "@/lib/strings";

export async function generateStaticParams() {
  return UNIVERSITIES.map((u) => ({ id: u.id }));
}

export default async function UniversityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const t = translator(session.locale);
  const f = formatters(session.locale);
  const rate = session.tenant.usdRate;

  const gate = moduleGate(session, "universities", t(S.nav.universities));
  if (gate) return gate;

  const uni = universityById(id);
  if (!uni) notFound();

  const picked = await shortlistFor(NO_STUDENT);
  const apps = scopedApplications(session).filter((a) => a.universityId === uni.id);
  const students = scopedStudents(session);
  /** Кому из базы этот вуз подходит прямо сейчас — обратный подбор. */
  const fits = students
    .map((s) => {
      const best = uni.programs
        .map((p) => matchProgram(s, uni, p))
        .sort((a, b) => b.score - a.score)[0];
      return { student: s, match: best };
    })
    .filter((x) => x.match && x.match.verdict !== "not_suitable")
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 6);

  return (
    <>
      <div className="t-caption mb-4 flex items-center gap-2 text-ink-faint">
        <Link href="/universities" className="hover:text-ink">
          {t(S.nav.universities)}
        </Link>
        <span>/</span>
        <span className="text-ink-muted">{uni.name}</span>
      </div>

      <PageHeader
        title={uni.name}
        meta={
          <>
            <span>{uni.nameKo}</span>
            <span className="text-ink-faint">·</span>
            <span>
              {t(ref(CITY_LABEL, uni.city))}, {t(ref(REGION_LABEL, uni.region))}
            </span>
            <span className="text-ink-faint">·</span>
            <span>{t(OWNERSHIP_LABEL[uni.ownership])}</span>
            <span className="chip">
              <StatusDot
                color={
                  uni.dataStatus === "verified"
                    ? "var(--color-status-deal)"
                    : "var(--color-status-progress)"
                }
              />
              {t(
                uni.dataStatus === "verified"
                  ? S.universities.verified
                  : S.universities.draft,
              )}
            </span>
          </>
        }
        actions={
          <>
            <Link href="/universities/compare" className="btn btn-secondary btn-sm">
              {t(S.universities.compare)}
            </Link>
            <form action={toggleShortlist}>
              <input type="hidden" name="universityId" value={uni.id} />
              <input type="hidden" name="studentId" value={NO_STUDENT} />
              <button
                className={`btn btn-sm ${
                  picked.includes(uni.id) ? "btn-secondary" : "btn-primary"
                }`}
              >
                {t(picked.includes(uni.id) ? S.shortlist.added : S.shortlist.add)}
              </button>
            </form>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <section>
            <SectionTitle>{t(S.universities.programsTitle)}</SectionTitle>
            <div className="card divide-y divide-hairline-soft">
              {uni.programs.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="min-w-[220px] flex-1">
                    <div className="t-body-sm">{p.name}</div>
                    <div className="t-micro text-ink-faint">
                      {p.field} · {t(DEGREE_LABEL[p.degreeLevel])} ·{" "}
                      {t(S.universities.languageOfStudy)}: {t(PROGRAM_LANGUAGE[p.language])}
                    </div>
                  </div>
                  <Chip>TOPIK {p.topikMin || t(S.common.notRequired)}</Chip>
                  {p.ieltsMin ? <Chip>IELTS {p.ieltsMin}</Chip> : null}
                  <div className="t-body-sm t-num w-40 text-right">
                    {f.usd(p.tuitionPerYear)}
                    <span className="t-micro block text-ink-faint">
                      {f.som(p.tuitionPerYear * rate, { compact: true })} ·{" "}
                      {t(S.common.perYear)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>{t(S.universities.whoFits)}</SectionTitle>
            <div className="card divide-y divide-hairline-soft">
              {fits.length ? (
                fits.map(({ student, match }) => (
                  <Link
                    key={student.id}
                    href={`/students/${student.id}`}
                    className="flex flex-wrap items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2"
                  >
                    <div className="min-w-[180px] flex-1">
                      <div className="t-body-sm">{student.fullName}</div>
                      <div className="t-micro text-ink-faint">
                        TOPIK {student.profile.topik || "—"} ·{" "}
                        {t(S.universities.budget)} {f.usd(student.profile.budgetPerYear)}
                      </div>
                    </div>
                    <div className="t-caption min-w-[200px] flex-1 text-ink-muted">
                      {match.program.name}
                    </div>
                    <span className="chip">
                      <StatusDot color={verdictDot(match.verdict)} />
                      {t(verdictLabel(match.verdict))} · {match.score}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="t-body-sm px-5 py-8 text-center text-ink-muted">
                  {t(S.universities.noFits)}
                </div>
              )}
            </div>
          </section>

          {apps.length ? (
            <section>
              <SectionTitle>{t(S.universities.ourApplications)}</SectionTitle>
              <div className="card divide-y divide-hairline-soft">
                {apps.map((a) => (
                  <Link
                    key={a.id}
                    href={`/applications/${a.id}`}
                    className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-surface-2"
                  >
                    <span className="t-body-sm">
                      {students.find((s) => s.id === a.studentId)?.fullName ?? a.studentId}
                    </span>
                    <span className="t-caption text-ink-muted">
                      {t(ref(INTAKE_LABEL, a.intake))} ·{" "}
                      {f.som(a.contractValue, { compact: true })}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              {t(S.universities.requirements)}
            </div>
            <Field
              label="TOPIK"
              value={uni.requirements.topikMin || t(S.common.notRequired)}
            />
            <Field label="IELTS" value={uni.requirements.ieltsMin ?? "—"} />
            <Field label="GPA" value={uni.requirements.gpaMin ?? "—"} />
            <Field
              label={t(S.universities.bankBalance)}
              value={f.usdWithSom(uni.requirements.bankBalance, rate)}
            />
            <Field
              label={t(S.universities.gradWithin)}
              value={
                uni.requirements.graduationWithinYears
                  ? `${t(S.universities.yearsUpTo)} ${uni.requirements.graduationWithinYears} ${t(S.universities.years)}`
                  : t(S.universities.notLimited)
              }
            />
          </div>

          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              {t(S.universities.conditions)}
            </div>
            <Field
              label={t(S.universities.admissionFee)}
              value={f.usd(uni.admissionFee)}
            />
            <Field
              label={t(S.universities.dorm)}
              value={
                uni.dormAvailable
                  ? f.usdWithSom(uni.dormCostPerYear ?? 0, rate)
                  : t(S.common.none)
              }
            />
            <Field
              label={t(S.universities.scholarshipUpTo)}
              value={`${t(S.universities.upTo)} ${uni.scholarshipMax}%`}
            />
            <Field
              label={t(S.universities.languageCenter)}
              value={t(uni.hasLanguageCenter ? S.common.yes : S.common.none)}
            />
            <Field
              label={t(S.universities.visaStatus)}
              value={t(VISA_GRADE_LABEL[uni.visaGrade])}
            />
            <Field
              label={t(S.universities.intakes)}
              value={uni.intakes.map((i) => t(ref(INTAKE_LABEL, i))).join(", ")}
            />
          </div>

          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              {t(S.shortlist.deadline)}
            </div>
            {uni.intakeDeadlines.map((d) => (
              <Field
                key={d.intake}
                label={t(ref(INTAKE_LABEL, d.intake))}
                value={
                  <span
                    style={{
                      color:
                        d.deadline < "2026-09-17"
                          ? "var(--color-ink-faint)"
                          : undefined,
                    }}
                  >
                    {f.date(d.deadline)} · {f.relativeDeadline(d.deadline)}
                  </span>
                }
              />
            ))}
          </div>

          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              {t(S.universities.sourceTitle)}
            </div>
            <Field
              label={t(S.universities.status)}
              value={t(
                uni.dataStatus === "verified"
                  ? S.universities.verified
                  : S.universities.draft,
              )}
            />
            <Field label={t(S.universities.updatedAt)} value={f.date(uni.updatedAt)} />
            <Field
              label={t(S.universities.guideline)}
              value={uni.sourceUrl ?? t(S.universities.notLinked)}
            />
            <p className="t-micro mt-3 leading-relaxed text-ink-faint">
              {t(S.universities.sourceHint)}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
