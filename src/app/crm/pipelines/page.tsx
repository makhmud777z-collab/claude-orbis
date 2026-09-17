import { PipelineEditor, type PipelineDraft } from "@/components/PipelineEditor";
import { moduleGate } from "@/components/guard";
import { PageHeader } from "@/components/ui";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { allow } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { pipelinesOf } from "@/lib/store";
import { P, S } from "@/lib/strings";

/** Воронки лидов и сделок: стадии, их подписи и цвета. */
export default async function PipelinesPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const f = formatters(session.locale);
  const gate = moduleGate(session, "crmSettings", t(S.pipelines.title));
  if (gate) return gate;

  const pipelines: PipelineDraft[] = [
    ...pipelinesOf(session.tenant.id, "lead"),
    ...pipelinesOf(session.tenant.id, "deal"),
  ].map((p) => ({
    id: p.id,
    name: t(p.name),
    entity: p.entity,
    stagesLabel: f.plural(p.stages.length, P.stages),
    stages: p.stages.map((s) => ({
      key: s.key,
      labelRu: s.label.ru,
      labelUz: s.label.uz,
      color: s.color,
      hint: t(s.hint),
      final: s.final ?? null,
    })),
  }));

  return (
    <>
      <PageHeader title={t(S.pipelines.title)} meta={<span>{t(S.pipelines.subtitle)}</span>} />
      <PipelineEditor
        pipelines={pipelines}
        locale={session.locale}
        canEdit={allow(session.tenant.id, session.role, "crmSettings", "edit")}
      />
    </>
  );
}
