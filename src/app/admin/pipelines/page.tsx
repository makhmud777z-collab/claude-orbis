import { PipelineEditor, type PipelineDraft } from "@/components/PipelineEditor";
import { Crumbs, PageHeader } from "@/components/ui";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { allow } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { dealsOfPipeline, pipelinesOf, stageUsage } from "@/lib/store";
import { P, S } from "@/lib/strings";

/** Воронки лидов и сделок: стадии, порядок, цвета, финалы и вторая воронка. */
export default async function PipelinesPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const f = formatters(session.locale);

  const pipelines: PipelineDraft[] = [
    ...pipelinesOf(session.tenant.id, "lead"),
    ...pipelinesOf(session.tenant.id, "deal"),
  ].map((p) => ({
    id: p.id,
    nameRu: p.name.ru,
    nameUz: p.name.uz,
    entity: p.entity,
    isDefault: p.isDefault,
    used: dealsOfPipeline(p.id).length > 0,
    stagesLabel: f.plural(p.stages.length, P.stages),
    stages: p.stages.map((s) => ({
      key: s.key,
      labelRu: s.label.ru,
      labelUz: s.label.uz,
      color: s.color,
      hintRu: s.hint.ru,
      hintUz: s.hint.uz,
      final: s.final ?? null,
      cards: stageUsage(p.id, s.key),
      cardsLabel: f.plural(stageUsage(p.id, s.key), P.cards),
    })),
  }));

  return (
    <>
      <Crumbs back="/admin" backLabel={t(S.admin.title)} current={t(S.pipelines.title)} />
      <PageHeader title={t(S.pipelines.title)} meta={<span>{t(S.pipelines.subtitle)}</span>} />
      <PipelineEditor
        pipelines={pipelines}
        locale={session.locale}
        canEdit={allow(session.tenant.id, session.role, "crmSettings", "edit")}
      />
    </>
  );
}
