"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconChevronRight } from "./icons";

/**
 * Обратный путь + хлебные крошки одним элементом.
 *
 * Ведёт стрелка «назад»: на любой странице человек видит, куда вернуться,
 * и попадает туда одним нажатием, а не ищет кнопку браузера.
 *
 * Если он пришёл сюда с другой страницы портала, стрелка возвращает именно
 * туда, откуда он пришёл, — иначе из «Финансов», открытых из «Сделок»,
 * нажатие уводило бы на дашборд, которого человек не видел. Когда ходить
 * некуда (ссылку открыли напрямую или прислали коллеге), работает обычный
 * переход к родителю: стрелка остаётся настоящей ссылкой, так что открыть
 * её в новой вкладке и скопировать адрес можно как всегда.
 */
export function Crumbs({
  back,
  backLabel,
  current,
}: {
  back: string;
  backLabel: string;
  current?: string;
}) {
  const router = useRouter();
  const [fromPortal, setFromPortal] = useState(false);

  useEffect(() => {
    /*
     * Само по себе history.length ничего не говорит: у свежей вкладки оно
     * уже равно двум, и «назад» по прямой ссылке уводило на пустую страницу
     * вместо портала. Поэтому запоминаем длину истории на первой открытой
     * странице и считаем своими только переходы поверх неё — всё, что было
     * в этой вкладке до портала, остаётся недосягаемым.
     */
    const KEY = "orbis_history_base";
    try {
      const saved = Number(sessionStorage.getItem(KEY));
      const base = saved || window.history.length;
      if (!saved) sessionStorage.setItem(KEY, String(base));
      setFromPortal(window.history.length > base);
    } catch {
      // Хранилище может быть закрыто настройками браузера — тогда просто
      // ведём к родителю: это рабочее поведение, а не ошибка.
      setFromPortal(false);
    }
  }, []);

  return (
    <nav className="t-caption mb-4 flex items-center gap-1.5 text-ink-faint">
      <Link
        href={back}
        onClick={(e) => {
          // Средняя кнопка, Ctrl и Cmd открывают в новой вкладке — не мешаем.
          if (!fromPortal || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          router.back();
        }}
        className="-ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium text-ink-muted transition-colors hover:bg-surface-1 hover:text-ink"
      >
        <IconChevronRight size={14} style={{ transform: "rotate(180deg)" }} />
        {backLabel}
      </Link>
      {current ? (
        <>
          <IconChevronRight size={13} />
          <span className="text-ink-muted">{current}</span>
        </>
      ) : null}
    </nav>
  );
}
