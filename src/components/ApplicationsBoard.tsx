"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconFilter, IconMore, IconPhone } from "./icons";
import { Avatar, Chip, Progress, StatusDot } from "./ui";
import { BOARD_STAGES, CITY_LABEL, INTAKE_LABEL, ref, stageMeta } from "@/lib/labels";
import { formatters, isPast, isSoon } from "@/lib/format";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";
import type { ApplicationStage } from "@/lib/types";

export interface BoardCard {
  id: string;
  stage: ApplicationStage;
  studentId: string;
  studentName: string;
  studentPhone: string;
  universityName: string;
  programName: string;
  city: string;
  intake: string;
  ownerId: string;
  ownerName: string;
  priority: "low" | "normal" | "high";
  deadline: string | null;
  dossierPercent: number;
  contractValue: number;
  paid: number;
  updatedLabel: string;
}

export function ApplicationsBoard({
  cards,
  owners,
  intakes,
  initialStage,
  locale,
}: {
  cards: BoardCard[];
  owners: { id: string; name: string }[];
  intakes: string[];
  initialStage?: string;
  locale: Locale;
}) {
  const t = translator(locale);
  const f = formatters(locale);
  const [owner, setOwner] = useState("all");
  const [intake, setIntake] = useState("all");
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [focus, setFocus] = useState<string>(initialStage ?? "all");

  // То же самое для этапов: /applications?stage=visa из меню.
  useEffect(() => setFocus(initialStage ?? "all"), [initialStage]);

  const filtered = useMemo(
    () =>
      cards.filter((c) => {
        if (owner !== "all" && c.ownerId !== owner) return false;
        if (intake !== "all" && c.intake !== intake) return false;
        if (onlyUrgent && c.priority !== "high") return false;
        return true;
      }),
    [cards, owner, intake, onlyUrgent],
  );

  const columns = BOARD_STAGES.filter((s) => focus === "all" || focus === s);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          className="field h-[30px] w-auto rounded-full py-0 text-[12px]"
        >
          <option value="all">{t(S.applications.allStages)}</option>
          {BOARD_STAGES.map((s) => (
            <option key={s} value={s}>
              {t(stageMeta(s).label)}
            </option>
          ))}
        </select>
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
          value={intake}
          onChange={(e) => setIntake(e.target.value)}
          className="field h-[30px] w-auto rounded-full py-0 text-[12px]"
        >
          <option value="all">{t(S.applications.allIntakes)}</option>
          {intakes.map((i) => (
            <option key={i} value={i}>
              {t(ref(INTAKE_LABEL, i))}
            </option>
          ))}
        </select>
        <button onClick={() => setOnlyUrgent((v) => !v)}>
          <Chip active={onlyUrgent} dot="var(--color-status-risk)">
            {t(S.applications.onlyUrgent)}
          </Chip>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="t-micro text-ink-faint">
            {filtered.length} {t(S.applications.inSelection)}
          </span>
          <button className="btn-icon" aria-label={t(S.common.filters)}>
            <IconFilter size={16} />
          </button>
        </div>
      </div>

      <div className="scroll-x -mx-1 pb-4">
        <div className="flex min-w-max gap-4 px-1">
          {columns.map((stage) => {
            const meta = stageMeta(stage);
            const items = filtered.filter((c) => c.stage === stage);
            return (
              <section key={stage} className="w-[286px] flex-none">
                <div className="mb-3 flex items-center gap-2 rounded-[10px] border border-hairline-soft bg-surface-1 px-3.5 py-2.5">
                  <StatusDot color={meta.dot} />
                  <span className="t-caption flex-1 truncate">{t(meta.short)}</span>
                  <span className="t-micro t-num rounded-full bg-surface-2 px-2 py-0.5 text-ink-muted">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {items.map((c) => (
                    <Link
                      key={c.id}
                      href={`/applications/${c.id}`}
                      className="card card-hover block p-4"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={c.studentName} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="t-body-sm truncate">{c.studentName}</div>
                          <div className="t-micro text-ink-faint">{c.updatedLabel}</div>
                        </div>
                        <span className="text-ink-faint">
                          <IconMore size={15} />
                        </span>
                      </div>

                      <div className="mt-3.5 space-y-1.5">
                        <div className="t-caption truncate text-ink-muted">
                          {c.universityName}
                        </div>
                        <div className="t-micro truncate text-ink-faint">
                          {c.programName} · {t(ref(CITY_LABEL, c.city))} ·{" "}
                          {t(ref(INTAKE_LABEL, c.intake))}
                        </div>
                        {c.studentPhone ? (
                          <div className="t-micro flex items-center gap-1.5 text-ink-faint">
                            <IconPhone size={12} />
                            {c.studentPhone}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-3.5">
                        <div className="t-micro mb-1.5 flex items-center justify-between text-ink-faint">
                          <span>{t(S.applications.dossier)}</span>
                          <span className="t-num">{c.dossierPercent}%</span>
                        </div>
                        <Progress
                          percent={c.dossierPercent}
                          tone={
                            c.dossierPercent >= 80
                              ? "var(--color-status-deal)"
                              : c.dossierPercent >= 40
                                ? "var(--color-status-progress)"
                                : "var(--color-status-risk)"
                          }
                        />
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <Chip
                          dot={
                            c.deadline && (isPast(c.deadline) || isSoon(c.deadline, 7))
                              ? "var(--color-status-risk)"
                              : "var(--color-status-hold)"
                          }
                        >
                          {f.relativeDeadline(c.deadline)}
                        </Chip>
                        <span className="t-micro t-num whitespace-nowrap text-ink-faint">
                          {f.somPair(c.paid, c.contractValue)}
                        </span>
                      </div>
                    </Link>
                  ))}

                  {!items.length ? (
                    <div className="t-micro rounded-[15px] border border-dashed border-hairline px-4 py-8 text-center text-ink-faint">
                      {t(S.common.empty)}
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
