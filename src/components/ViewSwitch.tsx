"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconBoard, IconList } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";
import { VIEW_KEY, type ListView } from "@/lib/view";

/**
 * Канбан или список — как в Битриксе.
 *
 * Доска нужна, когда ведёшь работу: видно, где затор. Список нужен, когда
 * работу проверяешь: видно суммы, сроки и ответственных подряд. Выбор
 * живёт в адресе страницы, поэтому его можно отправить ссылкой.
 */
export function ViewSwitch({ view, locale }: { view: ListView; locale: Locale }) {
  const t = translator(locale);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const go = (next: ListView) => {
    const query = new URLSearchParams(params.toString());
    if (next === "board") query.delete(VIEW_KEY);
    else query.set(VIEW_KEY, next);
    const s = query.toString();
    router.push(s ? `${pathname}?${s}` : pathname);
  };

  const options = [
    { key: "board" as const, label: t(S.pipelines.viewKanban), Icon: IconBoard },
    { key: "list" as const, label: t(S.pipelines.viewList), Icon: IconList },
  ];

  return (
    <span className="flex items-center gap-0.5 rounded-full bg-surface-1 p-0.5" style={{ border: "1px solid var(--color-hairline)" }}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => go(option.key)}
          aria-pressed={view === option.key}
          title={option.label}
          className="t-micro flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors"
          style={{
            background: view === option.key ? "var(--color-surface-3)" : "transparent",
            color: view === option.key ? "var(--color-ink)" : "var(--color-ink-faint)",
          }}
        >
          <option.Icon size={13} />
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </span>
  );
}
