/**
 * Свой флажок. Нативный `<input type="checkbox">` остаётся в разметке
 * скрытым, чтобы форма отправлялась как обычно и работала клавиатура.
 */
export function Check({ on }: { on: boolean }) {
  return (
    <span
      className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] border transition-colors"
      style={{
        borderColor: on ? "var(--color-accent)" : "var(--color-hairline)",
        background: on ? "var(--color-accent)" : "transparent",
        color: "#fff",
      }}
    >
      {on ? (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m4.5 12.5 5 5 10-11" />
        </svg>
      ) : null}
    </span>
  );
}
