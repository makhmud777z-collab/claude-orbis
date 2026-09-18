"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loc } from "@/lib/i18n";
import { allow, type Action, type Module } from "@/lib/rbac";
import * as db from "@/lib/store";
import type { CalendarEvent, Lead, Role, StudentDocument, TimelineEvent } from "@/lib/types";
import { checklistKey, DOCUMENT_CHECKLIST } from "@/lib/labels";
import { ADMIN_COOKIE, adminUnlocked, passcodeMatches } from "@/lib/admin-lock";
import { getSession } from "@/lib/session";
import {
  NO_STUDENT,
  parseShortlist,
  SHORTLIST_COOKIE,
  toggle,
  type ShortlistMap,
} from "@/lib/shortlist";

/** Заголовки записей истории, которые сотрудник добавляет руками. */
const TIMELINE_TITLE: Partial<Record<TimelineEvent["kind"], { ru: string; uz: string }>> & {
  comment: { ru: string; uz: string };
  activity: { ru: string; uz: string };
} = {
  comment: loc("Комментарий", "Izoh"),
  activity: loc("Дело", "Ish"),
  message: loc("Сообщение", "Xabar"),
  task: loc("Задача", "Vazifa"),
};

/** Демо-переключатели: в бою их место занимают вход и выбор рабочего пространства. */

export async function switchUser(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const store = await cookies();
  store.set("orbis_user", userId, { path: "/", maxAge: 60 * 60 * 24 * 30 });
  revalidatePath("/", "layout");
}

