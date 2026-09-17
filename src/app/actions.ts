"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loc } from "@/lib/i18n";
import { allow, type Action, type Module } from "@/lib/rbac";
import * as db from "@/lib/store";
import type { Lead, Role, TimelineEvent } from "@/lib/types";
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

async function actor() {
  const { getSession } = await import("@/lib/session");
  return getSession();
}

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

  if (ru && uz) db.renameStage(pipelineId, stageKey, { ru, uz });
  if (/^#[0-9a-fA-F]{6}$/.test(color)) db.setStageColor(pipelineId, stageKey, color.toLowerCase());
  revalidatePath("/crm/pipelines");
  revalidatePath("/crm/deals");
  revalidatePath("/crm/leads");
}

/** Какие поля показывать на карточке канбана — настройка каждого сотрудника. */
export async function setCardFieldsAction(formData: FormData) {
  const session = await actor();
  db.setCardFields(session.user.id, formData.getAll("field").map(String));
  revalidatePath("/crm/deals");
  revalidatePath("/crm/leads");
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
  const entity = String(formData.get("entity") ?? "") as "lead" | "deal" | "contact";
  const id = String(formData.get("id") ?? "");
  const module = entity === "lead" ? "leads" : entity === "deal" ? "deals" : "contacts";
  if (!allow(session.tenant.id, session.role, module, "edit")) return;

  const patch: Record<string, string> = {};
  for (const key of db.EDITABLE[entity] ?? []) {
    const value = formData.get(key);
    if (value !== null) patch[key] = String(value);
  }

  db.updateCard(entity, id, patch, session.user.id);
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
