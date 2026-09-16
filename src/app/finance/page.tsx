import { IconExport } from "@/components/icons";
import { NoAccess } from "@/components/NoAccess";
import {
  Avatar,
  PageHeader,
  Progress,
  SectionTitle,
  StatTile,
  StatusDot,
} from "@/components/ui";
import { studentById } from "@/lib/data/students";
import { universityById } from "@/lib/data/universities";
import { userById } from "@/lib/data/users";
import { money } from "@/lib/format";
import { stageMeta } from "@/lib/labels";
import { can } from "@/lib/rbac";
import { scopedApplications, scopedTeam } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function FinancePage() {
  const session = await getSession();
  if (!can(session.role, "finance")) {
    return <NoAccess role={session.role} module="Финансы" />;
  }

  const apps = scopedApplications(session).filter((a) => a.contractValue > 0);
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
        title="Финансы"
        meta={
          <>
            <span>{apps.length} договоров в работе</span>
            <span className="text-ink-faint">·</span>
            <span>суммы по договорам с семьями, без стоимости обучения в вузе</span>
          </>
        }
        actions={
          <button className="btn btn-secondary btn-sm">
            <IconExport size={15} /> Выгрузить реестр
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Законтрактовано" value={money(contracted)} accent="var(--color-status-open)" />
        <StatTile
          label="Оплачено"
          value={money(paid)}
          hint={`${Math.round((paid / Math.max(1, contracted)) * 100)}% от суммы договоров`}
          accent="var(--color-status-deal)"
        />
        <StatTile label="Дебиторка" value={money(debt)} accent="var(--color-status-progress)" />
        <StatTile
          label="Закрыто успешно"
          value={won.length}
          hint={`${money(won.reduce((n, a) => n + a.paid, 0))} получено`}
          accent="var(--color-status-violet)"
        />
      </div>

      <section className="mt-9">
        <SectionTitle>По менеджерам</SectionTitle>
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
                {row.count} дог.
              </div>
              <div className="t-body-sm t-num w-32 text-right">
                {money(row.paid)}
                <span className="t-micro block text-ink-faint">
                  из {money(row.contracted)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-9">
        <SectionTitle>Договоры</SectionTitle>
        <div className="card overflow-hidden">
          <div className="scroll-x">
            <table className="w-full min-w-[840px] border-collapse">
              <thead>
                <tr className="border-b border-hairline-soft">
                  {["Студент", "Вуз", "Этап", "Договор", "Оплачено", "Остаток"].map((h) => (
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
                  const meta = stageMeta(a.stage);
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
                          <StatusDot color={meta.dot} />
                          {meta.short}
                        </span>
                      </td>
                      <td className="t-body-sm t-num px-5 py-3">{money(a.contractValue)}</td>
                      <td className="t-body-sm t-num px-5 py-3">{money(a.paid)}</td>
                      <td
                        className="t-body-sm t-num px-5 py-3"
                        style={{
                          color:
                            a.contractValue - a.paid > 0
                              ? "var(--color-status-progress)"
                              : "var(--color-ink-faint)",
                        }}
                      >
                        {money(a.contractValue - a.paid)}
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
  );
}
