"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, Tooltip } from "./controls";
import { IconSettings } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

/**
 * Выбор воронки — там же, где доска, а не отдельным разделом меню.
 * Рядом шестерёнка: настройки стадий открываются из того места,
 * где сотрудник на эти стадии и смотрит.
 */
export function PipelinePicker({
  pipelines,
  current,
  locale,
  canEdit,
}: {
  pipelines: { id: string; name: string }[];
  current: string;
  locale: Locale;
  canEdit: boolean;
}) {
  const t = translator(locale);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const pick = (id: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("pipeline", id);
    router.push(`${pathname}?${next}`);
  };

  return (
    <span className="flex items-center gap-1.5">
      {pipelines.length > 1 ? (
        <Select
          locale={locale}
          width="min(216px, 60vw)"
          value={current}
          options={pipelines.map((p) => ({ value: p.id, label: p.name }))}
          onChange={pick}
        />
      ) : (
        <span className="chip">{pipelines[0]?.name ?? t(S.pipelines.title)}</span>
      )}
      {canEdit ? (
        <Tooltip text={t(S.pipelines.title)}>
          <Link href="/crm/pipelines" className="btn-icon" aria-label={t(S.pipelines.title)}>
            <IconSettings size={16} />
          </Link>
        </Tooltip>
      ) : null}
    </span>
  );
}
