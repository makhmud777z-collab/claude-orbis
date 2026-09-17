import { activityOfTenant } from "./data/activity";
import { applicationsOfTenant } from "./data/applications";
import { documentsOfTenant } from "./data/documents";
import { studentsOfTenant } from "./data/students";
import { tasksOfTenant } from "./data/tasks";
import { usersOfTenant } from "./data/users";
import { daysUntil } from "./format";
import { loc } from "./i18n";
import { DEADLINE_KIND } from "./labels";
import type { Session } from "./session";
import type { Application, Deadline, Student, StudentDocument, Task } from "./types";

/**
 * Единственная точка, где применяется область видимости роли.
 * tenant — всё агентство · branch — свой филиал · own — только свои записи.
 */
function inScope(session: Session, branchId: string, ownerId: string): boolean {
  if (session.scope === "tenant") return true;
  if (session.scope === "branch") return branchId === session.user.branchId;
  return ownerId === session.user.id;
}

export function scopedStudents(session: Session): Student[] {
  return studentsOfTenant(session.tenant.id).filter(
    (s) =>
      inScope(session, s.branchId, s.ownerId) ||
      // агент-партнёр не ведёт студента, но видит тех, кого сам привёл
      (session.role === "partner" && s.referredById === session.user.id),
  );
}

export function scopedApplications(session: Session): Application[] {
  const students = new Map(scopedStudents(session).map((s) => [s.id, s]));
  return applicationsOfTenant(session.tenant.id).filter(
    (a) => students.has(a.studentId) || a.ownerId === session.user.id,
  );
}

export function scopedDocuments(session: Session): StudentDocument[] {
  const students = new Set(scopedStudents(session).map((s) => s.id));
  return documentsOfTenant(session.tenant.id).filter((d) => students.has(d.studentId));
}

export function scopedTasks(session: Session): Task[] {
  const all = tasksOfTenant(session.tenant.id);
  if (session.scope === "tenant") return all;
  if (session.scope === "branch") {
    const staff = new Set(
      usersOfTenant(session.tenant.id)
        .filter((u) => u.branchId === session.user.branchId)
        .map((u) => u.id),
    );
    return all.filter((t) => staff.has(t.assigneeId) || staff.has(t.creatorId));
  }
  return all.filter(
    (t) => t.assigneeId === session.user.id || t.creatorId === session.user.id,
  );
}

export function scopedTeam(session: Session) {
  const staff = usersOfTenant(session.tenant.id);
  return session.scope === "branch"
    ? staff.filter((u) => u.branchId === session.user.branchId)
    : staff;
}

export function scopedActivity(session: Session) {
  return activityOfTenant(session.tenant.id);
}

/**
 * Дедлайны не хранятся отдельно — они вычисляются из заявок, документов и задач.
 * Один источник правды: изменилась заявка → изменился календарь.
 */
export function scopedDeadlines(session: Session): Deadline[] {
  const students = new Map(scopedStudents(session).map((s) => [s.id, s]));
  const items: Deadline[] = [];

  for (const app of scopedApplications(session)) {
    if (!app.deadline) continue;
    const student = students.get(app.studentId);
    const name = student?.fullName ?? "—";
    items.push({
      id: `dl_app_${app.id}`,
      tenantId: app.tenantId,
      kind: app.stage === "visa" ? "visa" : "university",
      title:
        app.stage === "visa"
          ? loc(`${name} — решение по визе`, `${name} — viza bo‘yicha qaror`)
          : loc(`${name} — дедлайн подачи`, `${name} — topshirish muddati`),
      date: app.deadline,
      ownerId: app.ownerId,
      relation: { type: "application", id: app.id },
    });
  }

  for (const doc of scopedDocuments(session)) {
    if (!doc.expiresAt) continue;
    if (daysUntil(doc.expiresAt) > 120) continue;
    const owner = students.get(doc.studentId)?.fullName ?? "—";
    items.push({
      id: `dl_doc_${doc.id}`,
      tenantId: doc.tenantId,
      kind: "document",
      title: loc(
        `${owner} — истекает «${doc.kind.ru}»`,
        `${owner} — «${doc.kind.uz}» muddati tugayapti`,
      ),
      date: doc.expiresAt,
      ownerId: doc.uploadedById ?? session.user.id,
      relation: { type: "student", id: doc.studentId },
    });
  }

  for (const task of scopedTasks(session)) {
    if (task.status === "done") continue;
    items.push({
      id: `dl_task_${task.id}`,
      tenantId: task.tenantId,
      kind: "task",
      title: loc(task.title, task.title),
      date: task.dueAt,
      ownerId: task.assigneeId,
      relation:
        task.relation && (task.relation.type === "student" || task.relation.type === "application")
          ? { type: task.relation.type, id: task.relation.id }
          : null,
    });
  }

  return items.sort((a, b) => a.date.localeCompare(b.date));
}

export function deadlineLabel(kind: keyof typeof DEADLINE_KIND) {
  return DEADLINE_KIND[kind];
}
