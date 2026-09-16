import { DOCUMENT_CHECKLIST } from "../labels";
import type { DocumentStatus, StudentDocument } from "../types";
import { APPLICATIONS } from "./applications";
import { STUDENTS } from "./students";

/**
 * Досье студента формируется из базового чек-листа: по каждому пункту система
 * держит статус, версию и срок годности. Здесь статусы разложены детерминированно,
 * чтобы демо-данные были стабильны между рендерами.
 */

const STAGE_WEIGHT: Record<string, number> = {
  new: 0, consultation: 1, matching: 2, documents: 5,
  submitted: 9, university_review: 11, offer: 12, visa: 12, departed: 12, lost: 3,
};

const seed = (value: string) =>
  [...value].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 9973, 7);

function statusFor(index: number, progress: number, noise: number): DocumentStatus {
  if (index > progress) return noise % 3 === 0 ? "requested" : "missing";
  if (index === progress) return "uploaded";
  if (noise % 11 === 0) return "rejected";
  if (noise % 7 === 0) return "expiring";
  return "verified";
}

export const DOCUMENTS: StudentDocument[] = STUDENTS.flatMap((student) => {
  const apps = APPLICATIONS.filter((a) => a.studentId === student.id);
  const progress = Math.max(0, ...apps.map((a) => STAGE_WEIGHT[a.stage] ?? 0));
  const primaryApp = apps[0]?.id ?? null;

  return DOCUMENT_CHECKLIST.filter((item) => {
    if (item.kind === "Сертификат TOPIK" && student.profile.topik === 0) return false;
    if (item.kind === "Сертификат IELTS" && student.profile.ielts === null) return false;
    return true;
  }).map((item, index) => {
    const noise = seed(student.id + item.kind);
    const status = statusFor(index, progress, noise);
    const hasFile = status !== "missing" && status !== "requested";

    return {
      id: `d_${student.id}_${index}`,
      tenantId: student.tenantId,
      studentId: student.id,
      applicationId: index < 4 ? primaryApp : null,
      kind: item.kind,
      fileName: hasFile
        ? `${student.latinName.toLowerCase().replace(/\s+/g, "_")}_${index + 1}.pdf`
        : null,
      sizeKb: hasFile ? 180 + (noise % 2400) : null,
      status,
      version: status === "rejected" ? 2 : 1,
      expiresAt:
        item.kind === "Сертификат TOPIK"
          ? student.profile.topikExpiresAt
          : status === "expiring"
            ? "2026-10-05"
            : null,
      uploadedById: hasFile ? student.ownerId : null,
      updatedAt: `2026-09-${String(1 + (noise % 15)).padStart(2, "0")}`,
      needsApostille: item.needsApostille,
    } satisfies StudentDocument;
  });
});

export function documentsOfTenant(tenantId: string) {
  return DOCUMENTS.filter((d) => d.tenantId === tenantId);
}

export function documentsOfStudent(studentId: string) {
  return DOCUMENTS.filter((d) => d.studentId === studentId);
}

/** Готовность досье студента в процентах (проверено / всего). */
export function dossierProgress(studentId: string) {
  const docs = documentsOfStudent(studentId);
  if (!docs.length) return { done: 0, total: 0, percent: 0 };
  const done = docs.filter((d) => d.status === "verified").length;
  return { done, total: docs.length, percent: Math.round((done / docs.length) * 100) };
}
