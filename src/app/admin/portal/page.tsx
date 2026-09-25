import { moduleGate } from "@/components/guard";
import { AddBranchDialog } from "@/components/AddBranchDialog";
import { AgencyProfileCard } from "@/components/AgencyProfileCard";
import { DomainCard } from "@/components/DomainCard";
import { setPasscodeAction } from "@/app/actions";
import {
  Chip,
  Crumbs,
  Field,
  PageHeader,
  Progress,
  SectionTitle,
  StatusDot,
} from "@/components/ui";
import { formatters } from "@/lib/format";
import { translator, type Loc } from "@/lib/i18n";
import { BRANCH_LABEL, CITY_LABEL, ref } from "@/lib/labels";
import { allow, ROLES } from "@/lib/rbac";
import { P, S } from "@/lib/strings";
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
      <Crumbs back="/admin" backLabel={t(S.admin.title)} current={t(S.settings.title)} />
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
                    {f.plural(Object.keys(r.permissions).length, P.modules)}
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
          <AgencyProfileCard
            name={tenant.name}
            legalName={tenant.legalName}
            mark={tenant.mark}
            locale={tenant.locale}
            usdRate={tenant.usdRate}
            usdRateLabel={`1 $ = ${f.som(tenant.usdRate)}`}
            currencyLabel={session.locale === "ru" ? "Сум (UZS)" : "So‘m (UZS)"}
            createdLabel={f.date(tenant.createdAt)}
            rateHint={t(S.settings.rateHint)}
            canEdit={allow(session.tenant.id, session.role, "settings", "edit")}
            uiLocale={session.locale}
          />

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
            <p className="t-micro mt-4 leading-relaxed text-ink-faint">
              {t(S.settings.seatsHint)}
            </p>
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
            {allow(session.tenant.id, session.role, "settings", "edit") ? (
              <AddBranchDialog locale={session.locale} />
            ) : null}
          </div>
        </div>
      </div>
      <SectionTitle>{t(S.admin.passcode)}</SectionTitle>
      <form action={setPasscodeAction} className="card max-w-[480px] p-5">
        <p className="t-caption mb-4 leading-relaxed text-ink-muted">
          {t(S.admin.passcodeHint)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="code"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            pattern="\\d{4,12}"
            required
            placeholder="••••"
            className="field t-num max-w-[180px] tracking-[0.3em]"
          />
          <button className="btn btn-primary btn-sm">{t(S.admin.changePasscode)}</button>
        </div>
      </form>

    </>
  );
}
