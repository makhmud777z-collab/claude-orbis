"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "./controls";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

/**
 * Выбор воронки — там же, где доска, а не отдельным разделом меню.
 * Настройка стадий сюда не вынесена намеренно: она живёт в закрытом
 * «Администрировании», чтобы менеджер не переписал воронку с доски.
 */
export function PipelinePicker({
  pipelines,
  current,
  locale,
}: {
  pipelines: { id: string; name: string }[];
  current: string;
  locale: Locale;
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
    </span>
  );
}
