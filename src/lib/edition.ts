import { loc, type Loc } from "./i18n";
import type { Module } from "./rbac";

/**
 * Версии продукта из дорожной карты.
 * Агентство покупает MVP (подбор вузов) и растёт до CRM и платформы —
 * поэтому версия это не маркетинг, а реальный набор модулей у арендатора.
 */
export type Edition = "mvp" | "crm" | "advanced";

export const EDITIONS: {
  key: Edition;
  order: number;
  code: string;
  label: Loc;
  goal: Loc;
}[] = [
  {
    key: "mvp",
    order: 1,
    code: "01 / MVP",
    label: loc("University Finder", "University Finder"),
    goal: loc(
      "Проверка рынка: подбор вузов под профиль студента",
      "Bozorni tekshirish: talaba profiliga mos universitet tanlash",
    ),
  },
  {
    key: "crm",
    order: 2,
    code: "02 / CRM",
    label: loc("CRM", "CRM"),
    goal: loc(
      "Управление студентами: заявки, документы, задачи, сроки",
      "Talabalarni boshqarish: arizalar, hujjatlar, vazifalar, muddatlar",
    ),
  },
  {
    key: "advanced",
    order: 3,
    code: "03 / ADVANCED",
    label: loc("Advanced", "Advanced"),
    goal: loc(
      "Единая среда для агентства и студента",
      "Agentlik va talaba uchun yagona muhit",
    ),
  },
];

/** Модули, которые появляются в каждой версии (версии накапливаются). */
const MODULES_BY_EDITION: Record<Edition, Module[]> = {
  mvp: ["universities", "students", "settings"],
  crm: [
    "dashboard",
    "applications",
    "documents",
    "tasks",
    "deadlines",
    "team",
    "finance",
  ],
  advanced: [],
};

export function editionOrder(edition: Edition): number {
  return EDITIONS.find((e) => e.key === edition)?.order ?? 1;
}

export function editionMeta(edition: Edition) {
  return EDITIONS.find((e) => e.key === edition) ?? EDITIONS[0];
}

/** Все модули, доступные арендатору на его версии. */
export function editionModules(edition: Edition): Module[] {
  const level = editionOrder(edition);
  return EDITIONS.filter((e) => e.order <= level).flatMap(
    (e) => MODULES_BY_EDITION[e.key],
  );
}

export function hasModule(edition: Edition, module: Module): boolean {
  return editionModules(edition).includes(module);
}

/** В какой версии модуль появляется — нужно для экрана «доступно в версии …». */
export function moduleEdition(module: Module): Edition {
  for (const e of EDITIONS) {
    if (MODULES_BY_EDITION[e.key].includes(module)) return e.key;
  }
  return "advanced";
}

/** Куда попадает сотрудник, открыв систему: MVP начинается с каталога. */
export function homeHref(edition: Edition): string {
  return hasModule(edition, "dashboard") ? "/" : "/universities";
}