export async function switchLocale(formData: FormData) {
  const locale = String(formData.get("locale") ?? "");
  const store = await cookies();
  store.set("orbis_locale", locale === "uz" ? "uz" : "ru", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}

export async function switchTenant(formData: FormData) {
  const slug = String(formData.get("tenant") ?? "");
  const store = await cookies();
  store.set("orbis_tenant", slug, { path: "/", maxAge: 60 * 60 * 24 * 30 });
  store.delete("orbis_user");
  store.delete("orbis_locale");
  revalidatePath("/", "layout");
}

/** Шорт-лист вузов: добавить или убрать вуз для выбранного студента. */
export async function toggleShortlist(formData: FormData) {
  const universityId = String(formData.get("universityId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  if (!universityId) return;

  const store = await cookies();
  const map: ShortlistMap = parseShortlist(store.get(SHORTLIST_COOKIE)?.value);
  store.set(SHORTLIST_COOKIE, JSON.stringify(toggle(map, studentId, universityId)), {
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  revalidatePath("/universities");
  revalidatePath("/universities/compare");
}

export async function clearShortlist(formData: FormData) {
  const studentId = String(formData.get("studentId") || NO_STUDENT);
  const store = await cookies();
  const map: ShortlistMap = parseShortlist(store.get(SHORTLIST_COOKIE)?.value);
  delete map[studentId];
  store.set(SHORTLIST_COOKIE, JSON.stringify(map), {
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  revalidatePath("/universities");
  revalidatePath("/universities/compare");
}

/* ── CRM: перенос карточек, лиды, конвертация ────────────────── */

const actor = getSession;

/** Перенос карточки канбана на другую стадию — запись уходит и в историю. */
export async function moveCardAction(formData: FormData) {
  const entity = String(formData.get("entity") ?? "") as "lead" | "deal";
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (entity !== "lead" && entity !== "deal") return;

  const session = await actor();
  const module = entity === "lead" ? "leads" : "deals";
  if (!allow(session.tenant.id, session.role, module, "edit")) return;

  db.moveCard(entity, id, stage, session.user.id, session.tenant.id);
  revalidatePath("/crm/leads");
  revalidatePath("/crm/deals");
  revalidatePath("/", "layout");
}

/** Создание лида. Дубль по телефону не создаёт вторую карточку. */
export async function createLeadAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "leads", "create")) return;

  const phone = String(formData.get("phone") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!phone || !name) return;

  db.createLead({
    tenantId: session.tenant.id,
    name,
    phone,
    email: String(formData.get("email") ?? "").trim() || null,
    source: (String(formData.get("source") || "instagram") as Lead["source"]),
    channelId: String(formData.get("channelId") ?? "") || null,
    comment: String(formData.get("comment") ?? "").trim(),
    ownerId: String(formData.get("ownerId") || session.user.id),
    branchId: session.user.branchId,
  });
  revalidatePath("/crm/leads");
}

export async function convertLeadAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "leads", "edit")) return;

  const result = db.convertLead(String(formData.get("leadId") ?? ""), session.user.id);
  revalidatePath("/crm/leads");
  revalidatePath("/crm/deals");
  revalidatePath("/crm/contacts");
  if (result.ok) redirect(`/crm/deals/${result.dealId}`);
}

/** Комментарий, дело или сообщение в историю карточки. */
export async function addTimelineAction(formData: FormData) {
  const session = await actor();
  const entity = String(formData.get("entity") ?? "") as TimelineEvent["entity"];
  const entityId = String(formData.get("entityId") ?? "");
  const kind = String(formData.get("kind") || "comment") as TimelineEvent["kind"];
  const body = String(formData.get("body") ?? "").trim();
  const dueAt = String(formData.get("dueAt") ?? "").trim() || null;
  if (!entityId || !body) return;

  db.addTimeline({
    tenantId: session.tenant.id,
    entity,
    entityId,
    kind,
    title: kind === "activity" ? TIMELINE_TITLE.activity : TIMELINE_TITLE[kind] ?? TIMELINE_TITLE.comment,
    body,
    authorId: session.user.id,
    source: null,
    dueAt,
    done: kind === "activity" ? false : null,
  });
  revalidatePath("/crm/leads");
  revalidatePath("/crm/deals");
  revalidatePath("/crm/contacts");
}

/* ── Настройки воронки и карточки ────────────────────────────── */

export async function updateStageAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "crmSettings", "edit")) return;

  const pipelineId = String(formData.get("pipelineId") ?? "");
  const stageKey = String(formData.get("stageKey") ?? "");
  const ru = String(formData.get("labelRu") ?? "").trim();
  const uz = String(formData.get("labelUz") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();

  const hintRu = String(formData.get("hintRu") ?? "").trim();
  const hintUz = String(formData.get("hintUz") ?? "").trim();
  const final = String(formData.get("final") ?? "");

  if (ru && uz) db.renameStage(pipelineId, stageKey, { ru, uz });
  if (/^#[0-9a-fA-F]{6}$/.test(color)) db.setStageColor(pipelineId, stageKey, color.toLowerCase());
  db.setStageHint(pipelineId, stageKey, { ru: hintRu, uz: hintUz });
  db.setStageFinal(pipelineId, stageKey, final === "won" || final === "lost" ? final : null);
  revalidateCrm();
}

/** Порядок стадий, добавление и удаление — то же право на настройки CRM. */
export async function moveStageAction(formData: FormData) {
  if (!(await canEditCrm())) return;
  db.moveStage(
    String(formData.get("pipelineId") ?? ""),
    String(formData.get("stageKey") ?? ""),
    Number(formData.get("delta") ?? 0),
  );
  revalidateCrm();
}

export async function addStageAction(formData: FormData) {
  if (!(await canEditCrm())) return;
  const ru = String(formData.get("labelRu") ?? "").trim();
  const uz = String(formData.get("labelUz") ?? "").trim() || ru;
  const color = String(formData.get("color") ?? "").trim();
  if (!ru) return;
  db.addStage(
    String(formData.get("pipelineId") ?? ""),
    { ru, uz },
    /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : "#0a6ed1",
  );
  revalidateCrm();
}

export async function removeStageAction(formData: FormData) {
  if (!(await canEditCrm())) return;
  db.removeStage(String(formData.get("pipelineId") ?? ""), String(formData.get("stageKey") ?? ""));
  revalidateCrm();
}

export async function updatePipelineAction(formData: FormData) {
  if (!(await canEditCrm())) return;
  const id = String(formData.get("pipelineId") ?? "");
  const ru = String(formData.get("nameRu") ?? "").trim();
  const uz = String(formData.get("nameUz") ?? "").trim() || ru;
  if (ru) db.renamePipeline(id, { ru, uz });
  if (formData.get("makeDefault")) db.setDefaultPipeline(id);
  revalidateCrm();
}

export async function addPipelineAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "crmSettings", "edit")) return;
  const ru = String(formData.get("nameRu") ?? "").trim();
  const uz = String(formData.get("nameUz") ?? "").trim() || ru;
  const entity = String(formData.get("entity") ?? "deal") === "lead" ? "lead" : "deal";
  if (!ru) return;
  db.addPipeline(session.tenant.id, entity, { ru, uz });
  revalidateCrm();
}

