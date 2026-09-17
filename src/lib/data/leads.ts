import type { Lead } from "../types";

/**
 * Лиды — необработанные обращения. Телефоны здесь не совпадают ни с одним
 * контактом: повторное обращение существующего человека по правилу дедупликации
 * попадает в его карточку, а не создаёт нового лида.
 */
export const LEADS: Lead[] = [
  { id: "l_001", tenantId: "t_seoulway", name: "Отабек Нурматов", phone: "+998 90 302-11-45", email: "otabek.n@gmail.com", source: "instagram", channelId: "ch_sw_ig", comment: "Спрашивает про бакалавриат по IT в Сеуле, TOPIK нет.", stage: "new", stageEnteredAt: "2026-09-16", ownerId: "u_kamila", branchId: "b_tas", createdAt: "2026-09-16", convertedContactId: null, convertedDealId: null, junkReason: null },
  { id: "l_002", tenantId: "t_seoulway", name: "Севара Юлдашева", phone: "+998 93 710-55-02", email: null, source: "telegram", channelId: "ch_sw_tg", comment: "Сестра студента, интересуется языковыми курсами на весну.", stage: "qualification", stageEnteredAt: "2026-09-15", ownerId: "u_kamila", branchId: "b_tas", createdAt: "2026-09-14", convertedContactId: null, convertedDealId: null, junkReason: null },
  { id: "l_003", tenantId: "t_seoulway", name: "Бахтиёр Сулейманов", phone: "+998 94 118-90-33", email: "b.suleymanov@mail.ru", source: "website", channelId: null, comment: "Заявка с сайта: медицина, бюджет до $10 000.", stage: "qualification", stageEnteredAt: "2026-09-13", ownerId: "u_jasur", branchId: "b_sam", createdAt: "2026-09-12", convertedContactId: null, convertedDealId: null, junkReason: null },
  { id: "l_004", tenantId: "t_seoulway", name: "Шахноза Мирзаева", phone: "+998 97 404-27-18", email: "shahnoza.m@gmail.com", source: "referral", channelId: null, comment: "По рекомендации Малики. Магистратура по дизайну.", stage: "in_progress", stageEnteredAt: "2026-09-11", ownerId: "u_nilufar", branchId: "b_tas", createdAt: "2026-09-09", convertedContactId: null, convertedDealId: null, junkReason: null },
  { id: "l_005", tenantId: "t_seoulway", name: "Иброхим Ғаниев", phone: "+998 90 555-73-19", email: null, source: "instagram", channelId: "ch_sw_ig", comment: "Спросил стоимость и пропал, не отвечает третий день.", stage: "in_progress", stageEnteredAt: "2026-09-08", ownerId: "u_kamila", branchId: "b_tas", createdAt: "2026-09-05", convertedContactId: null, convertedDealId: null, junkReason: null },
  { id: "l_006", tenantId: "t_seoulway", name: "Дилдора Хакимова", phone: "+998 91 220-64-77", email: "dildora.h@gmail.com", source: "event", channelId: null, comment: "С выставки в Ташкенте, оставила контакт для рассылки.", stage: "new", stageEnteredAt: "2026-09-16", ownerId: "u_jasur", branchId: "b_sam", createdAt: "2026-09-16", convertedContactId: null, convertedDealId: null, junkReason: null },
  { id: "l_007", tenantId: "t_seoulway", name: "Реклама, автоответ", phone: "+998 99 000-00-01", email: null, source: "instagram", channelId: "ch_sw_ig", comment: "Спам из Direct.", stage: "junk", stageEnteredAt: "2026-09-10", ownerId: "u_kamila", branchId: "b_tas", createdAt: "2026-09-10", convertedContactId: null, convertedDealId: null, junkReason: "Спам" },
  { id: "l_008", tenantId: "t_seoulway", name: "Азиза Нурматова", phone: "+998 90 111-22-33", email: "aziza.n@gmail.com", source: "instagram", channelId: "ch_sw_ig", comment: "Первое обращение, конвертирован в контакт и сделку.", stage: "converted", stageEnteredAt: "2026-06-05", ownerId: "u_nilufar", branchId: "b_tas", createdAt: "2026-06-02", convertedContactId: "s_001", convertedDealId: "d_001", junkReason: null },

  { id: "lx_001", tenantId: "t_agencyx", name: "Тимур Абдрахманов", phone: "+7 701 884-22-10", email: "timur.a@gmail.com", source: "instagram", channelId: "ch_ax_ig", comment: "Инженерия, Пусан, бюджет до $8 000.", stage: "new", stageEnteredAt: "2026-09-16", ownerId: "u_x_sales", branchId: "b_alm", createdAt: "2026-09-16", convertedContactId: null, convertedDealId: null, junkReason: null },
  { id: "lx_002", tenantId: "t_agencyx", name: "Асель Нурланова", phone: "+7 705 447-91-03", email: null, source: "telegram", channelId: "ch_ax_tg", comment: "Языковые курсы, хочет выехать весной.", stage: "qualification", stageEnteredAt: "2026-09-14", ownerId: "u_x_sales", branchId: "b_alm", createdAt: "2026-09-13", convertedContactId: null, convertedDealId: null, junkReason: null },

  { id: "lh_001", tenantId: "t_hanbridge", name: "Азамат Сыдыков", phone: "+996 555 77-31-08", email: null, source: "instagram", channelId: "ch_hb_ig", comment: "Бакалавриат, IT, спрашивает про гранты.", stage: "new", stageEnteredAt: "2026-09-16", ownerId: "u_h_case", branchId: "b_bis", createdAt: "2026-09-16", convertedContactId: null, convertedDealId: null, junkReason: null },
];

export function leadsOfTenant(tenantId: string) {
  return LEADS.filter((l) => l.tenantId === tenantId);
}

/** Активными считаются лиды до конвертации: именно они участвуют в дедупликации. */
export const isActiveLead = (l: Lead) => l.stage !== "converted" && l.stage !== "junk";

/** Нормализация телефона: сравниваем только цифры, формат ввода значения не имеет. */
export const digits = (phone: string) => phone.replace(/\D/g, "");
