"use client";

import { useMemo, useState } from "react";
import { requestDocumentAction } from "@/app/actions";
import { Modal, Select } from "./controls";
import { IconPlus } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

export interface DocKindOption {
  value: string;
  label: string;
}

/**
 * Запрос документа у студента.
 *
 * Файлового хранилища ещё нет, поэтому «Загрузить документ» было бы кнопкой
 * ни о чём. Запрос — настоящий шаг куратора: пункт встаёт в досье со статусом
 * «запрошен», виден в фильтре «требуют внимания» и остаётся в истории контакта.
 */
export function RequestDocumentDialog({
  locale,
  students,
  kinds,
  /** пункты, которые запрашивать незачем: studentId → ключи типов */
  existing,
  defaultStudentId,
  label,
  variant = "primary",
}: {
  locale: Locale;
  students: { value: string; label: string; hint?: string }[];
  kinds: DocKindOption[];
  existing: Record<string, string[]>;
  defaultStudentId?: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const t = translator(locale);

  // Открывать диалог на студенте, которому нечего запросить, — значит
  // показывать заблокированную форму: по умолчанию берём того, у кого
  // свободные пункты остались.
  const firstFree = useMemo(() => {
    const total = kinds.length;
    return (
      students.find((s) => (existing[s.value]?.length ?? 0) < total)?.value ??
      students[0]?.value ??
      ""
    );
  }, [existing, kinds.length, students]);

  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState(defaultStudentId ?? firstFree);
  const [kind, setKind] = useState("");

  // Пункт, который уже в работе или проверен, предлагать незачем: повторный
  // запрос ничего не добавит, а список только длиннее. «Нет файла» и
  // «возвращён» остаются — их и просят у студента.
  const free = useMemo(() => {
    const taken = new Set(existing[studentId] ?? []);
    return kinds.filter((k) => !taken.has(k.value));
  }, [existing, kinds, studentId]);

  const current = free.some((k) => k.value === kind) ? kind : (free[0]?.value ?? "");

  const openDialog = () => {
    setStudentId(defaultStudentId ?? firstFree);
    setKind("");
    setOpen(true);
  };

  if (!students.length) return null;

  return (
    <>
      <button
        className={`btn btn-${variant} btn-sm`}
        onClick={openDialog}
      >
        <IconPlus size={15} /> {label ?? t(S.documents.request)}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t(S.documents.request)}
        width={460}
      >
        <form
          action={(data) => {
            setOpen(false);
            return requestDocumentAction(data);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="kind" value={current} />

          {defaultStudentId ? null : (
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.documents.student)}</span>
              <Select
                locale={locale}
                width="100%"
                searchable
                value={studentId}
                options={students}
                onChange={setStudentId}
              />
            </label>
          )}

          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.documents.docKind)}</span>
            {free.length ? (
              <Select
                locale={locale}
                width="100%"
                value={current}
                options={free}
                onChange={setKind}
              />
            ) : (
              <div className="field flex items-center text-[13px] text-ink-faint">
                {t(S.documents.allRequested)}
              </div>
            )}
          </label>

          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">
              {t(S.documents.noteForStudent)}
            </span>
            <textarea name="note" rows={2} className="field resize-none text-[13px]" />
          </label>

          <p className="t-micro leading-relaxed text-ink-faint">{t(S.documents.requestHint)}</p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setOpen(false)}
            >
              {t(S.common.cancel)}
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!free.length}>
              {t(S.documents.request)}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
