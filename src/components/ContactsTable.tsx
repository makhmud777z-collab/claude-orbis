import Link from "next/link";
import { Avatar, Chip, StatusDot } from "./ui";
import { formatters } from "@/lib/format";
import { translator, type Locale } from "@/lib/i18n";
import { CITY_LABEL, DEGREE_LABEL, FIELD_LABEL, ref, SOURCE_LABEL, STUDENT_STATUS } from "@/lib/labels";
import { P, S } from "@/lib/strings";
import type { Student } from "@/lib/types";

export interface ContactRow extends Student {
  ownerName: string;
  branchName: string;
  dealsCount: number;
  dossierPercent: number;
}

/**
 * Таблица контактов. Фильтрация живёт в умном фильтре раздела и работает
 * на сервере, поэтому здесь остался только вывод — без своего состояния.
 */
export function ContactsTable({ rows, locale }: { rows: ContactRow[]; locale: Locale }) {
  const t = translator(locale);
  const f = formatters(locale);

  const columns = [
    S.students.colStudent,
    S.students.colProfile,
    S.students.colBudget,
    S.students.colGoal,
    S.students.colCurator,
    S.students.colDossier,
    S.students.colStatus,
  ];

  return (
    <div className="card overflow-hidden">
      <div className="scroll-x">
        <table className="w-full min-w-[1060px] border-collapse">
          <thead>
            <tr className="border-b border-hairline-soft bg-surface-2">
              {columns.map((h) => (
                <th
                  key={h.ru}
                  className="t-micro whitespace-nowrap px-4 py-3 text-left font-medium uppercase tracking-[0.07em] text-ink-faint"
                >
                  {t(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const st = STUDENT_STATUS[s.status];
              return (
                <tr
                  key={s.id}
                  className="border-b border-hairline-soft transition-colors last:border-b-0 hover:bg-surface-2"
                >
                  <td className="px-4 py-3.5">
                    <Link href={`/crm/contacts/${s.id}`} className="flex items-center gap-3">
                      <Avatar name={s.fullName} size={32} />
                      <span className="min-w-0">
                        <span className="t-body-sm block truncate">{s.fullName}</span>
                        <span className="t-micro block truncate text-ink-faint">
                          {t(ref(CITY_LABEL, s.city))} · {t(SOURCE_LABEL[s.source])} ·{" "}
                          {f.shortDate(s.createdAt)}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Chip>TOPIK {s.profile.topik || "—"}</Chip>
                      {s.profile.ielts ? <Chip>IELTS {s.profile.ielts}</Chip> : null}
                      {s.profile.gpa ? <Chip>GPA {s.profile.gpa}</Chip> : null}
                    </div>
                  </td>
                  <td className="t-body-sm t-num whitespace-nowrap px-4 py-3.5">
                    {f.usd(s.profile.budgetPerYear)}
                    {s.profile.needsScholarship ? (
                      <span className="t-micro block text-ink-faint">{t(S.students.needsGrant)}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="t-body-sm whitespace-nowrap">
                      {s.profile.preferredMajors[0]
                        ? t(ref(FIELD_LABEL, s.profile.preferredMajors[0]))
                        : t(S.students.notDefined)}
                    </div>
                    <div className="t-micro whitespace-nowrap text-ink-faint">
                      {t(DEGREE_LABEL[s.profile.degreeLevel])} ·{" "}
                      {s.profile.preferredCities.length
                        ? s.profile.preferredCities.map((c) => t(ref(CITY_LABEL, c))).join(", ")
                        : t(S.students.anyCity)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={s.ownerName} size={22} />
                      <span className="t-caption whitespace-nowrap">{s.ownerName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="t-caption t-num">{s.dossierPercent}%</div>
                    <div className="t-micro whitespace-nowrap text-ink-faint">
                      {f.plural(s.dealsCount, P.deals)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="chip">
                      <StatusDot color={st.dot} />
                      {t(st.label)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
