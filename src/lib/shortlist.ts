/**
 * Шорт-лист: вузы, отобранные оператором для конкретного студента.
 * Ключ — id студента, «_» для подбора без привязки к студенту.
 * Сейчас хранится в cookie: этого достаточно, чтобы функция работала
 * целиком, а на этапе 2 хранилище меняется на таблицу без правок в UI.
 */

export const SHORTLIST_COOKIE = "orbis_shortlist";
export const NO_STUDENT = "_";
export const SHORTLIST_LIMIT = 6;

export type ShortlistMap = Record<string, string[]>;

export function parseShortlist(raw: string | undefined): ShortlistMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: ShortlistMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(value)) out[key] = value.filter((v) => typeof v === "string");
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Добавляет или убирает вуз. На пределе список не вытесняет ранее выбранное
 * молча: лишний вуз просто не добавляется, оператор сам решает, кого убрать.
 */
export function toggle(map: ShortlistMap, studentId: string, universityId: string) {
  const key = studentId || NO_STUDENT;
  const current = map[key] ?? [];
  if (current.includes(universityId))
    return { ...map, [key]: current.filter((id) => id !== universityId) };
  if (current.length >= SHORTLIST_LIMIT) return map;
  return { ...map, [key]: [...current, universityId] };
}