export async function removePipelineAction(formData: FormData) {
  if (!(await canEditCrm())) return;
  db.removePipeline(String(formData.get("pipelineId") ?? ""));
  revalidateCrm();
}

async function canEditCrm() {
  const session = await actor();
  return allow(session.tenant.id, session.role, "crmSettings", "edit");
}

/** Воронка видна на трёх экранах сразу — обновляем их вместе. */
function revalidateCrm() {
  revalidatePath("/admin/pipelines");
  revalidatePath("/crm/deals");
  revalidatePath("/crm/leads");
  revalidatePath("/");
}

/** Какие поля показывать на карточке канбана — настройка каждого сотрудника. */
export async function setCardFieldsAction(formData: FormData) {
  const session = await actor();
  db.setCardFields(session.user.id, formData.getAll("field").map(String));
  revalidatePath("/crm/deals");
  revalidatePath("/crm/leads");
}

/* ── пользователи и филиалы ──────────────────────────────────── */

export async function inviteUserAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "admin", "create")) return;

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!name || !email) return;

  db.inviteUser({
    tenantId: session.tenant.id,
    name,
    email,
    title: String(formData.get("title") ?? "").trim() || name,
    role: (String(formData.get("role") ?? "sales_manager") as Role),
    branchId: String(formData.get("branchId") ?? "") || session.user.branchId,
  });
  revalidatePath("/admin/users");
  revalidatePath("/team");
}

export async function addBranchAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "settings", "edit")) return;
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  if (!name || !city) return;
  db.addBranch(session.tenant.id, name, city);
  revalidatePath("/admin/portal");
}

/* ── каналы продаж ───────────────────────────────────────────── */

export async function toggleChannelAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "crmSettings", "edit")) return;
  db.toggleChannel(String(formData.get("channelId") ?? ""));
  revalidatePath("/admin/channels");
  revalidatePath("/admin");
}

/* ── задачи ──────────────────────────────────────────────────── */

export async function addTaskAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "tasks", "create")) return;

  const title = String(formData.get("title") ?? "").trim();
  const dueAt = String(formData.get("dueAt") ?? "").trim();
  if (!title || !dueAt) return;

  const priority = String(formData.get("priority") ?? "normal");
  db.addTask({
    tenantId: session.tenant.id,
    title,
    description: String(formData.get("description") ?? "").trim(),
    assigneeId: String(formData.get("assigneeId") ?? "") || session.user.id,
    creatorId: session.user.id,
    dueAt,
    priority: priority === "low" || priority === "high" ? priority : "normal",
  });
  revalidatePath("/tasks");
  revalidatePath("/deadlines");
  revalidatePath("/");
}

/* ── документы ───────────────────────────────────────────────── */

/**
 * Запрос документа у студента. Загрузки файла в системе пока нет — есть
 * запрос: пункт досье встаёт в статус «запрошен» и попадает в историю контакта.
 */
export async function requestDocumentAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "documents", "create")) return;

  const studentId = String(formData.get("studentId") ?? "");
  const key = String(formData.get("kind") ?? "");
  const item = DOCUMENT_CHECKLIST.find((x) => checklistKey(x.kind) === key);
  if (!studentId || !item) return;

  db.requestDocument({
    tenantId: session.tenant.id,
    studentId,
    kind: item.kind,
    needsApostille: item.needsApostille,
    note: String(formData.get("note") ?? ""),
    authorId: session.user.id,
  });
  revalidatePath("/documents");
  revalidatePath(`/crm/contacts/${studentId}`);
}

