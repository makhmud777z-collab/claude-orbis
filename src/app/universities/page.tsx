import { moduleGate } from "@/components/guard";
import { CatalogExplorer } from "@/components/CatalogExplorer";
import { IconExport, IconPlus } from "@/components/icons";
import { Banner, PageHeader } from "@/components/ui";
import { UNIVERSITIES } from "@/lib/data/universities";
import { translator } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { S } from "@/lib/strings";
import { scopedStudents } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { readShortlist } from "@/lib/shortlist.server";

export default async function UniversitiesPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const gate = moduleGate(session, "universities", t(S.nav.universities));
  if (gate) return gate;

  const cities = [...new Set(UNIVERSITIES.map((u) => u.city))].sort();
  const fields = [...new Set(UNIVERSITIES.flatMap((u) => u.fields))].sort();
  const intakes = [...new Set(UNIVERSITIES.flatMap((u) => u.intakes))].sort();

  const shortlist = await readShortlist();
  const students = scopedStudents(session)
    .filter((s) => s.status !== "lost")
    .map((s) => ({ id: s.id, fullName: s.fullName, profile: s.profile }));

  return (
    <>
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
          <>
            <button className="btn btn-secondary btn-sm">
              <IconExport size={15} /> {t(S.universities.exportShortlist)}
            </button>
            {can(session.role, "universities", "create") ? (
              <button className="btn btn-primary btn-sm">
                <IconPlus size={15} /> {t(S.universities.add)}
              </button>
            ) : null}
          </>
        }
      />

      <Banner tone="warn">{t(S.universities.draftBanner)}</Banner>

      <CatalogExplorer
        universities={UNIVERSITIES}
        students={students}
        cities={cities}
        fields={fields}
        intakes={intakes}
        locale={session.locale}
        usdRate={session.tenant.usdRate}
        shortlist={shortlist}
      />
    </>
  );
}
