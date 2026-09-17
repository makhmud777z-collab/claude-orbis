import Link from "next/link";
import { moduleGate } from "@/components/guard";
import { Avatar, Chip, PageHeader } from "@/components/ui";
import { DEPARTMENTS } from "@/lib/data/org";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { scopedTeam } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { departmentOf } from "@/lib/store";
import { P, S } from "@/lib/strings";
import type { Department, User } from "@/lib/types";

/**
 * Структура компании: дерево подразделений с руководителями.
 * Сотрудник виден там, где он числится, — и открывается своей карточкой.
 */
export default async function StructurePage() {
  const session = await getSession();
  const t = translator(session.locale);
  const f = formatters(session.locale);
  const gate = moduleGate(session, "structure", t(S.structure.title));
  if (gate) return gate;

  const team = scopedTeam(session);
  const departments = DEPARTMENTS.filter((d) => d.tenantId === session.tenant.id);
  const byId = new Map(team.map((u) => [u.id, u]));
  const membersOf = (departmentId: string) =>
    team.filter((u) => departmentOf(u.id) === departmentId);

  const roots = departments.filter((d) => !d.parentId);

  const render = (department: Department, depth: number): React.ReactNode => {
    const head = department.headId ? byId.get(department.headId) : undefined;
    const members = membersOf(department.id);
    const children = departments.filter((d) => d.parentId === department.id);

    return (
      <div key={department.id} style={{ marginLeft: depth ? 20 : 0 }}>
        <section
          className="card p-5"
          style={depth ? { borderLeft: "2px solid var(--color-hairline)" } : undefined}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="t-headline">{t(department.name)}</h2>
              <div className="t-micro mt-1 text-ink-faint">
                {f.plural(members.length, P.employees)}
              </div>
            </div>
            {head ? (
              <Link href={`/team/${head.id}`} className="flex items-center gap-2.5">
                <Avatar name={head.name} size={28} />
                <span>
                  <span className="t-caption block">{head.name}</span>
                  <span className="t-micro block text-ink-faint">{t(S.structure.head)}</span>
                </span>
              </Link>
            ) : null}
          </div>

          {members.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {members.map((member: User) => (
                <Link key={member.id} href={`/team/${member.id}`}>
                  <Chip active={member.id === department.headId}>
                    <Avatar name={member.name} size={18} />
                    {member.name}
                  </Chip>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        {children.length ? (
          <div className="mt-3 space-y-3">{children.map((child) => render(child, depth + 1))}</div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title={t(S.structure.title)}
        meta={<span>{t(S.structure.subtitle)}</span>}
      />
      <div className="space-y-3">{roots.map((root) => render(root, 0))}</div>
    </>
  );
}
