import { TODAY_ISO } from "../format";
import { isCapitalArea, krwToUsd, visaFundsUsd } from "../rules";
import type { ApplicationWindow, DegreeLevel, Program, SourceRef, University } from "../types";

/**
 * Каталог вузов Кореи.
 *
 * Здесь только настоящие вузы и только сверенные факты. Каждая цифра —
 * дата подачи, стоимость, требование TOPIK — взята из источника, который
 * лежит в карточке вуза. Чего не нашлось, того нет: пустое поле честнее
 * правдоподобной выдумки, по которой агентство потом подаст документы.
 *
 * Сверка — 14 октября 2026 года, по открытым источникам: прессе (Korea
 * JoongAng Daily, K-Study Times), документам вузов, которые нашлись
 * поиском, и справочникам. Официальные сайты вузов из среды сверки были
 * недоступны, поэтому статус записей — «сверено по открытым источникам»,
 * а не «проверено по guideline»: перед подачей дату и сумму подтверждают
 * на сайте вуза.
 *
 * Деньги — в вонах и за тот период, за который их называет вуз. Доллары
 * считаются по курсу каталога (rules.ts).
 */

export const FIELDS = [
  "Медицина",
  "Инженерия",
  "IT и Computer Science",
  "Бизнес и менеджмент",
  "Дизайн и искусство",
  "Гуманитарные науки",
  "Естественные науки",
  "Языковая программа",
] as const;

export const CITIES = [
  "Сеул",
  "Инчхон",
  "Сувон",
  "Соннам",
  "Тэджон",
  "Пусан",
  "Тэгу",
  "Кванджу",
  "Ульсан",
  "Пхохан",
] as const;

/* ── сборка записей ───────────────────────────────────────────── */

type Krw = number | [number, number] | null;

interface ProgramSpec {
  id: string;
  name: string;
  field: string;
  level?: DegreeLevel;
  lang?: Program["language"];
  topik: number;
  ielts?: number | null;
  krw: Krw;
  /** по умолчанию — семестр; языковые курсы — четверть (10 недель) */
  period?: Program["tuitionPeriod"];
}

/** Сколько периодов в учебном году: два семестра или четыре четверти. */
const PERIODS_PER_YEAR: Record<Program["tuitionPeriod"], number> = { semester: 2, term: 4, year: 1 };

function program(spec: ProgramSpec): Program {
  const level = spec.level ?? "bachelor";
  const period = spec.period ?? (level === "language" ? "term" : "semester");
  const range = spec.krw === null ? null : Array.isArray(spec.krw)
    ? { min: spec.krw[0], max: spec.krw[1] }
    : { min: spec.krw, max: spec.krw };
  const perYear = PERIODS_PER_YEAR[period];
  return {
    id: spec.id,
    name: spec.name,
    field: spec.field,
    degreeLevel: level,
    language: spec.lang ?? "ko",
    topikMin: spec.topik,
    ieltsMin: spec.ielts ?? null,
    tuitionKrw: range,
    tuitionPeriod: period,
    tuitionPerYear: range ? krwToUsd(range.max * perYear) : null,
    tuitionPerYearMin: range ? krwToUsd(range.min * perYear) : null,
  };
}

/** Бакалаврские направления с одной вилкой на всех: вуз публикует её общей. */
function majors(
  prefix: string,
  krw: Krw,
  topik: number,
  list: [suffix: string, name: string, field: string, topikOverride?: number][],
  /** за какой период вуз называет цену; обычно — семестр */
  period: Program["tuitionPeriod"] = "semester",
): Program[] {
  return list.map(([suffix, name, field, topikOverride]) =>
    program({ id: `${prefix}_${suffix}`, name, field, topik: topikOverride ?? topik, krw, period }),
  );
}

interface UniversitySpec
  extends Omit<
    University,
    | "capitalArea"
    | "admissionFee"
    | "requirements"
    | "intakes"
    | "intakeDeadlines"
    | "fields"
    | "dormAvailable"
    | "dormCostPerYear"
  > {
  requirements: { topikMin: number; ieltsMin?: number | null; notes?: string[] };
  dormAvailable?: boolean;
}

function university(spec: UniversitySpec): University {
  const capitalArea = isCapitalArea(spec.region);
  const windows = [...spec.windows].sort((a, b) => a.closes.localeCompare(b.closes));
  return {
    ...spec,
    capitalArea,
    dormAvailable: spec.dormAvailable ?? true,
    // Стоимость общежития вузы публикуют отдельно и по корпусам; в найденных
    // источниках сверенной цифры нет — поле остаётся пустым, а не средним.
    dormCostPerYear: null,
    admissionFee: spec.applicationFeeKrw === null ? null : krwToUsd(spec.applicationFeeKrw),
    requirements: {
      topikMin: spec.requirements.topikMin,
      ieltsMin: spec.requirements.ieltsMin ?? null,
      // Формального минимума GPA корейские вузы для иностранцев обычно не
      // публикуют, а срок после выпуска не ограничивают — не выдумываем.
      gpaMin: null,
      bankBalance: visaFundsUsd(capitalArea, "D-2"),
      graduationWithinYears: null,
      notes: spec.requirements.notes ?? [],
    },
    windows,
    intakes: [...new Set(windows.map((w) => w.intake))],
    intakeDeadlines: windows.map((w) => ({ intake: w.intake, deadline: w.closes, round: w.round })),
    fields: [...new Set(spec.programs.map((p) => p.field))],
  };
}

const win = (
  intake: string,
  opens: string | null,
  closes: string,
  results: string | null = null,
  round: string | null = null,
  // Все найденные окна — приём на бакалавриат; у языковых курсов свой
  // поквартальный график, и окно бакалавриата к ним не относится.
  level: ApplicationWindow["level"] = "bachelor",
): ApplicationWindow => ({ intake, round, level, opens, closes, results });

/* ── источники, общие для нескольких вузов ─────────────────────── */

