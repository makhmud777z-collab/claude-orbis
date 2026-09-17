import Link from "next/link";
import { moduleGate } from "@/components/guard";
import { IconArrowUpRight } from "@/components/icons";
import { Chip, PageHeader, StatusDot } from "@/components/ui";
import { clearShortlist } from "@/app/actions";
import {
  hasEnglishTrack,
  nextDeadline,
  universityById,
} from "@/lib/data/universities";
import { formatters } from "@/lib/format";
import { translator, type Loc } from "@/lib/i18n";
import {
  CITY_LABEL,
  INTAKE_LABEL,
  OWNERSHIP_LABEL,
  ref,
  REGION_LABEL,
  VISA_GRADE_LABEL,
} from "@/lib/labels";
import { matchStudent, verdictDot, verdictLabel } from "@/lib/matching";
import { scopedStudents } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { NO_STUDENT } from "@/lib/shortlist";
import { shortlistFor } from "@/lib/shortlist.server";
import { S } from "@/lib/strings";
import type { University } from "@/lib/types";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const session = await getSession();
  const t = translator(session.locale);
  const f = formatters(session.locale);
  const rate = session.tenant.usdRate;

  const gate = moduleGate(session, "universities", t(S.nav.universities));
  if (gate) return gate;

  const { student: studentParam } = await searchParams;
  const students = scopedStudents(session);
  const student = students.find((s) => s.id === studentParam) ?? null;

  const ids = await shortlistFor(student?.id ?? NO_STUDENT);
  const universities = ids
    .map((id) => universityById(id))
    .filter((u): u is University => Boolean(u));

  /** Вердикт по лучшей программе вуза — если сравниваем под конкретного студента. */
  const verdicts = new Map(
    student
      ? universities.map((u) => {
          const best = matchStudent(student, [u])[0];
          return [u.id, best];
        })
      : [],
  );

  const rows: { label: Loc; value: (u: University) => string }[] = [
    {
      label: S.universities.city,
      value: (u) =>
        `${t(ref(CITY_LABEL, u.city))}, ${t(ref(REGION_LABEL, u.region))}`,
    },
    { label: S.universities.ownership, value: (u) => t(OWNERSHIP_LABEL[u.ownership]) },
    {
      label: S.universities.tuitionPerYear,
      value: (u) =>
        `${f.usd(Math.min(...u.programs.map((p) => p.tuitionPerYear)))} – ${f.usd(
          Math.max(...u.programs.map((p) => p.tuitionPerYear)),
        )}`,
    },
    {
      label: S.universities.dorm,
      value: (u) =>
        u.dormAvailable ? f.usdWithSom(u.dormCostPerYear ?? 0, rate) : t(S.common.none),
    },
    { label: S.universities.admissionFee, value: (u) => f.usd(u.admissionFee) },
    {
      label: S.universities.scholarshipUpTo,
      value: (u) => `${t(S.universities.upTo)} ${u.scholarshipMax}%`,
    },
    {
      label: S.shortlist.yearCost,
      value: (u) => {
        const cheapest = Math.min(...u.programs.map((p) => p.tuitionPerYear));
        const total = cheapest + (u.dormCostPerYear ?? 0) + u.admissionFee;
        return f.usdWithSom(total, rate);
      },
    },
    {
      label: { ru: "TOPIK", uz: "TOPIK" },
      value: (u) => String(u.requirements.topikMin || t(S.common.notRequired)),
    },
    {
      label: { ru: "IELTS", uz: "IELTS" },
      value: (u) => String(u.requirements.ieltsMin ?? "—"),
    },
    {
      label: { ru: "GPA", uz: "GPA" },
      value: (u) => String(u.requirements.gpaMin ?? "—"),
    },
    {
      label: S.universities.bankBalance,
      value: (u) => f.usd(u.requirements.bankBalance),
    },
    {
      label: S.shortlist.englishTaught,
      value: (u) => t(hasEnglishTrack(u) ? S.common.yes : S.common.none),
    },
    {
      label: S.universities.languageCenter,
      value: (u) => t(u.hasLanguageCenter ? S.common.yes : S.common.none),
    },
    {
      label: S.shortlist.deadline,
      value: (u) => {
        const d = nextDeadline(u);
        return d
          ? `${f.shortDate(d.deadline)} · ${t(ref(INTAKE_LABEL, d.intake))}`
          : t(S.shortlist.noDeadline);
      },
    },
    { label: S.universities.visaStatus, value: (u) => t(VISA_GRADE_LABEL[u.visaGrade]) },
    {
      label: S.universities.intakes,
      value: (u) => u.intakes.map((i) => t(ref(INTAKE_LABEL, i))).join(", "),
    },
  ];

  return (
    <>
      <div className="t-caption mb-4 flex items-center gap-2 text-ink-faint">
        <Link href="/universities" className="hover:text-ink">
          {t(S.nav.universities)}
        </Link>
        <span>/</span>
        <span className="text-ink-muted">{t(S.shortlist.compareTitle)}</span>
      </div>

      <PageHeader
        title={t(S.shortlist.compareTitle)}
        meta={
          <>
            <span>
              {f.plural(universities.length, {
                ru: ["вуз", "вуза", "вузов"],
                uz: ["universitet", "universitet", "universitet"],
              })}{" "}
              {t(S.shortlist.count)}
            </span>
            <span className="text-ink-faint">·</span>
            <span>
              {student
                ? `${t(S.shortlist.forStudent)}: ${student.fullName}`
                : t(S.shortlist.withoutStudent)}
            </span>
          </>
        }
        actions={
          <>
            <Link href="/universities" className="btn btn-secondary btn-sm">
              {t(S.shortlist.backToCatalog)}
            </Link>
            {universities.length ? (
              <form action={clearShortlist}>
                <input
                  type="hidden"
                  name="studentId"
                  value={student?.id ?? NO_STUDENT}
                />
                <button className="btn btn-secondary btn-sm">
                  {t(S.shortlist.clear)}
                </button>
              </form>
            ) : null}
          </>
        }
      />

      {universities.length ? (
        <div className="card overflow-hidden">
          <div className="scroll-x">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-hairline-soft">
                  <th className="t-micro sticky left-0 z-10 bg-surface-1 px-5 py-4 text-left font-medium uppercase tracking-[0.07em] text-ink-faint">
                    {t(S.shortlist.criterion)}
                  </th>
                  {universities.map((u) => (
                    <th key={u.id} className="px-5 py-4 text-left align-top">
                      <Link href={`/universities/${u.id}`} className="group block">
                        <div className="t-body-sm">{u.name}</div>
                        <div className="t-micro mt-0.5 text-ink-faint">
                          {u.nameKo}{" "}
                          <IconArrowUpRight
                            size={11}
                            className="inline opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        </div>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {student ? (
                  <tr className="border-b border-hairline-soft bg-surface-2/40">
                    <td className="t-caption sticky left-0 z-10 bg-surface-1 px-5 py-3 text-ink-muted">
                      {t(S.shortlist.verdict)}
                    </td>
                    {universities.map((u) => {
                      const m = verdicts.get(u.id);
                      return (
                        <td key={u.id} className="px-5 py-3">
                          {m ? (
                            <span className="chip chip-active">
                              <StatusDot color={verdictDot(m.verdict)} />
                              {t(verdictLabel(m.verdict))} · {m.score}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ) : null}

                {rows.map((row) => (
                  <tr
                    key={row.label.ru}
                    className="border-b border-hairline-soft last:border-b-0"
                  >
                    <td className="t-caption sticky left-0 z-10 bg-surface-1 px-5 py-3 text-ink-muted">
                      {t(row.label)}
                    </td>
                    {universities.map((u) => (
                      <td key={u.id} className="t-body-sm px-5 py-3">
                        {row.value(u)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card px-6 py-16 text-center">
          <div className="t-body-lg">{t(S.shortlist.empty)}</div>
          <p className="t-caption mx-auto mt-3 max-w-md text-ink-muted">
            {t(S.shortlist.emptyHint)}
          </p>
          <Link href="/universities" className="btn btn-primary btn-sm mt-6">
            {t(S.nav.universities)}
          </Link>
        </div>
      )}

      {student ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Chip>TOPIK {student.profile.topik || "—"}</Chip>
          {student.profile.ielts ? <Chip>IELTS {student.profile.ielts}</Chip> : null}
          {student.profile.gpa ? <Chip>GPA {student.profile.gpa}</Chip> : null}
          <Chip>
            {t(S.universities.budget)} {f.usd(student.profile.budgetPerYear)}
          </Chip>
        </div>
      ) : null}
    </>
  );
}