/** Куратор проверил документ или вернул его на доработку. */
export async function setDocumentStatusAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "documents", "edit")) return;

  const id = String(formData.get("documentId") ?? "");
  const status = String(formData.get("status") ?? "") as StudentDocument["status"];
  if (!["requested", "uploaded", "verified", "rejected"].includes(status)) return;

  const result = db.setDocumentStatus(id, status, session.user.id);
  revalidatePath("/documents");
  if (result.ok) revalidatePath(`/crm/contacts/${result.doc.studentId}`);
}

/* ── Права доступа ───────────────────────────────────────────── */

export async function setPermissionAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "admin", "edit")) return;

  db.setPermission(
    session.tenant.id,
    String(formData.get("role") ?? "") as Role,
    String(formData.get("module") ?? "") as Module,
    formData.getAll("action").map(String) as Action[],
  );
  revalidatePath("/", "layout");
}

/* ── Рабочий день ────────────────────────────────────────────── */

export async function workdayAction(formData: FormData) {
  const session = await actor();
  const what = String(formData.get("what") ?? "");
  if (what === "start") db.startWorkDay(session.tenant.id, session.user.id);
  if (what === "end") db.endWorkDay(session.user.id);
  if (what === "break") db.toggleBreak(session.user.id);
  revalidatePath("/", "layout");
}

/**
 * Проверка дубля до создания карточки.
 * Правило агентства: один человек — один контакт и один активный лид,
 * потому что телефон у него один. Вторая карточка на тот же номер не заводится.
 */
export async function findDuplicateAction(probe: { phone?: string; email?: string | null }) {
  const session = await actor();
  const hit = db.findDuplicate(session.tenant.id, probe);
  if (!hit) return null;
  return {
    ...hit,
    href: hit.kind === "contact" ? `/crm/contacts/${hit.id}` : `/crm/leads/${hit.id}`,
  };
}

/** Правка полей прямо в карточке — кнопка «Изменить» у блока основных полей. */
export async function updateCardAction(formData: FormData) {
  const session = await actor();
  const entity = String(formData.get("entity") ?? "") as "lead" | "deal" | "contact" | "employee";
  const id = String(formData.get("id") ?? "");
  const module =
    entity === "lead" ? "leads"
    : entity === "deal" ? "deals"
    : entity === "employee" ? "team"
    : "contacts";
  if (!allow(session.tenant.id, session.role, module, "edit")) return;

  const patch: Record<string, string> = {};
  for (const key of db.EDITABLE[entity] ?? []) {
    const value = formData.get(key);
    if (value !== null) patch[key] = String(value);
  }

  db.updateCard(entity, id, patch, session.user.id);
  if (entity === "employee") {
    revalidatePath("/", "layout");
    return;
  }
  revalidatePath(`/crm/${module}/${id}`);
  revalidatePath(`/crm/${module}`);
}

/* ── Администрирование: роли и доступ сотрудников ────────────── */

export async function setUserRoleAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "admin", "edit")) return;

  db.setUserRole(
    String(formData.get("userId") ?? ""),
    String(formData.get("role") ?? "") as Role,
    session.user.id,
  );
  revalidatePath("/", "layout");
}

export async function setUserStatusAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "admin", "edit")) return;

  db.setUserStatus(
    String(formData.get("userId") ?? ""),
    String(formData.get("status") ?? "active") as "active" | "invited" | "suspended",
    session.user.id,
  );
  revalidatePath("/", "layout");
}

/** Тема портала — настройка сотрудника, а не агентства: у каждого своя. */
export async function switchTheme(formData: FormData) {
  const value = String(formData.get("theme") ?? "");
  const store = await cookies();
  store.set("orbis_theme", value === "dark" ? "dark" : "light", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}

/* ── замок администрирования ─────────────────────────────────── */

/**
 * Вход в настройки по коду. Портал сотрудников и портал владельца — это
 * два разных места: менеджер работает, владелец настраивает. Код держит
 * границу между ними и в демо, и в бою.
 */
export async function unlockAdminAction(formData: FormData) {
  const session = await getSession();
  const code = String(formData.get("code") ?? "");
  const back = String(formData.get("next") ?? "/admin");
  if (!passcodeMatches(session.tenant, code)) {
    redirect(`/admin?e=1&next=${encodeURIComponent(back)}`);
  }
  const store = await cookies();
  // без maxAge: замок закрывается вместе с браузером — так безопаснее
  store.set(ADMIN_COOKIE, session.tenant.id, { path: "/", httpOnly: true, sameSite: "lax" });
  redirect(back);
}

export async function lockAdminAction() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/");
}

