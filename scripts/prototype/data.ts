/**
 * Выгрузка данных для одностраничного прототипа.
 *
 * Прототип — это витрина для показа, но данные у него те же, что у продукта:
 * иначе он начнёт расходиться с системой уже на второй неделе. Скрипт берёт
 * сиды и справочники из src/lib и складывает их в один JSON, который собирается
 * в HTML скриптом build.mjs.
 *
 * Запуск: npx tsx scripts/prototype/data.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { CHANNELS } from "../../src/lib/data/channels";
import { DEALS } from "../../src/lib/data/deals";
import { DOCUMENTS } from "../../src/lib/data/documents";
import { LEADS } from "../../src/lib/data/leads";
import { DEPARTMENTS, DEPARTMENT_OF, PROJECTS, TASK_TEMPLATES, WORK_SESSIONS } from "../../src/lib/data/org";
import { PIPELINES } from "../../src/lib/data/pipelines";
import { STUDENTS } from "../../src/lib/data/students";
import { TASKS } from "../../src/lib/data/tasks";
import { TIMELINE } from "../../src/lib/data/timeline";
import { UNIVERSITIES } from "../../src/lib/data/universities";
import { USERS } from "../../src/lib/data/users";
import {
  BRANCH_LABEL, CITY_LABEL, DEADLINE_KIND, DEGREE_LABEL, DOCUMENT_CHECKLIST,
  DOCUMENT_STATUS, FIELD_LABEL,
  INTAKE_LABEL, OWNERSHIP_LABEL, PRIORITY_LABEL, PROGRAM_LANGUAGE, REGION_LABEL,
  SOURCE_LABEL, STUDENT_STATUS, TASK_STATUS, VISA_GRADE_LABEL,
} from "../../src/lib/labels";
import { ACTION_LABEL, MODULE_LABEL, ROLES } from "../../src/lib/rbac";
import { EDITIONS } from "../../src/lib/edition";
import { TENANTS } from "../../src/lib/tenants";

const payload = {
  tenants: TENANTS,
  users: USERS,
  students: STUDENTS,
  leads: LEADS,
  deals: DEALS,
  pipelines: PIPELINES,
  channels: CHANNELS,
  departments: DEPARTMENTS,
  departmentOf: DEPARTMENT_OF,
  projects: PROJECTS,
  templates: TASK_TEMPLATES,
  sessions: WORK_SESSIONS,
  timeline: TIMELINE,
  tasks: TASKS,
  documents: DOCUMENTS,
  checklist: DOCUMENT_CHECKLIST,
  universities: UNIVERSITIES,
  editions: EDITIONS,
  roles: ROLES,
  labels: {
    documentStatus: DOCUMENT_STATUS,
    taskStatus: TASK_STATUS,
    deadlineKind: DEADLINE_KIND,
    source: SOURCE_LABEL,
    degree: DEGREE_LABEL,
    ownership: OWNERSHIP_LABEL,
    studentStatus: STUDENT_STATUS,
    priority: PRIORITY_LABEL,
    visaGrade: VISA_GRADE_LABEL,
    programLanguage: PROGRAM_LANGUAGE,
    field: FIELD_LABEL,
    city: CITY_LABEL,
    region: REGION_LABEL,
    intake: INTAKE_LABEL,
    branch: BRANCH_LABEL,
    module: MODULE_LABEL,
    action: ACTION_LABEL,
  },
};

mkdirSync("scripts/prototype/build", { recursive: true });
writeFileSync("scripts/prototype/build/data.json", JSON.stringify(payload));
console.log(
  `Данные прототипа собраны: ${payload.deals.length} сделок, ${payload.leads.length} лидов, ` +
  `${payload.students.length} контактов, ${payload.universities.length} вузов`,
);
