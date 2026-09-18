import { documentsOfTenant } from "./store";
import { isActiveLead } from "./data/leads";
import { usersOfTenant } from "./data/users";
import { daysUntil } from "./format";
import { loc } from "./i18n";
import type { Session } from "./session";
import * as store from "./store";
import type {
  Deadline, Deal, Lead, Project, Student, StudentDocument, Task,
} from "./types";

/**
 * Единственная точка, где применяется область видимости роли.
 * tenant — всё агентство · branch — свой филиал · own — только свои записи.
 */
function inScope(session: Session, branchId: string, ownerId: string): boolean {
  if (session.scope === "tenant") return true;
  if (session.scope === "branch") return branchId === session.user.branchId;
  return ownerId === session.user.id;
}

export function scopedContacts(session: Session): Student[] {
  return store.allStudents(session.tenant.id).filter(
    (s) =>
      inScope(session, s.branchId, s.ownerId) ||
      (session.role === "partner" && s.referredById === session.user.id),
  );
}

export function scopedLeads(session: Session): Lead[] {
  return store.allLeads(session.tenant.id).filter((l) => inScope(session, l.branchId, l.ownerId));
}

export function scopedDeals(session: Session): Deal[] {
  const contacts = new Map(scopedContacts(session).map((s) => [s.id, s]));
  return store
    .allDeals(session.tenant.id)
    .filter((d) => contacts.has(d.studentId) || d.ownerId === session.user.id);
}

export function scopedDocuments(session: Session): StudentDocument[] {
  const ids = new Set(scopedContacts(session).map((s) => s.id));
  return documentsOfTenant(session.tenant.id).filter((d) => ids.has(d.studentId));
}

export function scopedTeam(session: Session) {
  const staff = usersOfTenant(session.tenant.id);
  return session.scope === "branch"
    ? staff.filter((u) => u.branchId === session.user.branchId)
    : staff;
}

export function scopedTasks(session: Session): Task[] {
  const all = store.allTasks(session.tenant.id);
  if (session.scope === "tenant") return all;
  if (session.scope === "branch") {
    const ids = new Set(scopedTeam(session).map((u) => u.id));
    return all.filter((t) => ids.has(t.assigneeId) || ids.has(t.creatorId));
  }
  return all.filter((t) => t.assigneeId === session.user.id || t.creatorId === session.user.id);
}

export function scopedProjects(session: Session): Project[] {
  const all = store.allProjects(session.tenant.id);
  if (session.scope === "tenant") return all;
  return all.filter(
    (p) => p.memberIds.includes(session.user.id) || p.leadId === session.user.id,
  );
}

/** Лента событий агентства по зоне видимости сотрудника. */
export function scopedActivity(session: Session) {
  const ids = new Set(scopedTeam(session).map((u) => u.id));
  const mine = session.scope === "own" ? new Set([session.user.id]) : ids;
  return store
    .timelineAll(session.tenant.id)
    .filter((e) => session.scope === "tenant" || mine.has(e.authorId))
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Активные лиды — те, что участвуют в дедупликации и висят на сотруднике. */
export const activeLeads = (session: Session) => scopedLeads(session).filter(isActiveLead);

/**
 * Дедлайны не хранятся отдельно — они вычисляются из сделок, документов и задач.
 * Один источник правды: изменилась сделка → изменился календарь.
 */
export function scopedDeadlines(session: Session): Deadline[] {
  const contacts = new Map(scopedContacts(session).map((s) => [s.id, s]));
  const items: Deadline[] = [];

  for (const deal of scopedDeals(session)) {
    if (!deal.deadline) continue;
    const name = contacts.get(deal.studentId)?.fullName ?? "—";
    items.push({
      id: `dl_deal_${deal.id}`,
      tenantId: deal.tenantId,
      kind: deal.stage === "visa" ? "visa" : "university",
      title:
        deal.stage === "visa"
          ? loc(`${name} — решение по визе`, `${name} — viza bo‘yicha qaror`)
          : loc(`${name} — дедлайн подачи`, `${name} — topshirish muddati`),
      date: deal.deadline,
      ownerId: deal.ownerId,
      relation: { type: "deal", id: deal.id },
    });
  }

  for (const doc of scopedDocuments(session)) {
    if (!doc.expiresAt || daysUntil(doc.expiresAt) > 120) continue;
    const name = contacts.get(doc.studentId)?.fullName ?? "—";
    items.push({
      id: `dl_doc_${doc.id}`,
      tenantId: doc.tenantId,
      kind: "document",
      title: loc(
        `${name} — истекает «${doc.kind.ru}»`,
        `${name} — «${doc.kind.uz}» muddati tugayapti`,
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
        task.relation && (task.relation.type === "student" || task.relation.type === "deal")
          ? { type: task.relation.type, id: task.relation.id }
          : null,
    });
  }

  return items.sort((a, b) => a.date.localeCompare(b.date));
}


/**
 * Что требует внимания сегодня: просроченные сроки и задачи впереди,
 * ближайшая неделя следом. Это не лента событий — лента рассказывает,
 * что уже произошло, а уведомления говорят, что сейчас не сделано.
 */
export function noticesFor(session: Session) {
  const own = scopedDeadlines(session).filter((d) => d.ownerId === session.user.id);
  return own
    .filter((d) => daysUntil(d.date) <= 7)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 12)
    .map((d) => ({
      id: d.id,
      date: d.date,
      title: d.title,
      kind: d.kind,
      relation: d.relation,
      overdue: daysUntil(d.date) < 0,
    }));
}
