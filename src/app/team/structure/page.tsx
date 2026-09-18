import { CompanyStructure, type StructureNode, type StructurePerson } from "@/components/CompanyStructure";
import { moduleGate } from "@/components/guard";
import { PageHeader } from "@/components/ui";
import { translator } from "@/lib/i18n";
import { scopedTeam } from "@/lib/queries";
import { allow } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { departmentOf, departmentsOf } from "@/lib/store";
import { formatters } from "@/lib/format";
import { P, S } from "@/lib/strings";

/**
 * Структура компании: дерево подразделений и панель выбранного отдела.
 * Дерево живое — отдел создаётся здесь же, руководитель назначается,
 * а сотрудник переносится перетаскиванием.
 */
export default async function StructurePage() {
  const session = await getSession();
  const t = translator(session.locale);
  const f = formatters(session.locale);
  const gate = moduleGate(session, "structure", t(S.structure.title));
  if (gate) return gate;

  const team = scopedTeam(session);
  const departments = departmentsOf(session.tenant.id);

  const people: StructurePerson[] = team.map((u) => ({
    id: u.id,
    name: u.name,
    title: u.title,
    departmentId: departmentOf(u.id),
  }));

  /** Сотрудники подразделения вместе со всеми вложенными — цифра на карточке. */
  const collect = (id: string): string[] => {
    const own = people.filter((p) => p.departmentId === id).map((p) => p.id);
    const children = departments.filter((d) => d.parentId === id);
    return [...own, ...children.flatMap((c) => collect(c.id))];
  };

  const nodes: StructureNode[] = departments.map((d) => ({
    id: d.id,
    name: t(d.name),
    parentId: d.parentId,
    headId: d.headId,
    memberIds: people.filter((p) => p.departmentId === d.id).map((p) => p.id),
    totalIds: collect(d.id),
  }));

  return (
    <>
      <PageHeader
        title={t(S.structure.title)}
        meta={
          <>
            <span>{f.plural(departments.length, P.departments)}</span>
            <span className="text-ink-faint">·</span>
            <span>{t(S.structure.subtitle)}</span>
          </>
        }
      />
      <CompanyStructure
        nodes={nodes}
        people={people}
        locale={session.locale}
        canEdit={allow(session.tenant.id, session.role, "structure", "edit")}
        currentUserId={session.user.id}
        companyName={session.tenant.name}
        companyMark={session.tenant.mark}
      />
    </>
  );
}
