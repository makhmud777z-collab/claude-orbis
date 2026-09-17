import { cookies } from "next/headers";
import { NO_STUDENT, parseShortlist, SHORTLIST_COOKIE, type ShortlistMap } from "./shortlist";

/** Чтение шорт-листа на сервере. Клиентские компоненты получают его пропсом. */
export async function readShortlist(): Promise<ShortlistMap> {
  const store = await cookies();
  return parseShortlist(store.get(SHORTLIST_COOKIE)?.value);
}

export async function shortlistFor(studentId: string | null): Promise<string[]> {
  const map = await readShortlist();
  return map[studentId || NO_STUDENT] ?? [];
}
