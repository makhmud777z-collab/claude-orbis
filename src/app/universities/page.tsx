import { ExportButton } from "@/components/ExportButton";
import { moduleGate } from "@/components/guard";
import { CatalogExplorer, type Filters } from "@/components/CatalogExplorer";
import { SectionFilter } from "@/components/SectionFilter";
import { Banner, Crumbs, PageHeader } from "@/components/ui";
import { dataStatusView } from "@/lib/catalog";
import { nextDeadline, tuitionRange, UNIVERSITIES } from "@/lib/data/universities";
import { readFilter, readQuery } from "@/lib/filters";
import { translator } from "@/lib/i18n";
import { CITY_LABEL, IEQAS_LABEL, ieqasKey, OWNERSHIP_LABEL, ref } from "@/lib/labels";
import { allow } from "@/lib/rbac";
import { simplePresets, universityFields } from "@/lib/section-filters";
import { S } from "@/lib/strings";
import { scopedContacts } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { readShortlist } from "@/lib/shortlist.server";
import type { DegreeLevel, Ownership } from "@/lib/types";

export default async function UniversitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const t = translator(session.locale);
  const gate = moduleGate(session, "universities", t(S.nav.universities));
  if (gate) return gate;

  const fields_ = universityFields(t);
  const values = readFilter(params);
  const query = readQuery(params);
  const list = (key: string) => (values[key] ?? "").split(",").filter(Boolean);
  const extras = list("extras");
  const num = (key: string) => (values[key] ? Number(values[key]) : ("all" as const));

  // Условия из адреса переводим в форму, понятную каталогу: у него свой
  // словарь критериев, завязанный на профиль студента.
  const urlFilters: Filters = {
    query,
    cities: list("city"),
    ownership: list("ownership") as Ownership[],
    fields: list("fields"),
    degree: (values.degree as DegreeLevel) || "all",
    topik: num("topik"),
    ielts: num("ielts"),
    budget: values.tuitionTo ? Number(values.tuitionTo) : "all",
    intake: values.intake || "all",
    dorm: extras.includes("dorm"),
    scholarship: extras.includes("grant"),
    languageCenter: false,
    certifiedOnly: extras.includes("certified"),
    englishTaught: extras.includes("english"),
  };

  const cities = [...new Set(UNIVERSITIES.map((u) => u.city))].sort();
  const fields = [...new Set(UNIVERSITIES.flatMap((u) => u.fields))].sort();
  const intakes = [...new Set(UNIVERSITIES.flatMap((u) => u.intakes))].sort();

  const shortlist = await readShortlist();
  const students = scopedContacts(session)
    .filter((s) => s.status !== "lost")
    .map((s) => ({ id: s.id, fullName: s.fullName, profile: s.profile }));

  return (
    <>
      <Crumbs back="/" backLabel={t(S.nav.dashboard)} current={t(S.universities.title)} />
      <PageHeader
        title={t(S.universities.title)}
        meta={
          <>
            <span>
              {t(S.universities.country)} · {UNIVERSITIES.length}{" "}
              {t(S.universities.universities)}
            </span>
            <span className="text-ink-faint">·</span>
            <span>
              {UNIVERSITIES.reduce((n, u) => n + u.programs.length, 0)}{" "}
              {t(S.universities.programs)}
            </span>
          </>
        }
        actions={
          <ExportButton
            locale={session.locale}
            label={t(S.universities.exportCatalog)}
            filename="orbis-vuzy"
            headers={[
              t(S.universities.colName), "한국어", t(S.students.colCity), t(S.universities.ownership),
              t(S.universities.colRank), "IEQAS", "TOPIK", "IELTS",
              `${t(S.universities.colTuition)}, USD`, t(S.shortlist.deadline),
              t(S.universities.status), t(S.universities.website),
            ]}
            rows={UNIVERSITIES.map((u) => {
              const range = tuitionRange(u);
              const next = nextDeadline(u);
              return [
                u.name,
                u.nameKo,
                t(ref(CITY_LABEL, u.city)),
                t(OWNERSHIP_LABEL[u.ownership]),
                u.qsRank ?? "",
                t(IEQAS_LABEL[ieqasKey(u.ieqas)]),
                u.requirements.topikMin,
                u.requirements.ieltsMin ?? "",
                range ? (range.min === range.max ? range.max : `${range.min}–${range.max}`) : "",
                next ? next.deadline : "",
                dataStatusView(u, t).label,
                u.website,
              ];
            })}
          />
        }
      />

      <Banner tone="neutral">{t(S.universities.draftBanner)}</Banner>

      <SectionFilter
        scope="universities"
        fields={fields_}
        presets={simplePresets()}
        locale={session.locale}
        userId={session.user.id}
        total={UNIVERSITIES.length}
        shown={UNIVERSITIES.length}
      />

      <CatalogExplorer
        universities={UNIVERSITIES}
        students={students}
        cities={cities}
        fields={fields}
        intakes={intakes}
        locale={session.locale}
        usdRate={session.tenant.usdRate}
        shortlist={shortlist}
        urlFilters={urlFilters}
      />
    </>
  );
}
