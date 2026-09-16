"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar, Chip, StatusDot } from "./ui";
import { IconSearch } from "./icons";
import { DEGREE_LABEL, SOURCE_LABEL, STUDENT_STATUS } from "@/lib/labels";
import { formatShortDate, money } from "@/lib/format";
import type { Student, User } from "@/lib/types";

export interface StudentRow extends Student {
  ownerName: string;
  branchName: string;
  applicationsCount: number;
  dossierPercent: number;
}

const STATUS_FILTERS = [
  { key: "all", label: "Все" },
  { key: "lead", label: "Лиды" },
  { key: "active", label: "В работе" },
  { key: "enrolled", label: "Зачислены" },
  { key: "paused", label: "На паузе" },
  { key: "lost", label: "Потеряны" },
] as const;

export function StudentsTable({
  rows,
  owners,
}: {
  rows: StudentRow[];
  owners: Pick<User, "id" | "name">[];
}) {
  const [status, setStatus] = useState<string>("all");
  const [owner, setOwner] = useState<string>("all");
  const [topik, setTopik] = useState<string>("all");
  const [query, setQuery] = useState("");

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

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setStatus(f.key)}>
              <Chip active={status === f.key}>
                {f.label}
                <span className="t-num ml-1 text-ink-faint">
                  {f.key === "all"
                    ? rows.length
                    : rows.filter((r) => r.status === f.key).length}
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
            <option value="all">Все кураторы</option>
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
            <option value="all">Любой TOPIK</option>
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
              placeholder="Поиск по базе"
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
                {["Студент", "Профиль", "Бюджет / год", "Цель", "Куратор", "Досье", "Статус"].map(
                  (h) => (
                    <th
                      key={h}
                      className="t-micro whitespace-nowrap px-4 py-3 text-left font-medium uppercase tracking-[0.07em] text-ink-faint"
                    >
                      {h}
                    </th>
                  ),
                )}
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
                            {s.city} · {SOURCE_LABEL[s.source]} · {formatShortDate(s.createdAt)}
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
                      {money(s.profile.budgetPerYear)}
                      {s.profile.needsScholarship ? (
                        <span className="t-micro block text-ink-faint">нужен грант</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="t-body-sm whitespace-nowrap">
                        {s.profile.preferredMajors[0] ?? "не определено"}
                      </div>
                      <div className="t-micro whitespace-nowrap text-ink-faint">
                        {DEGREE_LABEL[s.profile.degreeLevel]} ·{" "}
                        {s.profile.preferredCities.join(", ") || "любой город"}
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
                        {s.applicationsCount} заявк{s.applicationsCount === 1 ? "а" : "и"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="chip">
                        <StatusDot color={st.dot} />
                        {st.label}
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
            Ничего не найдено — попробуйте снять фильтры.
          </div>
        ) : null}
      </div>
    </>
  );
}