const JOONGANG_SEP: SourceRef = {
  label: "Korea JoongAng Daily: вузы открыли приём на весну 2027 (сентябрь)",
  url: "https://www.koreajoongangdaily.com/korea/korean-universities-open-spring-2027-admissions-for-international-students/12863631",
  kind: "press",
};
const JOONGANG_AUG: SourceRef = {
  label: "Korea JoongAng Daily: приём на весну 2027 (август)",
  url: "https://www.koreajoongangdaily.com/korea/spring-2027-admissions-for-international-students-open-at-korean-universities/12788168",
  kind: "press",
};
const JOONGANG_OCT: SourceRef = {
  label: "Korea JoongAng Daily: ещё вузы открыли приём на весну 2027 (октябрь)",
  url: "https://www.koreajoongangdaily.com/korea/more-korean-universities-open-spring-admissions-for-international-students/12901437",
  kind: "press",
};
const KSTUDY_CALENDAR: SourceRef = {
  label: "K-Study Times: календарь приёма на весну 2027 (KU, SKKU)",
  url: "https://kstudytimes.kr/news/universities/2026/08/spring-2027-international-undergraduate-calendar?lang=en",
  kind: "press",
};
const QS: SourceRef = {
  label: "TopUniversities: лучшие вузы Южной Кореи (QS)",
  url: "https://www.topuniversities.com/university-rankings-articles/world-university-rankings/top-universities-south-korea",
  kind: "guide",
};
const SEOUL_TUITION: SourceRef = {
  label: "Study Abroad Aide: стоимость обучения в вузах Сеула",
  url: "https://studyabroadaide.com/tuition-fees-seoul/",
  kind: "guide",
};
const LANGUAGE_FEES: SourceRef = {
  label: "EpicKor: стоимость языковых курсов в Сеуле (01.10.2026)",
  url: "https://www.epickor.com/blog/494",
  kind: "guide",
};
const IEQAS_EXCELLENT: SourceRef = {
  label: "Apply Uni: «отличные» вузы IEQAS 2025",
  url: "https://applyuni.global/excellent-ieqas-universities-in-korea/",
  kind: "guide",
};

const SPRING = "2027 Весна";
const FALL = "2027 Осень";
const CHECKED = "2026-10-14";

/* ── вузы ─────────────────────────────────────────────────────── */

