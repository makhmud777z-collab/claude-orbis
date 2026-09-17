import { moduleGate } from "@/components/guard";
import { DomainCard } from "@/components/DomainCard";
import {
  Chip,
  Field,
  PageHeader,
  Progress,
  SectionTitle,
  StatusDot,
} from "@/components/ui";
import { formatters } from "@/lib/format";
import { translator, LOCALES, type Loc } from "@/lib/i18n";
import { BRANCH_LABEL, CITY_LABEL, ref } from "@/lib/labels";
import { allow, ROLES } from "@/lib/rbac";
import { S } from "@/lib/strings";
import { getSession } from "@/lib/session";
import { ROOT_DOMAIN } from "@/lib/tenants";

const PLAN_LABEL: Record<string, Loc> = {
  trial: S.plans.trial,
  standard: S.plans.standard,
  pro: S.plans.pro,
  enterprise: S.plans.enterprise,
};

const INTEGRATIONS: { name: Loc; hint: Loc }[] = [
  { name: S.integrations.telegram, hint: S.integrations.telegramHint },
  { name: S.integrations.smtp, hint: S.integrations.smtpHint },
  { name: S.integrations.storage, hint: S.integrations.storageHint },
  { name: S.integrations.catalog, hint: S.integrations.catalogHint },
];

export default async function SettingsPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const f = formatters(session.locale);
  const gate = moduleGate(session, "settings", t(S.nav.settings));
  if (gate) return gate;

  const { tenant } = session;

  return (
    <>
      <PageHeader
        title={t(S.settings.title)}
        meta={
          <>
            <span>{tenant.name}</span>
            <span className="text-ink-faint">·</span>
            <span>{t(PLAN_LABEL[tenant.plan])}</span>
            <span className="text-ink-faint">·</span>
            <span>
              {tenant.seatsUsed} / {tenant.seatsLimit} {t(S.settings.seats)}
            </span>
          </>
        }
        actions={
          allow(session.tenant.id, session.role, "settings", "edit") ? (
            <button className="btn btn-primary btn-sm">
              {t(S.settings.saveChanges)}
            </button>
          ) : null
        }
      />

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <DomainCard
            slug={tenant.slug}
            rootDomain={ROOT_DOMAIN}
            customDomain={tenant.customDomain}
            customDomainStatus={tenant.customDomainStatus}
            currentHost={session.host}
            locale={session.locale}
          />

          <div className="card p-6">
            <SectionTitle>{t(S.settings.rolesTitle)}</SectionTitle>
            <div className="divide-y divide-hairline-soft">
              {ROLES.map((r) => (
                <div key={r.key} className="flex flex-wrap items-center gap-4 py-3.5">
                  <div className="min-w-[200px] flex-1">
                    <div className="t-body-sm">{t(r.label)}</div>
                    <div className="t-micro text-ink-faint">{t(r.description)}</div>
                  </div>
                  <Chip>
                    {t(
                      r.scope === "tenant"
                        ? S.common.scopeTenant
                        : r.scope === "branch"
                          ? S.common.scopeBranch
                          : S.common.scopeOwn,
                    )}
                  </Chip>
                  <span className="t-micro w-28 text-right text-ink-faint">
                    {Object.keys(r.permissions).length} {t(S.settings.modules)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <SectionTitle>{t(S.settings.integrations)}</SectionTitle>
            <div className="divide-y divide-hairline-soft">
              {INTEGRATIONS.map((i) => (
                <div key={i.name.ru} className="flex items-center gap-4 py-3.5">
                  <StatusDot color="var(--color-status-hold)" />
                  <div className="min-w-0 flex-1">
                    <div className="t-body-sm">{t(i.name)}</div>
                    <div className="t-micro text-ink-faint">{t(i.hint)}</div>
                  </div>
                  <Chip>{t(S.settings.stage2)}</Chip>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              {t(S.settings.agency)}
            </div>
            <Field label={t(S.settings.name)} value={tenant.name} />
            <Field label={t(S.settings.legalName)} value={tenant.legalName} />
            <Field label={t(S.settings.monogram)} value={tenant.mark} />
            <Field
              label={t(S.settings.interfaceLanguage)}
              value={LOCALES.find((l) => l.key === tenant.locale)?.label ?? tenant.locale}
            />
            <Field
              label={t(S.settings.currency)}
              value={session.locale === "ru" ? "Сум (UZS)" : "So‘m (UZS)"}
            />
            <Field
              label={t(S.settings.usdRate)}
              value={`1 $ = ${f.som(tenant.usdRate)}`}
            />
            <Field label={t(S.settings.inSystemSince)} value={f.date(tenant.createdAt)} />
            <p className="t-micro mt-3 leading-relaxed text-ink-faint">
              {t(S.settings.rateHint)}
            </p>
          </div>

          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              {t(S.settings.plan)}
            </div>
            <div className="t-display-sm">{t(PLAN_LABEL[tenant.plan])}</div>
            <div className="t-micro mt-1 text-ink-faint">
              {tenant.seatsUsed} / {tenant.seatsLimit} {t(S.settings.seatsUsed)}
            </div>
            <div className="mt-4">
              <Progress percent={(tenant.seatsUsed / tenant.seatsLimit) * 100} />
            </div>
            <button className="btn btn-secondary btn-sm mt-5 w-full">
              {t(S.settings.addSeats)}
            </button>
          </div>

          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              {t(S.settings.branches)}
            </div>
            {tenant.branches.map((b) => (
              <Field
                key={b.id}
                label={t(ref(CITY_LABEL, b.city))}
                value={t(ref(BRANCH_LABEL, b.name))}
              />
            ))}
            <button className="btn btn-secondary btn-sm mt-4 w-full">
              {t(S.settings.addBranch)}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
