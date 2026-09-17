import { userById } from "./data/users";
import type { Translate } from "./i18n";
import * as store from "./store";
import type { TimelineItem } from "@/components/Timeline";

/** История карточки, приведённая к строкам текущего языка. */
export function timelineItems(
  entity: "lead" | "deal" | "contact" | "employee",
  entityId: string,
  t: Translate,
): TimelineItem[] {
  return store.timelineOf(entity, entityId).map((e) => ({
    id: e.id,
    kind: e.kind,
    title: t(e.title),
    body: e.body,
    authorName: userById(e.authorId)?.name ?? "—",
    at: e.at,
    source: e.source ? t(e.source) : null,
    dueAt: e.dueAt,
    done: e.done,
  }));
}
