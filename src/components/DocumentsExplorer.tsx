"use client";

import Link from "next/link";
import { useState } from "react";
import { setDocumentStatusAction } from "@/app/actions";
import { RequestDocumentDialog, type DocKindOption } from "./RequestDocumentDialog";
import { IconDocuments } from "./icons";
import { Avatar, Chip, Progress, StatusDot } from "./ui";
import { DOCUMENT_STATUS } from "@/lib/labels";
import { formatters } from "@/lib/format";
import { translator, type Loc, type Locale } from "@/lib/i18n";
import { P, S } from "@/lib/strings";
import type { DocumentStatus } from "@/lib/types";

export interface DossierFolder {
  studentId: string;
  studentName: string;
  ownerName: string;
  total: number;
  verified: number;
  problems: number;
  percent: number;
  updatedAt: string;
  items: {
    id: string;
    kind: Loc;
    fileName: string | null;
    status: DocumentStatus;
    sizeKb: number | null;
    needsApostille: boolean;
    expiresAt: string | null;
    updatedAt: string;
  }[];
}

/**
 * Досье документов. Отбор папок делает умный фильтр раздела,
 * здесь осталось только состояние «какая папка открыта».
 */
export function DocumentsExplorer({
  folders,
  locale,
  canEdit,
  request,
}: {
  folders: DossierFolder[];
  locale: Locale;
  canEdit: boolean;
  request: {
    students: { value: string; label: string; hint?: string }[];
    kinds: DocKindOption[];
    existing: Record<string, string[]>;
  } | null;
}) {
  const t = translator(locale);
  const f = formatters(locale);
  const [openId, setOpenId] = useState<string | null>(folders[0]?.studentId ?? null);
  const visible = folders;
  const open = visible.find((folder) => folder.studentId === openId) ?? visible[0];

  return (
    <>
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        <div className="min-w-0 space-y-2.5 lg:max-h-[72vh] lg:overflow-y-auto lg:pr-1">
          {visible.map((folder) => (
            <button
              key={folder.studentId}
              onClick={() => setOpenId(folder.studentId)}
              className={`card card-hover w-full p-4 text-left ${
                open?.studentId === folder.studentId
                  ? "!bg-surface-2 !border-hairline"
                  : ""
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={folder.studentName} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="t-body-sm truncate">{folder.studentName}</div>
                  <div className="t-micro truncate text-ink-faint">
                    {f.plural(folder.total, P.documents)} · {t(S.common.curator)}{" "}
                    {folder.ownerName}
                  </div>
                </div>
                {folder.problems ? (
                  <span
                    className="t-micro t-num rounded-full px-2 py-0.5"
                    style={{
                      background: "rgb(255 85 119 / 0.12)",
                      color: "var(--color-status-risk)",
                    }}
                  >
                    {folder.problems}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Progress
                  percent={folder.percent}
                  tone={
                    folder.percent >= 80
                      ? "var(--color-status-deal)"
                      : folder.percent >= 40
                        ? "var(--color-status-progress)"
                        : "var(--color-status-risk)"
                  }
                />
                <span className="t-micro t-num w-9 text-right text-ink-faint">
                  {folder.percent}%
                </span>
              </div>
            </button>
          ))}
          {!visible.length ? (
            <div className="card px-4 py-10 text-center">
              <div className="t-body-sm text-ink-muted">{t(S.documents.noFolders)}</div>
            </div>
          ) : null}
        </div>

        {open ? (
          <div className="card min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline-soft px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-2 text-ink-muted">
                  <IconDocuments size={17} />
                </span>
                <div>
                  <div className="t-body-sm">
                    {t(S.documents.dossierOf)} — {open.studentName}
                  </div>
                  <div className="t-micro text-ink-faint">
                    {open.verified} {t(S.documents.verified)} · {open.problems}{" "}
                    {t(S.documents.needAttention)} · {t(S.documents.updated)}{" "}
                    {f.shortDate(open.updatedAt)}
                  </div>
                </div>
              </div>
              {/* Две кнопки рядом на 390px не помещаются: переносим их,
                  а не выталкиваем карточку за экран. */}
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Link
                  href={`/crm/contacts/${open.studentId}`}
                  className="btn btn-secondary btn-sm"
                >
                  {t(S.applications.studentCard)}
                </Link>
                {request ? (
                  <RequestDocumentDialog
                    locale={locale}
                    students={request.students}
                    kinds={request.kinds}
                    existing={request.existing}
                    defaultStudentId={open.studentId}
                    label={t(S.documents.requestFor)}
                  />
                ) : null}
              </div>
            </div>

            <div className="divide-y divide-hairline-soft">
              {open.items.map((d) => {
                const st = DOCUMENT_STATUS[d.status];
                return (
                  <div key={d.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                    <StatusDot color={st.dot} />
                    <div className="min-w-[200px] flex-1">
                      <div className="t-body-sm">{t(d.kind)}</div>
                      <div className="t-micro text-ink-faint">
                        {d.fileName ?? t(S.students.fileMissing)}
                        {d.sizeKb ? ` · ${(d.sizeKb / 1024).toFixed(1)} MB` : ""}
                      </div>
                    </div>
                    {d.needsApostille ? <Chip>{t(S.students.apostille)}</Chip> : null}
                    {d.expiresAt ? (
                      <Chip dot="var(--color-status-progress)">
                        {t(S.documents.until)} {f.shortDate(d.expiresAt)}
                      </Chip>
                    ) : null}
                    <span className="t-caption w-24 text-right text-ink-muted">
                      {t(st.label)}
                    </span>
                    {/* Место под кнопки занято всегда: иначе колонка статуса
                        гуляла бы по строке — там, где действий нет, статус
                        уезжал вправо, а рядом со строкой с кнопками стоял левее. */}
                    {canEdit ? (
                      <div className="flex w-[184px] flex-none justify-end">
                        <DocActions id={d.id} status={d.status} locale={locale} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

/**
 * Проверка пункта досье. Раньше строка была только витриной: статус приходил
 * из данных и поменять его было нечем — хотя именно это куратор и делает,
 * когда студент присылает документ.
 */
function DocActions({
  id,
  status,
  locale,
}: {
  id: string;
  status: DocumentStatus;
  locale: Locale;
}) {
  const t = translator(locale);
  const steps: { to: DocumentStatus; label: string }[] =
    status === "requested" || status === "missing"
      ? [{ to: "uploaded", label: t(S.documents.markReceived) }]
      : status === "uploaded" || status === "expiring"
        ? [
            { to: "verified", label: t(S.documents.markVerified) },
            { to: "rejected", label: t(S.documents.markRejected) },
          ]
        : status === "rejected"
          ? [{ to: "uploaded", label: t(S.documents.markReceived) }]
          : [];

  if (!steps.length) return null;
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step) => (
        <form key={step.to} action={setDocumentStatusAction}>
          <input type="hidden" name="documentId" value={id} />
          <input type="hidden" name="status" value={step.to} />
          <button type="submit" className="btn btn-secondary btn-xs">
            {step.label}
          </button>
        </form>
      ))}
    </div>
  );
}
