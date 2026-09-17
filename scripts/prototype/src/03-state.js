/* ── состояние ───────────────────────────────────────────── */
const S = {
  tenant: "t_seoulway",
  userId: "u_aziz",
  locale: "ru",
  route: "dashboard",
  param: null,
  menu: false,
  shortlist: {},
  /* правки, которые делает пользователь прототипа */
  stages: {},        // pipelineId → stageKey → {label, color}
  moved: {},         // id карточки → стадия
  perms: {},         // роль → модуль → действия
  work: {},          // userId → {startedAt, endedAt, breakMinutes, onBreak}
  notes: [],         // добавленные записи истории
  cardFields: ["phone", "dossier", "deadline", "amount"],
  popover: null,     // открытый выпадающий список
  modal: null,       // открытое модальное окно
  drag: null,
  over: null,
  contacts: { status: "all", owner: "all", topik: "all", q: "" },
  catalog: { student: "none", strict: false, q: "", cities: [], ownership: [], fields: [], degree: "all", topik: "all", budget: "all", intake: "all", dorm: false, grant: false, english: false },
  docs: { tab: "all", open: null },
  tasks: { mine: false, assignee: "all" },
  lead: { name: "", phone: "", checked: false },
  noteKind: "activity",
  theme: "light",      // светлая по умолчанию, как в Битриксе
  filters: {},         // scope → {q, values, fields, preset}
  filterOpen: null,    // какой раздел раскрыл панель фильтра
  saved: {},           // userId:scope → [{name, state}]
  cal: { view: "month", date: TODAY_ISO },
  events: [],          // свои встречи, добавленные в прототипе
  org: { selected: null, zoom: 90, q: "" },
  moves: {},           // userId → departmentId (перенос в структуре)
  depts: [],           // отделы, созданные в прототипе
  heads: {},           // departmentId → userId
};
try {
  const savedTheme = localStorage.getItem("orbis-theme");
  if (savedTheme === "dark" || savedTheme === "light") S.theme = savedTheme;
} catch { /* приватное окно — тема на сессию */ }
try {
  const saved = localStorage.getItem("orbis-shortlist");
  if (saved) S.shortlist = JSON.parse(saved);
} catch { /* приватное окно — работаем без сохранения */ }

const tenant = () => D.tenants.find((x) => x.id === S.tenant);
const user = () => D.users.find((x) => x.id === S.userId);
const userById = (id) => D.users.find((x) => x.id === id);
const studentById = (id) => D.students.find((x) => x.id === id);
const leadById = (id) => D.leads.find((x) => x.id === id);
const dealById = (id) => D.deals.find((x) => x.id === id);
const uniById = (id) => D.universities.find((x) => x.id === id);
const programById = (id) => D.universities.flatMap((u) => u.programs).find((p) => p.id === id);
const channelById = (id) => D.channels.find((c) => c.id === id);
const scope = () => roleDef(user().role).scope;
const digits = (phone) => String(phone ?? "").replace(/\D/g, "");

/* ── воронки и стадии ────────────────────────────────────── */
const pipelinesOf = (entity) => D.pipelines.filter((p) => p.tenantId === S.tenant && p.entity === entity);
const defaultPipeline = (entity) => pipelinesOf(entity).find((p) => p.isDefault) ?? pipelinesOf(entity)[0];
const pipelineById = (id) => D.pipelines.find((p) => p.id === id);

/** Стадия с учётом правок пользователя: он переименовывает и красит их сам. */
function stageOf(pipeline, key) {
  const base = pipeline?.stages.find((s) => s.key === key);
  if (!base) return null;
  const patch = S.stages[pipeline.id]?.[key];
  return patch ? { ...base, ...patch } : base;
}
const stagesOf = (pipeline) => (pipeline?.stages ?? []).map((s) => stageOf(pipeline, s.key));

/** Текущая стадия карточки: локальный перенос важнее исходных данных. */
const currentStage = (record) => S.moved[record.id] ?? record.stage;

/* ── зона видимости ──────────────────────────────────────── */
const inScope = (branchId, ownerId) => {
  if (scope() === "tenant") return true;
  if (scope() === "branch") return branchId === user().branchId;
  return ownerId === S.userId;
};
const scopedContacts = () =>
  D.students.filter((s) => s.tenantId === S.tenant &&
    (inScope(s.branchId, s.ownerId) || (user().role === "partner" && s.referredById === S.userId)));
