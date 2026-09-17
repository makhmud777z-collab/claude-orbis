"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IconSearch } from "./icons";
import { Select } from "./controls";
import { Chip, StatusDot } from "./ui";
import { formatters } from "@/lib/format";
import { translator, type Locale } from "@/lib/i18n";
import {
  CITY_LABEL,
  DEGREE_LABEL,
  FIELD_LABEL,
  INTAKE_LABEL,
  OWNERSHIP_LABEL,
  ref,
} from "@/lib/labels";
import { S } from "@/lib/strings";
import { toggleShortlist } from "@/app/actions";
import { hasEnglishTrack, nextDeadline } from "@/lib/data/universities";
import { NO_STUDENT, SHORTLIST_LIMIT, type ShortlistMap } from "@/lib/shortlist";
import { matchProgram, verdictDot, verdictLabel, type MatchResult } from "@/lib/matching";
import type { DegreeLevel, Ownership, Student, University } from "@/lib/types";

/**
 * Каталог вузов + подбор. Оператор либо крутит фильтры руками,
 * либо выбирает студента — и фильтры заполняются из его портфолио,
 * а каждая строка получает объяснённый балл совпадения.
 */

const OWNERSHIPS: Ownership[] = ["national", "public", "private"];
const DEGREES: DegreeLevel[] = ["language", "bachelor", "master", "phd"];

interface Filters {
  query: string;
  cities: string[];
  ownership: Ownership[];
  fields: string[];
  degree: DegreeLevel | "all";
  topik: number | "all";
  ielts: number | "all";
  budget: number | "all";
  intake: string | "all";
  dorm: boolean;
  scholarship: boolean;
  languageCenter: boolean;
  certifiedOnly: boolean;
  englishTaught: boolean;
}

const EMPTY: Filters = {
  query: "",
  cities: [],
  ownership: [],
  fields: [],
  degree: "all",
  topik: "all",
  ielts: "all",
  budget: "all",
  intake: "all",
  dorm: false,
  scholarship: false,
  languageCenter: false,
  certifiedOnly: false,
  englishTaught: false,
};

const BUDGETS = [4000, 6000, 8000, 10000, 12000, 15000];