export const UNIVERSITIES: University[] = [
  /* ── Сеул ── */
  university({
    id: "u_snu",
    name: "Seoul National University",
    nameKo: "서울대학교",
    city: "Сеул",
    region: "Столичный регион",
    ownership: "national",
    founded: 1946,
    website: "https://www.snu.ac.kr",
    qsRank: 38,
    ieqas: null,
    hasLanguageCenter: true,
    applicationFeeKrw: 70_000,
    scholarshipMax: null,
    scholarshipNote: null,
    requirements: {
      topikMin: 3,
      ieltsMin: 6.0,
      notes: [
        "Корейские программы: TOPIK 3+ или 4-й уровень языкового института корейского вуза",
        "Английский путь: TOEFL iBT 80 / IELTS 6.0 / TEPS 269 — но большинство курсов всё равно на корейском",
      ],
    },
    windows: [win(SPRING, "2026-07-06", "2026-07-09")],
    programs: [
      program({ id: "p_snu_hum", name: "Humanities & Social Sciences", field: "Гуманитарные науки", topik: 3, krw: 2_442_000 }),
      program({ id: "p_snu_sci", name: "Natural Sciences", field: "Естественные науки", topik: 3, krw: 2_975_000 }),
      program({ id: "p_snu_eng", name: "Engineering", field: "Инженерия", topik: 3, krw: 2_998_000 }),
      program({ id: "p_snu_cse", name: "Computer Science & Engineering", field: "IT и Computer Science", topik: 3, krw: 2_998_000 }),
      program({ id: "p_snu_lei", name: "Language Education Institute (LEI)", field: "Языковая программа", level: "language", topik: 0, krw: [1_650_000, 1_800_000] }),
    ],
    dataStatus: "checked",
    sources: [
      { label: "SNU: FAQ по приёму — сбор 70 000 KRW", url: "https://en.snu.ac.kr/admission/overview/faq/admission", kind: "official" },
      { label: "SNU LEI: стоимость курса — 1 800 000 утро / 1 650 000 день", url: "https://lei.snu.ac.kr/mobile/en/klec/regular/admission.jsp", kind: "official" },
      { label: "KoreaAdmit: приём в SNU 2027 — 6–9 июля, TOPIK 3, TOEFL 80 / IELTS 6.0", url: "https://koreaadmit.com/guides/seoul-national-university-admissions-international-students", kind: "guide" },
      { label: "KoreaAdmit: SNU — стоимость по направлениям", url: "https://koreaadmit.com/universities/seoul-national-university", kind: "guide" },
      JOONGANG_SEP,
      QS,
    ],
    sourceUrl: "https://en.snu.ac.kr/admission",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_yonsei",
    name: "Yonsei University",
    nameKo: "연세대학교",
    city: "Сеул",
    region: "Столичный регион",
    ownership: "private",
    founded: 1885,
    website: "https://www.yonsei.ac.kr",
    qsRank: 42,
    ieqas: null,
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: 100,
    scholarshipNote: "UIC: стипендия по итогам приёма, от трети до полной стоимости",
    requirements: {
      topikMin: 3,
      ieltsMin: 7.0,
      notes: [
        "Международный трек: TOPIK 3 — до выбора специальности, TOPIK 4 — до выпуска (можно заменить курсом KLI)",
        "Underwood International College — всё на английском, TOPIK не нужен, TOEFL iBT 100 / IELTS 7.0",
        "Языковой институт: сбор за подачу 120 000 KRW",
      ],
    },
    windows: [
      win(SPRING, "2026-08-26", "2026-09-17", null, "UIC", "bachelor"),
      win(SPRING, "2026-09-01", "2026-09-17", "2026-12-04", "Основной", "bachelor"),
      win(SPRING, "2026-10-07", "2026-10-14", null, "Магистратура", "master"),
    ],
    programs: [
      program({ id: "p_yonsei_uic", name: "Underwood International College", field: "Гуманитарные науки", lang: "en", topik: 0, ielts: 7.0, krw: [8_202_000, 8_416_000] }),
      program({ id: "p_yonsei_kor", name: "Korean-track majors (international admission)", field: "Гуманитарные науки", topik: 3, krw: null }),
      program({ id: "p_yonsei_gsis", name: "Graduate School of International Studies", field: "Гуманитарные науки", level: "master", lang: "en", topik: 0, krw: [7_924_000, 11_289_000] }),
      program({ id: "p_yonsei_kli", name: "Korean Language Institute (KLI)", field: "Языковая программа", level: "language", topik: 0, krw: 1_860_000 }),
    ],
    dataStatus: "checked",
    sources: [
      { label: "UIC Yonsei: стоимость — 8 202 000 KRW за семестр", url: "https://uic.yonsei.ac.kr/main/admission.php?mid=m04_03_01", kind: "official" },
      { label: "Yonsei GSIS: guideline осень 2026 — 7 924 000 / 11 289 000 KRW", url: "https://gsis.yonsei.ac.kr/gsis/community/boards1_01.do?mode=download&articleNo=465861&attachNo=206805", kind: "official" },
      { label: "K-Study Times: приём в Yonsei на весну 2027 — 1–17 сентября", url: "https://kstudytimes.kr/news/universities/2026/03/yonsei-university-international-student-admissions-guide", kind: "press" },
      JOONGANG_SEP,
      LANGUAGE_FEES,
      QS,
    ],
    sourceUrl: "https://admission.yonsei.ac.kr",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_korea",
    name: "Korea University",
    nameKo: "고려대학교",
    city: "Сеул",
    region: "Столичный регион",
    ownership: "private",
    founded: 1905,
    website: "https://www.korea.edu",
    qsRank: 52,
    ieqas: "excellent",
    hasLanguageCenter: true,
    applicationFeeKrw: 150_000,
    scholarshipMax: null,
    scholarshipNote: null,
    requirements: {
      topikMin: 3,
      notes: [
        "Начиная с приёма на 2027 год собственного теста по корейскому нет: без TOPIK 3 заявку не принимают",
      ],
    },
    windows: [win(SPRING, "2026-08-03", "2026-08-31", "2026-11-27")],
    programs: [
      ...majors("p_korea", [5_800_000, 7_800_000], 3, [
        ["hum", "Humanities & Social Sciences", "Гуманитарные науки"],
        ["biz", "Business Administration", "Бизнес и менеджмент"],
        ["sci", "Natural Sciences", "Естественные науки"],
        ["eng", "Engineering", "Инженерия"],
        ["cs", "Computer Science & Engineering", "IT и Computer Science"],
      ]),
      program({ id: "p_korea_klc", name: "Korean Language Center (KLC)", field: "Языковая программа", level: "language", topik: 0, krw: [1_690_000, 1_800_000] }),
    ],
    dataStatus: "checked",
    sources: [
      KSTUDY_CALENDAR,
      { label: "StudyU: Korea University — стоимость 2026 и сбор 150 000 KRW", url: "https://www.studyu.org/en/university-korea-university", kind: "guide" },
      { label: "KU News: Korea University — «отличный» вуз IEQAS 2025", url: "https://www.korea.edu/en/1127/subview.do?enc=Zm5jdDF8QEB8JTJGa3VzdG9yeSUyRmVuJTJGYXJ0Y2xWaWV3LmRvJTNGYXJ0Y2xTZXElM0QyODI3MyUyNg%3D%3D", kind: "official" },
      JOONGANG_SEP,
      LANGUAGE_FEES,
      QS,
    ],
    sourceUrl: "https://oia.korea.ac.kr",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_skku",
    name: "Sungkyunkwan University",
    nameKo: "성균관대학교",
    city: "Сеул",
    region: "Столичный регион",
    ownership: "private",
    founded: 1398,
    website: "https://www.skku.edu",
    qsRank: 108,
    ieqas: null,
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: null,
    scholarshipNote: null,
    requirements: {
      topikMin: 3,
      notes: [
        "Гуманитарный кампус — в Сеуле, естественные науки и инженерия — в Сувоне",
      ],
    },
    windows: [
      win(SPRING, "2026-08-12", "2026-08-21", "2026-10-23", "Раунд 1"),
      win(SPRING, "2026-11-04", "2026-11-13", "2027-01-08", "Раунд 2"),
    ],
    programs: [
      ...majors("p_skku", [5_200_000, 8_100_000], 3, [
        ["hum", "Humanities & Social Sciences", "Гуманитарные науки"],
        ["biz", "Business Administration", "Бизнес и менеджмент"],
        ["sci", "Natural Sciences", "Естественные науки"],
        ["eng", "Engineering", "Инженерия"],
        ["cs", "Software / Computer Science", "IT и Computer Science"],
      ]),
    ],
    dataStatus: "checked",
    sources: [
      { label: "SKKU: fact sheet осень 2026 — около 5.2–8.1 млн KRW за семестр", url: "https://www.skku.edu/eng/International/StudySKKU/BulletinBoard.do?mode=download&articleNo=135564&attachNo=112745", kind: "official" },
      KSTUDY_CALENDAR,
      JOONGANG_SEP,
      QS,
    ],
    sourceUrl: "https://www.skku.edu/eng/",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_hanyang",
    name: "Hanyang University",
    nameKo: "한양대학교",
    city: "Сеул",
    region: "Столичный регион",
    ownership: "private",
    founded: 1939,
    website: "https://www.hanyang.ac.kr",
    qsRank: 155,
    ieqas: null,
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: 100,
    scholarshipNote: "TOPIK 5 — 50%, TOPIK 6 — 100% за первый семестр",
    requirements: {
      topikMin: 3,
      notes: [
        "Поступить можно и без TOPIK, но к специальности допускают с TOPIK 4 (или 4-м уровнем языкового института)",
        "Приём на весну 2027 закрылся в начале июля 2026",
      ],
    },
    windows: [],
    programs: majors("p_hanyang", [5_279_000, 7_820_000], 3, [
      ["hum", "Humanities & Social Sciences", "Гуманитарные науки"],
      ["biz", "Business Administration", "Бизнес и менеджмент"],
      ["eng", "Engineering", "Инженерия"],
      ["cs", "Computer Science", "IT и Computer Science"],
    ]),
    dataStatus: "checked",
    sources: [
      { label: "K-Study Times: приём в Hanyang 2026 — стоимость, TOPIK 4 для специальности", url: "https://kstudytimes.kr/news/universities/2026/03/hanyang-university-international-student-application-guide", kind: "press" },
      JOONGANG_SEP,
      QS,
    ],
    sourceUrl: "https://www.hanyang.ac.kr/web/eng",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_khu",
    name: "Kyung Hee University",
    nameKo: "경희대학교",
    city: "Сеул",
    region: "Столичный регион",
    ownership: "private",
    founded: 1949,
    website: "https://www.khu.ac.kr",
    qsRank: 309,
    ieqas: null,
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: 100,
    scholarshipNote: "TOPIK 5 — 50%, TOPIK 6 — 100% за первый семестр",
    requirements: {
      topikMin: 3,
      notes: ["Бизнес — TOPIK 4"],
    },
    windows: [win(SPRING, "2026-10-26", "2026-11-06", "2026-12-24")],
    programs: [
      program({ id: "p_khu_hum", name: "Humanities & Social Sciences", field: "Гуманитарные науки", topik: 3, krw: [9_673_800, 13_186_400], period: "year" }),
      program({ id: "p_khu_biz", name: "Business Administration", field: "Бизнес и менеджмент", topik: 4, krw: [9_673_800, 13_186_400], period: "year" }),
      program({ id: "p_khu_sci", name: "Natural & Life Sciences", field: "Естественные науки", topik: 3, krw: [9_673_800, 13_186_400], period: "year" }),
      program({ id: "p_khu_art", name: "Art & Design", field: "Дизайн и искусство", topik: 3, krw: [9_673_800, 13_186_400], period: "year" }),
    ],
    dataStatus: "checked",
    sources: [
      JOONGANG_OCT,
      SEOUL_TUITION,
      { label: "Study International: стипендии вузов Кореи по TOPIK", url: "https://studyinternational.com/news/scholarships-in-south-korea/", kind: "press" },
      QS,
    ],
    sourceUrl: "https://www.khu.ac.kr/eng/main/index.do",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_ewha",
    name: "Ewha Womans University",
    nameKo: "이화여자대학교",
    city: "Сеул",
    region: "Столичный регион",
    ownership: "private",
    founded: 1886,
    website: "https://www.ewha.ac.kr",
    qsRank: null,
    ieqas: null,
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: null,
    scholarshipNote: null,
    requirements: {
      topikMin: 3,
      notes: [
        "Принимают только девушек",
        "Музыка, изобразительное искусство, спорт и медиадизайн — портфолио до того же срока",
      ],
    },
    windows: [win(SPRING, "2026-09-02", "2026-10-08", "2026-11-13")],
    programs: [
      program({ id: "p_ewha_hum", name: "Humanities & Social Sciences", field: "Гуманитарные науки", topik: 3, krw: [8_140_700, 11_347_600], period: "year" }),
      program({ id: "p_ewha_biz", name: "Business Administration", field: "Бизнес и менеджмент", topik: 3, krw: [8_140_700, 11_347_600], period: "year" }),
      program({ id: "p_ewha_sci", name: "Natural Sciences", field: "Естественные науки", topik: 3, krw: [8_140_700, 11_347_600], period: "year" }),
      program({ id: "p_ewha_art", name: "Art & Design", field: "Дизайн и искусство", topik: 3, krw: [8_140_700, 11_347_600], period: "year" }),
    ],
    dataStatus: "checked",
    sources: [
      { label: "Ewha: Spring 2027 Admissions for International Applicants", url: "https://isa.ewha.ac.kr/sites/oisa/file/ag_english.pdf", kind: "official" },
      JOONGANG_SEP,
      SEOUL_TUITION,
    ],
    sourceUrl: "https://isa.ewha.ac.kr",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_sogang",
    name: "Sogang University",
    nameKo: "서강대학교",
    city: "Сеул",
    region: "Столичный регион",
    ownership: "private",
    founded: 1960,
    website: "https://www.sogang.ac.kr",
    qsRank: null,
    ieqas: null,
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: null,
    scholarshipNote: null,
    requirements: {
      topikMin: 3,
      ieltsMin: 5.5,
      notes: ["Английский трек: IELTS 5.5 / TOEFL iBT 71"],
    },
    windows: [win(SPRING, "2026-10-12", "2026-11-20", "2026-12-24")],
    programs: [
      ...majors("p_sogang", [5_250_000, 6_790_000], 3, [
        ["hum", "Humanities & Social Sciences", "Гуманитарные науки"],
        ["biz", "Business Administration", "Бизнес и менеджмент"],
        ["eng", "Engineering", "Инженерия"],
        ["cs", "Computer Science & Engineering", "IT и Computer Science"],
      ]),
      program({ id: "p_sogang_klec", name: "Korean Language Education Center (KLEC)", field: "Языковая программа", level: "language", topik: 0, krw: [1_690_000, 1_830_000] }),
    ],
    dataStatus: "checked",
    sources: [
      JOONGANG_OCT,
      { label: "StudyU: Sogang — стоимость, TOPIK 3, IELTS 5.5 / TOEFL 71", url: "https://www.studyu.org/en/university-sogang", kind: "guide" },
      { label: "Sogang KLEC: стоимость изменилась с весны 2026", url: "https://klec.sogang.ac.kr/?url=%2Fdep_03%2F3100.php&lang=eng", kind: "official" },
      LANGUAGE_FEES,
    ],
    sourceUrl: "https://www.sogang.ac.kr/en",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_cau",
    name: "Chung-Ang University",
    nameKo: "중앙대학교",
    city: "Сеул",
    region: "Столичный регион",
    ownership: "private",
    founded: 1918,
    website: "https://www.cau.ac.kr",
    qsRank: null,
    ieqas: null,
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: null,
    scholarshipNote: null,
    requirements: { topikMin: 3, notes: ["На весну 2027 — два раунда подачи"] },
    windows: [win(SPRING, "2026-08-31", "2026-09-18", "2026-12-18", "Раунд 1")],
    programs: majors("p_cau", [8_434_000, 11_368_000], 3, [
      ["hum", "Humanities & Social Sciences", "Гуманитарные науки"],
      ["biz", "Business Administration", "Бизнес и менеджмент"],
      ["cs", "Software / Computer Science", "IT и Computer Science"],
      ["art", "Arts", "Дизайн и искусство"],
    ], "year"),
    dataStatus: "checked",
    sources: [
      { label: "Korea JoongAng Daily: Chung-Ang — раунд 1 с 31 августа по 18 сентября", url: "https://www.pressreader.com/korea-republic/korea-joongang-daily/20260909/281852945451624", kind: "press" },
      JOONGANG_SEP,
      SEOUL_TUITION,
    ],
    sourceUrl: "https://www.cau.ac.kr",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_hufs",
    name: "Hankuk University of Foreign Studies",
    nameKo: "한국외국어대학교",
    city: "Сеул",
    region: "Столичный регион",
    ownership: "private",
    founded: 1954,
    website: "https://www.hufs.ac.kr",
    qsRank: null,
    ieqas: null,
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: null,
    scholarshipNote: null,
    requirements: {
      topikMin: 3,
      notes: [
        "Без сертификата можно подать — уровень корейского проверят на собеседовании",
        "Первый семестр дороже на 198 000 KRW",
        "С TOPIK 4 не нужно проходить обязательный интенсив по корейскому",
      ],
    },
    windows: [win(SPRING, "2026-10-19", "2026-11-20", null, "Основной")],
    programs: majors("p_hufs", [4_300_000, 5_390_000], 3, [
      ["hum", "Languages & Humanities", "Гуманитарные науки"],
      ["biz", "Business Administration", "Бизнес и менеджмент"],
      ["intl", "International Studies", "Гуманитарные науки"],
    ]),
    dataStatus: "checked",
    sources: [
      { label: "HUFS: guideline осень 2026", url: "https://international.hufs.ac.kr/sites/international/contents/files/2026fall/HUFS_2026_Fall_Admission_guide(ENG)_update_ver.pdf", kind: "official" },
      { label: "StudyU: HUFS — весна 2027, 19 октября–20 ноября, стоимость", url: "https://www.studyu.org/en/university-hufs", kind: "guide" },
      JOONGANG_SEP,
    ],
    sourceUrl: "https://international.hufs.ac.kr",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_konkuk",
    name: "Konkuk University",
    nameKo: "건국대학교",
    city: "Сеул",
    region: "Столичный регион",
    ownership: "private",
    founded: 1946,
    website: "https://www.konkuk.ac.kr",
    qsRank: null,
    ieqas: null,
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: 50,
    scholarshipNote: "Первый семестр: 50% с TOPIK 4, 40% без него",
    requirements: {
      topikMin: 4,
      notes: [
        "TOPIK 4 — требование факультетов для иностранцев",
        "В гайде первокурсника 2026 — 95 000 KRW за кредит; сумма за семестр зависит от числа кредитов",
      ],
    },
    windows: [],
    programs: majors("p_konkuk", null, 4, [
      ["hum", "Humanities & Social Sciences", "Гуманитарные науки"],
      ["biz", "Business Administration", "Бизнес и менеджмент"],
      ["eng", "Engineering", "Инженерия"],
    ]),
    dataStatus: "checked",
    sources: [
      { label: "Konkuk: гайд первокурсника 2026", url: "https://www.konkuk.ac.kr/sites/konkuk/down/konkuk_guide_freshman_2026_eng.pdf", kind: "official" },
    ],
    sourceUrl: "https://www.konkuk.ac.kr",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_dongguk",
    name: "Dongguk University",
    nameKo: "동국대학교",
    city: "Сеул",
    region: "Столичный регион",
    ownership: "private",
    founded: 1906,
    website: "https://www.dongguk.edu",
    qsRank: null,
    ieqas: null,
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: null,
    scholarshipNote: null,
    requirements: {
      topikMin: 3,
      notes: ["Кроме обучения — регистрационный сбор 120 000–190 000 KRW"],
    },
    windows: [],
    programs: majors("p_dongguk", [4_261_000, 5_559_000], 3, [
      ["hum", "Humanities & Social Sciences", "Гуманитарные науки"],
      ["biz", "Business Administration", "Бизнес и менеджмент"],
      ["eng", "Engineering", "Инженерия"],
      ["art", "Film & Arts", "Дизайн и искусство"],
    ]),
    dataStatus: "checked",
    sources: [
      { label: "Inter-Korea: Dongguk — стоимость и TOPIK 3", url: "https://inter-korea.com/en/dongguk", kind: "guide" },
    ],
    sourceUrl: "https://www.dongguk.edu",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_sejong",
    name: "Sejong University",
    nameKo: "세종대학교",
    city: "Сеул",
    region: "Столичный регион",
    ownership: "private",
    founded: 1940,
    website: "https://www.sejong.ac.kr",
    qsRank: null,
    ieqas: "excellent",
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: null,
    scholarshipNote: null,
    requirements: {
      topikMin: 2,
      notes: [
        "TOPIK зависит от специальности: искусство и спорт — 2, большинство — 3, бизнес, медиа и корейская филология — 4",
        "Global Liberal Studies и School of Entertainment & Content — без требования к корейскому",
        "Стоимость дана по второму семестру 2025, в 2026 может вырасти",
      ],
    },
    windows: [],
    programs: [
      program({ id: "p_sejong_cs", name: "Computer Science & Engineering", field: "IT и Computer Science", topik: 3, krw: [4_670_000, 6_390_000] }),
      program({ id: "p_sejong_biz", name: "Business Administration", field: "Бизнес и менеджмент", topik: 4, krw: [4_670_000, 6_390_000] }),
      program({ id: "p_sejong_art", name: "Arts & Design", field: "Дизайн и искусство", topik: 2, krw: [4_670_000, 6_390_000] }),
      program({ id: "p_sejong_eng", name: "Engineering", field: "Инженерия", topik: 3, krw: [4_670_000, 6_390_000] }),
    ],
    dataStatus: "checked",
    sources: [
      { label: "StudyU: Sejong — стоимость 2026 и TOPIK по специальностям", url: "https://www.studyu.org/en/university-sejong", kind: "guide" },
      IEQAS_EXCELLENT,
    ],
    sourceUrl: "https://www.sejong.ac.kr",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_uos",
    name: "University of Seoul",
    nameKo: "서울시립대학교",
    city: "Сеул",
    region: "Столичный регион",
    ownership: "public",
    founded: 1918,
    website: "https://www.uos.ac.kr",
    qsRank: null,
    ieqas: "excellent",
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: null,
    scholarshipNote: null,
    requirements: {
      topikMin: 3,
      notes: [
        "Перевод — TOPIK 4",
        "К выпуску нужен TOPIK 4; без него — не больше 9 кредитов в семестр",
        "Городской вуз (правительство Сеула)",
      ],
    },
    windows: [],
    programs: majors("p_uos", null, 3, [
      ["hum", "Humanities & Social Sciences", "Гуманитарные науки"],
      ["biz", "Business Administration", "Бизнес и менеджмент"],
      ["eng", "Engineering", "Инженерия"],
    ]),
    dataStatus: "checked",
    sources: [
      { label: "UOS: Admissions for International Students 2025", url: "https://file.uos.ac.kr/upload/klcp/2025%20KLCP%20Admission%20Guideline%20ENG%20(%EC%98%81%EC%96%B4).pdf", kind: "official" },
      IEQAS_EXCELLENT,
    ],
    sourceUrl: "https://www.uos.ac.kr",
    updatedAt: CHECKED,
  }),

  /* ── столичный регион вне Сеула ── */
  university({
    id: "u_inha",
    name: "Inha University",
    nameKo: "인하대학교",
    city: "Инчхон",
    region: "Столичный регион",
    ownership: "private",
    founded: 1954,
    website: "https://www.inha.ac.kr",
    qsRank: null,
    ieqas: null,
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: 50,
    scholarshipNote: "Global 1: TOPIK 4 — 30%, TOPIK 5 — 50% за первый семестр",
    requirements: {
      topikMin: 4,
      notes: [
        "TOPIK 4 (на части треков — 5) или 5-й уровень языкового курса",
        "Inha University in Tashkent — отдельный вуз со своим приёмом",
      ],
    },
    windows: [],
    programs: [
      ...majors("p_inha", null, 4, [
        ["biz", "Business Administration", "Бизнес и менеджмент"],
        ["eng", "Engineering", "Инженерия"],
        ["cs", "Computer Science & Engineering", "IT и Computer Science"],
      ]),
      program({ id: "p_inha_lang", name: "Korean Language Program", field: "Языковая программа", level: "language", topik: 0, krw: null }),
    ],
    dataStatus: "checked",
    sources: [
      { label: "Inha: приём иностранцев на бакалавриат, весна 2026", url: "https://internationalcenter.inha.ac.kr/bbs/internationalcenter/2491/164765/download.do", kind: "official" },
      { label: "Inha: языковая программа", url: "https://ltc.inha.ac.kr/sites/ltc/file/%EC%9D%B8%ED%95%98%EB%8C%80%20%EB%A6%AC%ED%94%8C%EB%A0%9B(%EC%98%81%EC%96%B4).pdf", kind: "official" },
    ],
    sourceUrl: "https://internationalcenter.inha.ac.kr",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_ajou",
    name: "Ajou University",
    nameKo: "아주대학교",
    city: "Сувон",
    region: "Кёнгидо",
    ownership: "private",
    founded: 1973,
    website: "https://www.ajou.ac.kr",
    qsRank: null,
    ieqas: "excellent",
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: null,
    scholarshipNote: null,
    requirements: {
      topikMin: 3,
      ieltsMin: 5.5,
      notes: [
        "Английский трек: IELTS 5.5 / TOEFL iBT 71",
        "Ajou University in Tashkent — отдельный вуз со своим приёмом, зачёт не переносится сам",
      ],
    },
    windows: [],
    programs: [
      program({ id: "p_ajou_biz", name: "Business Administration", field: "Бизнес и менеджмент", topik: 3, krw: [3_748_000, 5_366_000] }),
      program({ id: "p_ajou_hum", name: "Humanities & Social Sciences", field: "Гуманитарные науки", topik: 3, krw: [3_748_000, 5_366_000] }),
      program({ id: "p_ajou_eng", name: "Engineering", field: "Инженерия", topik: 3, krw: [3_748_000, 5_366_000] }),
      program({ id: "p_ajou_cs", name: "Software & Computer Engineering", field: "IT и Computer Science", lang: "ko/en", topik: 3, ielts: 5.5, krw: [3_748_000, 5_366_000] }),
    ],
    dataStatus: "checked",
    sources: [
      { label: "Ajou: «отличный» вуз IEQAS (март 2026 – февраль 2027)", url: "https://www.ajou.ac.kr/en/ajou/news.do?mode=view&articleNo=364149", kind: "official" },
      { label: "StudyU: Ajou — стоимость, TOPIK 3, IELTS 5.5 / TOEFL 71", url: "https://www.studyu.org/en/university-ajou", kind: "guide" },
    ],
    sourceUrl: "https://www.ajou.ac.kr/en/",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_gachon",
    name: "Gachon University",
    nameKo: "가천대학교",
    city: "Соннам",
    region: "Кёнгидо",
    ownership: "private",
    founded: 2012,
    website: "https://www.gachon.ac.kr",
    qsRank: null,
    ieqas: null,
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: null,
    scholarshipNote: null,
    requirements: {
      topikMin: 3,
      notes: [
        "Английские треки: Business Administration и Computer Engineering",
        "Нынешний вуз создан слиянием в 2012 году",
      ],
    },
    windows: [
      win(SPRING, "2026-10-12", "2026-10-23", "2026-11-20", "Раунд 1"),
      win(SPRING, "2026-11-23", "2026-12-04", "2026-12-24", "Раунд 2"),
      win(SPRING, "2026-12-28", "2027-01-04", "2027-01-22", "Раунд 3"),
    ],
    programs: [
      program({ id: "p_gachon_biz", name: "Business Administration (English track)", field: "Бизнес и менеджмент", lang: "en", topik: 0, krw: null }),
      program({ id: "p_gachon_cs", name: "Computer Engineering (English track)", field: "IT и Computer Science", lang: "en", topik: 0, krw: null }),
      program({ id: "p_gachon_hum", name: "Humanities & Social Sciences", field: "Гуманитарные науки", topik: 3, krw: null }),
    ],
    dataStatus: "checked",
    sources: [
      JOONGANG_OCT,
      { label: "Times Higher Education: Gachon — создан в 2012 году слиянием", url: "https://timeshighereducation.com/world-university-rankings/gachon-university", kind: "guide" },
    ],
    sourceUrl: "https://www.gachon.ac.kr",
    updatedAt: CHECKED,
  }),

  /* ── научные институты ── */
  university({
    id: "u_kaist",
    name: "KAIST",
    nameKo: "한국과학기술원",
    city: "Тэджон",
    region: "Тэджон",
    ownership: "national",
    founded: 1971,
    website: "https://www.kaist.ac.kr",
    qsRank: 65,
    ieqas: null,
    hasLanguageCenter: false,
    applicationFeeKrw: null,
    scholarshipMax: 100,
    scholarshipNote: "Бакалавриат: поддержка, покрывающая обучение, — вместе с зачислением",
    requirements: {
      topikMin: 0,
      ieltsMin: 6.5,
      notes: [
        "Обучение на английском, TOPIK не нужен",
        "Сроки бакалавриата в источниках расходятся (ранний трек — до 22 октября 2026, основной — до 14 января 2027): сверить на admissions.kaist.ac.kr",
        "Магистратура: TOEFL iBT 83 / IELTS 6.5; приём на весну 2027 закрылся 1 сентября 2026",
      ],
    },
    windows: [
      win(SPRING, null, "2026-09-01", null, "Магистратура", "master"),
      win(FALL, null, "2027-01-14", null, "Бакалавриат, основной", "bachelor"),
    ],
    programs: [
      program({ id: "p_kaist_ug", name: "Undergraduate (Science & Engineering)", field: "Инженерия", lang: "en", topik: 0, krw: null }),
      program({ id: "p_kaist_grad", name: "Graduate programs (Engineering & Science)", field: "Инженерия", level: "master", lang: "en", topik: 0, ielts: 6.5, krw: null }),
    ],
    dataStatus: "checked",
    sources: [
      { label: "Global Admissions: KAIST — стипендия и требования", url: "https://www.globaladmissions.com/scholarship/kaist-scholarship", kind: "guide" },
      { label: "KAIST Scholarship: сроки 2027", url: "https://kaistscholarship.com/undergraduate-scholarship/", kind: "guide" },
      QS,
    ],
    sourceUrl: "https://admission.kaist.ac.kr",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_postech",
    name: "POSTECH",
    nameKo: "포항공과대학교",
    city: "Пхохан",
    region: "Кёнсан-Пукто",
    ownership: "private",
    founded: 1986,
    website: "https://www.postech.ac.kr",
    qsRank: 106,
    ieqas: null,
    hasLanguageCenter: false,
    applicationFeeKrw: null,
    scholarshipMax: null,
    scholarshipNote: null,
    requirements: {
      topikMin: 0,
      notes: ["Условия приёма иностранцев на бакалавриат в найденных источниках не подтвердились — сверить на сайте вуза"],
    },
    windows: [],
    programs: [],
    dataStatus: "draft",
    sources: [QS],
    sourceUrl: "https://www.postech.ac.kr/eng/",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_unist",
    name: "UNIST",
    nameKo: "울산과학기술원",
    city: "Ульсан",
    region: "Ульсан",
    ownership: "national",
    founded: 2007,
    website: "https://www.unist.ac.kr",
    qsRank: 299,
    ieqas: "excellent",
    hasLanguageCenter: false,
    applicationFeeKrw: null,
    scholarshipMax: null,
    scholarshipNote: null,
    requirements: {
      topikMin: 0,
      notes: ["Условия приёма иностранцев на бакалавриат в найденных источниках не подтвердились — сверить на сайте вуза"],
    },
    windows: [],
    programs: [],
    dataStatus: "draft",
    sources: [
      { label: "UNIST: «отличный» вуз IEQAS 2025", url: "https://news.unist.ac.kr/unist-named-excellent-certified-university-in-2025-ieqas-evaluation/", kind: "official" },
      QS,
    ],
    sourceUrl: "https://www.unist.ac.kr",
    updatedAt: CHECKED,
  }),

  /* ── регионы ── */
  university({
    id: "u_pnu",
    name: "Pusan National University",
    nameKo: "부산대학교",
    city: "Пусан",
    region: "Пусан",
    ownership: "national",
    founded: 1946,
    website: "https://www.pusan.ac.kr",
    qsRank: null,
    ieqas: null,
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: 100,
    scholarshipNote: "TOPIK 4 — освобождение от части оплаты, TOPIK 5 — больше, TOPIK 6 — полностью",
    requirements: {
      topikMin: 3,
      notes: ["На части специальностей — TOPIK 4–5"],
    },
    windows: [win(SPRING, "2026-10-12", "2026-10-23", "2026-12-18")],
    programs: [
      program({ id: "p_pnu_hum", name: "Humanities & Social Sciences", field: "Гуманитарные науки", topik: 3, krw: 2_069_000 }),
      program({ id: "p_pnu_biz", name: "Business Administration", field: "Бизнес и менеджмент", topik: 3, krw: 2_069_000 }),
      program({ id: "p_pnu_sci", name: "Natural Sciences", field: "Естественные науки", topik: 3, krw: 2_705_000 }),
      program({ id: "p_pnu_eng", name: "Engineering", field: "Инженерия", topik: 3, krw: 2_932_000 }),
      program({ id: "p_pnu_art", name: "Arts", field: "Дизайн и искусство", topik: 3, krw: 2_867_000 }),
      program({ id: "p_pnu_lang", name: "Korean Language Program", field: "Языковая программа", level: "language", topik: 0, krw: null }),
    ],
    dataStatus: "checked",
    sources: [
      { label: "K-Study Times: стоимость в трёх национальных вузах Пусана (2026)", url: "https://kstudytimes.kr/news/universities/2026/08/busan-national-universities-cost-guide-2026", kind: "press" },
      JOONGANG_OCT,
      { label: "KoreaAdmit: Pusan National — TOPIK и стипендии", url: "https://koreaadmit.com/universities/pusan-national-university", kind: "guide" },
    ],
    sourceUrl: "https://www.pusan.ac.kr/eng/Main.do",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_knu",
    name: "Kyungpook National University",
    nameKo: "경북대학교",
    city: "Тэгу",
    region: "Тэгу",
    ownership: "national",
    founded: 1946,
    website: "https://www.knu.ac.kr",
    qsRank: null,
    ieqas: "excellent",
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: null,
    scholarshipNote: null,
    requirements: {
      topikMin: 3,
      notes: [
        "Бизнес, психология и ряд гуманитарных и ИТ-специальностей — TOPIK 4, медиа — TOPIK 5",
        "Подавшим по TOPIK-ваучеру — результат экзамена до 21 декабря 2026, 13:00",
        "Оплата обучения — середина января 2027",
      ],
    },
    windows: [win(SPRING, "2026-10-12", "2026-10-30", "2027-01-06")],
    programs: [
      program({ id: "p_knu_hum", name: "Humanities & Social Sciences", field: "Гуманитарные науки", topik: 3, krw: null }),
      program({ id: "p_knu_biz", name: "Business Administration", field: "Бизнес и менеджмент", topik: 4, krw: null }),
      program({ id: "p_knu_eng", name: "Engineering", field: "Инженерия", topik: 3, krw: null }),
      program({ id: "p_knu_cs", name: "Computer Science & Engineering", field: "IT и Computer Science", topik: 4, krw: null }),
    ],
    dataStatus: "checked",
    sources: [
      { label: "K-Study Times: KNU — приём на весну 2027, 12–30 октября", url: "https://kstudytimes.kr/news/universities/2026/09/knu-international-undergraduate-admission-2027", kind: "press" },
      { label: "KNU: guideline осень 2026 (бакалавриат)", url: "https://www.timeshighereducation.com/cms-academic/sites/default/files/institution_downloads/2026-05/[Undergraduate]%202026%20Fall%20Semester%20Admissions%20Guide.pdf", kind: "official" },
      JOONGANG_OCT,
      IEQAS_EXCELLENT,
    ],
    sourceUrl: "https://en.knu.ac.kr/admission/foreign02_inc.htm",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_jnu",
    name: "Chonnam National University",
    nameKo: "전남대학교",
    city: "Кванджу",
    region: "Кванджу",
    ownership: "national",
    founded: 1952,
    website: "https://www.jnu.ac.kr",
    qsRank: null,
    ieqas: null,
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: null,
    scholarshipNote: null,
    requirements: { topikMin: 3, notes: ["Весна 2027 — два раунда подачи"] },
    windows: [
      win(SPRING, null, "2026-10-14", null, "Раунд 1"),
      win(SPRING, "2026-10-15", "2026-10-23", null, "Раунд 2"),
    ],
    programs: majors("p_jnu", null, 3, [
      ["hum", "Humanities & Social Sciences", "Гуманитарные науки"],
      ["eng", "Engineering", "Инженерия"],
      ["biz", "Business Administration", "Бизнес и менеджмент"],
    ]),
    dataStatus: "checked",
    sources: [JOONGANG_OCT],
    sourceUrl: "https://www.jnu.ac.kr",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_keimyung",
    name: "Keimyung University",
    nameKo: "계명대학교",
    city: "Тэгу",
    region: "Тэгу",
    ownership: "private",
    founded: 1954,
    website: "https://www.kmu.ac.kr",
    qsRank: null,
    ieqas: "excellent",
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: 100,
    scholarshipNote: "Для программы 2+2 с ТГУВ: TOPIK 4 — 50%, TOPIK 5 — 70%, TOPIK 6 — 100%",
    requirements: {
      topikMin: 3,
      notes: [
        "Совместная программа 2+2 с Ташкентским университетом востоковедения: два года в Ташкенте, два в Тэгу, два диплома; для перехода нужен TOPIK 3",
        "«Отличный» вуз IEQAS третий год подряд — единственный частный вуз вне столичного региона",
      ],
    },
    windows: [],
    programs: majors("p_keimyung", null, 3, [
      ["hum", "Humanities & Korean Studies", "Гуманитарные науки"],
      ["biz", "Business Administration", "Бизнес и менеджмент"],
      ["art", "Arts & Design", "Дизайн и искусство"],
    ]),
    dataStatus: "checked",
    sources: [
      { label: "ТГУВ: совместная программа с Keimyung на 2025–2026", url: "https://tsuos.uz/en/tdshuda-qoshma-talim-uchun-2025-2026-oquv-yiliga-qabul-davom-etadi/", kind: "official" },
      { label: "Asia Business Daily: Keimyung — «отличный» вуз IEQAS третий год подряд", url: "https://view.asiae.co.kr/en/article/2026021217150715151", kind: "press" },
    ],
    sourceUrl: "https://www.kmu.ac.kr",
    updatedAt: CHECKED,
  }),

  university({
    id: "u_woosong",
    name: "Woosong University",
    nameKo: "우송대학교",
    city: "Тэджон",
    region: "Тэджон",
    ownership: "private",
    founded: 1995,
    website: "https://www.wsu.ac.kr",
    qsRank: null,
    ieqas: null,
    hasLanguageCenter: true,
    applicationFeeKrw: null,
    scholarshipMax: 100,
    scholarshipNote: "TOPIK 3 — 60%, TOPIK 4 — 70%, TOPIK 5+ — 100%; TOPIK 6 и GPA от 3.75 — все 4 года",
    requirements: {
      topikMin: 3,
      notes: [
        "Есть программы полностью на английском",
        "Университет открыт в 1995 году; образовательный фонд — с 1954",
      ],
    },
    windows: [],
    programs: [
      program({ id: "p_woosong_hosp", name: "Global Hospitality", field: "Бизнес и менеджмент", topik: 3, krw: null }),
      program({ id: "p_woosong_eng", name: "Railroad & Engineering", field: "Инженерия", topik: 3, krw: null }),
      program({ id: "p_woosong_biz", name: "Business Administration (English)", field: "Бизнес и менеджмент", lang: "en", topik: 0, krw: null }),
    ],
    dataStatus: "checked",
    sources: [
      { label: "Woosong: guideline бакалавриата, осень 2026", url: "https://namsankoreancourse.com/wp-content/uploads/2026/04/Degree-Program-Woosong-University-Fall-2026-Guideline.pdf", kind: "official" },
      { label: "Wikipedia: Woosong University", url: "https://en.wikipedia.org/wiki/Woosong_University", kind: "guide" },
    ],
    sourceUrl: "https://www.wsu.ac.kr",
    updatedAt: CHECKED,
  }),
];

