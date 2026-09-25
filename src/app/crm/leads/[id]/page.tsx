import Link from "next/link";
import { notFound } from "next/navigation";
import { convertLeadAction } from "@/app/actions";
import { EditableFields } from "@/components/EditableFields";
import { StageBar } from "@/components/StageBar";
import { Timeline } from "@/components/Timeline";
import { moduleGate } from "@/components/guard";
import { IconArrowUpRight } from "@/components/icons";
import { Chip, Crumbs, PageHeader, StatusDot } from "@/components/ui";
import { boardStages } from "@/lib/crm";
import { userById } from "@/lib/data/users";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { SOURCE_LABEL } from "@/lib/labels";
import { scopedLeads } from "@/lib/queries";
import { allow } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { channelById, customFieldsOf, customValuesOf, defaultPipeline, stageOf } from "@/lib/store";
import { CustomFieldsCard, type ContactCustomField } from "@/components/CustomFieldsCard";
import { S } from "@/lib/strings";
import { timelineItems } from "@/lib/timeline-view";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;
  const t = translator(session.locale);
  const gate = moduleGate(session, "leads", t(S.crm.leads));
  if (gate) return gate;

  const lead = scopedLeads(session).find((l) => l.id === id);
  if (!lead) notFound();

  const f = formatters(session.locale);
  const pipeline = defaultPipeline(session.tenant.id, "lead");
  const stage = stageOf(pipeline, lead.stage);
  const owner = userById(lead.ownerId);
  const channel = channelById(lead.channelId);
  const canEdit = allow(session.tenant.id, session.role, "leads", "edit");

  const leadValues = customValuesOf(lead.id);
  const leadCustomFields: ContactCustomField[] = customFieldsOf(session.tenant.id, "lead").map((cf) => ({
    id: cf.id,
    label: t(cf.label),
    type: cf.type,
    options: cf.options ?? [],
    value: leadValues[cf.id] ?? "",
  }));

  return (
    <>
      <Crumbs back="/crm/leads" backLabel={t(S.crm.leads)} current={lead.name} />
      <PageHeader
        title={lead.name}
        meta={
          <>
            <span className="t-num">{lead.id.toUpperCase()}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5">
              <StatusDot color={stage?.color ?? "var(--color-ink-faint)"} />
              {stage ? t(stage.label) : lead.stage}
            </span>
            <span>·</span>
            <span>{f.date(lead.createdAt)}</span>
          </>
        }
        actions={
          canEdit && lead.stage !== "converted" ? (
            <form action={convertLeadAction}>
              <input type="hidden" name="leadId" value={lead.id} />
              <button className="btn btn-primary btn-sm">
                <IconArrowUpRight size={15} /> {t(S.crm.convert)}
              </button>
            </form>
          ) : lead.convertedContactId ? (
            <Link href={`/crm/contacts/${lead.convertedContactId}`} className="btn btn-secondary btn-sm">
              {t(S.crm.openExisting)}
            </Link>
          ) : null
        }
      />

      <div className="mb-6">
        <StageBar
          entity="lead"
          id={lead.id}
          current={lead.stage}
          canEdit={canEdit}
          stages={boardStages(pipeline?.id, session.tenant.id, "lead", t)}
        />
        {lead.stage !== "converted" ? (
          <p className="t-micro mt-2 text-ink-faint">{t(S.crm.convertHint)}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="min-w-0 space-y-5">
          <EditableFields
            entity="lead"
            id={lead.id}
            title={t(S.crm.mainFields)}
            locale={session.locale}
            canEdit={canEdit}
            fields={[
              { name: "name", label: t(S.common.fullName), value: lead.name, display: lead.name },
              { name: "phone", label: t(S.crm.phone), value: lead.phone, display: lead.phone },
              { name: "email", label: "Email", value: lead.email ?? "", display: lead.email ?? "—" },
              {
                name: "comment",
                label: t(S.crm.comment),
                value: lead.comment,
                display: lead.comment,
                kind: "textarea",
              },
            ]}
          />

          <div className="card p-4">
            <div className="t-headline mb-3">{t(S.crm.source)}</div>
            <div className="flex flex-wrap gap-1.5">
              <Chip>{t(SOURCE_LABEL[lead.source])}</Chip>
              {channel ? <Chip dot="var(--color-status-magenta)">{channel.title} · {channel.handle}</Chip> : null}
              <Chip>{t(S.pipelines.fieldOwner)}: {owner?.name ?? "—"}</Chip>
              {lead.junkReason ? <Chip dot="var(--color-status-risk)">{lead.junkReason}</Chip> : null}
            </div>
          </div>

          <CustomFieldsCard
            entity="lead"
            entityId={lead.id}
            fields={leadCustomFields}
            locale={session.locale}
            canEdit={canEdit}
          />
        </div>

        <div className="min-w-0">
          <Timeline
            entity="lead"
            entityId={lead.id}
            items={timelineItems("lead", lead.id, t)}
            locale={session.locale}
            canWrite={canEdit}
          />
        </div>
      </div>
    </>
  );
}
