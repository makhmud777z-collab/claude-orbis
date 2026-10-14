/* ── подбор вуза: перенесён из src/lib/matching.ts без изменений ── */
const MONTHS_RU = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const MONTHS_UZ = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const dayMonth = (iso, lang) => { const [, m, d] = iso.split("-").map(Number); return `${d} ${(lang === "ru" ? MONTHS_RU : MONTHS_UZ)[m - 1]}`; };
const RULES = () => D.rules;
const visaFor = (level) => (level === "language" ? "D-4" : "D-2");
const visaFundsKrw = (capitalArea, visa) => RULES().visaFundsKrw[visa][capitalArea ? "capital" : "regions"];
const krwToUsd = (krw) => Math.round(krw / RULES().krwPerUsd);
/** Окна вуза для программы этого уровня: магистерское окно бакалавру не подходит. */
const windowsFor = (u, level) => u.windows.filter((w) => w.level === null || w.level === level);

function matchProgram(student, university, program) {
  const p = student.profile;
  const reasons = [];
  let score = 100;
  let blocked = false;
  const add = (key, label, level) => reasons.push({ key, label, level });

  const extras =
    (p.needsDorm && university.dormCostPerYear ? university.dormCostPerYear : 0) +
    (university.admissionFee ?? 0);
  const yearCost = program.tuitionPerYear === null ? null : program.tuitionPerYear + extras;
  const yearCostMin = program.tuitionPerYearMin === null ? yearCost : program.tuitionPerYearMin + extras;

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

  // Срок действия TOPIK — два года: истёкший вуз не примет.
  if (program.topikMin > 0 && p.topik >= program.topikMin && p.topikExpiresAt) {
    const upcoming = windowsFor(university, program.degreeLevel)
      .filter((w) => w.intake === p.intake && w.closes >= TODAY_ISO)
      .sort((a, b) => a.closes.localeCompare(b.closes))[0];
    if (p.topikExpiresAt < TODAY_ISO) {
      score -= 40; blocked = true;
      add("topik_valid", loc(`TOPIK истёк ${dayMonth(p.topikExpiresAt, "ru")} — нужен новый экзамен`, `TOPIK muddati ${dayMonth(p.topikExpiresAt, "uz")} tugagan — yangi imtihon kerak`), "block");
    } else if (upcoming && p.topikExpiresAt < upcoming.closes) {
      score -= 15;
      add("topik_valid", loc(`TOPIK истекает ${dayMonth(p.topikExpiresAt, "ru")} — раньше конца подачи`, `TOPIK ${dayMonth(p.topikExpiresAt, "uz")} tugaydi — topshirish tugashidan oldin`), "warn");
    }
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

  const usd = (n) => `$${nf.format(n)}`;
  if (yearCost === null || yearCostMin === null) {
    score -= 8;
    add("budget", loc("Вуз не публикует стоимость — уточнить до подачи", "Universitet narxni e’lon qilmaydi — topshirishdan oldin aniqlang"), "warn");
  } else if (yearCost <= p.budgetPerYear) {
    add("budget", loc(
      yearCostMin < yearCost ? `Укладывается в бюджет: ${usd(yearCostMin)}–${usd(yearCost)} в год` : `Укладывается в бюджет: ${usd(yearCost)} в год`,
      yearCostMin < yearCost ? `Byudjetga sig‘adi: yiliga ${usd(yearCostMin)}–${usd(yearCost)}` : `Byudjetga sig‘adi: yiliga ${usd(yearCost)}`), "ok");
  } else if (yearCostMin <= p.budgetPerYear) {
    score -= 10;
    add("budget", loc(`${usd(yearCostMin)}–${usd(yearCost)} в год: в бюджет входят не все специальности`, `Yiliga ${usd(yearCostMin)}–${usd(yearCost)}: hamma yo‘nalish byudjetga sig‘maydi`), "warn");
  } else if (yearCostMin <= p.budgetPerYear * 1.15) {
    score -= 15;
    add("budget", loc(`Дороже бюджета минимум на ${usd(yearCostMin - p.budgetPerYear)}`, `Byudjetdan kamida ${usd(yearCostMin - p.budgetPerYear)} qimmat`), "warn");
  } else {
    score -= 35; blocked = true;
    add("budget", loc(`Бюджет ${usd(p.budgetPerYear)}, стоимость от ${usd(yearCostMin)}`, `Byudjet ${usd(p.budgetPerYear)}, narx ${usd(yearCostMin)} dan`), "block");
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

  // Набор и сроки: если окно подачи уже закрылось, вуз не предлагается.
  const windows = windowsFor(university, program.degreeLevel);
  const forIntake = windows.filter((w) => w.intake === p.intake);
  if (!windows.length) {
    score -= 5;
    add("intake", loc("Сроки подачи не сверены — уточнить на сайте вуза", "Topshirish muddatlari tekshirilmagan — sayt orqali aniqlang"), "warn");
  } else if (!forIntake.length) {
    score -= 14;
    add("intake", loc(`Нет набора на ${p.intake}`, `${p.intake} uchun qabul yo‘q`), "warn");
  } else {
    const ahead = forIntake.filter((w) => w.closes >= TODAY_ISO).sort((a, b) => a.closes.localeCompare(b.closes))[0];
    if (!ahead) {
      const last = forIntake.map((w) => w.closes).sort().at(-1);
      score -= 30; blocked = true;
      add("intake", loc(`Приём на ${p.intake} закрылся ${dayMonth(last, "ru")}`, `${p.intake} qabuli ${dayMonth(last, "uz")} yopilgan`), "block");
    } else {
      const left = daysUntil(ahead.closes);
      const round = ahead.round ? ` (${ahead.round})` : "";
      add("intake", loc(
        left <= 14 ? `Подача до ${dayMonth(ahead.closes, "ru")}${round} — осталось ${left} дн.` : `Подача до ${dayMonth(ahead.closes, "ru")}${round}`,
        left <= 14 ? `Topshirish ${dayMonth(ahead.closes, "uz")}${round} gacha — ${left} kun qoldi` : `Topshirish ${dayMonth(ahead.closes, "uz")}${round} gacha`),
        left <= 14 ? "warn" : "ok");
      if (left <= 14) score -= 4;
    }
  }

  if (p.needsScholarship) {
    if (university.scholarshipMax === null) {
      score -= 6;
      add("scholarship", loc("Скидки вуза не сверены — уточнить", "Universitet chegirmalari tekshirilmagan — aniqlang"), "warn");
    } else if (university.scholarshipMax >= 50) {
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

  // Деньги на счёте — правило визы: D-2 или D-4, столичный регион или нет.
  const visa = visaFor(program.degreeLevel);
  const fundsKrw = visaFundsKrw(university.capitalArea, visa);
  const fundsUsd = krwToUsd(fundsKrw);
  const funds = `${nf.format(fundsKrw / 1_000_000)} млн KRW (≈ ${usd(fundsUsd)})`;
  const fundsUz = `${nf.format(fundsKrw / 1_000_000)} mln KRW (≈ ${usd(fundsUsd)})`;
  if (fundsUsd > p.budgetPerYear) {
    score -= 10;
    add("bank", loc(`Виза ${visa}: на счёте ${funds} не меньше ${RULES().holdDays} дней — больше годового бюджета`, `${visa} viza: hisobda ${fundsUz} kamida ${RULES().holdDays} kun — yillik byudjetdan ko‘p`), "warn");
  } else {
    add("bank", loc(`Виза ${visa}: на счёте ${funds} не меньше ${RULES().holdDays} дней`, `${visa} viza: hisobda ${fundsUz} kamida ${RULES().holdDays} kun`), "ok");
  }

  if (university.ieqas === "restricted") {
    score -= 20; blocked = true;
    add("visa", loc("Вуз в списке с ограничениями по визе", "Universitet viza cheklovlari ro‘yxatida"), "block");
  } else if (university.ieqas === "excellent") {
    add("visa", loc("IEQAS: «отличный» вуз — виза проще", "IEQAS: «a’lo» universitet — viza osonroq"), "ok");
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
