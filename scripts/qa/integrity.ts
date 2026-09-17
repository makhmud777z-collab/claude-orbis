/**
 * Проверка ссылочной целостности демо-данных.
 * Ловит то, что не видит TypeScript: заявку на программу чужого вуза,
 * студента из другого агентства, набор, которого у вуза нет.
 * Запуск: npx tsx scripts/qa/integrity.ts
 */
import { APPLICATIONS } from "../../src/lib/data/applications";
import { DOCUMENTS } from "../../src/lib/data/documents";
import { STUDENTS } from "../../src/lib/data/students";
import { TASKS } from "../../src/lib/data/tasks";
import { UNIVERSITIES } from "../../src/lib/data/universities";
import { USERS } from "../../src/lib/data/users";
import { TENANTS } from "../../src/lib/tenants";

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

for (const a of APPLICATIONS) {
  const student = students.get(a.studentId);
  const uni = universities.get(a.universityId);
  if (!student) fail(`application ${a.id}: нет студента ${a.studentId}`);
  else if (student.tenantId !== a.tenantId)
    fail(`application ${a.id}: студент из другого агентства`);
  if (!uni) fail(`application ${a.id}: нет вуза ${a.universityId}`);
  else {
    const program = uni.programs.find((p) => p.id === a.programId);
    if (!program)
      fail(`application ${a.id}: программа ${a.programId} не принадлежит вузу ${uni.id}`);
    else if (program.degreeLevel !== a.degreeLevel)
      fail(
        `application ${a.id}: уровень ${a.degreeLevel}, а у программы ${program.degreeLevel}`,
      );
    if (!uni.intakes.includes(a.intake))
      fail(`application ${a.id}: у вуза ${uni.id} нет набора «${a.intake}»`);
  }
  const owner = users.get(a.ownerId);
  if (!owner) fail(`application ${a.id}: нет куратора ${a.ownerId}`);
  else if (owner.tenantId !== a.tenantId)
    fail(`application ${a.id}: куратор из другого агентства`);
  if (a.paid > a.contractValue)
    fail(`application ${a.id}: оплачено больше суммы договора`);
  if (a.paid < 0 || a.contractValue < 0) fail(`application ${a.id}: отрицательная сумма`);
}

for (const d of DOCUMENTS) {
  const s = students.get(d.studentId);
  if (!s) fail(`document ${d.id}: нет студента ${d.studentId}`);
  else if (s.tenantId !== d.tenantId)
    fail(`document ${d.id}: студент из другого агентства`);
  if (d.applicationId && !APPLICATIONS.some((a) => a.id === d.applicationId))
    fail(`document ${d.id}: нет заявки ${d.applicationId}`);
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
  if (t.relation?.type === "application" && !APPLICATIONS.some((a) => a.id === t.relation!.id))
    fail(`task ${t.id}: нет заявки ${t.relation.id}`);
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

console.log(
  problems.length
    ? `ПРОБЛЕМЫ ЦЕЛОСТНОСТИ (${problems.length}):`
    : "Данные целостны: ссылки, суммы и наборы сходятся",
);
problems.forEach((p) => console.log(" - " + p));
process.exit(problems.length ? 1 : 0);
