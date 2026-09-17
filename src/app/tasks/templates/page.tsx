import { moduleGate } from "@/components/guard";
import { IconCheck } from "@/components/icons";
import { Chip, PageHeader } from "@/components/ui";
import { templatesOfTenant } from "@/lib/data/org";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { allow, roleLabel } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { P, S } from "@/lib/strings";

/**
 * Шаблоны задач: повторяющиеся процессы агентства — пакет документов,
 * подача на визу, первый звонок лиду. Из шаблона задача создаётся целиком,
 * вместе с чек-листом, чтобы куратор не собирал его заново каждый раз.
 */
export default async function TaskTemplatesPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const f = formatters(session.locale);
  const gate = moduleGate(session, "tasks", t(S.projects.templates));
  if (gate) return gate;

  const templates = templatesOfTenant(session.tenant.id);
  const canCreate = allow(session.tenant.id, session.role, "tasks", "create");

  return (
    <>
      <PageHeader title={t(S.projects.templates)} meta={<span>{f.plural(templates.length, P.templates)}</span>} />

      {templates.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <article key={template.id} className="card p-5">
              <h2 className="t-body-lg">{t(template.title)}</h2>
              <p className="t-caption mt-2 leading-relaxed text-ink-muted">
                {t(template.description)}
              </p>

              <div className="t-micro mt-4 uppercase tracking-[0.07em] text-ink-faint">
                {t(S.projects.checklist)} · {template.checklist.length}
              </div>
              <ul className="mt-2 space-y-1.5">
                {template.checklist.map((item) => (
                  <li key={item.ru} className="t-caption flex items-start gap-2 text-ink-muted">
                    <span className="mt-[3px] flex-none text-ink-faint">
                      <IconCheck size={11} />
                    </span>
                    {t(item)}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between gap-3">
                <Chip>{t(roleLabel(template.defaultAssigneeRole))}</Chip>
                {canCreate ? (
                  <button className="btn btn-secondary btn-sm">{t(S.projects.useTemplate)}</button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card px-6 py-16 text-center">
          <div className="t-body-lg">{t(S.common.empty)}</div>
        </div>
      )}
    </>
  );
}
