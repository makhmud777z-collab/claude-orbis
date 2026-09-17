import { SmartFilter, type ClientField } from "./SmartFilter";
import { translator, type Locale, type Loc } from "@/lib/i18n";
import { FILTER_PREFIX, PRESET_KEY, QUERY_KEY, type FilterField, type FilterPreset } from "@/lib/filters";
import { savedFilters } from "@/lib/store";

/**
 * Серверная обёртка умного фильтра: переводит подписи полей и срезов,
 * подтягивает сохранённые фильтры сотрудника и отдаёт всё клиентской панели.
 * Страницы описывают только свои поля — панель везде одна и та же.
 */
export function SectionFilter({
  scope,
  fields,
  presets,
  locale,
  userId,
  total,
  shown,
}: {
  scope: string;
  fields: FilterField[];
  presets: FilterPreset[];
  locale: Locale;
  userId: string;
  total: number;
  shown: number;
}) {
  const t = translator(locale);

  const clientFields: ClientField[] = fields.map((f) => ({
    key: f.key,
    label: t(f.label),
    kind: f.kind,
    options: f.options,
    base: f.base,
    range: f.range,
  }));

  const clientPresets = presets.map((p) => ({
    key: p.key,
    label: t(p.label),
    query: presetQuery(p),
  }));

  return (
    <SmartFilter
      scope={scope}
      fields={clientFields}
      presets={clientPresets}
      saved={savedFilters(userId, scope)}
      locale={locale}
      total={total}
      shown={shown}
    />
  );
}

/** Срез — это обычный адрес: его можно открыть ссылкой и переслать. */
function presetQuery(preset: FilterPreset): string {
  const params = new URLSearchParams();
  if (preset.key) params.set(PRESET_KEY, preset.key);
  for (const [key, value] of Object.entries(preset.values)) {
    if (key === QUERY_KEY) params.set(QUERY_KEY, value);
    else if (value) params.set(FILTER_PREFIX + key, value);
  }
  return params.toString();
}

/** Подпись пустого результата — одна на все разделы. */
export const nothingFound = (locale: Locale, text: Loc) => translator(locale)(text);
