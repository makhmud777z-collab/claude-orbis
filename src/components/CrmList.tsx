import Link from "next/link";
import { motion } from "framer-motion";
import { IconMail, IconPhone } from "./icons";
import { Avatar, StatusDot } from "./ui";
import { translator, type Locale } from "@/lib/i18n";
import { S } from "@/lib/strings";
import { containerVariants, itemVariants } from "@/lib/animations";

export interface CrmRow {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  stageLabel: string;
  stageColor: string;
  ownerName: string;
  /** правая колонка: сумма или дата — раздел решает сам */
  value: string;
  valueHint: string | null;
  phone: string | null;
  email: string | null;
  /** сколько дней карточка стоит на одной стадии */
  idleDays: number;
  stale: boolean;
}

/**
 * Список вместо доски.
 *
 * Доска отвечает на вопрос «где затор», список — на вопрос «что у нас
 * вообще есть»: суммы, сроки и ответственные видны подряд, а не по одной
 * карточке. Звонок и письмо — прямо из строки, без захода в карточку.
 */
export function CrmList({
  rows,
  locale,
  valueLabel,
}: {
  rows: CrmRow[];
  locale: Locale;
  valueLabel: string;
}) {
  const t = translator(locale);

  return (
    <div className="card overflow-hidden">
      <div className="scroll-x">
        <table className="w-full min-w-[880px] border-collapse">
          <thead>
            <tr className="border-b border-hairline-soft" style={{ background: "var(--color-surface-2)" }}>
              {[t(S.crm.contact), t(S.pipelines.stages), t(S.crm.owner), valueLabel, ""].map((head, i) => (
                <th
                  key={head || i}
                  className="t-micro px-5 py-3 text-left font-medium uppercase tracking-[0.07em] text-ink-faint"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <motion.tbody initial="hidden" animate="visible" variants={containerVariants}>
            {rows.map((row) => (
              <motion.tr key={row.id} variants={itemVariants} className="border-b border-hairline-soft transition-colors last:border-b-0 hover:bg-surface-2">
                <td className="px-5 py-3">
                  <Link href={row.href} className="block min-w-0">
                    <span className="t-body-sm block truncate">{row.title}</span>
                    <span className="t-micro block truncate text-ink-faint">{row.subtitle}</span>
                  </Link>
                </td>

                <td className="px-5 py-3">
                  <span className="chip">
                    <StatusDot color={row.stageColor} />
                    {row.stageLabel}
                  </span>
                  {/* «Завис» — карточка, которая неделю стоит на одной стадии.
                      Это главный вопрос к доске: не где карточки, а где они встали. */}
                  {row.stale ? (
                    <span
                      className="t-micro ml-1.5 whitespace-nowrap rounded-full px-2 py-0.5"
                      style={{
                        background: "color-mix(in srgb, var(--color-status-progress) 16%, transparent)",
                        color: "var(--color-status-progress)",
                      }}
                    >
                      {t(S.crm.idle)} {row.idleDays}
                    </span>
                  ) : null}
                </td>

                <td className="px-5 py-3">
                  <span className="flex items-center gap-2">
                    <Avatar name={row.ownerName} size={24} />
                    <span className="t-caption whitespace-nowrap text-ink-muted">{row.ownerName}</span>
                  </span>
                </td>

                <td className="px-5 py-3">
                  <span className="t-body-sm t-num block whitespace-nowrap">{row.value}</span>
                  {row.valueHint ? (
                    <span className="t-micro block whitespace-nowrap text-ink-faint">{row.valueHint}</span>
                  ) : null}
                </td>

                <td className="px-5 py-3">
                  <span className="flex items-center justify-end gap-1">
                    {row.phone ? (
                      <a className="btn-icon h-8 w-8" href={`tel:${row.phone}`} aria-label={t(S.students.call)} title={row.phone}>
                        <IconPhone size={14} />
                      </a>
                    ) : null}
                    {row.email ? (
                      <a className="btn-icon h-8 w-8" href={`mailto:${row.email}`} aria-label={t(S.students.write)} title={row.email}>
                        <IconMail size={14} />
                      </a>
                    ) : null}
                  </span>
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>
    </div>
  );
}
