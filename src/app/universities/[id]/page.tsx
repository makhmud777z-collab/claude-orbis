import { moduleGate } from "@/components/guard";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Chip,
  Crumbs,
  Field,
  PageHeader,
  SectionTitle,
  StatusDot,
} from "@/components/ui";
import { dataStatusView, programPrice, sourceKindLabel } from "@/lib/catalog";
import { UNIVERSITIES, universityById } from "@/lib/data/universities";
import { formatters, isPast } from "@/lib/format";
import { translator } from "@/lib/i18n";
import {
  CITY_LABEL,
  DEGREE_LABEL,
  IEQAS_LABEL,
  ieqasKey,
  INTAKE_LABEL,
  OWNERSHIP_LABEL,
  PROGRAM_LANGUAGE,
  ref,
  REGION_LABEL,
} from "@/lib/labels";
import {
  KRW_PER_USD,
  KRW_RATE_DATE,
  VISA_FUNDS_HOLD_DAYS,
  VISA_SOURCES,
  visaFundsKrw,
  visaFundsUsd,
} from "@/lib/rules";
import { matchProgram, verdictDot, verdictLabel } from "@/lib/matching";
import { scopedDeals, scopedContacts } from "@/lib/queries";
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

  const status = dataStatusView(uni, t);
  const hasLanguage = uni.programs.some((p) => p.degreeLevel === "language");
  const picked = await shortlistFor(NO_STUDENT);
  const apps = scopedDeals(session).filter((a) => a.universityId === uni.id);
  const students = scopedContacts(session);
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
      <Crumbs back="/universities" backLabel={t(S.nav.universities)} current={uni.name} />

      <PageHeader
        title={uni.name}
        meta={
          <>
            <span>{uni.nameKo}</span>
            <span className="text-ink-faint">·</span>
            <span>
              {t(ref(CITY_LABEL, uni.city))}
              {uni.region !== uni.city ? `, ${t(ref(REGION_LABEL, uni.region))}` : ""}
            </span>
            <span className="text-ink-faint">·</span>
            <span>{t(OWNERSHIP_LABEL[uni.ownership])}</span>
            <span className="text-ink-faint">·</span>
            <span>
              {t(S.universities.founded)} {uni.founded}
            </span>
            {uni.qsRank ? (
              <>
                <span className="text-ink-faint">·</span>
                <span className="t-num">QS #{uni.qsRank}</span>
              </>
            ) : null}
            <span className="chip">
              <StatusDot color={status.color} />
              {status.label}
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

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <section>
            <SectionTitle>{t(S.universities.programsTitle)}</SectionTitle>
            <div className="card divide-y divide-hairline-soft overflow-hidden">
              {uni.programs.length ? (
                uni.programs.map((p) => {
                  const price = programPrice(p, f, t);
                  return (
                    <div key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                      <div className="min-w-[220px] flex-1">
                        <div className="t-body-sm font-medium">{p.name}</div>
                        <div className="t-micro text-ink-faint">
                          {p.field} · {t(DEGREE_LABEL[p.degreeLevel])} ·{" "}
                          {t(S.universities.languageOfStudy)}: {t(PROGRAM_LANGUAGE[p.language])}
                        </div>
                      </div>
                      <Chip>TOPIK {p.topikMin || t(S.common.notRequired)}</Chip>
                      {p.ieltsMin ? <Chip>IELTS {p.ieltsMin}</Chip> : null}
                      <div className="w-48 text-right">
                        {price ? (
                          <>
                            <span className="t-body-sm t-num block">{price.krw}</span>
                            <span className="t-micro block text-ink-faint">{price.usd}</span>
                          </>
                        ) : (
                          <span className="t-caption text-ink-faint">
                            {t(S.universities.notPublished)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="t-body-sm px-5 py-6 leading-relaxed text-ink-muted">
                  {t(S.universities.noPrograms)}
                </p>
              )}
            </div>
          </section>

          <section>
            <SectionTitle>{t(S.universities.whoFits)}</SectionTitle>
            <div className="card divide-y divide-hairline-soft overflow-hidden">
              {fits.length ? (
                fits.map(({ student, match }) => (
                  <Link
                    key={student.id}
                    href={`/crm/contacts/${student.id}`}
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
              <div className="card divide-y divide-hairline-soft overflow-hidden">
                {apps.map((a) => (
                  <Link
                    key={a.id}
                    href={`/crm/deals/${a.id}`}
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
          {/* Сроки — первыми: по ним оператор решает, успевает ли студент вообще. */}
          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              {t(S.universities.windows)}
            </div>
            {uni.windows.length ? (
              <div className="space-y-3">
                {uni.windows.map((w) => {
                  const over = isPast(w.closes);
                  return (
                    <div
                      key={`${w.intake}-${w.round ?? ""}-${w.closes}`}
                      style={{ opacity: over ? 0.55 : 1 }}
                    >
                      <div className="t-caption flex items-center justify-between gap-2 font-medium">
                        <span>
                          {t(ref(INTAKE_LABEL, w.intake))}
                          {w.round ? <span className="text-ink-faint"> · {w.round}</span> : null}
                        </span>
                        {over ? (
                          <span className="t-micro text-ink-faint">{t(S.universities.closed)}</span>
                        ) : (
                          <span
                            className="t-micro font-semibold"
                            style={{ color: "var(--color-status-progress)" }}
                          >
                            {f.relativeDeadline(w.closes)}
                          </span>
                        )}
                      </div>
                      <div className="t-micro t-num mt-0.5 text-ink-muted">
                        {w.opens ? `${f.shortDate(w.opens)} – ` : ""}
                        {f.date(w.closes)}
                        {w.results ? ` · ${t(S.universities.results)} ${f.shortDate(w.results)}` : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="t-micro leading-relaxed text-ink-muted">{t(S.universities.noWindows)}</p>
            )}
          </div>

          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              {t(S.universities.requirements)}
            </div>
            <Field label="TOPIK" value={uni.requirements.topikMin || t(S.common.notRequired)} />
            <Field label="IELTS" value={uni.requirements.ieltsMin ?? "—"} />
            {uni.requirements.notes.length ? (
              <ul className="mt-3 space-y-2">
                {uni.requirements.notes.map((note) => (
                  <li key={note} className="t-micro flex gap-2 leading-relaxed text-ink-muted">
                    <span aria-hidden className="mt-[7px] h-1 w-1 flex-none rounded-full bg-ink-faint" />
                    {note}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* Деньги на счёте — правило визы, а не вуза: считается по региону. */}
          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              {t(S.universities.visaTitle)}
            </div>
            <Field
              label={t(S.universities.visaD2)}
              value={`${f.krw(visaFundsKrw(uni.capitalArea, "D-2"), { compact: true })} · ${f.usdWithSom(visaFundsUsd(uni.capitalArea, "D-2"), rate)}`}
            />
            {hasLanguage ? (
              <Field
                label={t(S.universities.visaD4)}
                value={`${f.krw(visaFundsKrw(uni.capitalArea, "D-4"), { compact: true })} · ${f.usdWithSom(visaFundsUsd(uni.capitalArea, "D-4"), rate)}`}
              />
            ) : null}
            <Field
              label={t(S.universities.holdDays)}
              value={f.days(VISA_FUNDS_HOLD_DAYS)}
            />
            <Field
              label={t(S.universities.ieqas)}
              value={t(IEQAS_LABEL[ieqasKey(uni.ieqas)])}
            />
            <p className="t-micro mt-3 leading-relaxed text-ink-faint">
              {t(uni.capitalArea ? S.universities.capitalArea : S.universities.regionsArea)}.{" "}
              {t(S.universities.visaHint)}
            </p>
            <p className="t-micro mt-2 leading-relaxed text-ink-faint">{t(S.universities.apostilleNote)}</p>
            <p className="t-micro mt-2 leading-relaxed text-ink-faint">{t(S.universities.tbNote)}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {VISA_SOURCES.slice(0, 2).map((src) => (
                <a
                  key={src.url}
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="t-micro text-ink-muted underline decoration-hairline underline-offset-2 hover:text-ink"
                >
                  {src.label}
                </a>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              {t(S.universities.conditions)}
            </div>
            <Field
              label={t(S.universities.admissionFee)}
              value={
                uni.applicationFeeKrw !== null
                  ? `${f.krw(uni.applicationFeeKrw)} · ${f.usd(uni.admissionFee ?? 0)}`
                  : t(S.universities.toClarify)
              }
            />
            <Field
              label={t(S.universities.dorm)}
              value={
                uni.dormAvailable
                  ? uni.dormCostPerYear !== null
                    ? f.usdWithSom(uni.dormCostPerYear, rate)
                    : `${t(S.common.yes)} · ${t(S.universities.toClarify)}`
                  : t(S.common.none)
              }
            />
            <Field
              label={t(S.universities.scholarshipUpTo)}
              value={
                uni.scholarshipMax !== null
                  ? `${t(S.universities.upTo)} ${uni.scholarshipMax}%`
                  : t(S.universities.toClarify)
              }
            />
            {uni.scholarshipNote ? (
              <p className="t-micro -mt-1 mb-2 leading-relaxed text-ink-muted">{uni.scholarshipNote}</p>
            ) : null}
            <Field
              label={t(S.universities.languageCenter)}
              value={t(uni.hasLanguageCenter ? S.common.yes : S.common.none)}
            />
            <Field
              label={t(S.universities.website)}
              value={
                <a href={uni.website} target="_blank" rel="noreferrer" className="underline decoration-hairline underline-offset-2 hover:text-ink">
                  {uni.website.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              }
            />
          </div>

          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              {t(S.universities.sources)}
            </div>
            <Field label={t(S.universities.status)} value={status.label} />
            <Field label={t(S.universities.updatedAt)} value={f.date(uni.updatedAt)} />
            <Field
              label={t(S.universities.rateNote)}
              value={`1 $ = ${KRW_PER_USD.toLocaleString("ru-RU")} ₩ · ${f.shortDate(KRW_RATE_DATE)}`}
            />
            <ul className="mt-3 space-y-2.5">
              {uni.sources.map((src) => (
                <li key={src.url} className="t-micro leading-snug">
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ink-muted underline decoration-hairline underline-offset-2 hover:text-ink"
                  >
                    {src.label}
                  </a>
                  <span className="ml-1.5 text-ink-faint">· {sourceKindLabel(src.kind, t)}</span>
                </li>
              ))}
            </ul>
            <p className="t-micro mt-3 leading-relaxed text-ink-faint">
              {t(S.universities.sourceHint)}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
