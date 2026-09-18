"use client";

import { useState } from "react";
import { addTaskAction } from "@/app/actions";
import { DatePicker, Modal, Select } from "./controls";
import { Check } from "./Check";
import { IconPlus } from "./icons";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";

/**
 * Новая задача. Кнопка «Новая задача» три версии подряд стояла на доске
 * и ничего не делала — теперь она открывает то, что обещает.
 */
export function NewTaskDialog({
  locale,
  people,
  defaultAssigneeId,
  defaultDue,
}: {
  locale: Locale;
  people: { value: string; label: string; hint?: string }[];
  defaultAssigneeId: string;
  defaultDue: string;
}) {
  const t = translator(locale);
  const [open, setOpen] = useState(false);
  const [assignee, setAssignee] = useState(defaultAssigneeId);
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");

  const priorities = [
    { key: "low" as const, label: t(S.tasks.priorityLow) },
    { key: "normal" as const, label: t(S.tasks.priorityNormal) },
    { key: "high" as const, label: t(S.tasks.priorityHigh) },
  ];

  return (
    <>
      <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        <IconPlus size={15} /> {t(S.tasks.create)}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t(S.tasks.create)} width={480}>
        <form
          action={(data) => {
            setOpen(false);
            return addTaskAction(data);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="assigneeId" value={assignee} />
          <input type="hidden" name="priority" value={priority} />

          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.tasks.taskTitle)}</span>
            <input name="title" required autoFocus className="field text-[13px]" />
          </label>

          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.crm.comment)}</span>
            <textarea name="description" rows={2} className="field resize-none text-[13px]" />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.tasks.assignee)}</span>
              <Select
                locale={locale}
                width="100%"
                value={assignee}
                options={people}
                onChange={setAssignee}
              />
            </label>
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.tasks.due)}</span>
              <DatePicker name="dueAt" value={defaultDue} locale={locale} width="100%" />
            </label>
          </div>

          <div>
            <span className="t-micro mb-2 block text-ink-faint">{t(S.tasks.priority)}</span>
            <div className="flex flex-wrap gap-1.5">
              {priorities.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setPriority(item.key)}
                  className={`chip ${priority === item.key ? "chip-active" : ""}`}
                >
                  <Check on={priority === item.key} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>
              {t(S.common.cancel)}
            </button>
            <button type="submit" className="btn btn-primary btn-sm">{t(S.common.save)}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