/* ── справочные функции ───────────────────────────────────────── */

/** Есть ли у вуза программа на английском — отдельный фильтр в каталоге. */
export function hasEnglishTrack(u: University): boolean {
  return u.programs.some((p) => p.language === "en" || p.language === "ko/en");
}

/** Ближайший непрошедший дедлайн подачи. */
export function nextDeadline(u: University, today: string = TODAY_ISO) {
  return (
    u.intakeDeadlines
      .filter((d) => d.deadline >= today)
      .sort((a, b) => a.deadline.localeCompare(b.deadline))[0] ?? null
  );
}

/** Окна вуза для программы этого уровня: магистерское окно бакалавру не подходит. */
export function windowsFor(u: University, level: DegreeLevel) {
  return u.windows.filter((w) => w.level === null || w.level === level);
}

/** Самая низкая и самая высокая цена года среди программ вуза, USD. */
export function tuitionRange(u: University): { min: number; max: number } | null {
  const known = u.programs.filter((p) => p.tuitionPerYear !== null);
  if (!known.length) return null;
  return {
    min: Math.min(...known.map((p) => p.tuitionPerYearMin ?? p.tuitionPerYear!)),
    max: Math.max(...known.map((p) => p.tuitionPerYear!)),
  };
}

export const PROGRAMS = UNIVERSITIES.flatMap((u) =>
  u.programs.map((p) => ({ ...p, universityId: u.id })),
);

export function universityById(id: string) {
  return UNIVERSITIES.find((u) => u.id === id);
}

export function programById(id: string) {
  return PROGRAMS.find((p) => p.id === id);
}