const scopedLeads = () =>
  D.leads.filter((l) => l.tenantId === S.tenant && inScope(l.branchId, l.ownerId));
const scopedDeals = () => {
  const ids = new Set(scopedContacts().map((s) => s.id));
  return D.deals.filter((d) => d.tenantId === S.tenant && (ids.has(d.studentId) || d.ownerId === S.userId));
};
const scopedDocuments = () => {
  const ids = new Set(scopedContacts().map((s) => s.id));
  return D.documents.filter((d) => ids.has(d.studentId));
};
const scopedTeam = () => {
  const staff = D.users.filter((u) => u.tenantId === S.tenant);
  return scope() === "branch" ? staff.filter((u) => u.branchId === user().branchId) : staff;
};
const scopedTasks = () => {
  const all = D.tasks.filter((x) => x.tenantId === S.tenant);
  if (scope() === "tenant") return all;
  if (scope() === "branch") {
    const ids = new Set(scopedTeam().map((u) => u.id));
    return all.filter((x) => ids.has(x.assigneeId) || ids.has(x.creatorId));
  }
  return all.filter((x) => x.assigneeId === S.userId || x.creatorId === S.userId);
};
const scopedProjects = () => {
  const all = D.projects.filter((p) => p.tenantId === S.tenant);
  if (scope() === "tenant") return all;
  return all.filter((p) => p.memberIds.includes(S.userId) || p.leadId === S.userId);
};

/* ── история ─────────────────────────────────────────────── */
const allTimeline = () => [...D.timeline, ...S.notes].filter((e) => e.tenantId === S.tenant);
const timelineOf = (entity, entityId) =>
  allTimeline().filter((e) => e.entity === entity && e.entityId === entityId)
    .sort((a, b) => b.at.localeCompare(a.at));
const scopedActivity = () => {
  const all = allTimeline();
  if (scope() === "tenant") return all.sort((a, b) => b.at.localeCompare(a.at));
  const ids = scope() === "branch" ? new Set(scopedTeam().map((u) => u.id)) : new Set([S.userId]);
  return all.filter((e) => ids.has(e.authorId)).sort((a, b) => b.at.localeCompare(a.at));
};
function addNote(entity, entityId, kind, title, body, dueAt) {
  S.notes.push({
    id: "tl_" + Math.random().toString(36).slice(2, 9),
    tenantId: S.tenant, entity, entityId, kind, title, body: body || null,
    authorId: S.userId, at: "2026-09-16T09:30:00", source: null,
    dueAt: dueAt || null, done: kind === "activity" ? false : null,
  });
}

/* ── дедупликация: один человек — один контакт и один активный лид ── */
const isActiveLead = (l) => currentStage(l) !== "converted" && currentStage(l) !== "junk";
function findDuplicate(phone, email) {
  const p = digits(phone);
  const e = (email ?? "").trim().toLowerCase();
  for (const s of D.students.filter((x) => x.tenantId === S.tenant)) {
    if (p && digits(s.phone) === p) return { kind: "contact", id: s.id, name: s.fullName, by: "phone" };
    if (e && s.email.toLowerCase() === e) return { kind: "contact", id: s.id, name: s.fullName, by: "email" };
  }
  for (const l of D.leads.filter((x) => x.tenantId === S.tenant && isActiveLead(x))) {
    if (p && digits(l.phone) === p) return { kind: "lead", id: l.id, name: l.name, by: "phone" };
    if (e && (l.email ?? "").toLowerCase() === e) return { kind: "lead", id: l.id, name: l.name, by: "email" };
  }
  return null;
}

