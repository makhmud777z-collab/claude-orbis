import { loc, type Loc } from "./i18n";
import type { Program, Student, University } from "./types";

/**
 * Подбор вуза = ядро продукта.
 * Одна чистая функция сравнивает портфолио студента с требованиями программы
 * и возвращает объяснимый результат: балл, что сходится, что блокирует.
 * Никакой магии — оператор должен понимать, почему вуз в шорт-листе.
 */

export type MatchVerdict = "suitable" | "possible" | "not_suitable";

export interface MatchReason {
  key: string;
  label: Loc;
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

/** Три состояния из дорожной карты: Suitable / Possible / Not suitable. */
const VERDICT_LABEL: Record<MatchVerdict, Loc> = {
  suitable: loc("Подходит", "Mos keladi"),
  possible: loc("Возможен", "Ehtimoli bor"),
  not_suitable: loc("Не подходит", "Mos emas"),
};

export function verdictLabel(v: MatchVerdict): Loc {
  return VERDICT_LABEL[v];
}

export function verdictDot(v: MatchVerdict): string {
  return {
    suitable: "var(--color-status-deal)",
    possible: "var(--color-status-progress)",
    not_suitable: "var(--color-status-risk)",
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
    reasons.push({ key: "degree", label: loc("Другой уровень обучения", "Boshqa ta’lim bosqichi"), level: "block" });
    blocked = true;
  }

  // ── TOPIK
  const topikGap = program.topikMin - p.topik;
  if (topikGap <= 0) {
    reasons.push({
      key: "topik",
      label:
        program.topikMin === 0
          ? loc("TOPIK не требуется", "TOPIK talab qilinmaydi")
          : loc(`TOPIK ${p.topik} ≥ ${program.topikMin}`, `TOPIK ${p.topik} ≥ ${program.topikMin}`),
      level: "ok",
    });
  } else if (topikGap === 1) {
    score -= 22;
    reasons.push({ key: "topik", label: loc(
        `Нужен TOPIK ${program.topikMin}, у студента ${p.topik}`,
        `TOPIK ${program.topikMin} kerak, talabada ${p.topik}`,
      ), level: "warn" });
  } else {
    score -= 45;
    blocked = true;
    reasons.push({ key: "topik", label: loc(
        `TOPIK ${p.topik} против требуемого ${program.topikMin}`,
        `TOPIK ${p.topik}, talab ${program.topikMin}`,
      ), level: "block" });
  }

  // ── IELTS
  if (program.ieltsMin !== null) {
    if (p.ielts === null) {
      score -= 20;
      reasons.push({ key: "ielts", label: loc(
        `Нужен IELTS ${program.ieltsMin}, сертификата нет`,
        `IELTS ${program.ieltsMin} kerak, sertifikat yo‘q`,
      ), level: "warn" });
    } else if (p.ielts >= program.ieltsMin) {
      reasons.push({ key: "ielts", label: loc(`IELTS ${p.ielts} ≥ ${program.ieltsMin}`, `IELTS ${p.ielts} ≥ ${program.ieltsMin}`), level: "ok" });
    } else {
      score -= 25;
      reasons.push({ key: "ielts", label: loc(
        `IELTS ${p.ielts} ниже ${program.ieltsMin}`,
        `IELTS ${p.ielts}, talab ${program.ieltsMin}`,
      ), level: "block" });
      blocked = true;
    }
  }

  // ── GPA
  const gpaMin = university.requirements.gpaMin;
  if (gpaMin !== null && p.gpa !== null) {
    if (p.gpa >= gpaMin) {
      reasons.push({ key: "gpa", label: loc(`GPA ${p.gpa} ≥ ${gpaMin}`, `GPA ${p.gpa} ≥ ${gpaMin}`), level: "ok" });
    } else if (gpaMin - p.gpa <= 0.2) {
      score -= 10;
      reasons.push({ key: "gpa", label: loc(`GPA ${p.gpa} чуть ниже ${gpaMin}`, `GPA ${p.gpa} — ${gpaMin} dan sal past`), level: "warn" });
    } else {
      score -= 25;
      blocked = true;
      reasons.push({ key: "gpa", label: loc(`GPA ${p.gpa} ниже требуемого ${gpaMin}`, `GPA ${p.gpa}, talab ${gpaMin}`), level: "block" });
    }
  }

  // ── бюджет семьи: почти всегда решающий фактор
  if (yearCost <= p.budgetPerYear) {
    reasons.push({ key: "budget", label: loc(
        `Укладывается в бюджет: $${yearCost.toLocaleString("ru-RU")} в год`,
        `Byudjetga sig‘adi: yiliga $${yearCost.toLocaleString("ru-RU")}`,
      ), level: "ok" });
  } else if (yearCost <= p.budgetPerYear * 1.15) {
    score -= 15;
    reasons.push({ key: "budget", label: loc(
        `Дороже бюджета на $${(yearCost - p.budgetPerYear).toLocaleString("ru-RU")}`,
        `Byudjetdan $${(yearCost - p.budgetPerYear).toLocaleString("ru-RU")} qimmat`,
      ), level: "warn" });
  } else {
    score -= 35;
    blocked = true;
    reasons.push({ key: "budget", label: loc(
        `Бюджет $${p.budgetPerYear.toLocaleString("ru-RU")}, стоимость $${yearCost.toLocaleString("ru-RU")}`,
        `Byudjet $${p.budgetPerYear.toLocaleString("ru-RU")}, narx $${yearCost.toLocaleString("ru-RU")}`,
      ), level: "block" });
  }

  // ── город
  if (p.preferredCities.length) {
    if (p.preferredCities.includes(university.city)) {
      reasons.push({ key: "city", label: loc(`Город: ${university.city}`, `Shahar: ${university.city}`), level: "ok" });
    } else {
      score -= 12;
      reasons.push({ key: "city", label: loc(
        `${university.city} вместо ${p.preferredCities.join(" / ")}`,
        `${p.preferredCities.join(" / ")} o‘rniga ${university.city}`,
      ), level: "warn" });
    }
  }

  // ── направление
  if (p.preferredMajors.length) {
    if (p.preferredMajors.includes(program.field)) {
      reasons.push({ key: "field", label: loc(`Направление: ${program.field}`, `Yo‘nalish: ${program.field}`), level: "ok" });
    } else {
      score -= 18;
      reasons.push({ key: "field", label: loc(`Другое направление: ${program.field}`, `Boshqa yo‘nalish: ${program.field}`), level: "warn" });
    }
  }

  // ── форма собственности
  if (p.preferredOwnership.length && !p.preferredOwnership.includes(university.ownership)) {
    score -= 8;
    reasons.push({ key: "ownership", label: loc("Не та форма собственности", "Mulkchilik shakli mos emas"), level: "warn" });
  }

  // ── набор
  if (!university.intakes.includes(p.intake)) {
    score -= 14;
    reasons.push({ key: "intake", label: loc(`Нет набора на ${p.intake}`, `${p.intake} uchun qabul yo‘q`), level: "warn" });
  }

  // ── грант
  if (p.needsScholarship) {
    if (university.scholarshipMax >= 50) {
      reasons.push({ key: "scholarship", label: loc(`Грант до ${university.scholarshipMax}%`, `Grant ${university.scholarshipMax}% gacha`), level: "ok" });
    } else {
      score -= 10;
      reasons.push({ key: "scholarship", label: loc(`Грант максимум ${university.scholarshipMax}%`, `Grant eng ko‘pi ${university.scholarshipMax}%`), level: "warn" });
    }
  }

  // ── общежитие
  if (p.needsDorm && !university.dormAvailable) {
    score -= 12;
    reasons.push({ key: "dorm", label: loc("Нет общежития", "Yotoqxona yo‘q"), level: "warn" });
  }

  // ── визовый рейтинг вуза
  if (university.visaGrade === "restricted") {
    score -= 20;
    reasons.push({ key: "visa", label: loc("Ограничения по студенческой визе", "Talaba vizasida cheklovlar"), level: "block" });
    blocked = true;
  }

  score = Math.max(0, Math.min(100, score));

  // Провал жёсткого требования — «не подходит», сколько бы баллов ни набралось:
  // оператор не должен предлагать семье вуз, куда студента не примут.
  const verdict: MatchVerdict = blocked
    ? "not_suitable"
    : score >= 80
      ? "suitable"
      : "possible";

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
