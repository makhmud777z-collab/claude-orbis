"use client";

import { IconExport } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

/**
 * Выгрузка в CSV.
 *
 * Раньше кнопка «Экспорт» стояла на четырёх экранах и не делала ничего —
 * обещание, которое портал не выполнял. Файл собирается прямо в браузере:
 * данные уже отрисованы на странице, ходить за ними на сервер незачем.
 *
 * Разделитель — точка с запятой, кодировка — UTF-8 с BOM: иначе Excel
 * в русской локали открывает файл одной колонкой и в кракозябрах.
 */
export function ExportButton({
  rows,
  headers,
  filename,
  label,
  locale,
}: {
  headers: string[];
  rows: (string | number | null)[][];
  filename: string;
  label?: string;
  locale: Locale;
}) {
  const t = translator(locale);

  const download = () => {
    const cell = (value: string | number | null) => {
      const text = value === null || value === undefined ? "" : String(value);
      return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const csv = [headers, ...rows].map((row) => row.map(cell).join(";")).join("\r\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button className="btn btn-secondary btn-sm" onClick={download} disabled={!rows.length}>
      <IconExport size={15} /> {label ?? t(S.common.export)}
    </button>
  );
}
