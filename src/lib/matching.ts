import type { Program, Student, University } from "./types";

/**
 * Подбор вуза = ядро продукта.
 * Одна чистая функция сравнивает портфолио студента с требованиями программы
 * и возвращает объяснимый результат: балл, что сходится, что блокирует.
 * Никакой магии — оператор должен понимать, почему вуз в шорт-листе.
 */

export type MatchVerdict = "strong" | "possible" | "risky" | "blocked";

export interface MatchReason {
  key: string;
  label: string;
  level: "ok" | "warn" | "block";
}

export interface MatchResult {
  university: University;
  program: Program;
  score: number;
  verdict: MatchVerdict;
  reasons: MatchReason[];
  /** полная стоимость первого года: обучение + общежитие + вступительный взнос */
  yearCost: number;
}

const VERDICT_LABEL: Record<MatchVerdict, string> = {
  strong: "Сильное совпадение",
  possible: "Подходит",
  risky: "С риском",
  blocked: "Не проходит",
};

export function verdictLabel(v: MatchVerdict): string {
  return VERDICT_LABEL[v];
}

export function verdictDot(v: MatchVerdict): string {
  return {
    strong: "var(--color-status-deal)",
    possible: "var(--color-status-open)",
    risky: "var(--color-status-progress)",
    blocked: "var(--color-status-risk)",
  }[v];
}

export function matchProgram(
  student: Student,
  university: University,
  program: Program,
): MatchResult {
  const p = student.profile;
  const reasons: MatchReason[] = [];
  let score = 100;
  let blocked = false;

  const yearCost =
    program.tuitionPerYear +
    (p.needsDorm && university.dormCostPerYear ? university.dormCostPerYear : 0) +
    university.admissionFee;

  // ── уровень обучения — жёсткий фильтр
  if (program.degreeLevel !== p.degreeLevel) {
    reasons.push({ key: "degree", label: "Другой уровень обучения", level: "block" });
    blocked = true;
  }

  // ── TOPIK
  const topikGap = program.topikMin - p.topik;
  if (topikGap <= 0) {
    reasons.push({
      key: "topik",
      label: program.topikMin === 0 ? "TOPIK не требуется" : `TOPIK ${p.topik} ≥ ${program.topikMin}`,
      level: "ok",
    });
  } else if (topikGap === 1) {
    score -= 22;
    reasons.push({ key: "topik", label: `Нужен TOPIK ${program.topikMin}, у студента ${p.topik}`, level: "warn" });
  } else {
    score -= 45;
    blocked = true;
    reasons.push({ key: "topik", label: `TOPIK ${p.topik} против требуемого ${program.topikMin}`, level: "block" });
  }

  // ── IELTS
  if (program.ieltsMin !== null) {
    if (p.ielts === null) {
      score -= 20;
      reasons.push({ key: "ielts", label: `Нужен IELTS ${program.ieltsMin}, сертификата нет`, level: "warn" });
    } else if (p.ielts >= program.ieltsMin) {
      reasons.push({ key: "ielts", label: `IELTS ${p.ielts} ≥ ${program.ieltsMin}`, level: "ok" });
    } else {
      score -= 25;
      reasons.push({ key: "ielts", label: `IELTS ${p.ielts} ниже ${program.ieltsMin}`, level: "block" });
      blocked = true;
    }
  }

  // ── GPA
  const gpaMin = university.requirements.gpaMin;
  if (gpaMin !== null && p.gpa !== null) {
    if (p.gpa >= gpaMin) {
      reasons.push({ key: "gpa", label: `GPA ${p.gpa} ≥ ${gpaMin}`, level: "ok" });
    } else if (gpaMin - p.gpa <= 0.2) {
      score -= 10;
      reasons.push({ key: "gpa", label: `GPA ${p.gpa} чуть ниже ${gpaMin}`, level: "warn" });
    } else {
      score -= 25;
      blocked = true;
      reasons.push({ key: "gpa", label: `GPA ${p.gpa} ниже требуемого ${gpaMin}`, level: "block" });
    }
  }

  // ── бюджет семьи: почти всегда решающий фактор
  if (yearCost <= p.budgetPerYear) {
    reasons.push({ key: "budget", label: `Укладывается в бюджет: $${yearCost.toLocaleString("ru-RU")} в год`, level: "ok" });
  } else if (yearCost <= p.budgetPerYear * 1.15) {
    score -= 15;
    reasons.push({ key: "budget", label: `Дороже бюджета на $${(yearCost - p.budgetPerYear).toLocaleString("ru-RU")}`, level: "warn" });
  } else {
    score -= 35;
    blocked = true;
    reasons.push({ key: "budget", label: `Бюджет $${p.budgetPerYear.toLocaleString("ru-RU")}, стоимость $${yearCost.toLocaleString("ru-RU")}`, level: "block" });
  }

  // ── город
  if (p.preferredCities.length) {
    if (p.preferredCities.includes(university.city)) {
      reasons.push({ key: "city", label: `Город: ${university.city}`, level: "ok" });
    } else {
      score -= 12;
      reasons.push({ key: "city", label: `${university.city} вместо ${p.preferredCities.join(" / ")}`, level: "warn" });
    }
  }

  // ── направление
  if (p.preferredMajors.length) {
    if (p.preferredMajors.includes(program.field)) {
      reasons.push({ key: "field", label: `Направление: ${program.field}`, level: "ok" });
    } else {
      score -= 18;
      reasons.push({ key: "field", label: `Другое направление: ${program.field}`, level: "warn" });
    }
  }

  // ── форма собственности
  if (p.preferredOwnership.length && !p.preferredOwnership.includes(university.ownership)) {
    score -= 8;
    reasons.push({ key: "ownership", label: "Не та форма собственности", level: "warn" });
  }

  // ── набор
  if (!university.intakes.includes(p.intake)) {
    score -= 14;
    reasons.push({ key: "intake", label: `Нет набора на ${p.intake}`, level: "warn" });
  }

  // ── грант
  if (p.needsScholarship) {
    if (university.scholarshipMax >= 50) {
      reasons.push({ key: "scholarship", label: `Грант до ${university.scholarshipMax}%`, level: "ok" });
    } else {
      score -= 10;
      reasons.push({ key: "scholarship", label: `Грант максимум ${university.scholarshipMax}%`, level: "warn" });
    }
  }

  // ── общежитие
  if (p.needsDorm && !university.dormAvailable) {
    score -= 12;
    reasons.push({ key: "dorm", label: "Нет общежития", level: "warn" });
  }

  // ── визовый рейтинг вуза
  if (university.visaGrade === "restricted") {
    score -= 20;
    reasons.push({ key: "visa", label: "Ограничения по студенческой визе", level: "block" });
    blocked = true;
  }

  score = Math.max(0, Math.min(100, score));
  const verdict: MatchVerdict = blocked
    ? score >= 55
      ? "risky"
      : "blocked"
    : score >= 85
      ? "strong"
      : score >= 65
        ? "possible"
        : "risky";

  return { university, program, score, verdict, reasons, yearCost };
}

export function matchStudent(
  student: Student,
  universities: University[],
): MatchResult[] {
  return universities
    .flatMap((u) => u.programs.map((p) => matchProgram(student, u, p)))
    .sort((a, b) => b.score - a.score);
}
