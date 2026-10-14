import type { Formatters } from "./format";
import type { Translate } from "./i18n";
import { S } from "./strings";
import type { Program, SourceRef, University } from "./types";

/**
 * Как показывать цену программы — одно правило на каталог, карточку вуза
 * и сравнение.
 *
 * Главная цифра — в вонах и за тот период, за который её назвал вуз:
 * так её можно сверить с guideline. Под ней — год в долларах: так семья
 * сравнивает с бюджетом.
 */
export function programPrice(
  p: Program,
  f: Formatters,
  t: Translate,
): { krw: string; usd: string } | null {
  if (!p.tuitionKrw || p.tuitionPerYear === null) return null;
  const period =
    p.tuitionPeriod === "semester"
      ? t(S.universities.perSemester)
      : p.tuitionPeriod === "term"
        ? t(S.universities.perTerm)
        : t(S.universities.perYearKrw);
  return {
    krw: `${f.krwRange(p.tuitionKrw, { compact: true })} ${period}`,
    usd: `${f.usdRange(p.tuitionPerYearMin ?? p.tuitionPerYear, p.tuitionPerYear)} ${t(S.common.perYear)}`,
  };
}

/** Подпись статуса сверки и её цвет. */
export function dataStatusView(u: University, t: Translate) {
  if (u.dataStatus === "verified")
    return { label: t(S.universities.verified), color: "var(--color-status-deal)" };
  if (u.dataStatus === "checked")
    return { label: t(S.universities.checked), color: "var(--color-status-open)" };
  return { label: t(S.universities.draft), color: "var(--color-status-progress)" };
}

export const sourceKindLabel = (kind: SourceRef["kind"], t: Translate) =>
  t(
    kind === "official"
      ? S.universities.sourceOfficial
      : kind === "press"
        ? S.universities.sourcePress
        : S.universities.sourceGuide,
  );
