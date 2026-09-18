"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconBell } from "./icons";
import { StatusDot } from "./ui";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

export interface NoticeItem {
  id: string;
  href: string;
  title: string;
  hint: string;
  color: string;
  /** просроченное показываем первым и красным */
  overdue: boolean;
}

/**
 * Уведомления.
 *
 * Раньше это был колокольчик с красной точкой, который ничего не открывал —
 * обещание, которое портал не выполнял. Теперь он показывает то, что
 * действительно требует внимания сегодня: просроченные сроки и задачи,
 * и ближайшие на неделю. Точка горит только когда есть просроченное.
 */
export function Notifications({ items, locale }: { items: NoticeItem[]; locale: Locale }) {
  const t = translator(locale);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const overdue = items.filter((i) => i.overdue).length;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button
        className="btn-icon relative"
        aria-label={t(S.common.notifications)}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <IconBell size={17} />
        {overdue ? (
          <span
            className="absolute right-1.5 top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
            style={{ background: "var(--color-status-risk)" }}
          >
            {overdue > 9 ? "9+" : overdue}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="pop-in card-raised absolute right-0 top-11 z-40 w-[340px] overflow-hidden">
          <div className="card-head">
            <span className="t-caption">{t(S.common.notifications)}</span>
            <span className="t-micro t-num text-ink-faint">{items.length}</span>
          </div>

          {items.length ? (
            <div className="max-h-[60vh] divide-y divide-hairline-soft overflow-y-auto">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                >
                  <span className="mt-1.5 flex-none">
                    <StatusDot color={item.color} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="t-caption block">{item.title}</span>
                    <span
                      className="t-micro mt-0.5 block"
                      style={{ color: item.overdue ? "var(--color-status-risk)" : "var(--color-ink-faint)" }}
                    >
                      {item.hint}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="t-caption px-4 py-8 text-center text-ink-faint">
              {t(S.common.noNotifications)}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
