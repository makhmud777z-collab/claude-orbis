import { CatalogExplorer } from "@/components/CatalogExplorer";
import { IconExport, IconPlus } from "@/components/icons";
import { NoAccess } from "@/components/NoAccess";
import { Banner, PageHeader } from "@/components/ui";
import { UNIVERSITIES } from "@/lib/data/universities";
import { can } from "@/lib/rbac";
import { scopedStudents } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function UniversitiesPage() {
  const session = await getSession();
  if (!can(session.role, "universities")) {
    return <NoAccess role={session.role} module="Каталог вузов" />;
  }

  const cities = [...new Set(UNIVERSITIES.map((u) => u.city))].sort();
  const fields = [...new Set(UNIVERSITIES.flatMap((u) => u.fields))].sort();
  const intakes = [...new Set(UNIVERSITIES.flatMap((u) => u.intakes))].sort();
  const drafts = UNIVERSITIES.filter((u) => u.dataStatus === "draft").length;

  const students = scopedStudents(session)
    .filter((s) => s.status !== "lost")
    .map((s) => ({ id: s.id, fullName: s.fullName, profile: s.profile }));

  return (
    <>
      <PageHeader
        title="Каталог вузов"
        meta={
          <>
            <span>Корея · {UNIVERSITIES.length} вузов</span>
            <span className="text-ink-faint">·</span>
            <span>
              {UNIVERSITIES.reduce((n, u) => n + u.programs.length, 0)} программ
            </span>
          </>
        }
        actions={
          <>
            <button className="btn btn-secondary btn-sm">
              <IconExport size={15} /> Выгрузить шорт-лист
            </button>
            {can(session.role, "universities", "create") ? (
              <button className="btn btn-primary btn-sm">
                <IconPlus size={15} /> Добавить вуз
              </button>
            ) : null}
          </>
        }
      />

      <Banner tone="warn">
        Этап 1: структура и фильтры. {drafts} из {UNIVERSITIES.length} карточек
        заполнены демо-данными и помечены как «черновик». На этапе 2 записи
        заполняются с официальных страниц вузов и файлов admission guideline,
        после сверки карточка получает статус «проверено» и дату источника.
      </Banner>

      <CatalogExplorer
        universities={UNIVERSITIES}
        students={students}
        cities={cities}
        fields={fields}
        intakes={intakes}
      />
    </>
  );
}
