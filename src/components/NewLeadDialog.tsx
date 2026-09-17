"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createLeadAction, findDuplicateAction } from "@/app/actions";
import { Modal, Select, type Option } from "./controls";
import { IconAlert, IconPlus } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

interface Duplicate {
  kind: "contact" | "lead";
  id: string;
  name: string;
  matchedBy: "phone" | "email" | "passport";
  href: string;
}

/**
 * Создание лида с проверкой дубля до сохранения.
 * Номер телефона — ключ человека: если он уже есть в системе, форма показывает
 * существующую карточку и не даёт завести вторую.
 */
export function NewLeadDialog({
  locale,
  sources,
  channels,
  owners,
  defaultOwnerId,
}: {
  locale: Locale;
  sources: Option[];
  channels: Option[];
  owners: Option[];
  defaultOwnerId: string;
}) {
  const t = translator(locale);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState(sources[0]?.value ?? "instagram");
  const [channelId, setChannelId] = useState("");
  const [ownerId, setOwnerId] = useState(defaultOwnerId);
  const [duplicate, setDuplicate] = useState<Duplicate | null>(null);
  const [checking, startCheck] = useTransition();

  const check = () => {
    if (!phone.trim() && !email.trim()) return;
    startCheck(async () => {
      setDuplicate(await findDuplicateAction({ phone, email: email || null }));
    });
  };

  const reason =
    duplicate?.matchedBy === "email"
      ? t(S.crm.duplicateByEmail)
      : duplicate?.matchedBy === "passport"
        ? t(S.crm.duplicateByPassport)
        : t(S.crm.duplicateByPhone);

  return (
    <>
      <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        <IconPlus size={15} /> {t(S.crm.newLead)}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t(S.crm.newLead)}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
              {t(S.common.cancel)}
            </button>
            <button
              type="submit"
              form="new-lead"
              disabled={Boolean(duplicate)}
              className="btn btn-primary btn-sm"
              style={{ opacity: duplicate ? 0.4 : 1 }}
            >
              {t(S.common.save)}
            </button>
          </>
        }
      >
        <form
          id="new-lead"
          action={(data) => {
            setOpen(false);
            setPhone("");
            setEmail("");
            setDuplicate(null);
            return createLeadAction(data);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="source" value={source} />
          <input type="hidden" name="channelId" value={channelId} />
          <input type="hidden" name="ownerId" value={ownerId} />

          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.common.fullName)}</span>
            <input name="name" required className="field text-[13px]" autoComplete="off" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.crm.phone)}</span>
              <input
                name="phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={check}
                placeholder="+998 90 000-00-00"
                className="field text-[13px]"
                autoComplete="off"
              />
            </label>
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">Email</span>
              <input
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={check}
                className="field text-[13px]"
                autoComplete="off"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.crm.source)}</span>
              <Select locale={locale} width="100%" value={source} options={sources} onChange={setSource} />
            </label>
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.crm.channel)}</span>
              <Select
                locale={locale}
                width="100%"
                value={channelId}
                placeholder={t(S.common.notSet)}
                options={[{ value: "", label: t(S.common.notSet) }, ...channels]}
                onChange={setChannelId}
              />
            </label>
          </div>

          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.pipelines.fieldOwner)}</span>
            <Select locale={locale} width="100%" value={ownerId} options={owners} onChange={setOwnerId} />
          </label>

          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.crm.comment)}</span>
            <textarea name="comment" rows={3} className="field resize-none text-[13px]" />
          </label>

          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={check} className="btn btn-secondary btn-sm">
              {checking ? "…" : t(S.crm.checkDuplicate)}
            </button>
            {!duplicate && (phone || email) && !checking ? (
              <span className="t-micro text-ink-faint">{t(S.common.nothingFound)}</span>
            ) : null}
          </div>

          {duplicate ? (
            <div
              className="rounded-[10px] border px-3.5 py-3"
              style={{ borderColor: "rgb(255 85 119 / 0.3)", background: "var(--color-surface-1)" }}
            >
              <div className="t-caption flex items-center gap-2">
                <IconAlert size={14} style={{ color: "var(--color-status-risk)" }} />
                {t(S.crm.duplicateFound)} — {reason}
              </div>
              <p className="t-micro mt-1.5 leading-relaxed text-ink-muted">
                {t(S.crm.duplicateHint)}
              </p>
              <Link href={duplicate.href} className="btn btn-secondary btn-sm mt-3">
                {t(S.crm.openExisting)}: {duplicate.name}
              </Link>
            </div>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
