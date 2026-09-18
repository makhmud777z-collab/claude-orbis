/**
 * Проверка ссылочной целостности демо-данных.
 * Ловит то, что не видит TypeScript: заявку на программу чужого вуза,
 * студента из другого агентства, набор, которого у вуза нет.
 * Запуск: npx tsx scripts/qa/integrity.ts
 */
import { CHANNELS } from "../../src/lib/data/channels";
import { DEALS } from "../../src/lib/data/deals";
import { DEPARTMENTS, DEPARTMENT_OF, PROJECTS, WORK_SESSIONS } from "../../src/lib/data/org";
import { TIMELINE } from "../../src/lib/data/timeline";
import { LEADS, digits, isActiveLead } from "../../src/lib/data/leads";
import { PIPELINES } from "../../src/lib/data/pipelines";
import { DOCUMENTS } from "../../src/lib/data/documents";
import { STUDENTS } from "../../src/lib/data/students";
import { TASKS } from "../../src/lib/data/tasks";
import { UNIVERSITIES } from "../../src/lib/data/universities";
import { USERS } from "../../src/lib/data/users";
import { TENANTS } from "../../src/lib/tenants";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const problems: string[] = [];
const fail = (msg: string) => problems.push(msg);

const tenants = new Map(TENANTS.map((t) => [t.id, t]));
const users = new Map(USERS.map((u) => [u.id, u]));
const students = new Map(STUDENTS.map((s) => [s.id, s]));
const universities = new Map(UNIVERSITIES.map((u) => [u.id, u]));

for (const u of USERS) {
  if (!tenants.has(u.tenantId)) fail(`user ${u.id}: нет арендатора ${u.tenantId}`);
  const branches = tenants.get(u.tenantId)?.branches.map((b) => b.id) ?? [];
  if (!branches.includes(u.branchId))
    fail(`user ${u.id}: филиал ${u.branchId} не принадлежит ${u.tenantId}`);
}

for (const s of STUDENTS) {
  if (!tenants.has(s.tenantId)) fail(`student ${s.id}: нет арендатора ${s.tenantId}`);
  const owner = users.get(s.ownerId);
  if (!owner) fail(`student ${s.id}: нет куратора ${s.ownerId}`);
  else if (owner.tenantId !== s.tenantId)
    fail(`student ${s.id}: куратор ${owner.id} из другого агентства`);
  const branches = tenants.get(s.tenantId)?.branches.map((b) => b.id) ?? [];
  if (!branches.includes(s.branchId))
    fail(`student ${s.id}: филиал ${s.branchId} не принадлежит ${s.tenantId}`);
  if (s.referredById && !users.has(s.referredById))
    fail(`student ${s.id}: нет партнёра ${s.referredById}`);
  if (s.profile.topik < 0 || s.profile.topik > 6)
    fail(`student ${s.id}: TOPIK вне 0–6 (${s.profile.topik})`);
  if (s.profile.ielts !== null && (s.profile.ielts < 0 || s.profile.ielts > 9))
    fail(`student ${s.id}: IELTS вне 0–9 (${s.profile.ielts})`);
  if (s.profile.gpa !== null && (s.profile.gpa < 0 || s.profile.gpa > 4))
    fail(`student ${s.id}: GPA вне 0–4 (${s.profile.gpa})`);
  if (s.profile.topik === 0 && s.profile.topikExpiresAt)
    fail(`student ${s.id}: срок TOPIK есть, а сертификата нет`);
}

for (const a of DEALS) {
  const student = students.get(a.studentId);
  const uni = universities.get(a.universityId);
  if (!student) fail(`deal ${a.id}: нет студента ${a.studentId}`);
  else if (student.tenantId !== a.tenantId)
    fail(`deal ${a.id}: студент из другого агентства`);
  if (!uni) fail(`deal ${a.id}: нет вуза ${a.universityId}`);
  else {
    const program = uni.programs.find((p) => p.id === a.programId);
    if (!program)
      fail(`deal ${a.id}: программа ${a.programId} не принадлежит вузу ${uni.id}`);
    else if (program.degreeLevel !== a.degreeLevel)
      fail(
        `deal ${a.id}: уровень ${a.degreeLevel}, а у программы ${program.degreeLevel}`,
      );
    if (!uni.intakes.includes(a.intake))
      fail(`deal ${a.id}: у вуза ${uni.id} нет набора «${a.intake}»`);
  }
  const owner = users.get(a.ownerId);
  if (!owner) fail(`deal ${a.id}: нет куратора ${a.ownerId}`);
  else if (owner.tenantId !== a.tenantId)
    fail(`deal ${a.id}: куратор из другого агентства`);
  if (a.paid > a.contractValue)
    fail(`deal ${a.id}: оплачено больше суммы договора`);
  if (a.paid < 0 || a.contractValue < 0) fail(`deal ${a.id}: отрицательная сумма`);
}

