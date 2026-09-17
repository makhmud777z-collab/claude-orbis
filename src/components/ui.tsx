import Link from "next/link";
import type { ReactNode } from "react";
import { initials } from "@/lib/format";
import { IconChevronRight } from "./icons";

/**
 * Хлебные крошки. Настройки спрятаны по разделам, и без обратного пути
 * человек в них теряется: страница обязана показывать, откуда в неё пришли.
 */
export function Crumbs({
  back,
  backLabel,
  current,
}: {
  back: string;
  backLabel: string;
  current: string;
}) {
  return (
    <nav className="t-caption mb-4 flex items-center gap-1.5 text-ink-faint">
      <Link href={back} className="transition-colors hover:text-ink">
        {backLabel}
      </Link>
      <IconChevronRight size={13} />
      <span className="text-ink-muted">{current}</span>
    </nav>
  );
}

export function PageHeader({
  title,
  meta,
  actions,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-6">
      <div className="min-w-0">
        <h1 className="t-display-md">{title}</h1>
        {meta ? (
          <div className="t-caption mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-muted">
            {meta}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function StatusDot({ color }: { color: string }) {
  return <span className="dot" style={{ background: color }} />;
}

export function Chip({
  children,
  active = false,
  dot,
  className = "",
}: {
  children: ReactNode;
  active?: boolean;
  dot?: string;
  className?: string;
}) {
  return (
    <span className={`chip ${active ? "chip-active" : ""} ${className}`}>
      {dot ? <StatusDot color={dot} /> : null}
      {children}
    </span>
  );
}

export function Avatar({
  name,
  size = 30,
  tone = "surface",
}: {
  name: string;
  size?: number;
  tone?: "surface" | "light";
}) {
  return (
    <span
      className="inline-flex flex-none items-center justify-center rounded-full font-medium"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        letterSpacing: "-0.02em",
        background: tone === "light" ? "var(--color-surface-1)" : "var(--color-surface-3)",
        color: tone === "light" ? "var(--color-ink)" : "var(--color-ink-muted)",
        border: tone === "light" ? "none" : "1px solid var(--color-hairline)",
      }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="card card-hover p-5">
      <div className="t-caption flex items-center gap-2 text-ink-muted">
        {accent ? <StatusDot color={accent} /> : null}
        {label}
      </div>
      <div className="t-display-sm t-num mt-3">{value}</div>
      {hint ? <div className="t-micro mt-1.5 text-ink-faint">{hint}</div> : null}
    </div>
  );
}

export function Progress({ percent, tone = "ink" }: { percent: number; tone?: string }) {
  return (
    <div className="h-[3px] w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${Math.max(2, Math.min(100, percent))}%`,
          background: tone === "ink" ? "var(--color-ink)" : tone,
        }}
      />
    </div>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    // Заголовок, который идёт вторым в колонке, обязан отступать от блока
    // выше: иначе он липнет к предыдущей карточке и выглядит обрезанным.
    <div className="mb-4 flex items-baseline justify-between gap-4 [&:not(:first-child)]:mt-9">
      <h2 className="t-headline min-w-0">{children}</h2>
      {action ? <span className="flex-none">{action}</span> : null}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="t-body-lg">{title}</div>
      {hint ? <div className="t-caption mt-2 max-w-sm text-ink-muted">{hint}</div> : null}
    </div>
  );
}

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline-soft py-2.5 last:border-b-0">
      <span className="t-caption text-ink-muted">{label}</span>
      <span className="t-body-sm text-right">{value}</span>
    </div>
  );
}

export function Banner({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "warn";
  children: ReactNode;
}) {
  return (
    <div
      className="t-caption mb-6 flex items-start gap-3 rounded-[10px] border px-4 py-3"
      style={{
        borderColor: tone === "warn" ? "rgb(224 179 65 / 0.25)" : "var(--color-hairline)",
        background: "var(--color-surface-1)",
        color: "var(--color-ink-muted)",
      }}
    >
      <StatusDot
        color={tone === "warn" ? "var(--color-status-progress)" : "var(--color-accent)"}
      />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
