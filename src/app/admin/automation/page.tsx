import { Automation, type PipelineCol, type StaffOption } from "@/components/Automation";
import { moduleGate } from "@/components/guard";
import { Banner, Chip, Crumbs, EmptyState, PageHeader, SectionTitle, StatusDot } from "@/components/ui";
import { usersOfTenant } from "@/lib/data/users";
import { actionSpec, triggerSpec } from "@/lib/automation";
import { formatters } from "@/lib/format";
import { translator, type Loc } from "@/lib/i18n";
import { allow } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import {
  pipelinesOf, robotById, robotRunsOf, robotsOf, triggersOf,
} from "@/lib/store";
import { P, S } from "@/lib/strings";
import type { RobotRun } from "@/lib/types";

/** Подпись и цвет срабатывания: по ним разбирают, почему робот не сделал. */
const RUN_META: Record<RobotRun["status"], { label: Loc; dot: string }> = {
  done: { label: S.automation.stDone, dot: "var(--color-status-deal)" },
  skipped: { label: S.automation.stSkipped, dot: "var(--color-status-hold)" },
  failed: { label: S.automation.stFailed, dot: "var(--color-status-risk)" },
};

/**
 * Роботы и триггеры: автоматика воронки и журнал того, что она сделала.
 *
 * Автоматику, которую не видно, никто не включает: журнал здесь не
 * приложение к экрану, а половина его смысла — именно по нему разбирают
 * «робот не сработал».
 */
export default async function AutomationPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const gate = moduleGate(session, "crmSettings", t(S.automation.title));
  if (gate) return gate;

  const f = formatters(session.locale);
  const canEdit = allow(session.tenant.id, session.role, "crmSettings", "edit");

  const pipelines: PipelineCol[] = [
    ...pipelinesOf(session.tenant.id, "lead"),
    ...pipelinesOf(session.tenant.id, "deal"),
  ].map((p) => ({
    id: p.id,
    name: p.name,
    entity: p.entity,
    stages: p.stages.map((s) => ({ key: s.key, label: s.label, color: s.color })),
  }));

  const robots = robotsOf(session.tenant.id);
  const triggers = triggersOf(session.tenant.id);
  const runs = robotRunsOf(session.tenant.id).slice(0, 20);

  const staff: StaffOption[] = usersOfTenant(session.tenant.id).map((u) => ({
    id: u.id,
    name: u.name,
    title: u.title,
  }));

  const active = robots.filter((r) => r.enabled).length;

  /** Что именно сработало: действие робота или событие триггера. */
  const runLabel = (run: RobotRun) => {
    if (run.triggerId) {
      const trigger = triggers.find((x) => x.id === run.triggerId);
      const spec = trigger ? triggerSpec(trigger.event) : undefined;
      return `${t(S.automation.byTrigger)} · ${spec ? t(spec.label) : "—"}`;
    }
    const robot = run.robotId ? robotById(run.robotId) : undefined;
    return `${t(S.automation.byRobot)} · ${robot ? t(actionSpec(robot.action).label) : "—"}`;
  };

  return (
    <>
      <Crumbs back="/admin" backLabel={t(S.admin.title)} current={t(S.automation.title)} />
      <PageHeader
        title={t(S.automation.title)}
        meta={
          <>
            {/* «6 из 8 роботов» честнее голой шестёрки: выключенные тоже есть. */}
            <span>{`${active} ${t(S.team.of)} ${f.plural(robots.length, P.robots)}`}</span>
            <span>·</span>
            <span>{f.plural(triggers.length, P.triggers)}</span>
          </>
        }
      />

      <Banner>{t(S.automation.intro)}</Banner>

      {!pipelines.length ? (
        <EmptyState title={t(S.automation.noneAtAll)} hint={t(S.automation.noneHint)} />
      ) : (
        <Automation
          pipelines={pipelines}
          robots={robots}
          triggers={triggers}
          staff={staff}
          locale={session.locale}
          canEdit={canEdit}
        />
      )}

      <SectionTitle>{t(S.automation.journal)}</SectionTitle>
      <p className="t-caption -mt-2 mb-3 text-ink-muted">{t(S.automation.journalHint)}</p>

      {!runs.length ? (
        <EmptyState title={t(S.automation.noRuns)} />
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-x">
            <table className="w-full min-w-[680px] border-collapse">
              <tbody >
                {runs.map((run) => {
                  const meta = RUN_META[run.status];
                  return (
                    <tr
                      key={run.id}
                      className="row-hover border-b border-hairline-soft last:border-b-0 hover:bg-surface-2"
                    >
                      <td className="px-5 py-3">
                        <span className="chip">
                          <StatusDot color={meta.dot} />
                          {t(meta.label)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="t-body-sm block truncate">{runLabel(run)}</span>
                        <span className="t-micro block truncate text-ink-faint">
                          {run.entity === "deal" ? t(S.crm.deals) : t(S.crm.leads)} · {run.entityId}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="t-caption block max-w-[360px] break-words text-ink-muted">
                          {run.note}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Chip>{run.at.slice(0, 16).replace("T", " ")}</Chip>
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
  );
}
