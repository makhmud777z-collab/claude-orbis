import Link from "next/link";
import { connectMetaPageAction, disconnectMetaPageAction, dismissMetaPendingAction } from "@/app/actions";
import { moduleGate } from "@/components/guard";
import { MetaForms, type MetaFormRow, type OwnerOption } from "@/components/MetaForms";
import { Banner, Chip, Crumbs, EmptyState, PageHeader, SectionTitle, StatusDot } from "@/components/ui";
import { usersOfTenant } from "@/lib/data/users";
import { formatters } from "@/lib/format";
import { translator, type Loc } from "@/lib/i18n";
import { allow } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { metaEventsOf, metaFormsOf, metaPageByPageId, metaPagesOf, metaPendingOf } from "@/lib/store";
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

/** Чем кончился возврат из Facebook — показываем над страницей. */
const CONNECT_RESULT: Record<string, Loc> = {
  denied: S.meta.cDenied,
  error: S.meta.cError,
  empty: S.meta.cEmpty,
  forbidden: S.meta.cForbidden,
};

/**
 * Лиды из Meta: подключение страниц, раскладка полей, журнал приходов.
 *
 * Весь путь «реклама в кабинете Meta → лид в воронке» собран на одном
 * экране: подключили страницу, разложили её поля, смотрим приходы. Рекламой
 * Orbis не управляет — она остаётся в кабинете Meta.
 */
export default async function MetaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const t = translator(session.locale);
  const gate = moduleGate(session, "admin", t(S.meta.title));
  if (gate) return gate;

  const params = await searchParams;
  const f = formatters(session.locale);
  const canEdit = allow(session.tenant.id, session.role, "admin", "edit");
  const pages = metaPagesOf(session.tenant.id);
  const forms = metaFormsOf(session.tenant.id);
  const events = metaEventsOf(session.tenant.id).slice(0, 20);
  const staff = usersOfTenant(session.tenant.id);

  const pending = canEdit ? metaPendingOf(session.tenant.id) : undefined;
  const notice = CONNECT_RESULT[String(params.connect ?? "")];
  // Отключение в два шага: ссылка открывает подтверждение на самой карточке.
  const confirming = String(params.disconnect ?? "");

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
        actions={
          canEdit ? (
            // Ссылка, а не форма: маршрут сам решает, вести в Facebook или
            // показать выбор страницы, и отвечает переадресацией.
            <a className="btn btn-primary btn-sm" href="/api/meta/connect" title={t(S.meta.connectHint)}>
              {t(S.meta.connect)}
            </a>
          ) : null
        }
      />

      <Banner>{t(S.meta.intro)}</Banner>
      {notice ? <Banner tone="warn">{t(notice)}</Banner> : null}

      {/*
        Список, который принёс вход в Facebook. Стоит выше подключённых
        страниц: человек только что вернулся сюда именно за этим выбором.
      */}
      {pending ? (
        <section className="card mb-8 overflow-hidden">
          <header className="border-b border-hairline-soft bg-surface-2 px-5 py-3.5">
            <div className="t-body-sm font-semibold">{t(S.meta.pick)}</div>
            <div className="t-caption mt-1 text-ink-muted">{t(S.meta.pickHint)}</div>
          </header>

          {pending.demo ? (
            <div
              className="t-caption flex items-start gap-2.5 border-b border-hairline-soft px-5 py-3"
              style={{
                background: "color-mix(in srgb, var(--color-status-progress) 9%, transparent)",
                color: "var(--color-ink-muted)",
              }}
            >
              <span aria-hidden style={{ color: "var(--color-status-progress)" }}>!</span>
              <span>{t(S.meta.connectDemo)}</span>
            </div>
          ) : null}

          <div >
            {pending.pages.map((page) => {
              // Страница кормит одно агентство: если её уже забрали, кнопку
              // не показываем вовсе, чтобы не предлагать невозможное.
              const taken = metaPageByPageId(page.pageId);
              const busy = Boolean(taken) && taken!.tenantId !== session.tenant.id;

              return (
                <div
                  key={page.pageId}
                  className="row-hover flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline-soft px-5 py-3.5 last:border-b-0 hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="t-body-sm truncate">{page.name}</div>
                    <div className="t-micro t-num truncate text-ink-faint">
                      {page.igHandle ? `${page.igHandle} · ${page.pageId}` : page.pageId}
                    </div>
                  </div>
                  {busy ? (
                    <span className="t-caption flex-none text-ink-faint">{t(S.meta.taken)}</span>
                  ) : (
                    <form action={connectMetaPageAction} className="flex-none">
                      <input type="hidden" name="pageId" value={page.pageId} />
                      <button className="btn btn-primary btn-sm">{t(S.meta.pickConnect)}</button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>

          <footer className="border-t border-hairline-soft px-5 py-3">
            <form action={dismissMetaPendingAction}>
              <button className="btn btn-ghost btn-sm">{t(S.meta.pickDone)}</button>
            </form>
          </footer>
        </section>
      ) : null}

      <SectionTitle>{t(S.meta.pages)}</SectionTitle>
      {!pages.length ? (
        <div className="mb-8">
          <EmptyState title={t(S.meta.noPages)} hint={t(S.meta.noPagesHint)} />
        </div>
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                  {page.status === "connected"
                    ? t(S.channels.connected)
                    : page.status === "needs_reconnect"
                      ? t(S.meta.needReconnect)
                      : t(S.channels.off)}
                </span>
                <Chip>{f.shortDate(page.connectedAt)}</Chip>
              </div>

              {/*
                Подписка на лиды не подтвердилась — заявки не пойдут. Сказать
                об этом здесь дешевле, чем разбирать потом по журналу.
              */}
              {page.status === "needs_reconnect" ? (
                <div className="t-micro mt-2.5" style={{ color: "var(--color-status-risk)" }}>
                  {t(S.meta.needReconnectHint)}
                </div>
              ) : null}

              {canEdit ? (
                confirming === page.pageId ? (
                  <div className="mt-3.5 border-t border-hairline-soft pt-3">
                    <div className="t-caption text-ink-muted">{t(S.meta.disconnectConfirm)}</div>
                    <div className="mt-2.5 flex gap-2">
                      <form action={disconnectMetaPageAction}>
                        <input type="hidden" name="pageId" value={page.pageId} />
                        <button className="btn btn-secondary btn-sm">{t(S.meta.disconnect)}</button>
                      </form>
                      <Link className="btn btn-ghost btn-sm" href="/admin/meta">
                        {t(S.common.cancel)}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Link
                    className="btn btn-ghost btn-sm mt-3.5"
                    href={`/admin/meta?disconnect=${encodeURIComponent(page.pageId)}`}
                  >
                    {t(S.meta.disconnect)}
                  </Link>
                )
              ) : null}
            </article>
          ))}
        </div>
      )}

      {pages.length ? (
        <>
          <SectionTitle>{t(S.meta.forms)}</SectionTitle>
          {!rows.length ? (
            <EmptyState title={t(S.meta.noForms)} hint={t(S.meta.noFormsHint)} />
          ) : (
            <MetaForms forms={rows} owners={owners} locale={session.locale} canEdit={canEdit} />
          )}

          <SectionTitle>{t(S.meta.journal)}</SectionTitle>
          <p className="t-caption -mt-2 mb-3 text-ink-muted">{t(S.meta.journalHint)}</p>
          {!events.length ? (
            <EmptyState title={t(S.meta.noEvents)} />
          ) : (
            <div className="card overflow-hidden">
              <div className="scroll-x">
                <table className="w-full min-w-[720px] border-collapse">
                  <tbody >
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
      ) : null}
    </>
  );
}