export async function setPasscodeAction(formData: FormData) {
  const session = await getSession();
  if (!(await adminUnlocked(session.tenant.id))) return;
  const code = String(formData.get("code") ?? "").trim();
  // Четыре цифры — компромисс: код набирают с телефона по десять раз в день.
  if (!/^\d{4,12}$/.test(code)) return;
  db.setPasscode(session.tenant.id, code);
  revalidatePath("/admin", "layout");
}

/* ── умный фильтр ────────────────────────────────────────────── */

export async function saveFilterAction(formData: FormData) {
  const session = await actor();
  const scope = String(formData.get("scope") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const query = String(formData.get("query") ?? "");
  if (!scope || !name) return;

  db.saveFilter(session.user.id, scope, name, query);
  revalidatePath("/", "layout");
}

export async function deleteFilterAction(formData: FormData) {
  const session = await actor();
  db.deleteFilter(
    session.user.id,
    String(formData.get("scope") ?? ""),
    String(formData.get("id") ?? ""),
  );
  revalidatePath("/", "layout");
}

/* ── Календарь ───────────────────────────────────────────────── */

export async function addEventAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "calendar", "create")) return;

  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  if (!title || !date) return;

  const startTime = String(formData.get("startTime") || "10:00");
  const endTime = String(formData.get("endTime") || "11:00");

  db.addEvent({
    tenantId: session.tenant.id,
    title,
    kind: String(formData.get("kind") || "meeting") as CalendarEvent["kind"],
    date,
    startTime,
    // Событие не может кончаться раньше, чем началось: иначе оно исчезнет
    // из часовой сетки, и сотрудник решит, что оно не сохранилось.
    endTime: endTime > startTime ? endTime : startTime,
    ownerId: session.user.id,
    relation: null,
    note: String(formData.get("note") ?? "").trim(),
  });
  revalidatePath("/calendar");
}

export async function removeEventAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "calendar", "delete")) return;
  db.removeEvent(String(formData.get("id") ?? ""));
  revalidatePath("/calendar");
}

/* ── Структура компании ──────────────────────────────────────── */

export async function addDepartmentAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "structure", "edit")) return;

  const ru = String(formData.get("nameRu") ?? "").trim();
  const uz = String(formData.get("nameUz") ?? "").trim() || ru;
  if (!ru) return;

  db.addDepartment(
    session.tenant.id,
    { ru, uz },
    String(formData.get("parentId") ?? "") || null,
    String(formData.get("headId") ?? "") || null,
  );
  revalidatePath("/team/structure");
}

export async function setDepartmentHeadAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "structure", "edit")) return;

  db.setDepartmentHead(
    String(formData.get("departmentId") ?? ""),
    String(formData.get("headId") ?? "") || null,
  );
  revalidatePath("/team/structure");
}

export async function moveEmployeeAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "structure", "edit")) return;

  db.moveEmployee(
    String(formData.get("userId") ?? ""),
    String(formData.get("departmentId") ?? ""),
    session.user.id,
  );
  revalidateStructure();
}

export async function renameDepartmentAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "structure", "edit")) return;
  const ru = String(formData.get("nameRu") ?? "").trim();
  const uz = String(formData.get("nameUz") ?? "").trim() || ru;
  if (!ru) return;
  db.renameDepartment(String(formData.get("departmentId") ?? ""), { ru, uz });
  revalidateStructure();
}

export async function removeDepartmentAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "structure", "edit")) return;
  db.removeDepartment(String(formData.get("departmentId") ?? ""));
  revalidateStructure();
}

export async function unassignEmployeeAction(formData: FormData) {
  const session = await actor();
  if (!allow(session.tenant.id, session.role, "structure", "edit")) return;
  db.unassignEmployee(String(formData.get("userId") ?? ""), session.user.id);
  revalidateStructure();
}

/** Структура видна и на схеме, и в карточках сотрудников. */
function revalidateStructure() {
  revalidatePath("/team/structure");
  revalidatePath("/team");
}
