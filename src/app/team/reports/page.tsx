import Link from "next/link";
import { moduleGate } from "@/components/guard";
import { Avatar, PageHeader, Progress, StatusDot } from "@/components/ui";
import { TODAY_ISO, formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { scopedTeam } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { sessionMinutes, sessionsOf } from "@/lib/store";
import { S } from "@/lib/strings";

/** Начало рабочего дня, после которого отметка считается опозданием. */
const LATE_AFTER = "09:30";

/**
 * Отчётность по часам. Единственный источник — отметки «начать» и «завершить
 * рабочий день» из меню профиля: никакого ручного ввода, иначе отчёт врёт.
 */
export default async function StaffReportsPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const gate = moduleGate(session, "staffReports", t(S.staffReports.title));
  if (gate) return gate;

  const f = formatters(session.locale);
  const team = scopedTeam(session);
  const all = sessionsOf(session.tenant.id);

  const rows = team
    .map((user) => {
      const mine = all.filter((s) => s.userId === user.id);
      const minutes = mine.reduce((sum, s) => sum + sessionMinutes(s), 0);
      const breaks = mine.reduce((sum, s) => sum + s.breakMinutes, 0);
      const late = mine.filter((s) => s.startedAt.slice(11, 16) > LATE_AFTER).length;
      const today = mine.find((s) => s.date === TODAY_ISO);
      return {
        user,
        days: mine.length,
        minutes,
        breaks,
        late,
        today,
        average: mine.length ? Math.round(minutes / mine.length) : 0,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);

  const maxMinutes = Math.max(1, ...rows.map((r) => r.minutes));
  const hhmm = (minutes: number) =>
    `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;

  return (
    <>
      <PageHeader
        title={t(S.staffReports.title)}
        meta={
          <>
            <span>{t(S.staffReports.subtitle)}</span>
            <span>·</span>
            <span>
              {rows.filter((r) => r.today && !r.today.endedAt).length}{" "}
              {t(S.staffReports.stillWorking)}
            </span>
          </>
        }
      />

      <div className="card overflow-hidden">
        <div className="scroll-x">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-hairline-soft">
                {[
                  S.staffReports.employee,
                  S.staffReports.days,
                  S.staffReports.hours,
                  S.staffReports.average,
                  S.staffReports.breaks,
                  S.staffReports.late,
                  S.staffReports.today,
                ].map((head) => (
                  <th
                    key={head.ru}
                    className="t-micro whitespace-nowrap px-5 py-3 text-left font-medium uppercase tracking-[0.07em] text-ink-faint"
                  >
                    {t(head)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user.id} className="border-b border-hairline-soft last:border-b-0">
                  <td className="px-5 py-3.5">
                    <Link href={`/team/${row.user.id}`} className="flex items-center gap-3">
                      <Avatar name={row.user.name} size={28} />
                      <span className="min-w-0">
                        <span className="t-body-sm block truncate">{row.user.name}</span>
                        <span className="t-micro block truncate text-ink-faint">
                          {row.user.title}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="t-body-sm t-num px-5 py-3.5">{row.days || "—"}</td>
                  <td className="px-5 py-3.5">
                    <div className="t-body-sm t-num">{hhmm(row.minutes)}</div>
                    <div className="mt-1.5 w-24">
                      <Progress percent={(row.minutes / maxMinutes) * 100} />
                    </div>
                  </td>
                  <td className="t-body-sm t-num px-5 py-3.5">
                    {row.average ? hhmm(row.average) : "—"}
                  </td>
                  <td className="t-caption t-num px-5 py-3.5 text-ink-muted">
                    {row.breaks ? `${row.breaks} ${t(S.common.minutesShort)}` : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="t-caption t-num"
                      style={{ color: row.late ? "var(--color-status-progress)" : undefined }}
                    >
                      {row.late || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {row.today ? (
                      <span className="chip">
                        <StatusDot
                          color={
                            row.today.endedAt
                              ? "var(--color-status-deal)"
                              : "var(--color-status-progress)"
                          }
                        />
                        {f.time(row.today.startedAt)}
                        {row.today.endedAt ? ` — ${f.time(row.today.endedAt)}` : ""}
                      </span>
                    ) : (
                      <span className="t-micro text-ink-faint">{t(S.workday.notStarted)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
