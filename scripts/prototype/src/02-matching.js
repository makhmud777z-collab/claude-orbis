/* ── подбор вуза: перенесён из src/lib/matching.ts без изменений ── */
function matchProgram(student, university, program) {
  const p = student.profile;
  const reasons = [];
  let score = 100;
  let blocked = false;
  const add = (key, label, level) => reasons.push({ key, label, level });

  const yearCost =
    program.tuitionPerYear +
    (p.needsDorm && university.dormCostPerYear ? university.dormCostPerYear : 0) +
    university.admissionFee;

  if (program.degreeLevel !== p.degreeLevel) {
    add("degree", loc("Другой уровень обучения", "Boshqa ta’lim bosqichi"), "block");
    blocked = true;
  }

  const topikGap = program.topikMin - p.topik;
  if (topikGap <= 0) {
    add("topik", program.topikMin === 0
      ? loc("TOPIK не требуется", "TOPIK talab qilinmaydi")
      : loc(`TOPIK ${p.topik} ≥ ${program.topikMin}`, `TOPIK ${p.topik} ≥ ${program.topikMin}`), "ok");
  } else if (topikGap === 1) {
    score -= 22;
    add("topik", loc(`Нужен TOPIK ${program.topikMin}, у студента ${p.topik}`, `TOPIK ${program.topikMin} kerak, talabada ${p.topik}`), "warn");
  } else {
    score -= 45; blocked = true;
    add("topik", loc(`TOPIK ${p.topik} против требуемого ${program.topikMin}`, `TOPIK ${p.topik}, talab ${program.topikMin}`), "block");
  }

  if (program.ieltsMin !== null) {
    if (p.ielts === null) {
      score -= 20;
      add("ielts", loc(`Нужен IELTS ${program.ieltsMin}, сертификата нет`, `IELTS ${program.ieltsMin} kerak, sertifikat yo‘q`), "warn");
    } else if (p.ielts >= program.ieltsMin) {
      add("ielts", loc(`IELTS ${p.ielts} ≥ ${program.ieltsMin}`, `IELTS ${p.ielts} ≥ ${program.ieltsMin}`), "ok");
    } else {
      score -= 25; blocked = true;
      add("ielts", loc(`IELTS ${p.ielts} ниже ${program.ieltsMin}`, `IELTS ${p.ielts}, talab ${program.ieltsMin}`), "block");
    }
  }

  const gpaMin = university.requirements.gpaMin;
  if (gpaMin !== null && p.gpa !== null) {
    if (p.gpa >= gpaMin) add("gpa", loc(`GPA ${p.gpa} ≥ ${gpaMin}`, `GPA ${p.gpa} ≥ ${gpaMin}`), "ok");
    else if (gpaMin - p.gpa <= 0.2) {
      score -= 10;
      add("gpa", loc(`GPA ${p.gpa} чуть ниже ${gpaMin}`, `GPA ${p.gpa} — ${gpaMin} dan sal past`), "warn");
    } else {
      score -= 25; blocked = true;
      add("gpa", loc(`GPA ${p.gpa} ниже требуемого ${gpaMin}`, `GPA ${p.gpa}, talab ${gpaMin}`), "block");
    }
  }

  if (yearCost <= p.budgetPerYear) {
    add("budget", loc(`Укладывается в бюджет: $${nf.format(yearCost)} в год`, `Byudjetga sig‘adi: yiliga $${nf.format(yearCost)}`), "ok");
  } else if (yearCost <= p.budgetPerYear * 1.15) {
    score -= 15;
    add("budget", loc(`Дороже бюджета на $${nf.format(yearCost - p.budgetPerYear)}`, `Byudjetdan $${nf.format(yearCost - p.budgetPerYear)} qimmat`), "warn");
  } else {
    score -= 35; blocked = true;
    add("budget", loc(`Бюджет $${nf.format(p.budgetPerYear)}, стоимость $${nf.format(yearCost)}`, `Byudjet $${nf.format(p.budgetPerYear)}, narx $${nf.format(yearCost)}`), "block");
  }

  if (p.preferredCities.length) {
    if (p.preferredCities.includes(university.city)) {
      add("city", loc(`Город: ${university.city}`, `Shahar: ${university.city}`), "ok");
    } else {
      score -= 12;
      add("city", loc(`${university.city} вместо ${p.preferredCities.join(" / ")}`, `${p.preferredCities.join(" / ")} o‘rniga ${university.city}`), "warn");
    }
  }

  if (p.preferredMajors.length) {
    if (p.preferredMajors.includes(program.field)) {
      add("field", loc(`Направление: ${program.field}`, `Yo‘nalish: ${program.field}`), "ok");
    } else {
      score -= 18;
      add("field", loc(`Другое направление: ${program.field}`, `Boshqa yo‘nalish: ${program.field}`), "warn");
    }
  }

  if (p.preferredOwnership.length && !p.preferredOwnership.includes(university.ownership)) {
    score -= 8;
    add("ownership", loc("Не та форма собственности", "Mulkchilik shakli mos emas"), "warn");
  }

  if (!university.intakes.includes(p.intake)) {
    score -= 14;
    add("intake", loc(`Нет набора на ${p.intake}`, `${p.intake} uchun qabul yo‘q`), "warn");
  }

  if (p.needsScholarship) {
    if (university.scholarshipMax >= 50) {
      add("scholarship", loc(`Грант до ${university.scholarshipMax}%`, `Grant ${university.scholarshipMax}% gacha`), "ok");
    } else {
      score -= 10;
      add("scholarship", loc(`Грант максимум ${university.scholarshipMax}%`, `Grant eng ko‘pi ${university.scholarshipMax}%`), "warn");
    }
  }

  if (p.needsDorm && !university.dormAvailable) {
    score -= 12;
    add("dorm", loc("Нет общежития", "Yotoqxona yo‘q"), "warn");
  }

  const limit = university.requirements.graduationWithinYears;
  if (limit !== null) {
    const since = TODAY.getFullYear() - p.graduationYear;
    if (since > limit) {
      score -= 30; blocked = true;
      add("graduation", loc(
        `Выпуск ${p.graduationYear}: прошло ${since} лет, вуз принимает до ${limit}`,
        `Bitirgan ${p.graduationYear}: ${since} yil o‘tgan, universitet ${limit} yilgacha qabul qiladi`), "block");
    } else {
      add("graduation", loc(`Выпуск ${p.graduationYear} — в пределах ${limit} лет`, `Bitirgan ${p.graduationYear} — ${limit} yil ichida`), "ok");
    }
  }

  const bank = university.requirements.bankBalance;
  if (bank > p.budgetPerYear) {
    score -= 10;
    add("bank", loc(`Нужна справка из банка на $${nf.format(bank)} — больше годового бюджета`, `Bankdan $${nf.format(bank)} ma’lumotnoma kerak — yillik byudjetdan ko‘p`), "warn");
  } else {
    add("bank", loc(`Справка из банка: $${nf.format(bank)}`, `Bankdan ma’lumotnoma: $${nf.format(bank)}`), "ok");
  }

  if (university.visaGrade === "restricted") {
    score -= 20; blocked = true;
    add("visa", loc("Ограничения по студенческой визе", "Talaba vizasida cheklovlar"), "block");
  }

  score = Math.max(0, Math.min(100, score));
  const verdict = blocked ? "not_suitable" : score >= 80 ? "suitable" : "possible";
  return { university, program, score, verdict, reasons, yearCost };
}

function matchStudent(student, universities) {
  return universities
    .flatMap((u) => u.programs.filter((p) => p.degreeLevel === student.profile.degreeLevel).map((p) => matchProgram(student, u, p)))
    .sort((a, b) => b.score - a.score);
}

const VERDICT = {
  suitable: { label: loc("Подходит", "Mos keladi"), dot: "var(--deal)" },
  possible: { label: loc("Возможен", "Ehtimoli bor"), dot: "var(--progress)" },
  not_suitable: { label: loc("Не подходит", "Mos emas"), dot: "var(--risk)" },
};
const levelDot = (level) => (level === "ok" ? "var(--deal)" : level === "warn" ? "var(--progress)" : "var(--risk)");
const hasEnglish = (u) => u.programs.some((p) => p.language === "en" || p.language === "ko/en");
const nextDeadline = (u) =>
  u.intakeDeadlines.filter((d) => d.deadline >= TODAY_ISO).sort((a, b) => a.deadline.localeCompare(b.deadline))[0] ?? null;
