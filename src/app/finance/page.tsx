import { ExportButton } from "@/components/ExportButton";
import { SectionFilter } from "@/components/SectionFilter";
import { moduleGate } from "@/components/guard";
import {
  Avatar,
  EmptyState,
  PageHeader,
  Progress,
  SectionTitle,
  StatTile,
  StatusDot,
} from "@/components/ui";
import { studentById } from "@/lib/data/students";
import { universityById } from "@/lib/data/universities";
import { userById } from "@/lib/data/users";
import { FILTER_TEXT, matchesFilter, readFilter, readQuery, type FilterRow } from "@/lib/filters";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { CITY_LABEL, ref } from "@/lib/labels";
import { scopedDeals, scopedTeam } from "@/lib/queries";
import { dealFields, simplePresets } from "@/lib/section-filters";
import { getSession } from "@/lib/session";
import { defaultPipeline, pipelineById, stageOf } from "@/lib/store";
import { P, S } from "@/lib/strings";
import type { Deal } from "@/lib/types";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const t = translator(session.locale);
  const f = formatters(session.locale);
  const gate = moduleGate(session, "finance", t(S.nav.finance));
  if (gate) return gate;

  const fields = dealFields(scopedTeam(session), defaultPipeline(session.tenant.id, "deal"), t);
  const values = readFilter(params);
  const query = readQuery(params);

  const withContract = scopedDeals(session).filter((a) => a.contractValue > 0);
  const apps = withContract.filter((deal) =>
    matchesFilter(financeRow(deal), fields, values, query),
  );
  const contracted = apps.reduce((n, a) => n + a.contractValue, 0);
  const paid = apps.reduce((n, a) => n + a.paid, 0);
  const debt = contracted - paid;
  const won = apps.filter((a) => a.stage === "departed");

  const byManager = scopedTeam(session)
    .map((u) => {
      const mine = apps.filter((a) => a.ownerId === u.id);
      return {
        user: u,
        count: mine.length,
        contracted: mine.reduce((n, a) => n + a.contractValue, 0),
        paid: mine.reduce((n, a) => n + a.paid, 0),
      };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.contracted - a.contracted);

  return (
    <>
      <PageHeader
        title={t(S.finance.title)}
        meta={
          <>
            <span>
              {f.plural(withContract.length, P.contracts)} {t(S.finance.inWork)}
            </span>
            <span className="text-ink-faint">·</span>
            <span>{t(S.finance.subtitle)}</span>
            <span className="text-ink-faint">·</span>
            <span>
              {t(S.finance.rate)}: 1$ = {f.som(session.tenant.usdRate)}
            </span>
          </>
        }
        actions={
          <ExportButton
            locale={session.locale}
            label={t(S.finance.exportRegistry)}
            filename="orbis-dogovory"
            headers={[
              t(S.applications.student), t(S.applications.university), t(S.finance.colStage),
              t(S.applications.contract), t(S.applications.paid), t(S.finance.colRest),
            ]}
            rows={apps.map((a) => {
              const stage = stageOf(pipelineById(a.pipelineId), a.stage);
              return [
                studentById(a.studentId)?.fullName ?? "",
                universityById(a.universityId)?.name ?? "",
                stage ? t(stage.label) : a.stage,
                a.contractValue, a.paid, a.contractValue - a.paid,
              ];
            })}
          />
        }
      />

      <SectionFilter
        scope="finance"
        fields={fields}
        presets={simplePresets()}
        locale={session.locale}
        userId={session.user.id}
        total={withContract.length}
        shown={apps.length}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={t(S.finance.contracted)}
          value={f.som(contracted, { compact: true })}
          accent="var(--color-status-open)"
        />
        <StatTile
          label={t(S.finance.paid)}
          value={f.som(paid, { compact: true })}
          hint={`${Math.round((paid / Math.max(1, contracted)) * 100)}% ${t(S.finance.ofContracts)}`}
          accent="var(--color-status-deal)"
        />
        <StatTile
          label={t(S.finance.receivable)}
          value={f.som(debt, { compact: true })}
          accent="var(--color-status-progress)"
        />
        <StatTile
          label={t(S.finance.closedWon)}
          value={won.length}
          hint={`${f.som(won.reduce((n, a) => n + a.paid, 0), { compact: true })} ${t(S.finance.received)}`}
          accent="var(--color-status-violet)"
        />
      </div>

      {/* Пустой фильтр раньше оставлял две белые карточки без строк:
          сотрудник видел рамки и не понимал, сломалось или просто нет данных. */}
      {!apps.length ? <EmptyState title={t(FILTER_TEXT.nothing)} /> : null}

      {apps.length ? (
        <>
          <section className="mt-9">
            <SectionTitle>{t(S.finance.byManager)}</SectionTitle>
            <div className="card divide-y divide-hairline-soft">
              {byManager.map((row) => (
                <div key={row.user.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <Avatar name={row.user.name} size={30} />
                  <div className="min-w-[160px] flex-1">
                    <div className="t-body-sm">{row.user.name}</div>
                    <div className="t-micro text-ink-faint">{row.user.title}</div>
                  </div>
                  <div className="w-[160px]">
                    <Progress percent={(row.paid / Math.max(1, row.contracted)) * 100} />
                  </div>
                  <div className="t-caption t-num w-20 text-right text-ink-muted">
                    {row.count} {t(S.finance.contractsShort)}
                  </div>
                  <div className="t-body-sm t-num w-32 text-right">
                    {f.som(row.paid, { compact: true })}
                    <span className="t-micro block text-ink-faint">
                      {t(S.finance.outOf)} {f.som(row.contracted, { compact: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-9">
            <SectionTitle>{t(S.finance.contracts)}</SectionTitle>
            <div className="card overflow-hidden">
              <div className="scroll-x">
                <table className="w-full min-w-[840px] border-collapse">
                  <thead>
                    <tr className="border-b border-hairline-soft">
                      {[
                        t(S.applications.student),
                        t(S.applications.university),
                        t(S.finance.colStage),
                        t(S.applications.contract),
                        t(S.applications.paid),
                        t(S.finance.colRest),
                      ].map((h) => (
                        <th
                          key={h}
                          className="t-micro px-5 py-3 text-left font-medium uppercase tracking-[0.07em] text-ink-faint"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map((a) => {
                      const stage = stageOf(pipelineById(a.pipelineId), a.stage);
                      return (
                        <tr key={a.id} className="border-b border-hairline-soft last:border-b-0">
                          <td className="t-body-sm px-5 py-3">
                            {studentById(a.studentId)?.fullName ?? "—"}
                          </td>
                          <td className="t-caption px-5 py-3 text-ink-muted">
                            {universityById(a.universityId)?.name ?? "—"}
                          </td>
                          <td className="px-5 py-3">
                            <span className="chip">
                              <StatusDot color={stage?.color ?? "var(--color-ink-faint)"} />
                              {stage ? t(stage.label) : a.stage}
                            </span>
                          </td>
                          <td className="t-body-sm t-num px-5 py-3">
                            {f.som(a.contractValue)}
                          </td>
                          <td className="t-body-sm t-num px-5 py-3">{f.som(a.paid)}</td>
                          <td
                            className="t-body-sm t-num px-5 py-3"
                            style={{
                              color:
                                a.contractValue - a.paid > 0
                                  ? "var(--color-status-progress)"
                                  : "var(--color-ink-faint)",
                            }}
                          >
                            {f.som(a.contractValue - a.paid)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}

/** Плоское представление договора для фильтра. */
function financeRow(deal: Deal): FilterRow {
  const contact = studentById(deal.studentId);
  const university = universityById(deal.universityId);
  return {
    search: `${contact?.fullName ?? ""} ${university?.name ?? ""}`,
    stage: deal.stage,
    ownerId: deal.ownerId,
    contractValue: deal.contractValue,
    deadline: deal.deadline,
    universityId: deal.universityId,
    intake: deal.intake,
    degreeLevel: deal.degreeLevel,
    priority: deal.priority,
    contact: contact?.fullName ?? "",
  };
}
