"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Появление страницы — ровно один раз на вход в раздел.
 *
 * Анимация запускается вручную, а не классом в CSS, и это главное здесь.
 * CSS-анимация играет каждый раз, когда браузер создаёт узел заново, а
 * узел пересоздаётся не только при переходе: смена вида списка, фильтр,
 * сортировка, сохранение формы — всё это тоже перерисовка, и экран каждый
 * раз дёргался, показывая то же самое. Ключа по адресу раздела оказалось
 * мало: React пересоздавал <main> и при неизменном ключе.
 *
 * Поэтому решение принимает сам компонент: запомнил адрес — сравнил —
 * проиграл, только если раздел действительно сменился. Повторный клик по
 * тому разделу, где человек уже стоит, не делает ничего.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const node = useRef<HTMLElement>(null);
  const shown = useRef<string | null>(null);

  useEffect(() => {
    const el = node.current;
    if (!el) return;

    const first = shown.current === null;
    const moved = shown.current !== pathname;
    shown.current = pathname;
    if (!first && !moved) return;

    // Человек попросил систему двигаться меньше — значит, не двигаемся.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    el.animate(
      [
        { opacity: 0, transform: "translateY(5px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
  }, [pathname]);

  return (
    <main ref={node} className="min-w-0 flex-1 px-5 py-7 lg:px-8">
      {children}
    </main>
  );
}
