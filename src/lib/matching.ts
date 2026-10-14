import { windowsFor } from "./data/universities";
import { daysUntil, TODAY, TODAY_ISO } from "./format";
import { loc, type Loc } from "./i18n";
import { VISA_FUNDS_HOLD_DAYS, visaFor, visaFundsKrw, visaFundsUsd } from "./rules";
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
  /**
   * Полная стоимость первого года: обучение (верхняя граница вилки) +
   * общежитие + сбор за подачу. null — вуз не публикует стоимость обучения.
   */
  yearCost: number | null;
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

/** «9 июля» / «9 iyul» — для причин подбора, без зависимости от форматтеров. */
const MONTHS: Record<"ru" | "uz", string[]> = {
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
  uz: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
};
function shortDate(iso: string, lang: "ru" | "uz"): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[lang][m - 1]}`;
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

  // Всё, что вуз не публикует, считается нулём — но об этом говорит
  // отдельная причина ниже, а не молчаливая «дешёвая» цифра.
  const extras =
    (p.needsDorm && university.dormCostPerYear ? university.dormCostPerYear : 0) +
    (university.admissionFee ?? 0);
  const yearCost = program.tuitionPerYear === null ? null : program.tuitionPerYear + extras;
  const yearCostMin =
    program.tuitionPerYearMin === null ? yearCost : program.tuitionPerYearMin + extras;

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

  // ── срок действия TOPIK: сертификат действует два года с объявления
  // результатов. Истёкший вуз не примет, а истекающий до конца подачи —
  // это пересдача, о которой семья должна узнать сейчас, а не в окне подачи.
  if (program.topikMin > 0 && p.topik >= program.topikMin && p.topikExpiresAt) {
    const upcoming = windowsFor(university, program.degreeLevel)
      .filter((w) => w.intake === p.intake && w.closes >= TODAY_ISO)
      .sort((a, b) => a.closes.localeCompare(b.closes))[0];
    if (p.topikExpiresAt < TODAY_ISO) {
      score -= 40;
      blocked = true;
      reasons.push({ key: "topik_valid", label: loc(
        `TOPIK истёк ${shortDate(p.topikExpiresAt, "ru")} — нужен новый экзамен`,
        `TOPIK muddati ${shortDate(p.topikExpiresAt, "uz")} tugagan — yangi imtihon kerak`,
      ), level: "block" });
    } else if (upcoming && p.topikExpiresAt < upcoming.closes) {
      score -= 15;
      reasons.push({ key: "topik_valid", label: loc(
        `TOPIK истекает ${shortDate(p.topikExpiresAt, "ru")} — раньше конца подачи`,
        `TOPIK ${shortDate(p.topikExpiresAt, "uz")} tugaydi — topshirish tugashidan oldin`,
      ), level: "warn" });
    }
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

  // ── бюджет семьи: почти всегда решающий фактор.
  // Вуз называет вилку по специальностям, поэтому и сравнение — с вилкой:
  // верх вилки в бюджете — подходит; в бюджет попадает только низ — смотря
  // какая специальность; даже низ дороже бюджета — не подходит.
  const usd = (n: number) => `$${n.toLocaleString("ru-RU")}`;
  if (yearCost === null || yearCostMin === null) {
    score -= 8;
    reasons.push({ key: "budget", label: loc(
        "Вуз не публикует стоимость — уточнить до подачи",
        "Universitet narxni e’lon qilmaydi — topshirishdan oldin aniqlang",
      ), level: "warn" });
  } else if (yearCost <= p.budgetPerYear) {
    reasons.push({ key: "budget", label: loc(
        yearCostMin < yearCost
          ? `Укладывается в бюджет: ${usd(yearCostMin)}–${usd(yearCost)} в год`
          : `Укладывается в бюджет: ${usd(yearCost)} в год`,
        yearCostMin < yearCost
          ? `Byudjetga sig‘adi: yiliga ${usd(yearCostMin)}–${usd(yearCost)}`
          : `Byudjetga sig‘adi: yiliga ${usd(yearCost)}`,
      ), level: "ok" });
  } else if (yearCostMin <= p.budgetPerYear) {
    score -= 10;
    reasons.push({ key: "budget", label: loc(
        `${usd(yearCostMin)}–${usd(yearCost)} в год: в бюджет входят не все специальности`,
        `Yiliga ${usd(yearCostMin)}–${usd(yearCost)}: hamma yo‘nalish byudjetga sig‘maydi`,
      ), level: "warn" });
  } else if (yearCostMin <= p.budgetPerYear * 1.15) {
    score -= 15;
    reasons.push({ key: "budget", label: loc(
        `Дороже бюджета минимум на ${usd(yearCostMin - p.budgetPerYear)}`,
        `Byudjetdan kamida ${usd(yearCostMin - p.budgetPerYear)} qimmat`,
      ), level: "warn" });
  } else {
    score -= 35;
    blocked = true;
    reasons.push({ key: "budget", label: loc(
        `Бюджет ${usd(p.budgetPerYear)}, стоимость от ${usd(yearCostMin)}`,
        `Byudjet ${usd(p.budgetPerYear)}, narx ${usd(yearCostMin)} dan`,
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

  // ── набор и сроки подачи.
  // Мало знать, что у вуза есть набор на весну: если окно подачи уже
  // закрылось, предлагать вуз семье — значит обещать то, чего не будет.
  const windows = windowsFor(university, program.degreeLevel);
  const forIntake = windows.filter((w) => w.intake === p.intake);
  if (!windows.length) {
    score -= 5;
    reasons.push({ key: "intake", label: loc(
      "Сроки подачи не сверены — уточнить на сайте вуза",
      "Topshirish muddatlari tekshirilmagan — sayt orqali aniqlang",
    ), level: "warn" });
  } else if (!forIntake.length) {
    score -= 14;
    reasons.push({ key: "intake", label: loc(`Нет набора на ${p.intake}`, `${p.intake} uchun qabul yo‘q`), level: "warn" });
  } else {
    const ahead = forIntake
      .filter((w) => w.closes >= TODAY_ISO)
      .sort((a, b) => a.closes.localeCompare(b.closes))[0];
    if (!ahead) {
      const last = forIntake.map((w) => w.closes).sort().at(-1)!;
      score -= 30;
      blocked = true;
      reasons.push({ key: "intake", label: loc(
        `Приём на ${p.intake} закрылся ${shortDate(last, "ru")}`,
        `${p.intake} qabuli ${shortDate(last, "uz")} yopilgan`,
      ), level: "block" });
    } else {
      const left = daysUntil(ahead.closes);
      const round = ahead.round ? ` (${ahead.round})` : "";
      reasons.push({ key: "intake", label: loc(
        left <= 14
          ? `Подача до ${shortDate(ahead.closes, "ru")}${round} — осталось ${left} дн.`
          : `Подача до ${shortDate(ahead.closes, "ru")}${round}`,
        left <= 14
          ? `Topshirish ${shortDate(ahead.closes, "uz")}${round} gacha — ${left} kun qoldi`
          : `Topshirish ${shortDate(ahead.closes, "uz")}${round} gacha`,
      ), level: left <= 14 ? "warn" : "ok" });
      if (left <= 14) score -= 4;
    }
  }

  // ── грант
  if (p.needsScholarship) {
    if (university.scholarshipMax === null) {
      score -= 6;
      reasons.push({ key: "scholarship", label: loc(
        "Скидки вуза не сверены — уточнить",
        "Universitet chegirmalari tekshirilmagan — aniqlang",
      ), level: "warn" });
    } else if (university.scholarshipMax >= 50) {
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

  // ── срок после выпуска: корейские вузы режут по нему жёстко
  const limit = university.requirements.graduationWithinYears;
  if (limit !== null) {
    const sinceGraduation = TODAY.getFullYear() - p.graduationYear;
    if (sinceGraduation > limit) {
      score -= 30;
      blocked = true;
      reasons.push({
        key: "graduation",
        label: loc(
          `Выпуск ${p.graduationYear}: прошло ${sinceGraduation} лет, вуз принимает до ${limit}`,
          `Bitirgan ${p.graduationYear}: ${sinceGraduation} yil o‘tgan, universitet ${limit} yilgacha qabul qiladi`,
        ),
        level: "block",
      });
    } else {
      reasons.push({
        key: "graduation",
        label: loc(
          `Выпуск ${p.graduationYear} — в пределах ${limit} лет`,
          `Bitirgan ${p.graduationYear} — ${limit} yil ichida`,
        ),
        level: "ok",
      });
    }
  }

  // ── деньги на счёте для визы.
  // Сумма — правило визы, а не требование вуза: D-2 для степени, D-4 для
  // языковых курсов, и для столичного региона она выше, чем для провинции.
  const visa = visaFor(program.degreeLevel);
  const fundsKrw = visaFundsKrw(university.capitalArea, visa);
  const fundsUsd = visaFundsUsd(university.capitalArea, visa);
  const fundsLabel = `${(fundsKrw / 1_000_000).toLocaleString("ru-RU")} млн KRW (≈ ${usd(fundsUsd)})`;
  const fundsLabelUz = `${(fundsKrw / 1_000_000).toLocaleString("ru-RU")} mln KRW (≈ ${usd(fundsUsd)})`;
  if (fundsUsd > p.budgetPerYear) {
    score -= 10;
    reasons.push({
      key: "bank",
      label: loc(
        `Виза ${visa}: на счёте ${fundsLabel} не меньше ${VISA_FUNDS_HOLD_DAYS} дней — больше годового бюджета`,
        `${visa} viza: hisobda ${fundsLabelUz} kamida ${VISA_FUNDS_HOLD_DAYS} kun — yillik byudjetdan ko‘p`,
      ),
      level: "warn",
    });
  } else {
    reasons.push({
      key: "bank",
      label: loc(
        `Виза ${visa}: на счёте ${fundsLabel} не меньше ${VISA_FUNDS_HOLD_DAYS} дней`,
        `${visa} viza: hisobda ${fundsLabelUz} kamida ${VISA_FUNDS_HOLD_DAYS} kun`,
      ),
      level: "ok",
    });
  }

  // ── статус вуза в IEQAS: от него зависит, насколько просто дадут визу
  if (university.ieqas === "restricted") {
    score -= 20;
    reasons.push({ key: "visa", label: loc("Вуз в списке с ограничениями по визе", "Universitet viza cheklovlari ro‘yxatida"), level: "block" });
    blocked = true;
  } else if (university.ieqas === "excellent") {
    reasons.push({ key: "visa", label: loc("IEQAS: «отличный» вуз — виза проще", "IEQAS: «a’lo» universitet — viza osonroq"), level: "ok" });
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

/**
 * Подбор по всем вузам.
 * Программы другого уровня обучения отбрасываются до скоринга: бакалавриат
 * не «не подходит» магистру — он просто не про него, и в выдаче ему не место.
 */
export function matchStudent(
  student: Student,
  universities: University[],
): MatchResult[] {
  return universities
    .flatMap((u) =>
      u.programs
        .filter((p) => p.degreeLevel === student.profile.degreeLevel)
        .map((p) => matchProgram(student, u, p)),
    )
    .sort((a, b) => b.score - a.score);
}
