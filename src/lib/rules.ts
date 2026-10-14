import type { DegreeLevel, SourceRef } from "./types";

/**
 * Правила, по которым работает агентство, — в одном месте.
 *
 * Раньше они были размазаны по данным: у каждого вуза своя «справка из
 * банка на $20 000», хотя это не требование вуза, а правило визы, и
 * зависит оно не от вуза, а от того, в каком регионе он стоит, и от типа
 * визы. Здесь каждое правило записано один раз, с источником и датой
 * сверки, и вуз получает свою цифру из правила, а не хранит копию.
 *
 * Официальные сайты (hikorea.go.kr, studyinkorea.go.kr, посольство в
 * Ташкенте) при сверке были недоступны, поэтому цифры сведены из
 * университетских страниц, прессы и справочников. Финальное слово — за
 * посольством Кореи: агентство подтверждает сумму перед подачей.
 */

export const RULES_CHECKED_AT = "2026-10-14";

/* ── курс ─────────────────────────────────────────────────────── */

/**
 * Вон за доллар. Вузы публикуют цены в вонах, семьи считают бюджет в
 * долларах — пересчёт идёт по одному курсу на весь каталог, а не «как
 * получилось» в каждой карточке.
 */
export const KRW_PER_USD = 1340;
export const KRW_RATE_DATE = "2026-10-14";
export const KRW_RATE_SOURCES: SourceRef[] = [
  { label: "TokenPost: закрытие USD/KRW 1 338.3 (14.10.2026)", url: "https://tokenpost.com/news/investing/31782", kind: "press" },
  { label: "Pluang: 1 USD = 1 340.05 KRW (14.10.2026)", url: "https://pluang.com/en/tools/currency-converter/usd-krw", kind: "guide" },
];

export const krwToUsd = (krw: number) => Math.round(krw / KRW_PER_USD);

/* ── регион ───────────────────────────────────────────────────── */

/**
 * Столичный регион — Сеул, Инчхон и провинция Кёнгидо. Визовые суммы для
 * них выше, чем для остальной страны.
 */
export const CAPITAL_AREA_REGIONS = ["Столичный регион", "Кёнгидо"];
export const isCapitalArea = (region: string) => CAPITAL_AREA_REGIONS.includes(region);

/* ── виза ─────────────────────────────────────────────────────── */

export type StudentVisa = "D-2" | "D-4";

/** D-4 — языковые курсы, D-2 — всё, что даёт степень. */
export const visaFor = (level: DegreeLevel): StudentVisa => (level === "language" ? "D-4" : "D-2");

/**
 * Сколько денег должно лежать на счёте для студенческой визы.
 *
 * D-2: около 20 млн вон для вузов столичного региона и около 16 млн для
 * остальных — на этом сходятся все найденные источники. «$20 000», которые
 * встречаются у агентств, — округление с запасом, а не правило.
 *
 * D-4: в гайдах 2026 года 10 млн вон для столичного региона и 8 млн для
 * остальных; встречается и «$10 000». Расхождение здесь больше, поэтому
 * сумму для языковых курсов агентство подтверждает в посольстве.
 */
export const VISA_FUNDS_KRW: Record<StudentVisa, { capital: number; regions: number }> = {
  "D-2": { capital: 20_000_000, regions: 16_000_000 },
  "D-4": { capital: 10_000_000, regions: 8_000_000 },
};

/** Сколько дней деньги должны пролежать на счёте до подачи (чаще всего — 28 дней или месяц). */
export const VISA_FUNDS_HOLD_DAYS = 28;

export function visaFundsKrw(capitalArea: boolean, visa: StudentVisa): number {
  const rule = VISA_FUNDS_KRW[visa];
  return capitalArea ? rule.capital : rule.regions;
}

export const visaFundsUsd = (capitalArea: boolean, visa: StudentVisa) =>
  krwToUsd(visaFundsKrw(capitalArea, visa));

export const VISA_SOURCES: SourceRef[] = [
  { label: "KoreaAdmit: сколько денег нужно для студенческой визы (2027)", url: "https://koreaadmit.com/guides/financial-proof-korea-student-visa", kind: "guide" },
  { label: "Seoul Start: D-2 visa guide 2026", url: "https://seoulstart.com/guides/d-2-visa-guide", kind: "guide" },
  { label: "Hani Seoul: D-2 и D-4 — требования 2026", url: "https://www.haniseoul.com/blogs/korea-d2-d4-student-visa-guide", kind: "guide" },
  { label: "Hani Seoul: виза D-4 (2026)", url: "https://www.haniseoul.com/blogs/south-korea-d4-language-trainee-visa", kind: "guide" },
  { label: "Посольство РК в Сингапуре: D-2 (Certificate of Admission, подача не раньше чем за 3 месяца)", url: "https://overseas.mofa.go.kr/sg-en/brd/m_2444/view.do?seq=761428&page=2", kind: "official" },
];

/* ── документы ────────────────────────────────────────────────── */

/**
 * Апостиль. Узбекистан присоединился к Гаагской конвенции 25 июля 2011
 * года, для него она действует с 15 апреля 2012 года: аттестат и диплом
 * апостилируются в Узбекистане, консульская легализация не нужна.
 */
export const APOSTILLE_RULE = {
  uzbekistanInForceSince: "2012-04-15",
  source: {
    label: "HCCH: Узбекистан присоединился к Апостильной конвенции",
    url: "https://www.hcch.net/en/news-archive/details/?varevent=229",
    kind: "official",
  } satisfies SourceRef,
};

/**
 * Справка о туберкулёзе. Для долгосрочных виз (в том числе D-2 и D-4)
 * гражданам ряда стран нужна справка из клиники, назначенной посольством
 * Кореи. Узбекистан и Кыргызстан — в официальном списке визового центра;
 * Казахстан — в более поздних списках вузов. Список меняется, поэтому
 * перед подачей его сверяют с посольством.
 */
export const TB_RULE = {
  countries: ["Узбекистан", "Кыргызстан", "Казахстан"],
  source: {
    label: "VFS Global Korea: обязательная справка о туберкулёзе для долгосрочных виз",
    url: "https://www.vfsglobal.com/korea/india/pdf/obligatory_Enforcement_080416.pdf",
    kind: "official",
  } satisfies SourceRef,
};

/* ── IEQAS ────────────────────────────────────────────────────── */

/**
 * Цикл оценки IEQAS 2025: результаты объявлены 12 февраля 2026 года,
 * действуют до февраля 2027. Сертифицирован 181 вуз и 123 языковых
 * института, из них 39 — «отличные».
 */
export const IEQAS_CYCLE = {
  label: "IEQAS, цикл 2025 (до февраля 2027)",
  announced: "2026-02-12",
  validUntil: "2027-02-28",
  sources: [
    { label: "UNIST: «отличный» вуз по итогам IEQAS 2025", url: "https://news.unist.ac.kr/unist-named-excellent-certified-university-in-2025-ieqas-evaluation/", kind: "official" },
    { label: "Ajou University: «отличный» вуз IEQAS", url: "https://www.ajou.ac.kr/en/ajou/news.do?mode=view&articleNo=364149", kind: "official" },
    { label: "Asia Business Daily: Keimyung — «отличный» вуз третий год подряд", url: "https://view.asiae.co.kr/en/article/2026021217150715151", kind: "press" },
    { label: "Apply Uni: «отличные» вузы IEQAS", url: "https://applyuni.global/excellent-ieqas-universities-in-korea/", kind: "guide" },
  ] satisfies SourceRef[],
};
