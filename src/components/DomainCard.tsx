"use client";

import { useState } from "react";
import { Chip, Field, StatusDot } from "./ui";
import { IconCheck, IconGlobe } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";
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
  locale,
}: {
  slug: string;
  rootDomain: string;
  customDomain: string | null;
  customDomainStatus: "none" | "pending" | "verified";
  currentHost: string;
  locale: Locale;
}) {
  const t = translator(locale);
  const [draft, setDraft] = useState(slug);
  const check = draft === slug ? { ok: true } : validateSlug(draft);

  return (
    <div className="card min-w-0 p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-2 text-ink-muted">
          <IconGlobe size={17} />
        </span>
        <div className="min-w-0">
          <div className="t-body-sm">{t(S.settings.addressTitle)}</div>
          <div className="t-micro text-ink-faint">{t(S.settings.addressHint)}</div>
        </div>
      </div>

      <div className="mb-5">
        <div className="t-micro mb-2 uppercase tracking-[0.07em] text-ink-faint">
          {t(S.settings.platformSubdomain)}
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
            {t(S.common.save)}
          </button>
        </div>
        <div className="t-micro mt-2 flex items-center gap-2">
          <StatusDot
            color={check.ok ? "var(--color-status-deal)" : "var(--color-status-risk)"}
          />
          <span className="text-ink-faint">
            {check.ok
              ? `${t(S.settings.willOpenAt)} https://${draft || slug}.${rootDomain}`
              : `${t(S.settings.unavailable)}: ${"reason" in check ? check.reason : ""}`}
          </span>
        </div>
      </div>

      <div className="hairline-t pt-5">
        <div className="t-micro mb-2 uppercase tracking-[0.07em] text-ink-faint">
          {t(S.settings.ownDomain)}
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
            {customDomain ?? t(S.settings.domainNotConnected)}
          </Chip>
          <span className="t-micro text-ink-faint">
            {t(
              customDomainStatus === "verified"
                ? S.settings.domainVerified
                : customDomainStatus === "pending"
                  ? S.settings.domainPending
                  : S.settings.domainCanConnect,
            )}
          </span>
        </div>

        <div className="min-w-0 overflow-hidden rounded-[10px] border border-hairline-soft bg-canvas p-4">
          <div className="t-micro mb-2 text-ink-faint">
            {t(S.settings.dnsTitle)}
          </div>
          <pre className="t-micro t-num overflow-x-auto text-ink-muted">
{`CNAME   crm        →  ${slug}.${rootDomain}
TXT     _orbis     →  orbis-verify=${slug}-8f2a41`}
          </pre>
          <div className="t-micro mt-3 flex items-center gap-2 text-ink-faint">
            <IconCheck size={13} />
            {t(S.settings.tlsHint)}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <Field label={t(S.settings.currentHost)} value={currentHost || "—"} />
        <Field label={t(S.settings.isolation)} value={t(S.settings.isolationValue)} />
      </div>
    </div>
  );
}
