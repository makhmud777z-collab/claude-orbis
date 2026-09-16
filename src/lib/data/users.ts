import type { User } from "../types";

export const USERS: User[] = [
  // ── Seoul Way Education (t_seoulway)
  { id: "u_aziz", tenantId: "t_seoulway", name: "Азиз Рахимов", role: "owner", email: "aziz@seoulway.uz", phone: "+998 90 123-45-67", branchId: "b_tas", title: "Основатель", status: "active", lastActiveAt: "2026-09-16T09:12:00", joinedAt: "2025-11-04" },
  { id: "u_dilnoza", tenantId: "t_seoulway", name: "Дилноза Каримова", role: "director", email: "dilnoza@seoulway.uz", phone: "+998 90 233-11-08", branchId: "b_tas", title: "Директор по операциям", status: "active", lastActiveAt: "2026-09-16T08:40:00", joinedAt: "2025-11-06" },
  { id: "u_shohruh", tenantId: "t_seoulway", name: "Шохрух Тураев", role: "branch_manager", email: "shohruh@seoulway.uz", phone: "+998 91 700-22-14", branchId: "b_sam", title: "Руководитель филиала, Самарканд", status: "active", lastActiveAt: "2026-09-15T18:02:00", joinedAt: "2026-01-20" },
  { id: "u_kamila", tenantId: "t_seoulway", name: "Камила Юсупова", role: "sales_manager", email: "kamila@seoulway.uz", phone: "+998 93 441-09-77", branchId: "b_tas", title: "Менеджер по продажам", status: "active", lastActiveAt: "2026-09-16T09:31:00", joinedAt: "2026-02-02" },
  { id: "u_jasur", tenantId: "t_seoulway", name: "Жасур Облоқулов", role: "sales_manager", email: "jasur@seoulway.uz", phone: "+998 94 512-77-31", branchId: "b_sam", title: "Менеджер по продажам", status: "active", lastActiveAt: "2026-09-16T07:55:00", joinedAt: "2026-03-15" },
  { id: "u_nilufar", tenantId: "t_seoulway", name: "Нилуфар Саидова", role: "case_manager", email: "nilufar@seoulway.uz", phone: "+998 90 887-65-43", branchId: "b_tas", title: "Куратор по Корее", status: "active", lastActiveAt: "2026-09-16T09:05:00", joinedAt: "2025-12-01" },
  { id: "u_bekzod", tenantId: "t_seoulway", name: "Бекзод Ҳасанов", role: "case_manager", email: "bekzod@seoulway.uz", phone: "+998 97 320-14-90", branchId: "b_tas", title: "Куратор по Корее", status: "active", lastActiveAt: "2026-09-15T20:47:00", joinedAt: "2026-04-11" },
  { id: "u_madina", tenantId: "t_seoulway", name: "Мадина Абдуллаева", role: "document_specialist", email: "madina@seoulway.uz", phone: "+998 99 105-63-22", branchId: "b_tas", title: "Специалист по документам", status: "active", lastActiveAt: "2026-09-16T08:58:00", joinedAt: "2026-01-09" },
  { id: "u_rustam", tenantId: "t_seoulway", name: "Рустам Эргашев", role: "finance", email: "rustam@seoulway.uz", phone: "+998 90 600-41-15", branchId: "b_tas", title: "Финансовый менеджер", status: "active", lastActiveAt: "2026-09-15T17:30:00", joinedAt: "2026-02-24" },
  { id: "u_partner1", tenantId: "t_seoulway", name: "Улугбек Ниязов", role: "partner", email: "ulugbek@partner.uz", phone: "+998 88 411-73-05", branchId: "b_sam", title: "Агент-партнёр, Навои", status: "invited", lastActiveAt: "2026-09-10T12:00:00", joinedAt: "2026-09-10" },

  // ── Agency X (t_agencyx)
  { id: "u_x_director", tenantId: "t_agencyx", name: "Алия Смагулова", role: "owner", email: "aliya@agencyx.kz", phone: "+7 701 223-45-67", branchId: "b_alm", title: "Директор", status: "active", lastActiveAt: "2026-09-16T06:20:00", joinedAt: "2026-02-18" },
  { id: "u_x_case", tenantId: "t_agencyx", name: "Данияр Оспанов", role: "case_manager", email: "daniyar@agencyx.kz", phone: "+7 702 884-10-02", branchId: "b_alm", title: "Куратор", status: "active", lastActiveAt: "2026-09-16T05:50:00", joinedAt: "2026-03-01" },
  { id: "u_x_sales", tenantId: "t_agencyx", name: "Жанна Ким", role: "sales_manager", email: "zhanna@agencyx.kz", phone: "+7 705 331-77-19", branchId: "b_alm", title: "Менеджер по продажам", status: "active", lastActiveAt: "2026-09-15T14:11:00", joinedAt: "2026-04-02" },
  { id: "u_x_docs", tenantId: "t_agencyx", name: "Ержан Ахметов", role: "document_specialist", email: "erzhan@agencyx.kz", phone: "+7 707 900-55-41", branchId: "b_alm", title: "Специалист по документам", status: "active", lastActiveAt: "2026-09-15T16:02:00", joinedAt: "2026-05-13" },

  // ── Hanbridge Consulting (t_hanbridge)
  { id: "u_h_owner", tenantId: "t_hanbridge", name: "Айбек Турсунов", role: "owner", email: "aibek@hanbridge.kg", phone: "+996 555 12-34-56", branchId: "b_bis", title: "Основатель", status: "active", lastActiveAt: "2026-09-16T04:40:00", joinedAt: "2026-08-30" },
  { id: "u_h_case", tenantId: "t_hanbridge", name: "Айгерим Осмонова", role: "case_manager", email: "aigerim@hanbridge.kg", phone: "+996 700 88-11-22", branchId: "b_bis", title: "Куратор", status: "active", lastActiveAt: "2026-09-15T13:25:00", joinedAt: "2026-09-01" },
];

export function usersOfTenant(tenantId: string) {
  return USERS.filter((u) => u.tenantId === tenantId);
}

export function userById(id: string) {
  return USERS.find((u) => u.id === id);
}

export function initials(name: string) {
  const [a, b] = name.split(" ");
  return `${a?.[0] ?? ""}${b?.[0] ?? ""}`.toUpperCase();
}
