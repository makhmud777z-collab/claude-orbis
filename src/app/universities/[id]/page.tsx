import Link from "next/link";
import { notFound } from "next/navigation";
import { NoAccess } from "@/components/NoAccess";
import {
  Chip,
  Field,
  PageHeader,
  SectionTitle,
  StatusDot,
} from "@/components/ui";
import { UNIVERSITIES, universityById } from "@/lib/data/universities";
import { formatDate, money } from "@/lib/format";
import { DEGREE_LABEL, OWNERSHIP_LABEL } from "@/lib/labels";
import { matchProgram, verdictDot, verdictLabel } from "@/lib/matching";
import { can } from "@/lib/rbac";
import { scopedApplications, scopedStudents } from "@/lib/queries";
import { getSession } from "@/lib/session";

const VISA_GRADE: Record<string, string> = {
  certified: "Сертифицированный (упрощённая виза)",
  general: "Обычный",
  restricted: "С ограничениями",
};

export async function generateStaticParams() {
  return UNIVERSITIES.map((u) => ({ id: u.id }));
}

export default async function UniversityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!can(session.role, "universities")) {
    return <NoAccess role={session.role} module="Каталог вузов" />;
  }

  const uni = universityById(id);
  if (!uni) notFound();

  const apps = scopedApplications(session).filter((a) => a.universityId === uni.id);
  const students = scopedStudents(session);
  /** Кому из базы этот вуз подходит прямо сейчас — обратный подбор. */
  const fits = students
    .map((s) => {
      const best = uni.programs
        .map((p) => matchProgram(s, uni, p))
        .sort((a, b) => b.score - a.score)[0];
      return { student: s, match: best };
    })
    .filter((x) => x.match && x.match.verdict !== "blocked")
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 6);

  return (
    <>
      <div className="t-caption mb-4 flex items-center gap-2 text-ink-faint">
        <Link href="/universities" className="hover:text-ink">
          Каталог вузов
        </Link>
        <span>/</span>
        <span className="text-ink-muted">{uni.name}</span>
      </div>

      <PageHeader
        title={uni.name}
        meta={
          <>
            <span>{uni.nameKo}</span>
            <span className="text-ink-faint">·</span>
            <span>
              {uni.city}, {uni.region}
            </span>
            <span className="text-ink-faint">·</span>
            <span>{OWNERSHIP_LABEL[uni.ownership]}</span>
            <span className="chip">
              <StatusDot
                color={
                  uni.dataStatus === "verified"
                    ? "var(--color-status-deal)"
                    : "var(--color-status-progress)"
                }
              />
              {uni.dataStatus === "verified" ? "данные проверены" : "черновик данных"}
            </span>
          </>
        }
        actions={
          <>
            <button className="btn btn-secondary btn-sm">Сравнить</button>
            <button className="btn btn-primary btn-sm">Добавить в шорт-лист</button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <section>
            <SectionTitle>Программы</SectionTitle>
            <div className="card divide-y divide-hairline-soft">
              {uni.programs.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="min-w-[220px] flex-1">
                    <div className="t-body-sm">{p.name}</div>
                    <div className="t-micro text-ink-faint">
                      {p.field} · {DEGREE_LABEL[p.degreeLevel]} · язык:{" "}
                      {p.language === "ko" ? "корейский" : p.language === "en" ? "английский" : "корейский / английский"}
                    </div>
                  </div>
                  <Chip>TOPIK {p.topikMin || "не нужен"}</Chip>
                  {p.ieltsMin ? <Chip>IELTS {p.ieltsMin}</Chip> : null}
                  <div className="t-body-sm t-num w-28 text-right">
                    {money(p.tuitionPerYear)}
                    <span className="t-micro block text-ink-faint">в год</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>Кому из базы подходит</SectionTitle>
            <div className="card divide-y divide-hairline-soft">
              {fits.length ? (
                fits.map(({ student, match }) => (
                  <Link
                    key={student.id}
                    href={`/students/${student.id}`}
                    className="flex flex-wrap items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2"
                  >
                    <div className="min-w-[180px] flex-1">
                      <div className="t-body-sm">{student.fullName}</div>
                      <div className="t-micro text-ink-faint">
                        TOPIK {student.profile.topik || "—"} · бюджет{" "}
                        {money(student.profile.budgetPerYear)}
                      </div>
                    </div>
                    <div className="t-caption min-w-[200px] flex-1 text-ink-muted">
                      {match.program.name}
                    </div>
                    <span className="chip">
                      <StatusDot color={verdictDot(match.verdict)} />
                      {verdictLabel(match.verdict)} · {match.score}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="t-body-sm px-5 py-8 text-center text-ink-muted">
                  Подходящих студентов в вашей зоне видимости нет.
                </div>
              )}
            </div>
          </section>

          {apps.length ? (
            <section>
              <SectionTitle>Наши заявки в этот вуз</SectionTitle>
              <div className="card divide-y divide-hairline-soft">
                {apps.map((a) => (
                  <Link
                    key={a.id}
                    href={`/applications/${a.id}`}
                    className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-surface-2"
                  >
                    <span className="t-body-sm">
                      {students.find((s) => s.id === a.studentId)?.fullName ?? a.studentId}
                    </span>
                    <span className="t-caption text-ink-muted">
                      {a.intake} · {money(a.contractValue)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              Требования
            </div>
            <Field label="TOPIK" value={uni.requirements.topikMin || "не требуется"} />
            <Field label="IELTS" value={uni.requirements.ieltsMin ?? "—"} />
            <Field label="GPA" value={uni.requirements.gpaMin ?? "—"} />
            <Field label="Счёт в банке" value={money(uni.requirements.bankBalance)} />
            <Field
              label="Срок после выпуска"
              value={
                uni.requirements.graduationWithinYears
                  ? `до ${uni.requirements.graduationWithinYears} лет`
                  : "не ограничен"
              }
            />
          </div>

          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              Условия
            </div>
            <Field label="Вступительный взнос" value={money(uni.admissionFee)} />
            <Field
              label="Общежитие"
              value={uni.dormAvailable ? money(uni.dormCostPerYear ?? 0) : "нет"}
            />
            <Field label="Грант" value={`до ${uni.scholarshipMax}%`} />
            <Field label="Языковой центр" value={uni.hasLanguageCenter ? "есть" : "нет"} />
            <Field label="Визовый статус" value={VISA_GRADE[uni.visaGrade]} />
            <Field label="Наборы" value={uni.intakes.join(", ")} />
          </div>

          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              Источник данных
            </div>
            <Field
              label="Статус"
              value={uni.dataStatus === "verified" ? "сверено" : "черновик"}
            />
            <Field label="Обновлено" value={formatDate(uni.updatedAt)} />
            <Field
              label="Admission guideline"
              value={uni.sourceUrl ?? "не привязан"}
            />
            <p className="t-micro mt-3 leading-relaxed text-ink-faint">
              На этапе 2 сюда подключается разбор официальной страницы вуза и PDF
              с правилами приёма: система сверяет цифры и ставит дату проверки.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
