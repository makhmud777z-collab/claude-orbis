"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IconSearch } from "./icons";
import { Chip, StatusDot } from "./ui";
import { money } from "@/lib/format";
import { DEGREE_LABEL, OWNERSHIP_LABEL } from "@/lib/labels";
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
};

const BUDGETS = [4000, 6000, 8000, 10000, 12000, 15000];

export function CatalogExplorer({
  universities,
  students,
  cities,
  fields,
  intakes,
}: {
  universities: University[];
  students: Pick<Student, "id" | "fullName" | "profile">[];
  cities: string[];
  fields: string[];
  intakes: string[];
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [studentId, setStudentId] = useState<string>("none");

  const student = students.find((s) => s.id === studentId);

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
  const applyStudent = (id: string) => {
    setStudentId(id);
    const s = students.find((x) => x.id === id);
    if (!s) return setFilters(EMPTY);
    setFilters({
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
      languageCenter: false,
      certifiedOnly: false,
    });
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
    [filters.dorm, filters.scholarship, filters.languageCenter, filters.certifiedOnly].filter(Boolean).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[272px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:h-fit">
        <div className="card p-5">
          <div className="mb-4">
            <div className="t-micro mb-2 uppercase tracking-[0.07em] text-ink-faint">
              Подобрать под студента
            </div>
            <select
              value={studentId}
              onChange={(e) => applyStudent(e.target.value)}
              className="field text-[13px]"
            >
              <option value="none">— выбрать студента —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
            {student ? (
              <div className="t-micro mt-2 leading-relaxed text-ink-faint">
                TOPIK {student.profile.topik || "—"} ·{" "}
                {student.profile.ielts ? `IELTS ${student.profile.ielts} · ` : ""}
                бюджет {money(student.profile.budgetPerYear)} ·{" "}
                {student.profile.preferredCities.join(", ") || "город любой"}
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
                placeholder="Название вуза"
                className="field h-9 pl-8 text-[13px]"
              />
            </label>

            <FilterGroup title="Город">
              {cities.map((c) => (
                <button key={c} onClick={() => toggle("cities", c)}>
                  <Chip active={filters.cities.includes(c)}>{c}</Chip>
                </button>
              ))}
            </FilterGroup>

            <FilterGroup title="Форма собственности">
              {OWNERSHIPS.map((o) => (
                <button key={o} onClick={() => toggle("ownership", o)}>
                  <Chip active={filters.ownership.includes(o)}>{OWNERSHIP_LABEL[o]}</Chip>
                </button>
              ))}
            </FilterGroup>

            <FilterGroup title="Направление">
              {fields.map((f) => (
                <button key={f} onClick={() => toggle("fields", f)}>
                  <Chip active={filters.fields.includes(f)}>{f}</Chip>
                </button>
              ))}
            </FilterGroup>

            <FilterGroup title="Уровень обучения">
              <select
                value={filters.degree}
                onChange={(e) => set("degree", e.target.value as Filters["degree"])}
                className="field text-[13px]"
              >
                <option value="all">Любой</option>
                {DEGREES.map((d) => (
                  <option key={d} value={d}>
                    {DEGREE_LABEL[d]}
                  </option>
                ))}
              </select>
            </FilterGroup>

            <FilterGroup title="TOPIK студента">
              <select
                value={String(filters.topik)}
                onChange={(e) =>
                  set("topik", e.target.value === "all" ? "all" : Number(e.target.value))
                }
                className="field text-[13px]"
              >
                <option value="all">Не важно</option>
                {[0, 1, 2, 3, 4, 5, 6].map((l) => (
                  <option key={l} value={l}>
                    {l === 0 ? "Нет сертификата" : `TOPIK ${l}`}
                  </option>
                ))}
              </select>
            </FilterGroup>

            <FilterGroup title="IELTS студента">
              <select
                value={String(filters.ielts)}
                onChange={(e) =>
                  set("ielts", e.target.value === "all" ? "all" : Number(e.target.value))
                }
                className="field text-[13px]"
              >
                <option value="all">Не важно</option>
                {[5, 5.5, 6, 6.5, 7].map((l) => (
                  <option key={l} value={l}>
                    IELTS {l}
                  </option>
                ))}
              </select>
            </FilterGroup>

            <FilterGroup title="Бюджет на год">
              <select
                value={String(filters.budget)}
                onChange={(e) =>
                  set("budget", e.target.value === "all" ? "all" : Number(e.target.value))
                }
                className="field text-[13px]"
              >
                <option value="all">Любой</option>
                {BUDGETS.map((b) => (
                  <option key={b} value={b}>
                    до {money(b)}
                  </option>
                ))}
              </select>
            </FilterGroup>

            <FilterGroup title="Набор">
              <select
                value={filters.intake}
                onChange={(e) => set("intake", e.target.value)}
                className="field text-[13px]"
              >
                <option value="all">Любой</option>
                {intakes.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </FilterGroup>

            <FilterGroup title="Условия">
              <button onClick={() => set("dorm", !filters.dorm)}>
                <Chip active={filters.dorm}>Есть общежитие</Chip>
              </button>
              <button onClick={() => set("scholarship", !filters.scholarship)}>
                <Chip active={filters.scholarship}>Грант от 50%</Chip>
              </button>
              <button onClick={() => set("languageCenter", !filters.languageCenter)}>
                <Chip active={filters.languageCenter}>Языковой центр</Chip>
              </button>
              <button onClick={() => set("certifiedOnly", !filters.certifiedOnly)}>
                <Chip active={filters.certifiedOnly}>Визовый рейтинг A</Chip>
              </button>
            </FilterGroup>

            <button
              onClick={() => {
                setFilters(EMPTY);
                setStudentId("none");
              }}
              className="btn btn-secondary btn-sm mt-2 w-full"
            >
              Сбросить {activeCount ? `(${activeCount})` : ""}
            </button>
          </div>
        </div>
      </aside>

      <div>
        <div className="t-caption mb-4 flex items-center justify-between text-ink-muted">
          <span>
            Найдено {rows.length} вузов
            {student ? ` · отсортировано по совпадению с профилем ${student.fullName}` : ""}
          </span>
        </div>

        <div className="space-y-4">
          {rows.map(({ university: u, programs, match }) => (
            <Link key={u.id} href={`/universities/${u.id}`} className="card card-hover block p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="t-body-lg">{u.name}</span>
                    <span className="t-micro text-ink-faint">{u.nameKo}</span>
                  </div>
                  <div className="t-caption mt-1.5 text-ink-muted">
                    {u.city} · {OWNERSHIP_LABEL[u.ownership]} ·{" "}
                    {u.nationalRank ? `#${u.nationalRank} в стране` : "без рейтинга"} ·
                    основан в {u.founded}
                  </div>
                </div>
                {match ? (
                  <span className="chip chip-active">
                    <StatusDot color={verdictDot(match.verdict)} />
                    {verdictLabel(match.verdict)} · {match.score}
                  </span>
                ) : (
                  <span className="chip">
                    {u.dataStatus === "draft" ? "черновик данных" : "проверено"}
                  </span>
                )}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Metric
                  label="Обучение в год"
                  value={`${money(Math.min(...programs.map((p) => p.tuitionPerYear)))} – ${money(
                    Math.max(...programs.map((p) => p.tuitionPerYear)),
                  )}`}
                />
                <Metric
                  label="Общежитие"
                  value={u.dormAvailable ? `${money(u.dormCostPerYear ?? 0)} в год` : "нет"}
                />
                <Metric
                  label="Требования"
                  value={`TOPIK ${u.requirements.topikMin}+${
                    u.requirements.ieltsMin ? ` · IELTS ${u.requirements.ieltsMin}` : ""
                  } · GPA ${u.requirements.gpaMin ?? "—"}`}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {programs.slice(0, 4).map((p) => (
                  <Chip key={p.id}>
                    {p.name} · {money(p.tuitionPerYear)}
                  </Chip>
                ))}
                {programs.length > 4 ? (
                  <Chip>+{programs.length - 4} программ</Chip>
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
                      {r.label}
                    </Chip>
                  ))}
                </div>
              ) : null}
            </Link>
          ))}

          {!rows.length ? (
            <div className="card px-6 py-16 text-center">
              <div className="t-body-lg">Под эти условия вузов нет</div>
              <div className="t-caption mt-2 text-ink-muted">
                Снимите часть фильтров — обычно первым мешает бюджет или уровень TOPIK.
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="t-micro text-ink-faint">{label}</div>
      <div className="t-body-sm mt-1">{value}</div>
    </div>
  );
}
