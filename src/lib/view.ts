/**
 * Режим показа списка: доска или таблица.
 *
 * Ключ лежит в отдельном модуле, а не рядом с компонентом переключателя,
 * и это не вкусовщина. Экспорт из модуля с «use client» приходит в
 * серверный компонент ссылкой на клиентский код, а не значением: строка
 * превращается в функцию-заглушку, и `params[VIEW_KEY]` молча становится
 * undefined. Общие константы обязаны жить вне клиентской границы.
 */
export const VIEW_KEY = "view";

export type ListView = "board" | "list";

export function readView(params: Record<string, string | string[] | undefined>): ListView {
  return params[VIEW_KEY] === "list" ? "list" : "board";
}
