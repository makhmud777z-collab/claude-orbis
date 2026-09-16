import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowUpRight, IconMail, IconPhone, IconPlus } from "@/components/icons";
import { NoAccess } from "@/components/NoAccess";
import {
  Avatar,
  Chip,
  Field,
  PageHeader,
  Progress,
  SectionTitle,
  StatusDot,
} from "@/components/ui";
import { applicationsOfStudent } from "@/lib/data/applications";
import { documentsOfStudent, dossierProgress } from "@/lib/data/documents";
import { TASKS } from "@/lib/data/tasks";
import { UNIVERSITIES, universityById } from "@/lib/data/universities";
import { userById } from "@/lib/data/users";
import { age, formatDate, formatShortDate, money, relativeDeadline } from "@/lib/format";
import {
  DEGREE_LABEL,
  DOCUMENT_STATUS,
  OWNERSHIP_LABEL,
  SOURCE_LABEL,
  STUDENT_STATUS,
  stageMeta,
} from "@/lib/labels";
import { matchStudent, verdictDot, verdictLabel } from "@/lib/matching";
import { can } from "@/lib/rbac";
import { scopedStudents } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!can(session.role, "students")) {
    return <NoAccess role={session.role} module="Студенты" />;
  }

  const student = scopedStudents(session).find((s) => s.id === id);
  if (!student) notFound();

  const owner = userById(student.ownerId);
  const apps = applicationsOfStudent(student.id);
  const docs = documentsOfStudent(student.id);
  const dossier = dossierProgress(student.id);
  const status = STUDENT_STATUS[student.status];
  const tasks = TASKS.filter(
    (t) =>
      (t.relation?.type === "student" && t.relation.id === student.id) ||
      (t.relation?.type === "application" &&
        apps.some((a) => a.id === t.relation?.id)),
  );
  const shortlist = matchStudent(student, UNIVERSITIES)
    .filter((m) => m.verdict !== "blocked")
    .slice(0, 4);

  return (
    <>
      <div className="t-caption mb-4 flex items-center gap-2 text-ink-faint">
        <Link href="/students" className="hover:text-ink">
          Студенты
        </Link>
        <span>/</span>
        <span className="text-ink-muted">{student.fullName}</span>
      </div>

      <PageHeader
        title={student.fullName}
        meta={
          <>
            <span className="chip">
              <StatusDot color={status.dot} />
              {status.label}
            </span>
            <span>
              {student.latinName} · {age(student.birthDate)} лет · {student.city}
            </span>
            <span className="text-ink-faint">·</span>
            <span>источник: {SOURCE_LABEL[student.source]}</span>
          </>
        }
        actions={
          <>
            <a href={`tel:${student.phone}`} className="btn btn-secondary btn-sm">
              <IconPhone size={15} /> Позвонить
            </a>
            <a href={`mailto:${student.email}`} className="btn btn-secondary btn-sm">
              <IconMail size={15} /> Написать
            </a>
            <Link href="/universities" className="btn btn-primary btn-sm">
              <IconPlus size={15} /> Подобрать вуз
            </Link>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <div className="space-y-5">
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={student.fullName} size={44} />
              <div className="min-w-0">
                <div className="t-body-sm truncate">{student.phone}</div>
                <div className="t-micro truncate text-ink-faint">{student.email}</div>
              </div>
            </div>
            <Field label="Дата рождения" value={formatDate(student.birthDate)} />
            <Field label="Образование" value={student.profile.education} />
            <Field label="Год выпуска" value={student.profile.graduationYear} />
            <Field label="Куратор" value={owner?.name ?? "—"} />
            <Field label="В базе с" value={formatDate(student.createdAt)} />
            <Field label="Последний контакт" value={formatDate(student.lastTouchAt)} />
          </div>

          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              Портфолио
            </div>
            <Field label="TOPIK" value={student.profile.topik || "нет сертификата"} />
            <Field
              label="TOPIK действует до"
              value={formatDate(student.profile.topikExpiresAt)}
            />
            <Field label="IELTS" value={student.profile.ielts ?? "—"} />
            <Field label="GPA" value={student.profile.gpa ?? "—"} />
            <Field
              label="Бюджет в год"
              value={money(student.profile.budgetPerYear, session.tenant.currency)}
            />
            <Field label="Уровень" value={DEGREE_LABEL[student.profile.degreeLevel]} />
            <Field label="Набор" value={student.profile.intake} />
            <Field
              label="Города"
              value={student.profile.preferredCities.join(", ") || "любой"}
            />
            <Field
              label="Направления"
              value={student.profile.preferredMajors.join(", ") || "не выбрано"}
            />
            <Field
              label="Форма вуза"
              value={student.profile.preferredOwnership
                .map((o) => OWNERSHIP_LABEL[o])
                .join(", ")}
            />
            <Field label="Общежитие" value={student.profile.needsDorm ? "нужно" : "не нужно"} />
            <Field
              label="Грант"
              value={student.profile.needsScholarship ? "критично" : "желательно"}
            />
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <SectionTitle
              action={
                <span className="t-caption text-ink-faint">
                  {dossier.done} из {dossier.total} проверено
                </span>
              }
            >
              Досье документов
            </SectionTitle>
            <div className="card p-5">
              <Progress percent={dossier.percent} />
              <div className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {docs.map((d) => {
                  const st = DOCUMENT_STATUS[d.status];
                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 border-b border-hairline-soft py-2.5 last:border-b-0"
                    >
                      <StatusDot color={st.dot} />
                      <div className="min-w-0 flex-1">
                        <div className="t-body-sm truncate">{d.kind}</div>
                        <div className="t-micro truncate text-ink-faint">
                          {d.fileName ?? "файл не загружен"}
                          {d.needsApostille ? " · нужен апостиль" : ""}
                        </div>
                      </div>
                      <span className="t-micro text-ink-faint">{st.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section>
            <SectionTitle>Заявки</SectionTitle>
            <div className="card divide-y divide-hairline-soft">
              {apps.length ? (
                apps.map((a) => {
                  const uni = universityById(a.universityId);
                  const meta = stageMeta(a.stage);
                  return (
                    <Link
                      key={a.id}
                      href={`/applications/${a.id}`}
                      className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2"
                    >
                      <div className="min-w-[220px] flex-1">
                        <div className="t-body-sm">{uni?.name}</div>
                        <div className="t-micro text-ink-faint">
                          {uni?.programs.find((p) => p.id === a.programId)?.name} ·{" "}
                          {a.intake}
                        </div>
                      </div>
                      <span className="chip">
                        <StatusDot color={meta.dot} />
                        {meta.label}
                      </span>
                      <div className="t-caption t-num w-28 text-right text-ink-muted">
                        {a.deadline ? relativeDeadline(a.deadline) : "без срока"}
                      </div>
                      <div className="t-caption t-num w-24 text-right">
                        {money(a.paid)} / {money(a.contractValue)}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="t-body-sm px-5 py-8 text-center text-ink-muted">
                  Заявок пока нет.
                </div>
              )}
            </div>
          </section>

          <section>
            <SectionTitle
              action={
                <Link href="/universities" className="t-caption text-ink-muted hover:text-ink">
                  Все вузы <IconArrowUpRight size={12} className="inline" />
                </Link>
              }
            >
              Рекомендованные вузы
            </SectionTitle>
            <div className="grid gap-4 md:grid-cols-2">
              {shortlist.map((m) => (
                <Link
                  key={`${m.university.id}_${m.program.id}`}
                  href={`/universities/${m.university.id}`}
                  className="card card-hover p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="t-body-sm truncate">{m.university.name}</div>
                      <div className="t-micro truncate text-ink-faint">
                        {m.program.name}
                      </div>
                    </div>
                    <span className="chip">
                      <StatusDot color={verdictDot(m.verdict)} />
                      {m.score}
                    </span>
                  </div>
                  <div className="t-micro mt-3 text-ink-muted">
                    {verdictLabel(m.verdict)} · {m.university.city} ·{" "}
                    {money(m.yearCost)} в год
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.reasons.slice(0, 3).map((r) => (
                      <Chip
                        key={r.key}
                        dot={
                          r.level === "ok"
                            ? "var(--color-status-deal)"
                            : r.level === "warn"
                              ? "var(--color-status-progress)"
                              : "var(--color-status-risk)"
                        }
                      >
                        {r.label}
                      </Chip>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>Связанные задачи</SectionTitle>
            <div className="card divide-y divide-hairline-soft">
              {tasks.length ? (
                tasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="h-3.5 w-3.5 flex-none rounded-[5px] border border-hairline" />
                    <div className="min-w-0 flex-1">
                      <div className="t-body-sm truncate">{t.title}</div>
                      <div className="t-micro text-ink-faint">
                        {userById(t.assigneeId)?.name} · до {formatShortDate(t.dueAt)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="t-body-sm px-5 py-8 text-center text-ink-muted">
                  Задач нет.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
