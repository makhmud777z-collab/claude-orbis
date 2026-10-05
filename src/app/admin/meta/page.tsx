import { moduleGate } from "@/components/guard";
import { MetaForms, type MetaFormRow, type OwnerOption } from "@/components/MetaForms";
import { Banner, Chip, Crumbs, EmptyState, PageHeader, SectionTitle, StatusDot } from "@/components/ui";
import { usersOfTenant } from "@/lib/data/users";
import { formatters } from "@/lib/format";
import { translator, type Loc } from "@/lib/i18n";
import { allow } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { metaEventsOf, metaFormsOf, metaPagesOf } from "@/lib/store";
import { P, S } from "@/lib/strings";
import type { MetaEvent } from "@/lib/types";

/** Подпись и цвет прихода: по ним разбирают, почему лид не дошёл. */
const EVENT_META: Record<MetaEvent["status"], { label: Loc; dot: string }> = {
  imported: { label: S.meta.stImported, dot: "var(--color-status-deal)" },
  duplicate: { label: S.meta.stDuplicate, dot: "var(--color-status-hold)" },
  unknown_page: { label: S.meta.stUnknownPage, dot: "var(--color-status-risk)" },
  no_mapping: { label: S.meta.stNoMapping, dot: "var(--color-status-progress)" },
  failed: { label: S.meta.stFailed, dot: "var(--color-status-risk)" },
};

/**
 * Лиды из Meta: раскладка полей и журнал приходов.
 *
 * Сами страницы подключаются в «Каналах продаж» — здесь настраивают то,
 * что происходит с уже приходящими заявками.
 */
export default async function MetaPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const gate = moduleGate(session, "admin", t(S.meta.title));
  if (gate) return gate;

  const f = formatters(session.locale);
  const pages = metaPagesOf(session.tenant.id);
  const forms = metaFormsOf(session.tenant.id);
  const events = metaEventsOf(session.tenant.id).slice(0, 20);
  const staff = usersOfTenant(session.tenant.id);

  const owners: OwnerOption[] = staff.map((u) => ({ id: u.id, name: u.name, title: u.title }));
  const pageName = (pageId: string) => pages.find((p) => p.pageId === pageId)?.pageName ?? pageId;

  const rows: MetaFormRow[] = forms.map((form) => ({
    pageId: form.pageId,
    formId: form.formId,
    formName: form.formName,
    ownerId: form.ownerId,
    updatedAt: form.updatedAt,
    fields: Object.entries(form.map).map(([name, target]) => ({ name, target })),
  }));

  return (
    <>
      <Crumbs back="/admin" backLabel={t(S.admin.title)} current={t(S.meta.title)} />
      <PageHeader
        title={t(S.meta.title)}
        meta={
          <>
            <span>{f.plural(pages.length, P.channels)}</span>
            <span>·</span>
            <span>{f.plural(forms.length, P.metaForms)}</span>
          </>
        }
      />

      <Banner>{t(S.meta.intro)}</Banner>

      {!pages.length ? (
        <EmptyState title={t(S.meta.noPages)} hint={t(S.meta.noPagesHint)} />
      ) : (
        <>
          <SectionTitle>{t(S.meta.pages)}</SectionTitle>
          <div className="stagger-in mb-8 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pages.map((page) => (
              <article key={page.pageId} className="card p-4">
                <div className="t-body-sm truncate">{page.pageName}</div>
                <div className="t-micro truncate text-ink-faint">{page.igHandle ?? page.pageId}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="chip">
                    <StatusDot
                      color={
                        page.status === "connected"
                          ? "var(--color-status-deal)"
                          : page.status === "needs_reconnect"
                            ? "var(--color-status-risk)"
                            : "var(--color-status-hold)"
                      }
                    />
                    {page.status === "connected" ? t(S.channels.connected) : t(S.channels.off)}
                  </span>
                  <Chip>{f.shortDate(page.connectedAt)}</Chip>
                </div>
              </article>
            ))}
          </div>

          <SectionTitle>{t(S.meta.forms)}</SectionTitle>
          {!rows.length ? (
            <EmptyState title={t(S.meta.noForms)} hint={t(S.meta.noFormsHint)} />
          ) : (
            <MetaForms
              forms={rows}
              owners={owners}
              locale={session.locale}
              canEdit={allow(session.tenant.id, session.role, "admin", "edit")}
            />
          )}

          <SectionTitle>{t(S.meta.journal)}</SectionTitle>
          <p className="t-caption -mt-2 mb-3 text-ink-muted">{t(S.meta.journalHint)}</p>
          {!events.length ? (
            <EmptyState title={t(S.meta.noEvents)} />
          ) : (
            <div className="card overflow-hidden">
              <div className="scroll-x">
                <table className="w-full min-w-[720px] border-collapse">
                  <tbody className="stagger-in">
                    {events.map((event) => {
                      const meta = EVENT_META[event.status];
                      return (
                        <tr
                          key={event.id}
                          className="row-hover border-b border-hairline-soft last:border-b-0 hover:bg-surface-2"
                        >
                          <td className="px-5 py-3">
                            <span className="chip">
                              <StatusDot color={meta.dot} />
                              {t(meta.label)}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="t-body-sm block truncate">{pageName(event.pageId)}</span>
                            <span className="t-micro t-num block truncate text-ink-faint">
                              {event.leadgenId}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="t-caption block max-w-[380px] break-words text-ink-muted">
                              {event.note}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className="t-micro whitespace-nowrap text-ink-faint">
                              {event.at.slice(0, 16).replace("T", " ")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
