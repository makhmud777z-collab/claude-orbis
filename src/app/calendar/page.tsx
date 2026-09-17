import { Calendar, type CalendarItem } from "@/components/Calendar";
import { moduleGate } from "@/components/guard";
import { PageHeader } from "@/components/ui";
import { userById } from "@/lib/data/users";
import { formatters } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { DEADLINE_KIND } from "@/lib/labels";
import { scopedActivity, scopedDeadlines, scopedTasks } from "@/lib/queries";
import { allow } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { allEvents } from "@/lib/store";
import { P, S } from "@/lib/strings";
import type { EventKind } from "@/lib/types";

const EVENT_COLOR: Record<EventKind, string> = {
  meeting: "var(--color-status-open)",
  call: "var(--color-status-deal)",
  interview: "var(--color-status-violet)",
  personal: "var(--color-status-hold)",
};

/**
 * Календарь сотрудника.
 *
 * Сводит в одну сетку то, что уже живёт в системе — дедлайны сделок, сроки
 * документов и задач, дела из истории карточек — и свои встречи. Своя здесь
 * только встреча: остальное остаётся в своих разделах, а календарь их читает.
 */
export default async function CalendarPage() {
  const session = await getSession();
  const t = translator(session.locale);
  const gate = moduleGate(session, "calendar", t(S.calendar.title));
  if (gate) return gate;

  const f = formatters(session.locale);
  const items: CalendarItem[] = [];

  // Свои встречи — видит тот, кто их поставил, и руководитель.
  const mine = session.scope === "own";
  for (const event of allEvents(session.tenant.id)) {
    if (mine && event.ownerId !== session.user.id) continue;
    items.push({
      id: event.id,
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      color: EVENT_COLOR[event.kind],
      kindLabel: t(
        event.kind === "meeting" ? S.calendar.kindMeeting
        : event.kind === "call" ? S.calendar.kindCall
        : event.kind === "interview" ? S.calendar.kindInterview
        : S.calendar.kindPersonal,
      ),
      href: event.relation
        ? event.relation.type === "deal"
          ? `/crm/deals/${event.relation.id}`
          : `/crm/contacts/${event.relation.id}`
        : null,
      note: event.note,
      ownerName: userById(event.ownerId)?.name ?? "—",
    });
  }

  for (const deadline of scopedDeadlines(session)) {
    const kind = DEADLINE_KIND[deadline.kind];
    items.push({
      id: deadline.id,
      title: t(deadline.title),
      date: deadline.date,
      startTime: null,
      endTime: null,
      color: kind.dot,
      kindLabel: t(kind.label),
      href: deadline.relation
        ? deadline.relation.type === "deal"
          ? `/crm/deals/${deadline.relation.id}`
          : deadline.relation.type === "student"
            ? `/crm/contacts/${deadline.relation.id}`
            : "/tasks"
        : "/tasks",
      note: "",
      ownerName: userById(deadline.ownerId)?.name ?? "—",
    });
  }

  // Дела со сроком из истории карточек: их ставят прямо в сделке или лиде.
  for (const event of scopedActivity(session)) {
    if (event.kind !== "activity" || !event.dueAt || event.done) continue;
    items.push({
      id: `tl_${event.id}`,
      title: t(event.title),
      date: event.dueAt,
      startTime: null,
      endTime: null,
      color: "var(--color-status-progress)",
      kindLabel: t(S.calendar.activity),
      href:
        event.entity === "deal" ? `/crm/deals/${event.entityId}`
        : event.entity === "lead" ? `/crm/leads/${event.entityId}`
        : event.entity === "contact" ? `/crm/contacts/${event.entityId}`
        : `/team/${event.entityId}`,
      note: event.body ?? "",
      ownerName: userById(event.authorId)?.name ?? "—",
    });
  }

  const tasks = scopedTasks(session).filter((task) => task.status !== "done");
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <>
      <PageHeader
        title={t(S.calendar.title)}
        meta={
          <>
            <span>{f.plural(items.length, P.events)}</span>
            <span>·</span>
            <span>{t(S.calendar.subtitle)}</span>
            <span>·</span>
            <span>{f.plural(tasks.length, P.tasks)}</span>
          </>
        }
      />
      <Calendar
        items={items}
        locale={session.locale}
        canCreate={allow(session.tenant.id, session.role, "calendar", "create")}
        today={`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`}
      />
    </>
  );
}
