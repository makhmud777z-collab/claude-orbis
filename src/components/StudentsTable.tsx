"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar, Chip, StatusDot } from "./ui";
import { IconSearch } from "./icons";
import { formatters } from "@/lib/format";
import { translator, type Loc, type Locale } from "@/lib/i18n";
import {
  CITY_LABEL,
  DEGREE_LABEL,
  FIELD_LABEL,
  ref,
  SOURCE_LABEL,
  STUDENT_STATUS,
} from "@/lib/labels";
import { S } from "@/lib/strings";
import type { Student, User } from "@/lib/types";

export interface StudentRow extends Student {
  ownerName: string;
  branchName: string;
  applicationsCount: number;
  dossierPercent: number;
}

export function StudentsTable({
  rows,
  owners,
  locale,
  initialStatus,
}: {
  rows: StudentRow[];
  owners: Pick<User, "id" | "name">[];
  locale: Locale;
  initialStatus?: string;
}) {
  const t = translator(locale);
  const f = formatters(locale);

  const [status, setStatus] = useState<string>(initialStatus ?? "all");
  const [owner, setOwner] = useState<string>("all");
  const [topik, setTopik] = useState<string>("all");
  const [query, setQuery] = useState("");

  const statusFilters: { key: string; label: Loc }[] = [
    { key: "all", label: S.common.all },
    { key: "lead", label: S.students.filterLead },
    { key: "active", label: S.students.filterActive },
    { key: "enrolled", label: S.students.filterEnrolled },
    { key: "paused", label: S.students.filterPaused },
    { key: "lost", label: S.students.filterLost },
  ];

  const filtered = useMemo(
    () =>
      rows.filter((s) => {
        if (status !== "all" && s.status !== status) return false;
        if (owner !== "all" && s.ownerId !== owner) return false;
        if (topik !== "all" && s.profile.topik < Number(topik)) return false;
        if (query) {
          const q = query.toLowerCase();
          const hay = `${s.fullName} ${s.latinName} ${s.phone} ${s.email} ${s.city}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }),
    [rows, status, owner, topik, query],
  );

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
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {statusFilters.map((item) => (
            <button key={item.key} onClick={() => setStatus(item.key)}>
              <Chip active={status === item.key}>
                {t(item.label)}
                <span className="t-num ml-1 text-ink-faint">
                  {item.key === "all"
                    ? rows.length
                    : rows.filter((r) => r.status === item.key).length}
                </span>
              </Chip>
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="field h-[30px] w-auto rounded-full py-0 text-[12px]"
          >
            <option value="all">{t(S.students.allCurators)}</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <select
            value={topik}
            onChange={(e) => setTopik(e.target.value)}
            className="field h-[30px] w-auto rounded-full py-0 text-[12px]"
          >
            <option value="all">{t(S.students.anyTopik)}</option>
            {[1, 2, 3, 4, 5, 6].map((lvl) => (
              <option key={lvl} value={lvl}>
                TOPIK {lvl}+
              </option>
            ))}
          </select>
          <label className="relative flex items-center">
            <span className="pointer-events-none absolute left-3 text-ink-faint">
              <IconSearch size={13} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(S.students.searchBase)}
              className="field h-[30px] w-[190px] rounded-full py-0 pl-8 text-[12px]"
            />
          </label>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="scroll-x">
          <table className="w-full min-w-[1060px] border-collapse">
            <thead>
              <tr className="border-b border-hairline-soft">
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
              {filtered.map((s) => {
                const st = STUDENT_STATUS[s.status];
                return (
                  <tr
                    key={s.id}
                    className="group border-b border-hairline-soft transition-colors last:border-b-0 hover:bg-surface-2"
                  >
                    <td className="px-4 py-3.5">
                      <Link href={`/students/${s.id}`} className="flex items-center gap-3">
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
                        <span className="t-micro block text-ink-faint">
                          {t(S.students.needsGrant)}
                        </span>
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
                          ? s.profile.preferredCities
                              .map((c) => t(ref(CITY_LABEL, c)))
                              .join(", ")
                          : t(S.students.anyCity)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2" title={s.branchName}>
                        <Avatar name={s.ownerName} size={22} />
                        <span className="t-caption whitespace-nowrap">{s.ownerName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="t-caption t-num">{s.dossierPercent}%</div>
                      <div className="t-micro whitespace-nowrap text-ink-faint">
                        {s.applicationsCount} {t(S.students.applicationsShort)}
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
        {!filtered.length ? (
          <div className="t-body-sm px-5 py-12 text-center text-ink-muted">
            {t(S.common.nothingFound)}
          </div>
        ) : null}
      </div>
    </>
  );
}
