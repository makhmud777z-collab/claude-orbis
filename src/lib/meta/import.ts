import * as db from "../store";
import { usersOfTenant } from "../data/users";
import type { MetaField, LeadgenEvent } from "./webhook";
import type { LeadSource, MetaFormMapping, MetaTarget } from "../types";

/**
 * Превращение лида Meta в лид Orbis.
 *
 * Поля формы у каждого агентства свои: одно спрашивает «телефон», другое
 * «ваш номер для связи». Поэтому соответствие задаётся в Orbis на каждую
 * форму, а здесь только применяется.
 */

/** Имена полей, которые Meta отдаёт сама, — их узнаём без настройки. */
const KNOWN: Record<string, MetaTarget> = {
  full_name: "name",
  first_name: "name",
  last_name: "name",
  name: "name",
  phone_number: "phone",
  phone: "phone",
  email: "email",
};

/** Догадка о раскладке для формы, которую ещё не настроили руками. */
export function guessMapping(fields: string[]): Record<string, MetaTarget> {
  const map: Record<string, MetaTarget> = {};
  for (const f of fields) map[f] = KNOWN[f.toLowerCase()] ?? "";
  return map;
}

export interface LeadDraft {
  name: string;
  phone: string;
  email: string | null;
  comment: string;
}

/**
 * Раскладка полей по карточке. Всё, что никуда не назначено, не теряется,
 * а уходит в комментарий: пустая карточка хуже лишней строки, а менеджеру
 * нужно видеть, что человек вообще написал.
 */
export function applyMapping(fields: MetaField[], map: Record<string, MetaTarget>): LeadDraft {
  const parts: Record<MetaTarget, string[]> = { name: [], phone: [], email: [], comment: [], "": [] };

  for (const field of fields) {
    const value = (field.values ?? []).filter(Boolean).join(", ").trim();
    if (!value) continue;
    const target = map[field.name] ?? "";
    if (target) parts[target].push(value);
    else parts.comment.push(`${field.name}: ${value}`);
  }

  return {
    name: parts.name.join(" ").trim(),
    phone: parts.phone.join(" ").trim(),
    email: parts.email[0]?.trim() || null,
    comment: parts.comment.join("\n").trim(),
  };
}

export interface ImportResult {
  status: "imported" | "duplicate" | "unknown_page" | "no_mapping" | "failed";
  note: string;
  leadId: string | null;
  tenantId: string | null;
}

/**
 * Весь путь от события до записи в воронке.
 *
 * Как достать сам лид, передаётся снаружи: в бою это Graph API, в тестах
 * и в симуляторе — готовый набор полей. Иначе проверить путь можно было бы
 * только живой рекламой.
 */
/**
 * Отличает «доступ отозван» от «Meta моргнула».
 *
 * Код 190 и 10 — это «токен недействителен» и «нет прав»: такое само не
 * пройдёт, страницу надо подключать заново. Сетевая ошибка или 500 —
 * пройдёт, и переводить из-за них страницу в «переподключите» значило бы
 * пугать агентство на ровном месте.
 */
function tokenDead(note: string): boolean {
  return /\b(190|463|467)\b/.test(note) || /OAuth|session has expired|access token/i.test(note)
    || /Graph API 401|Graph API 403/.test(note);
}

export async function importLead(
  event: LeadgenEvent,
  load: (leadgenId: string, token: string) => Promise<MetaField[]>,
  source: LeadSource = "facebook",
): Promise<ImportResult> {
  const page = db.metaPageByPageId(event.pageId);
  if (!page) {
    return {
      status: "unknown_page", leadId: null, tenantId: null,
      note: `Страница ${event.pageId} не подключена ни к одному агентству`,
    };
  }

  // Meta повторяет событие, пока не получит 200. Без этой проверки
  // повтор превращается во второй такой же лид в воронке.
  if (db.metaEventSeen(event.leadgenId)) {
    return { status: "duplicate", leadId: null, tenantId: page.tenantId, note: "Этот лид уже принят" };
  }

  let fields: MetaField[];
  try {
    fields = await load(event.leadgenId, page.token);
  } catch (err) {
    const note = err instanceof Error ? err.message : "Не удалось забрать лид";

    /*
     * Умерший токен нельзя оставлять под зелёной надписью «Подключено».
     * Агентство видит подключённую страницу, лиды при этом не идут, и
     * понять это можно только дочитав журнал до конца. Переводим страницу
     * в «переподключите» — на экране это красная строка, а не тишина.
     */
    if (tokenDead(note)) {
      db.saveMetaPage({ ...page, status: "needs_reconnect" });
      return {
        status: "failed", leadId: null, tenantId: page.tenantId,
        note: `Доступ к странице больше не действует — переподключите её. ${note}`,
      };
    }

    return { status: "failed", leadId: null, tenantId: page.tenantId, note };
  }

  const names = fields.map((f) => f.name);
  let form: MetaFormMapping | undefined = db.metaFormBy(event.pageId, event.formId);
  if (!form) {
    // Форму видим впервые: заводим с догадкой, чтобы лид не потерялся,
    // и показываем её агентству — пусть поправит, если угадали не всё.
    form = db.saveMetaForm({
      id: `mf_${event.pageId}_${event.formId}`,
      tenantId: page.tenantId,
      pageId: event.pageId,
      formId: event.formId,
      formName: `Форма ${event.formId}`,
      map: guessMapping(names),
      ownerId: null,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
  }

  const draft = applyMapping(fields, form.map);
  if (!draft.phone && !draft.email) {
    return {
      status: "no_mapping", leadId: null, tenantId: page.tenantId,
      note: `Ни телефон, ни почта не разложены. Поля формы: ${names.join(", ") || "пусто"}`,
    };
  }

  const staff = usersOfTenant(page.tenantId);
  const owner = staff.find((u) => u.id === form.ownerId)
    ?? staff.find((u) => u.role === "owner")
    ?? staff[0];
  if (!owner) {
    return { status: "failed", leadId: null, tenantId: page.tenantId, note: "В агентстве нет сотрудников" };
  }

  const created = db.createLead({
    tenantId: page.tenantId,
    name: draft.name || "Без имени",
    phone: draft.phone,
    email: draft.email,
    source,
    channelId: page.channelId,
    comment: draft.comment,
    ownerId: owner.id,
    branchId: owner.branchId,
  });

  if (!created.ok) {
    return {
      status: "duplicate", leadId: null, tenantId: page.tenantId,
      note: "Такой телефон уже есть — обращение записано в историю карточки",
    };
  }
  return { status: "imported", leadId: created.lead.id, tenantId: page.tenantId, note: form.formName };
}