for (const d of DOCUMENTS) {
  const s = students.get(d.studentId);
  if (!s) fail(`document ${d.id}: нет студента ${d.studentId}`);
  else if (s.tenantId !== d.tenantId)
    fail(`document ${d.id}: студент из другого агентства`);
  if (d.dealId && !DEALS.some((x) => x.id === d.dealId))
    fail(`document ${d.id}: нет сделки ${d.dealId}`);
  if ((d.status === "verified" || d.status === "uploaded") && !d.fileName)
    fail(`document ${d.id}: статус «${d.status}», но файла нет`);
}

for (const t of TASKS) {
  if (!users.has(t.assigneeId)) fail(`task ${t.id}: нет исполнителя ${t.assigneeId}`);
  if (!users.has(t.creatorId)) fail(`task ${t.id}: нет автора ${t.creatorId}`);
  if (users.get(t.assigneeId)?.tenantId !== t.tenantId)
    fail(`task ${t.id}: исполнитель из другого агентства`);
  if (t.relation?.type === "student" && !students.has(t.relation.id))
    fail(`task ${t.id}: нет студента ${t.relation.id}`);
  if (t.relation?.type === "deal" && !DEALS.some((x) => x.id === t.relation!.id))
    fail(`task ${t.id}: нет сделки ${t.relation.id}`);
}

for (const u of UNIVERSITIES) {
  const ids = new Set<string>();
  for (const p of u.programs) {
    if (ids.has(p.id)) fail(`university ${u.id}: дубль программы ${p.id}`);
    ids.add(p.id);
    if (!u.fields.includes(p.field) && p.field !== "Языковая программа")
      fail(`university ${u.id}: направление «${p.field}» программы ${p.id} не заявлено в fields`);
    // Языковые программы требований по TOPIK не имеют — на них как раз идут
    // учить язык, поэтому общий минимум вуза к ним не применяется.
    if (
      p.topikMin < u.requirements.topikMin &&
      p.language !== "en" &&
      p.degreeLevel !== "language"
    )
      fail(
        `university ${u.id}: программа ${p.id} требует TOPIK ${p.topikMin}, вуз — ${u.requirements.topikMin}`,
      );
  }
  const covered = u.intakeDeadlines.map((d) => d.intake);
  for (const intake of u.intakes)
    if (!covered.includes(intake))
      fail(`university ${u.id}: нет дедлайна для набора «${intake}»`);
  for (const d of u.intakeDeadlines)
    if (!u.intakes.includes(d.intake))
      fail(`university ${u.id}: дедлайн для несуществующего набора «${d.intake}»`);
  if (u.dormAvailable && u.dormCostPerYear === null)
    fail(`university ${u.id}: общежитие есть, стоимость не указана`);
  if (!u.dormAvailable && u.dormCostPerYear !== null)
    fail(`university ${u.id}: общежития нет, а стоимость указана`);
}


/* ── CRM: воронки, лиды, дедупликация ────────────────────────── */

const pipelines = new Map(PIPELINES.map((p) => [p.id, p]));