/* ── рабочий день ────────────────────────────────────────── */
function workOf(userId) {
  if (S.work[userId]) return S.work[userId];
  const open = D.sessions.find((s) => s.userId === userId && !s.endedAt);
  return open ? { startedAt: open.startedAt, endedAt: null, breakMinutes: open.breakMinutes, onBreak: Boolean(open.onBreakSince) } : null;
}
function sessionMinutes(s) {
  const end = s.endedAt ? parseDate(s.endedAt) : TODAY;
  return Math.max(0, Math.round((end - parseDate(s.startedAt)) / 60000) - (s.breakMinutes ?? 0));
}
const hhmm = (mins) => `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;

/**
 * Секунды рабочего дня. Отметка, поставленная прямо сейчас, считается по
 * настоящим часам — счётчик в шапке обязан идти вживую, иначе он украшение.
 * Демо-отметки из сидов остаются на демо-времени, иначе прототип показал бы
 * тысячи часов.
 */
function sessionSeconds(w) {
  if (!w) return 0;
  const breakMs = (w.breakSeconds ?? (w.breakMinutes ?? 0) * 60) * 1000;
  const paused = w.onBreak && w.breakSince ? Date.now() - w.breakSince : 0;
  if (w.startedMs) return Math.max(0, Math.round((Date.now() - w.startedMs - breakMs - paused) / 1000));
  return sessionMinutes(w) * 60;
}
const clockText = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
};

/* ── дедлайны: считаются из сделок, документов и задач ───── */
function dossier(studentId) {
  const docs = D.documents.filter((d) => d.studentId === studentId);
  const done = docs.filter((d) => d.status === "verified").length;
  return { done, total: docs.length, percent: docs.length ? Math.round((done / docs.length) * 100) : 0, docs };
}
function scopedDeadlines() {
  const items = [];
  const byId = new Map(scopedContacts().map((s) => [s.id, s]));
  for (const d of scopedDeals()) {
    if (!d.deadline) continue;
    const name = byId.get(d.studentId)?.fullName ?? "—";
    items.push({
      id: "dl_deal_" + d.id, kind: currentStage(d) === "visa" ? "visa" : "university",
      title: currentStage(d) === "visa"
        ? loc(`${name} — решение по визе`, `${name} — viza bo‘yicha qaror`)
        : loc(`${name} — дедлайн подачи`, `${name} — topshirish muddati`),
      date: d.deadline, ownerId: d.ownerId, go: "deal/" + d.id,
    });
  }
  for (const doc of scopedDocuments()) {
    if (!doc.expiresAt || daysUntil(doc.expiresAt) > 120) continue;
    const name = byId.get(doc.studentId)?.fullName ?? "—";
    items.push({
      id: "dl_doc_" + doc.id, kind: "document",
      title: loc(`${name} — истекает «${doc.kind.ru}»`, `${name} — «${doc.kind.uz}» muddati tugayapti`),
      date: doc.expiresAt, ownerId: doc.uploadedById ?? S.userId, go: "contact/" + doc.studentId,
    });
  }
  for (const task of scopedTasks()) {
    if (task.status === "done") continue;
    items.push({ id: "dl_task_" + task.id, kind: "task", title: loc(task.title, task.title), date: task.dueAt, ownerId: task.assigneeId, go: "tasks" });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

/* ── умный фильтр ────────────────────────────────────────── */
/**
 * Фильтр в портале один на все разделы: раздел описывает поля и отдаёт
 * плоскую строку (row), сопоставление делает одна функция. Новый раздел
 * получает фильтр, написав только эти две вещи.
 */
function filterState(scopeKey) {
  S.filters[scopeKey] ??= { q: "", values: {}, fields: null, preset: null };
  return S.filters[scopeKey];
}
function activeFields(scopeKey, fields) {
  const st = filterState(scopeKey);
  return st.fields ?? fields.filter((f) => f.def).map((f) => f.key);
}
function matchesFilter(row, fields, values, query) {
  if (query) {
    const hay = String(row.search ?? "").toLowerCase();
    if (!hay.includes(query.trim().toLowerCase())) return false;
  }
  for (const f of fields) {
    if (f.range) {
      const from = values[f.key + "From"];
      const to = values[f.key + "To"];
      const v = row[f.key];
      if (from !== undefined && from !== "" && !(Number(v) >= Number(from))) return false;
      if (to !== undefined && to !== "" && !(Number(v) <= Number(to))) return false;
      continue;
    }
    const want = values[f.key];
    if (want === undefined || want === "" || want === "all") continue;
    const v = row[f.key];
    if (f.kind === "text") {
      if (!String(v ?? "").toLowerCase().includes(String(want).toLowerCase())) return false;
    } else if (Array.isArray(v)) {
      if (!v.map(String).includes(String(want))) return false;
    } else if (String(v ?? "") !== String(want)) return false;
  }
  return true;
}
/** Условия, которые реально сужают выдачу, — их и показываем чипами. */
function activeConditions(fields, values) {
  const out = [];
  for (const f of fields) {
    if (f.range) {
      if (values[f.key + "From"]) out.push({ key: f.key + "From", label: t(f.label), value: `≥ ${values[f.key + "From"]}` });
      if (values[f.key + "To"]) out.push({ key: f.key + "To", label: t(f.label), value: `≤ ${values[f.key + "To"]}` });
      continue;
    }
    const v = values[f.key];
    if (v === undefined || v === "" || v === "all") continue;
    const opt = f.options?.find((o) => String(o.value) === String(v));
    out.push({ key: f.key, label: t(f.label), value: opt ? t(opt.label) : String(v) });
  }
  return out;
}
const savedKey = (scopeKey) => `${S.userId}:${scopeKey}`;
const savedFilters = (scopeKey) => S.saved[savedKey(scopeKey)] ?? [];

/* ── календарь ───────────────────────────────────────────── */
const EVENT_KIND = {
  meeting: { label: loc("Встреча", "Uchrashuv"), color: "var(--accent)" },
  call: { label: loc("Звонок", "Qo‘ng‘iroq"), color: "var(--violet)" },
  interview: { label: loc("Собеседование", "Suhbat"), color: "var(--deal)" },
  personal: { label: loc("Личное", "Shaxsiy"), color: "var(--hold)" },
};
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shiftDay = (isoDate, days) => { const d = parseDate(isoDate); d.setDate(d.getDate() + days); return iso(d); };
/** Неделя начинается с понедельника — так её читают и в Ташкенте, и в Сеуле. */
function weekStart(isoDate) {
  const d = parseDate(isoDate);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return iso(d);
}
const minutesOf = (hhmmStr) => {
  const [h, m] = String(hhmmStr).split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Демо-встречи вокруг сегодняшнего дня: без них дневной срез пустой. */
function seedEvents() {
  const mine = scopedDeals().slice(0, 6);
  const plan = [
    { d: 0, s: "10:00", e: "11:00", k: "meeting", n: loc("Консультация по подаче", "Hujjat topshirish bo‘yicha maslahat") },
    { d: 0, s: "13:30", e: "14:00", k: "call", n: loc("Звонок родителям", "Ota-onaga qo‘ng‘iroq") },
    { d: 0, s: "16:00", e: "17:30", k: "interview", n: loc("Собеседование с вузом", "Universitet bilan suhbat") },
    { d: 1, s: "09:30", e: "10:30", k: "meeting", n: loc("Разбор досье", "Hujjatlar tahlili") },
    { d: 2, s: "15:00", e: "16:00", k: "meeting", n: loc("Встреча в офисе", "Ofisda uchrashuv") },
    { d: -1, s: "11:00", e: "12:00", k: "call", n: loc("Уточнение по визе", "Viza bo‘yicha aniqlik") },
  ];
  return plan.map((x, i) => {
    const deal = mine[i % Math.max(1, mine.length)];
    const contact = deal ? studentById(deal.studentId) : null;
    return {
      id: `ev_seed_${i}`, date: shiftDay(TODAY_ISO, x.d), startTime: x.s, endTime: x.e,
      kind: x.k, title: t(x.n), ownerId: S.userId,
      relation: contact ? contact.fullName : "",
    };
  });
}

/** Всё, что видно в календаре: свои встречи плюс сроки из других разделов. */
function calendarItems() {
  const own = [...seedEvents(), ...S.events.filter((e) => e.ownerId === S.userId)]
    .map((e) => ({ ...e, source: "event" }));
  const deadlines = scopedDeadlines().map((d) => ({
    id: d.id, date: d.date, startTime: "09:00", endTime: "09:30",
    kind: "deadline", title: t(d.title), relation: "", source: "deadline", go: d.go,
  }));
  return [...own, ...deadlines];
}
const itemsOn = (isoDate) => calendarItems().filter((x) => x.date === isoDate)
  .sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime));

/* ── структура компании ──────────────────────────────────── */
const allDepartments = () => [...D.departments.filter((d) => d.tenantId === S.tenant), ...S.depts];
const departmentOf = (userId) => S.moves[userId] ?? D.departmentOf[userId] ?? null;
const headOf = (deptId) => S.heads[deptId] ?? allDepartments().find((d) => d.id === deptId)?.headId ?? null;
const staffOf = (deptId) => D.users.filter((u) => u.tenantId === S.tenant && departmentOf(u.id) === deptId);
