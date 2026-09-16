import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowUpRight, IconCheck } from "@/components/icons";
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
import { documentsOfStudent, dossierProgress } from "@/lib/data/documents";
import { studentById } from "@/lib/data/students";
import { TASKS } from "@/lib/data/tasks";
import { universityById } from "@/lib/data/universities";
import { userById } from "@/lib/data/users";
import { formatDate, money, relativeDeadline, relativeTime } from "@/lib/format";
import { DOCUMENT_STATUS, STAGES, stageMeta } from "@/lib/labels";
import { matchProgram, verdictDot, verdictLabel } from "@/lib/matching";
import { can } from "@/lib/rbac";
import { scopedApplications } from "@/lib/queries";
import { getSession } from "@/lib/session";

const FLOW = STAGES.filter((s) => s.key !== "lost");

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!can(session.role, "applications")) {
    return <NoAccess role={session.role} module="Заявки" />;
  }

  const app = scopedApplications(session).find((a) => a.id === id);
  if (!app) notFound();

  const student = studentById(app.studentId);
  const uni = universityById(app.universityId);
  const program = uni?.programs.find((p) => p.id === app.programId);
  const owner = userById(app.ownerId);
  const meta = stageMeta(app.stage);
  const currentIndex = FLOW.findIndex((s) => s.key === app.stage);
  const docs = documentsOfStudent(app.studentId);
  const dossier = dossierProgress(app.studentId);
  const tasks = TASKS.filter(
    (t) => t.relation?.type === "application" && t.relation.id === app.id,
  );
  const match =
    student && uni && program ? matchProgram(student, uni, program) : null;

  return (
    <>
      <div className="t-caption mb-4 flex items-center gap-2 text-ink-faint">
        <Link href="/applications" className="hover:text-ink">
          Заявки
        </Link>
        <span>/</span>
        <span className="text-ink-muted">{app.id.toUpperCase()}</span>
      </div>

      <PageHeader
        title={student?.fullName ?? "Заявка"}
        meta={
          <>
            <span className="chip">
              <StatusDot color={meta.dot} />
              {meta.label}
            </span>
            <span>
              {uni?.name} · {program?.name}
            </span>
            <span className="text-ink-faint">·</span>
            <span>набор {app.intake}</span>
            <span className="text-ink-faint">·</span>
            <span>на этапе {relativeTime(app.stageEnteredAt)}</span>
          </>
        }
        actions={
          <>
            <Link
              href={`/students/${app.studentId}`}
              className="btn btn-secondary btn-sm"
            >
              Карточка студента
            </Link>
            {can(session.role, "applications", "edit") ? (
              <button className="btn btn-primary btn-sm">
                <IconCheck size={15} /> Перевести на следующий этап
              </button>
            ) : null}
          </>
        }
      />

      <div className="card mb-6 px-5 py-5">
        <div className="scroll-x">
          <div className="flex min-w-max items-center gap-1">
            {FLOW.map((s, i) => {
              const done = i < currentIndex;
              const current = i === currentIndex;
              return (
                <div key={s.key} className="flex items-center gap-1">
                  <div
                    className="flex items-center gap-2 rounded-full px-3 py-2"
                    style={{
                      background: current
                        ? "var(--color-surface-2)"
                        : "transparent",
                      color: current
                        ? "var(--color-ink)"
                        : done
                          ? "var(--color-ink-muted)"
                          : "var(--color-ink-faint)",
                    }}
                  >
                    {done ? (
                      <IconCheck size={13} />
                    ) : (
                      <StatusDot color={current ? s.dot : "var(--color-hairline)"} />
                    )}
                    <span className="t-caption whitespace-nowrap">{s.short}</span>
                  </div>
                  {i < FLOW.length - 1 ? (
                    <span
                      className="h-px w-5"
                      style={{
                        background: done
                          ? "var(--color-ink-faint)"
                          : "var(--color-hairline)",
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        <div className="t-micro mt-3 text-ink-faint">{meta.hint}</div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <section>
            <SectionTitle
              action={
                <span className="t-caption text-ink-faint">
                  {dossier.done} из {dossier.total}
                </span>
              }
            >
              Документы по заявке
            </SectionTitle>
            <div className="card p-5">
              <Progress percent={dossier.percent} />
              <div className="mt-4 grid gap-x-6 sm:grid-cols-2">
                {docs.map((d) => {
                  const st = DOCUMENT_STATUS[d.status];
                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 border-b border-hairline-soft py-2.5 last:border-b-0"
                    >
                      <StatusDot color={st.dot} />
                      <span className="t-body-sm min-w-0 flex-1 truncate">{d.kind}</span>
                      <span className="t-micro text-ink-faint">{st.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {match ? (
            <section>
              <SectionTitle
                action={
                  <Link
                    href={`/universities/${uni?.id}`}
                    className="t-caption text-ink-muted hover:text-ink"
                  >
                    Карточка вуза <IconArrowUpRight size={12} className="inline" />
                  </Link>
                }
              >
                Сходимость с требованиями вуза
              </SectionTitle>
              <div className="card p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="chip chip-active">
                    <StatusDot color={verdictDot(match.verdict)} />
                    {verdictLabel(match.verdict)} · {match.score}/100
                  </span>
                  <span className="t-caption text-ink-muted">
                    полная стоимость года: {money(match.yearCost)}
                  </span>
                </div>
                <div className="grid gap-x-6 sm:grid-cols-2">
                  {match.reasons.map((r) => (
                    <div
                      key={r.key}
                      className="flex items-center gap-3 border-b border-hairline-soft py-2.5 last:border-b-0"
                    >
                      <StatusDot
                        color={
                          r.level === "ok"
                            ? "var(--color-status-deal)"
                            : r.level === "warn"
                              ? "var(--color-status-progress)"
                              : "var(--color-status-risk)"
                        }
                      />
                      <span className="t-body-sm">{r.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <section>
            <SectionTitle>Задачи по заявке</SectionTitle>
            <div className="card divide-y divide-hairline-soft">
              {tasks.length ? (
                tasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="h-3.5 w-3.5 flex-none rounded-[5px] border border-hairline" />
                    <div className="min-w-0 flex-1">
                      <div className="t-body-sm">{t.title}</div>
                      <div className="t-micro text-ink-faint">{t.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar name={userById(t.assigneeId)?.name ?? "—"} size={22} />
                      <span className="t-micro text-ink-faint">
                        {relativeDeadline(t.dueAt)}
                      </span>
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

        <div className="space-y-5">
          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              Заявка
            </div>
            <Field label="Куратор" value={owner?.name ?? "—"} />
            <Field label="Приоритет" value={app.priority === "high" ? "высокий" : app.priority === "normal" ? "обычный" : "низкий"} />
            <Field label="Создана" value={formatDate(app.createdAt)} />
            <Field
              label="Дедлайн"
              value={
                app.deadline
                  ? `${formatDate(app.deadline)} · ${relativeDeadline(app.deadline)}`
                  : "не задан"
              }
            />
            <Field label="Договор" value={money(app.contractValue)} />
            <Field label="Оплачено" value={money(app.paid)} />
          </div>

          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              Вуз
            </div>
            <Field label="Университет" value={uni?.name ?? "—"} />
            <Field label="Город" value={uni?.city ?? "—"} />
            <Field label="Программа" value={program?.name ?? "—"} />
            <Field
              label="Стоимость года"
              value={program ? money(program.tuitionPerYear) : "—"}
            />
            <Field
              label="Требуемый TOPIK"
              value={program?.topikMin ? program.topikMin : "не требуется"}
            />
            <Field
              label="Общежитие"
              value={uni?.dormAvailable ? money(uni.dormCostPerYear ?? 0) : "нет"}
            />
          </div>

          {app.note ? (
            <div className="card p-5">
              <div className="t-caption mb-2 uppercase tracking-[0.07em] text-ink-faint">
                Заметка куратора
              </div>
              <p className="t-body-sm leading-relaxed text-ink-muted">{app.note}</p>
              <div className="mt-3 flex items-center gap-2">
                <Avatar name={owner?.name ?? "—"} size={22} />
                <span className="t-micro text-ink-faint">{owner?.name}</span>
              </div>
            </div>
          ) : null}

          {student ? (
            <div className="card p-5">
              <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
                Студент
              </div>
              <div className="mb-3 flex items-center gap-3">
                <Avatar name={student.fullName} size={38} />
                <div className="min-w-0">
                  <div className="t-body-sm truncate">{student.fullName}</div>
                  <div className="t-micro truncate text-ink-faint">{student.phone}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Chip>TOPIK {student.profile.topik || "—"}</Chip>
                {student.profile.ielts ? <Chip>IELTS {student.profile.ielts}</Chip> : null}
                <Chip>{money(student.profile.budgetPerYear)}/год</Chip>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