for (const p of PIPELINES) {
  if (!tenants.has(p.tenantId)) fail(`pipeline ${p.id}: нет арендатора ${p.tenantId}`);
  const keys = new Set<string>();
  for (const stage of p.stages) {
    if (keys.has(stage.key)) fail(`pipeline ${p.id}: дубль стадии ${stage.key}`);
    keys.add(stage.key);
    if (!/^#[0-9a-f]{6}$/i.test(stage.color))
      fail(`pipeline ${p.id}: стадия ${stage.key} — цвет «${stage.color}» не HEX`);
  }
  if (!p.stages.some((s) => s.final === "won"))
    fail(`pipeline ${p.id}: нет финальной стадии успеха`);
}

for (const t of TENANTS) {
  for (const entity of ["lead", "deal"] as const) {
    const list = PIPELINES.filter((p) => p.tenantId === t.id && p.entity === entity);
    if (!list.length) fail(`tenant ${t.id}: нет воронки ${entity}`);
    else if (list.filter((p) => p.isDefault).length !== 1)
      fail(`tenant ${t.id}: у воронок ${entity} должна быть ровно одна по умолчанию`);
  }
}

for (const d of DEALS) {
  const pipeline = pipelines.get(d.pipelineId);
  if (!pipeline) fail(`deal ${d.id}: нет воронки ${d.pipelineId}`);
  else {
    if (pipeline.tenantId !== d.tenantId) fail(`deal ${d.id}: воронка из другого агентства`);
    if (!pipeline.stages.some((s) => s.key === d.stage))
      fail(`deal ${d.id}: стадии «${d.stage}» нет в воронке ${pipeline.id}`);
  }
}

for (const l of LEADS) {
  if (!tenants.has(l.tenantId)) fail(`lead ${l.id}: нет арендатора ${l.tenantId}`);
  const owner = users.get(l.ownerId);
  if (!owner) fail(`lead ${l.id}: нет ответственного ${l.ownerId}`);
  else if (owner.tenantId !== l.tenantId)
    fail(`lead ${l.id}: ответственный из другого агентства`);
  const pipeline = PIPELINES.find((p) => p.tenantId === l.tenantId && p.entity === "lead" && p.isDefault);
  if (pipeline && !pipeline.stages.some((s) => s.key === l.stage))
    fail(`lead ${l.id}: стадии «${l.stage}» нет в воронке лидов`);
  if (l.stage === "converted" && !l.convertedContactId)
    fail(`lead ${l.id}: конвертирован, но контакт не указан`);
  if (l.convertedContactId && !students.has(l.convertedContactId))
    fail(`lead ${l.id}: нет контакта ${l.convertedContactId}`);
  if (l.convertedDealId && !DEALS.some((d) => d.id === l.convertedDealId))
    fail(`lead ${l.id}: нет сделки ${l.convertedDealId}`);
}

/**
 * Главное правило CRM агентства: один человек — один контакт и один активный
 * лид. Ключ человека — телефон, поэтому дубли ищем по нему, игнорируя формат.
 */
for (const tenant of TENANTS) {
  const seen = new Map<string, string>();
  const add = (phone: string, who: string) => {
    const key = digits(phone);
    if (!key) return;
    const previous = seen.get(key);
    if (previous) fail(`дубль по номеру ${phone}: ${previous} и ${who}`);
    else seen.set(key, who);
  };
  for (const s of STUDENTS.filter((x) => x.tenantId === tenant.id)) add(s.phone, `контакт ${s.id}`);
  for (const l of LEADS.filter((x) => x.tenantId === tenant.id && isActiveLead(x)))
    add(l.phone, `лид ${l.id}`);
}

/* ── задачи и проекты ────────────────────────────────────────── */

for (const t of TASKS) {
  if (t.projectId && !PROJECTS.some((p) => p.id === t.projectId))
    fail(`task ${t.id}: нет проекта ${t.projectId}`);
  if (t.projectId) {
    const project = PROJECTS.find((p) => p.id === t.projectId);
    if (project && project.tenantId !== t.tenantId)
      fail(`task ${t.id}: проект из другого агентства`);
  }
}

for (const p of PROJECTS) {
  if (!users.has(p.leadId)) fail(`project ${p.id}: нет руководителя ${p.leadId}`);
  for (const memberId of p.memberIds)
    if (!users.has(memberId)) fail(`project ${p.id}: нет участника ${memberId}`);
}

/* ── структура компании и рабочие дни ────────────────────────── */

for (const d of DEPARTMENTS) {
  if (!tenants.has(d.tenantId)) fail(`department ${d.id}: нет арендатора ${d.tenantId}`);
  if (d.parentId && !DEPARTMENTS.some((x) => x.id === d.parentId))
    fail(`department ${d.id}: нет родителя ${d.parentId}`);
  if (d.headId && !users.has(d.headId)) fail(`department ${d.id}: нет руководителя ${d.headId}`);
}

for (const [userId, departmentId] of Object.entries(DEPARTMENT_OF)) {
  if (!users.has(userId)) fail(`структура: нет сотрудника ${userId}`);
  if (!DEPARTMENTS.some((d) => d.id === departmentId))
    fail(`структура: нет подразделения ${departmentId} у ${userId}`);
}

for (const s of WORK_SESSIONS) {
  if (!users.has(s.userId)) fail(`workday ${s.id}: нет сотрудника ${s.userId}`);
  if (s.endedAt && s.endedAt <= s.startedAt) fail(`workday ${s.id}: конец раньше начала`);
  if (s.breakMinutes < 0) fail(`workday ${s.id}: отрицательный перерыв`);
  if (!s.startedAt.startsWith(s.date)) fail(`workday ${s.id}: дата и отметка расходятся`);
}

/* ── история ─────────────────────────────────────────────────── */

for (const e of TIMELINE) {
  if (!tenants.has(e.tenantId)) fail(`timeline ${e.id}: нет арендатора ${e.tenantId}`);
  if (!users.has(e.authorId)) fail(`timeline ${e.id}: нет автора ${e.authorId}`);
  const exists =
    e.entity === "deal" ? DEALS.some((d) => d.id === e.entityId)
    : e.entity === "lead" ? LEADS.some((l) => l.id === e.entityId)
    : e.entity === "contact" ? students.has(e.entityId)
    : users.has(e.entityId);
  if (!exists) fail(`timeline ${e.id}: нет записи ${e.entity} ${e.entityId}`);
}

/* ── каналы продаж ───────────────────────────────────────────── */

for (const c of CHANNELS) {
  if (!tenants.has(c.tenantId)) fail(`channel ${c.id}: нет арендатора ${c.tenantId}`);
  if (c.status === "connected" && !c.connectedAt)
    fail(`channel ${c.id}: подключён, но нет даты подключения`);
}
for (const l of LEADS) {
  if (l.channelId && !CHANNELS.some((c) => c.id === l.channelId))
    fail(`lead ${l.id}: нет канала ${l.channelId}`);
  const channel = CHANNELS.find((c) => c.id === l.channelId);
  if (channel && channel.tenantId !== l.tenantId)
    fail(`lead ${l.id}: канал из другого агентства`);
}

/* ── единственный источник правды ────────────────────────────── */

/**
 * Коллекции, которые правит хранилище. Читать их напрямую из src/lib/data
 * нельзя никому, кроме самого хранилища: страница показала бы данные до
 * правки — добавленный отдел не появился бы в фильтре, отключённый канал
 * остался бы подключённым. Ошибка молчаливая, поэтому ловим её здесь.
 */
const LIVE_SOURCES = ["documents", "channels", "org"];

const srcRoot = resolve(import.meta.dirname, "../../src");
for (const file of walk(srcRoot)) {
  const rel = relative(srcRoot, file);
  if (rel === "lib/store.ts" || rel.startsWith("lib/data/")) continue;
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/from "(?:@\/lib|\.{1,2}(?:\/\.\.)*)\/data\/(\w+)"/g)) {
    const mod = match[1];
    if (!LIVE_SOURCES.includes(mod)) continue;
    // Сиды (DOCUMENTS, CHANNELS, DEPARTMENTS) читает только хранилище;
    // остальным нужны его функции.
    const line = text.slice(0, match.index).split("\n").length;
    fail(`${rel}:${line}: данные из data/${mod} читаются мимо хранилища`);
  }
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.tsx?$/.test(entry.name)) yield full;
  }
}

console.log(
  problems.length
    ? `ПРОБЛЕМЫ ЦЕЛОСТНОСТИ (${problems.length}):`
    : "Данные целостны: ссылки, суммы и наборы сходятся",
);
problems.forEach((p) => console.log(" - " + p));
process.exit(problems.length ? 1 : 0);
