import Link from "next/link";
import type { ReactNode } from "react";
import { IconLogo } from "./icons";
import { ROOT_DOMAIN } from "@/lib/tenants";

/**
 * Обвязка публичных правовых страниц.
 *
 * Политика и удаление данных обязаны открываться у кого угодно и без
 * входа — их читает не сотрудник агентства, а проверяющий Meta и человек,
 * оставивший заявку в рекламе. Поэтому ни меню портала, ни арендатора
 * здесь нет: страница про платформу целиком.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[760px] px-5 py-12 sm:py-16">
      <header className="page-in mb-10">
        <Link href="/" className="mb-8 inline-flex items-center gap-2.5 text-ink">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-white"
            style={{ background: "var(--color-accent)" }}
          >
            <IconLogo size={17} />
          </span>
          <span className="t-body-sm font-semibold">Orbis System</span>
        </Link>
        <h1 className="t-display-md">{title}</h1>
        <p className="t-caption mt-2.5 text-ink-faint">{updated}</p>
      </header>

      <article >{children}</article>

      <footer className="t-caption mt-14 border-t border-hairline-soft pt-6 text-ink-faint">
        Orbis System · {ROOT_DOMAIN} ·{" "}
        <Link href="/privacy" className="hover:text-ink">
          Политика конфиденциальности
        </Link>{" "}
        ·{" "}
        <Link href="/data-deletion" className="hover:text-ink">
          Удаление данных
        </Link>
      </footer>
    </div>
  );
}

/** Раздел правового текста: заголовок и содержимое одним блоком. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-9">
      <h2 className="t-headline mb-3">{title}</h2>
      <div className="t-body-sm space-y-3 leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}
