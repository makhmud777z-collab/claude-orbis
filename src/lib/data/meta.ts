import type { MetaFormMapping, MetaPage } from "../types";

/**
 * Демо-подключения Meta. Показывают готовый путь «реклама → лид в воронке»
 * на витрине продукта; настоящие агентства подключают страницы сами, и их
 * записи ложатся в то же хранилище.
 *
 * Токены здесь ненастоящие: забрать по ним лид нельзя, да и незачем —
 * демо-агентства живут на сидах.
 */
export const META_PAGES: MetaPage[] = [
  {
    id: "mp_sw",
    tenantId: "t_seoulway",
    pageId: "102938475610293",
    pageName: "Seoul Way Education",
    igHandle: "@seoulway.uz",
    token: "demo-not-a-real-token",
    channelId: "ch_sw_ig",
    status: "connected",
    connectedAt: "2026-01-15",
    connectedBy: "u_aziz",
    connectedByFbId: null,
  },
  {
    id: "mp_ax",
    tenantId: "t_agencyx",
    pageId: "556677889900112",
    pageName: "Agency X",
    igHandle: "@agencyx.kz",
    token: "demo-not-a-real-token",
    channelId: "ch_ax_ig",
    status: "connected",
    connectedAt: "2026-03-10",
    connectedBy: "u_x_director",
    connectedByFbId: null,
  },
];

/**
 * Раскладка полей. Названия полей в формах у агентств разные — это и есть
 * причина, по которой раскладка живёт в Orbis, а не угадывается каждый раз.
 */
export const META_FORMS: MetaFormMapping[] = [
  {
    id: "mf_sw_korea",
    tenantId: "t_seoulway",
    pageId: "102938475610293",
    formId: "7001",
    formName: "Корея — бесплатная консультация",
    map: {
      full_name: "name",
      phone_number: "phone",
      email: "email",
      "какой уровень образования?": "comment",
    },
    ownerId: "u_kamila",
    updatedAt: "2026-01-16",
  },
  {
    id: "mf_ax_main",
    tenantId: "t_agencyx",
    pageId: "556677889900112",
    formId: "8001",
    formName: "Учёба в Корее",
    map: { full_name: "name", "ваш номер для связи": "phone", email: "email" },
    ownerId: null,
    updatedAt: "2026-03-11",
  },
];
