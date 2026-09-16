import { DomainCard } from "@/components/DomainCard";
import { NoAccess } from "@/components/NoAccess";
import {
  Chip,
  Field,
  PageHeader,
  Progress,
  SectionTitle,
  StatusDot,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import { can, ROLES } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { ROOT_DOMAIN } from "@/lib/tenants";

const PLAN_LABEL: Record<string, string> = {
  trial: "Пробный период",
  standard: "Standard",
  pro: "Pro",
  enterprise: "Enterprise",
};

const INTEGRATIONS = [
  { name: "Telegram-бот для лидов", status: "этап 2", hint: "заявка из бота сразу в воронку" },
  { name: "Почта агентства (SMTP)", status: "этап 2", hint: "письма студентам с домена агентства" },
  { name: "Хранилище документов", status: "этап 2", hint: "S3-совместимое, с версиями файлов" },
  { name: "Импорт каталога вузов", status: "этап 2", hint: "разбор admission guideline" },
];

export default async function SettingsPage() {
  const session = await getSession();
  if (!can(session.role, "settings")) {
    return <NoAccess role={session.role} module="Настройки" />;
  }

  const { tenant } = session;

  return (
    <>
      <PageHeader
        title="Настройки агентства"
        meta={
          <>
            <span>{tenant.name}</span>
            <span className="text-ink-faint">·</span>
            <span>{PLAN_LABEL[tenant.plan]}</span>
            <span className="text-ink-faint">·</span>
            <span>
              {tenant.seatsUsed} из {tenant.seatsLimit} мест
            </span>
          </>
        }
        actions={
          can(session.role, "settings", "edit") ? (
            <button className="btn btn-primary btn-sm">Сохранить изменения</button>
          ) : null
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <DomainCard
            slug={tenant.slug}
            rootDomain={ROOT_DOMAIN}
            customDomain={tenant.customDomain}
            customDomainStatus={tenant.customDomainStatus}
            currentHost={session.host}
          />

          <div className="card p-6">
            <SectionTitle>Роли и доступы</SectionTitle>
            <div className="divide-y divide-hairline-soft">
              {ROLES.map((r) => (
                <div key={r.key} className="flex flex-wrap items-center gap-4 py-3.5">
                  <div className="min-w-[200px] flex-1">
                    <div className="t-body-sm">{r.label}</div>
                    <div className="t-micro text-ink-faint">{r.description}</div>
                  </div>
                  <Chip>
                    {r.scope === "tenant"
                      ? "всё агентство"
                      : r.scope === "branch"
                        ? "свой филиал"
                        : "только свои записи"}
                  </Chip>
                  <span className="t-micro w-24 text-right text-ink-faint">
                    {Object.keys(r.permissions).length} модулей
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <SectionTitle>Интеграции</SectionTitle>
            <div className="divide-y divide-hairline-soft">
              {INTEGRATIONS.map((i) => (
                <div key={i.name} className="flex items-center gap-4 py-3.5">
                  <StatusDot color="var(--color-status-hold)" />
                  <div className="min-w-0 flex-1">
                    <div className="t-body-sm">{i.name}</div>
                    <div className="t-micro text-ink-faint">{i.hint}</div>
                  </div>
                  <Chip>{i.status}</Chip>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              Агентство
            </div>
            <Field label="Название" value={tenant.name} />
            <Field label="Юридическое лицо" value={tenant.legalName} />
            <Field label="Монограмма" value={tenant.mark} />
            <Field label="Язык интерфейса" value={tenant.locale.toUpperCase()} />
            <Field label="Валюта договоров" value={tenant.currency} />
            <Field label="В системе с" value={formatDate(tenant.createdAt)} />
          </div>

          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              Тариф
            </div>
            <div className="t-display-sm">{PLAN_LABEL[tenant.plan]}</div>
            <div className="t-micro mt-1 text-ink-faint">
              {tenant.seatsUsed} из {tenant.seatsLimit} рабочих мест занято
            </div>
            <div className="mt-4">
              <Progress percent={(tenant.seatsUsed / tenant.seatsLimit) * 100} />
            </div>
            <button className="btn btn-secondary btn-sm mt-5 w-full">
              Добавить места
            </button>
          </div>

          <div className="card p-5">
            <div className="t-caption mb-3 uppercase tracking-[0.07em] text-ink-faint">
              Филиалы
            </div>
            {tenant.branches.map((b) => (
              <Field key={b.id} label={b.city} value={b.name} />
            ))}
            <button className="btn btn-secondary btn-sm mt-4 w-full">
              Добавить филиал
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