export function CatalogExplorer({
  universities,
  students,
  cities,
  fields,
  intakes,
  locale,
  usdRate,
  shortlist,
}: {
  universities: University[];
  students: Pick<Student, "id" | "fullName" | "profile">[];
  cities: string[];
  fields: string[];
  intakes: string[];
  locale: Locale;
  usdRate: number;
  shortlist: ShortlistMap;
}) {
  const t = translator(locale);
  const f = formatters(locale);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [studentId, setStudentId] = useState<string>("none");
  /**
   * Профиль студента по умолчанию только сортирует выдачу и объясняет каждый вуз.
   * Жёстко отсекать варианты — отдельное осознанное действие оператора:
   * иначе список схлопывается до одной строки и выбирать не из чего.
   */
  const [strict, setStrict] = useState(false);

  const student = students.find((s) => s.id === studentId);
  const picked = shortlist[studentId !== "none" ? studentId : NO_STUDENT] ?? [];

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const toggle = <K extends "cities" | "ownership" | "fields">(
    key: K,
    value: string,
  ) =>
    setFilters((f) => {
      const list = f[key] as string[];
      return {
        ...f,
        [key]: list.includes(value)
          ? list.filter((v) => v !== value)
          : [...list, value],
      } as Filters;
    });

  /** Выбор студента переносит его портфолио в фильтры — одно действие вместо десяти. */
  const preferencesOf = (s: Pick<Student, "profile">): Filters => ({
    ...EMPTY,
    cities: [...s.profile.preferredCities],
    ownership: [...s.profile.preferredOwnership],
    fields: [...s.profile.preferredMajors],
    degree: s.profile.degreeLevel,
    topik: s.profile.topik,
    ielts: s.profile.ielts ?? "all",
    budget: s.profile.budgetPerYear,
    intake: s.profile.intake,
    dorm: s.profile.needsDorm,
    scholarship: s.profile.needsScholarship,
  });

  const applyStudent = (id: string) => {
    setStudentId(id);
    const s = students.find((x) => x.id === id);
    if (!s) {
      setStrict(false);
      return setFilters(EMPTY);
    }
    // Уровень обучения — единственный жёсткий критерий: бакалавриат и языковые
    // курсы это разные продукты, смешивать их в одной выдаче бессмысленно.
    setFilters(strict ? preferencesOf(s) : { ...EMPTY, degree: s.profile.degreeLevel });
  };

  const toggleStrict = () => {
    const next = !strict;
    setStrict(next);
    const s = students.find((x) => x.id === studentId);
    if (!s) return;
    setFilters(next ? preferencesOf(s) : { ...EMPTY, degree: s.profile.degreeLevel });
  };

  const rows = useMemo(() => {
    const result: {
      university: University;
      programs: University["programs"];
      match: MatchResult | null;
    }[] = [];

    for (const u of universities) {
      if (filters.query && !`${u.name} ${u.nameKo} ${u.city}`.toLowerCase().includes(filters.query.toLowerCase())) continue;
      if (filters.cities.length && !filters.cities.includes(u.city)) continue;
      if (filters.ownership.length && !filters.ownership.includes(u.ownership)) continue;
      if (filters.dorm && !u.dormAvailable) continue;
      if (filters.scholarship && u.scholarshipMax < 50) continue;
      if (filters.languageCenter && !u.hasLanguageCenter) continue;
      if (filters.certifiedOnly && u.visaGrade !== "certified") continue;
      if (filters.englishTaught && !hasEnglishTrack(u)) continue;
      if (filters.intake !== "all" && !u.intakes.includes(filters.intake)) continue;

      const programs = u.programs.filter((p) => {
        if (filters.degree !== "all" && p.degreeLevel !== filters.degree) return false;
        if (filters.fields.length && !filters.fields.includes(p.field)) return false;
        if (filters.topik !== "all" && p.topikMin > filters.topik) return false;
        if (filters.ielts !== "all" && p.ieltsMin !== null && p.ieltsMin > filters.ielts)
          return false;
        if (filters.budget !== "all") {
          const total =
            p.tuitionPerYear +
            (filters.dorm && u.dormCostPerYear ? u.dormCostPerYear : 0) +
            u.admissionFee;
          if (total > filters.budget * 1.15) return false;
        }
        return true;
      });

      if (!programs.length) continue;

      const match =
        student
          ? programs
              .map((p) => matchProgram(student as Student, u, p))
              .sort((a, b) => b.score - a.score)[0]
          : null;

      result.push({ university: u, programs, match });
    }

    return result.sort((a, b) =>
      a.match && b.match
        ? b.match.score - a.match.score
        : (a.university.nationalRank ?? 999) - (b.university.nationalRank ?? 999),
    );
  }, [universities, filters, student]);

  const activeCount =
    filters.cities.length +
    filters.ownership.length +
    filters.fields.length +
    (filters.degree !== "all" ? 1 : 0) +
    (filters.topik !== "all" ? 1 : 0) +
    (filters.ielts !== "all" ? 1 : 0) +
    (filters.budget !== "all" ? 1 : 0) +
    (filters.intake !== "all" ? 1 : 0) +
    [
      filters.dorm,
      filters.scholarship,
      filters.languageCenter,
      filters.certifiedOnly,
      filters.englishTaught,
    ].filter(Boolean).length;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[272px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:h-fit">
        <div className="card p-5">
          <div className="mb-4">
            <div className="t-micro mb-2 uppercase tracking-[0.07em] text-ink-faint">
              {t(S.universities.pickForStudent)}
            </div>
            <Select
              locale={locale}
              width="100%"
              value={studentId}
              onChange={applyStudent}
              options={[
                { value: "none", label: t(S.universities.chooseStudent) },
                ...students.map((s) => ({ value: s.id, label: s.fullName })),
              ]}
            />
            {student ? (
              <>
                <button onClick={toggleStrict} className="mt-2.5 block">
                  <Chip active={strict}>{t(S.universities.applyPreferences)}</Chip>
                </button>
                <div className="t-micro mt-2 leading-relaxed text-ink-faint">
                  {t(S.universities.preferencesHint)}
                </div>
              </>
            ) : null}
            {student ? (
              <div className="t-micro mt-2 leading-relaxed text-ink-faint">
                TOPIK {student.profile.topik || "—"} ·{" "}
                {student.profile.ielts ? `IELTS ${student.profile.ielts} · ` : ""}
                {t(S.universities.budget)} {f.usd(student.profile.budgetPerYear)} ·{" "}
                {student.profile.preferredCities
                  .map((c) => t(ref(CITY_LABEL, c)))
                  .join(", ") || t(S.universities.cityAny)}
              </div>
            ) : null}
          </div>

          <div className="hairline-t pt-4">
            <label className="relative mb-4 flex items-center">
              <span className="pointer-events-none absolute left-3 text-ink-faint">
                <IconSearch size={13} />
              </span>
              <input
                value={filters.query}
                onChange={(e) => set("query", e.target.value)}
                placeholder={t(S.universities.universityName)}
                className="field h-9 pl-8 text-[13px]"
              />
            </label>

            <FilterGroup title={t(S.universities.city)}>
              {cities.map((c) => (
                <button key={c} onClick={() => toggle("cities", c)}>
                  <Chip active={filters.cities.includes(c)}>{t(ref(CITY_LABEL, c))}</Chip>
                </button>
              ))}
            </FilterGroup>

            <FilterGroup title={t(S.universities.ownership)}>
              {OWNERSHIPS.map((o) => (
                <button key={o} onClick={() => toggle("ownership", o)}>
                  <Chip active={filters.ownership.includes(o)}>
                    {t(OWNERSHIP_LABEL[o])}
                  </Chip>
                </button>
              ))}
            </FilterGroup>

            <FilterGroup title={t(S.universities.field)}>
              {fields.map((item) => (
                <button key={item} onClick={() => toggle("fields", item)}>
                  <Chip active={filters.fields.includes(item)}>
                    {t(ref(FIELD_LABEL, item))}
                  </Chip>
                </button>
              ))}
            </FilterGroup>

            <FilterGroup title={t(S.universities.degree)}>
              <Select
                locale={locale}
                width="100%"
                value={filters.degree}
                onChange={(v) => set("degree", v as Filters["degree"])}
                options={[
                  { value: "all", label: t(S.universities.any) },
                  ...DEGREES.map((d) => ({ value: d, label: t(DEGREE_LABEL[d]) })),
                ]}
              />
            </FilterGroup>

            <FilterGroup title={t(S.universities.studentTopik)}>
              <Select
                locale={locale}
                width="100%"
                value={String(filters.topik)}
                onChange={(v) => set("topik", v === "all" ? "all" : Number(v))}
                options={[
                  { value: "all", label: t(S.universities.notImportant) },
                  ...[0, 1, 2, 3, 4, 5, 6].map((l) => ({
                    value: String(l),
                    label: l === 0 ? t(S.universities.noCertificate) : `TOPIK ${l}`,
                  })),
                ]}
              />
            </FilterGroup>

            <FilterGroup title={t(S.universities.studentIelts)}>
              <Select
                locale={locale}
                width="100%"
                value={String(filters.ielts)}
                onChange={(v) => set("ielts", v === "all" ? "all" : Number(v))}
                options={[
                  { value: "all", label: t(S.universities.notImportant) },
                  ...[5, 5.5, 6, 6.5, 7].map((l) => ({
                    value: String(l),
                    label: `IELTS ${l}`,
                  })),
                ]}
              />
            </FilterGroup>

            <FilterGroup title={t(S.universities.budgetPerYear)}>
              <Select
                locale={locale}
                width="100%"
                value={String(filters.budget)}
                onChange={(v) => set("budget", v === "all" ? "all" : Number(v))}
                options={[
                  { value: "all", label: t(S.universities.any) },
                  ...BUDGETS.map((b) => ({
                    value: String(b),
                    label: `${t(S.universities.upTo)} ${f.usd(b)}`,
                    hint: f.som(b * usdRate, { compact: true }),
                  })),
                ]}
              />
            </FilterGroup>

            <FilterGroup title={t(S.universities.intake)}>
              <Select
                locale={locale}
                width="100%"
                value={filters.intake}
                onChange={(v) => set("intake", v)}
                options={[
                  { value: "all", label: t(S.universities.any) },
                  ...intakes.map((i) => ({ value: i, label: t(ref(INTAKE_LABEL, i)) })),
                ]}
              />
            </FilterGroup>

            <FilterGroup title={t(S.universities.conditions)}>
              <button onClick={() => set("dorm", !filters.dorm)}>
                <Chip active={filters.dorm}>{t(S.universities.hasDorm)}</Chip>
              </button>
              <button onClick={() => set("scholarship", !filters.scholarship)}>
                <Chip active={filters.scholarship}>{t(S.universities.grantFrom)}</Chip>
              </button>
              <button onClick={() => set("languageCenter", !filters.languageCenter)}>
                <Chip active={filters.languageCenter}>
                  {t(S.universities.languageCenter)}
                </Chip>
              </button>
              <button onClick={() => set("certifiedOnly", !filters.certifiedOnly)}>
                <Chip active={filters.certifiedOnly}>{t(S.universities.visaGradeA)}</Chip>
              </button>
              <button onClick={() => set("englishTaught", !filters.englishTaught)}>
                <Chip active={filters.englishTaught}>
                  {t(S.universities.englishTaught)}
                </Chip>
              </button>
            </FilterGroup>

            <button
              onClick={() => {
                setFilters(EMPTY);
                setStudentId("none");
              }}
              className="btn btn-secondary btn-sm mt-2 w-full"
            >
              {t(S.common.reset)} {activeCount ? `(${activeCount})` : ""}
            </button>
          </div>
        </div>
      </aside>

      <div>
        <div className="t-caption mb-4 flex flex-wrap items-center justify-between gap-3 text-ink-muted">
          <span>
            {t(S.universities.found)}{" "}
            {f.plural(rows.length, {
              ru: ["вуз", "вуза", "вузов"],
              uz: ["universitet", "universitet", "universitet"],
            })}
            {student
              ? ` · ${t(S.universities.sortedByMatch)}: ${student.fullName}`
              : ""}
          </span>
          <span className="flex items-center gap-2">
            <span className="t-micro text-ink-faint">
              {picked.length} / {SHORTLIST_LIMIT} {t(S.shortlist.count)}
            </span>
            <Link
              href={
                studentId !== "none"
                  ? `/universities/compare?student=${studentId}`
                  : "/universities/compare"
              }
              className={`btn btn-sm ${picked.length ? "btn-primary" : "btn-secondary"}`}
            >
              {t(S.shortlist.compare)}
            </Link>
          </span>
        </div>

        <div className="space-y-4">
          {rows.map(({ university: u, programs, match }) => (
            <div key={u.id} className="card card-hover p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/universities/${u.id}`}
                    className="flex items-center gap-2.5 hover:opacity-90"
                  >
                    <span className="t-body-lg">{u.name}</span>
                    <span className="t-micro text-ink-faint">{u.nameKo}</span>
                  </Link>
                  <div className="t-caption mt-1.5 text-ink-muted">
                    {t(ref(CITY_LABEL, u.city))} · {t(OWNERSHIP_LABEL[u.ownership])} ·{" "}
                    {u.nationalRank
                      ? `#${u.nationalRank} ${t(S.universities.inCountry)}`
                      : t(S.universities.noRank)}{" "}
                    · {t(S.universities.founded)} {u.founded}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {match ? (
                    <span className="chip chip-active">
                      <StatusDot color={verdictDot(match.verdict)} />
                      {t(verdictLabel(match.verdict))} · {match.score}
                    </span>
                  ) : (
                    <span className="chip">
                      {t(
                        u.dataStatus === "draft"
                          ? S.universities.draft
                          : S.universities.verified,
                      )}
                    </span>
                  )}
                  <form action={toggleShortlist}>
                    <input type="hidden" name="universityId" value={u.id} />
                    <input
                      type="hidden"
                      name="studentId"
                      value={studentId !== "none" ? studentId : NO_STUDENT}
                    />
                    <button
                      className={`btn btn-sm ${
                        picked.includes(u.id) ? "btn-primary" : "btn-secondary"
                      }`}
                    >
                      {t(picked.includes(u.id) ? S.shortlist.added : S.shortlist.add)}
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Metric
                  label={t(S.universities.tuitionPerYear)}
                  value={(() => {
                    const low = Math.min(...programs.map((p) => p.tuitionPerYear));
                    const high = Math.max(...programs.map((p) => p.tuitionPerYear));
                    return low === high ? f.usd(low) : `${f.usd(low)} – ${f.usd(high)}`;
                  })()}
                  hint={f.som(
                    Math.min(...programs.map((p) => p.tuitionPerYear)) * usdRate,
                    { compact: true },
                  )}
                />
                <Metric
                  label={t(S.universities.dorm)}
                  value={
                    u.dormAvailable
                      ? `${f.usd(u.dormCostPerYear ?? 0)} ${t(S.common.perYear)}`
                      : t(S.common.none)
                  }
                />
                <Metric
                  label={t(S.universities.requirements)}
                  value={`TOPIK ${u.requirements.topikMin}+${
                    u.requirements.ieltsMin ? ` · IELTS ${u.requirements.ieltsMin}` : ""
                  } · GPA ${u.requirements.gpaMin ?? "—"}`}
                  hint={(() => {
                    const d = nextDeadline(u);
                    return d
                      ? `${t(S.universities.deadlineSoon)}: ${f.shortDate(d.deadline)} · ${t(ref(INTAKE_LABEL, d.intake))}`
                      : t(S.shortlist.noDeadline);
                  })()}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {programs.slice(0, 4).map((p) => (
                  <Chip key={p.id}>
                    {p.name} · {f.usd(p.tuitionPerYear)}
                  </Chip>
                ))}
                {programs.length > 4 ? (
                  <Chip>
                    +{programs.length - 4} {t(S.universities.morePrograms)}
                  </Chip>
                ) : null}
              </div>

              {match ? (
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-hairline-soft pt-4">
                  {match.reasons.slice(0, 4).map((r) => (
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
              ) : null}
            </div>
          ))}

          {!rows.length ? (
            <div className="card px-6 py-16 text-center">
              <div className="t-body-lg">{t(S.universities.noResults)}</div>
              <div className="t-caption mt-2 text-ink-muted">
                {t(S.universities.noResultsHint)}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="t-micro mb-2 uppercase tracking-[0.07em] text-ink-faint">
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="t-micro text-ink-faint">{label}</div>
      <div className="t-body-sm mt-1">{value}</div>
      {hint ? <div className="t-micro mt-0.5 text-ink-faint">{hint}</div> : null}
    </div>
  );
}
