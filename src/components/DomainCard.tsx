"use client";

import { useState } from "react";
import { Chip, Field, StatusDot } from "./ui";
import { IconCheck, IconGlobe } from "./icons";
import { validateSlug } from "@/lib/tenants";

/**
 * Адрес системы. Для агентства это вопрос доверия: клиент должен видеть
 * собственный поддомен, а не «ещё один чужой кабинет».
 */
export function DomainCard({
  slug,
  rootDomain,
  customDomain,
  customDomainStatus,
  currentHost,
}: {
  slug: string;
  rootDomain: string;
  customDomain: string | null;
  customDomainStatus: "none" | "pending" | "verified";
  currentHost: string;
}) {
  const [draft, setDraft] = useState(slug);
  const check = draft === slug ? { ok: true } : validateSlug(draft);

  return (
    <div className="card p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-2 text-ink-muted">
          <IconGlobe size={17} />
        </span>
        <div>
          <div className="t-body-sm">Адрес системы</div>
          <div className="t-micro text-ink-faint">
            Каждое агентство работает на своём поддомене — сотрудники и клиенты
            видят только его.
          </div>
        </div>
      </div>

      <div className="mb-5">
        <div className="t-micro mb-2 uppercase tracking-[0.07em] text-ink-faint">
          Поддомен платформы
        </div>
        <div className="flex items-stretch gap-2">
          <div className="flex flex-1 items-center overflow-hidden rounded-[10px] border border-hairline-soft bg-surface-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.toLowerCase().trim())}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[14px] outline-none"
            />
            <span className="t-body-sm border-l border-hairline-soft px-3 py-2.5 text-ink-faint">
              .{rootDomain}
            </span>
          </div>
          <button className="btn btn-secondary" disabled={!check.ok || draft === slug}>
            Сохранить
          </button>
        </div>
        <div className="t-micro mt-2 flex items-center gap-2">
          <StatusDot
            color={check.ok ? "var(--color-status-deal)" : "var(--color-status-risk)"}
          />
          <span className="text-ink-faint">
            {check.ok
              ? `Система откроется по адресу https://${draft || slug}.${rootDomain}`
              : `Недоступно: ${"reason" in check ? check.reason : ""}`}
          </span>
        </div>
      </div>

      <div className="hairline-t pt-5">
        <div className="t-micro mb-2 uppercase tracking-[0.07em] text-ink-faint">
          Собственный домен агентства
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Chip
            dot={
              customDomainStatus === "verified"
                ? "var(--color-status-deal)"
                : customDomainStatus === "pending"
                  ? "var(--color-status-progress)"
                  : "var(--color-status-hold)"
            }
            active={customDomainStatus === "verified"}
          >
            {customDomain ?? "домен не подключён"}
          </Chip>
          <span className="t-micro text-ink-faint">
            {customDomainStatus === "verified"
              ? "DNS проверен, сертификат выпущен"
              : customDomainStatus === "pending"
                ? "ждём проверки DNS"
                : "можно подключить свой домен вместо поддомена"}
          </span>
        </div>

        <div className="rounded-[10px] border border-hairline-soft bg-canvas p-4">
          <div className="t-micro mb-2 text-ink-faint">
            Что добавить в DNS домена агентства:
          </div>
          <pre className="t-micro t-num overflow-x-auto text-ink-muted">
{`CNAME   crm        →  ${slug}.${rootDomain}
TXT     _orbis     →  orbis-verify=${slug}-8f2a41`}
          </pre>
          <div className="t-micro mt-3 flex items-center gap-2 text-ink-faint">
            <IconCheck size={13} />
            Сертификат TLS выпускается автоматически после проверки записи.
          </div>
        </div>
      </div>

      <div className="mt-5">
        <Field label="Текущий хост запроса" value={currentHost || "—"} />
        <Field
          label="Изоляция данных"
          value="строгая: запрос без совпадающего арендатора не видит ни одной записи"
        />
      </div>
    </div>
  );
}
