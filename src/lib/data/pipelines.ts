import { loc } from "../i18n";
import type { Pipeline } from "../types";

/**
 * Воронки. У лидов и сделок они разные, как в Битриксе: лид проходит
 * квалификацию, сделка — путь от подбора вуза до вылета.
 * Цвет стадии редактируется в настройках воронки, поэтому он часть данных,
 * а не константа в коде.
 */
export const PIPELINES: Pipeline[] = [
  {
    id: "pl_sw_leads",
    tenantId: "t_seoulway",
    entity: "lead",
    isDefault: true,
    name: loc("Лиды", "Lidlar"),
    stages: [
      { key: "new", label: loc("Новый", "Yangi"), color: "#ff7a3d", hint: loc("Обращение пришло, звонка не было", "Murojaat keldi, qo‘ng‘iroq bo‘lmadi") },
      { key: "qualification", label: loc("Квалификация", "Malaka"), color: "#0099ff", hint: loc("Выясняем цель, бюджет и уровень языка", "Maqsad, byudjet va til darajasi aniqlanmoqda") },
      { key: "in_progress", label: loc("В работе", "Ishda"), color: "#e0b341", hint: loc("Консультация назначена, ждём решения семьи", "Konsultatsiya belgilangan, oila qaroriga qaraymiz") },
      { key: "converted", label: loc("Конвертирован", "Konvertatsiya"), color: "#22c55e", hint: loc("Создан контакт и первая сделка", "Kontakt va birinchi bitim yaratildi"), final: "won" },
      { key: "junk", label: loc("Некачественный", "Sifatsiz"), color: "#ff5577", hint: loc("Не целевой, дубль или отказ", "Nomaqsad, dublikat yoki rad javobi"), final: "lost" },
    ],
  },
  {
    id: "pl_sw_main",
    tenantId: "t_seoulway",
    entity: "deal",
    isDefault: true,
    name: loc("Поступление в вуз", "Universitetga qabul"),
    stages: [
      { key: "new", label: loc("Новая сделка", "Yangi bitim"), color: "#ff7a3d", hint: loc("Сделка создана, работа не начата", "Bitim yaratildi, ish boshlanmadi") },
      { key: "consultation", label: loc("Консультация", "Konsultatsiya"), color: "#0099ff", hint: loc("Профиль собран, бюджет и цели обсуждены", "Profil yig‘ilgan, byudjet muhokama qilingan") },
      { key: "matching", label: loc("Подбор вузов", "Universitet tanlash"), color: "#6a4cf5", hint: loc("Куратор формирует шорт-лист из каталога", "Kurator qisqa ro‘yxat tuzmoqda") },
      { key: "documents", label: loc("Сбор документов", "Hujjat yig‘ish"), color: "#e0b341", hint: loc("Апостиль, переводы, справка из банка", "Apostil, tarjimalar, bank ma’lumotnomasi") },
      { key: "submitted", label: loc("Подано в вуз", "Topshirildi"), color: "#d44df0", hint: loc("Пакет отправлен, взнос оплачен", "Hujjatlar yuborildi, to‘lov amalga oshirildi") },
      { key: "university_review", label: loc("Ожидание вуза", "Universitet javobi"), color: "#8a8a8a", hint: loc("Вуз рассматривает, возможно интервью", "Universitet ko‘rib chiqmoqda") },
      { key: "offer", label: loc("Получен offer", "Offer olindi"), color: "#22c55e", hint: loc("Пришло письмо о зачислении / CoA", "Qabul xati / CoA keldi") },
      { key: "visa", label: loc("Виза D-2 / D-4", "Viza D-2 / D-4"), color: "#0099ff", hint: loc("Подача в консульство, ожидание решения", "Konsullikka topshirildi") },
      { key: "departed", label: loc("Выехал", "Jo‘nab ketdi"), color: "#22c55e", hint: loc("Студент в Корее, сделка закрыта успешно", "Talaba Koreyada, bitim yopildi"), final: "won" },
      { key: "lost", label: loc("Отказ", "Rad javobi"), color: "#ff5577", hint: loc("Отказ вуза, консульства или студента", "Universitet yoki talabaning rad javobi"), final: "lost" },
    ],
  },
  {
    id: "pl_sw_lang",
    tenantId: "t_seoulway",
    entity: "deal",
    isDefault: false,
    name: loc("Языковые курсы", "Til kurslari"),
    stages: [
      { key: "new", label: loc("Новая заявка", "Yangi ariza"), color: "#ff7a3d", hint: loc("Обращение по языковой программе", "Til dasturi bo‘yicha murojaat") },
      { key: "matching", label: loc("Подбор центра", "Markaz tanlash"), color: "#6a4cf5", hint: loc("Выбираем языковой центр и семестр", "Til markazi va semestr tanlanmoqda") },
      { key: "documents", label: loc("Сбор документов", "Hujjat yig‘ish"), color: "#e0b341", hint: loc("Пакет для языковой визы D-4", "D-4 vizasi uchun hujjatlar") },
      { key: "submitted", label: loc("Подано", "Topshirildi"), color: "#d44df0", hint: loc("Документы в языковом центре", "Hujjatlar til markazida") },
      { key: "visa", label: loc("Виза D-4", "Viza D-4"), color: "#0099ff", hint: loc("Подача в консульство", "Konsullikka topshirish") },
      { key: "departed", label: loc("Выехал", "Jo‘nab ketdi"), color: "#22c55e", hint: loc("Студент на курсах", "Talaba kurslarda"), final: "won" },
      { key: "lost", label: loc("Отказ", "Rad javobi"), color: "#ff5577", hint: loc("Сделка не состоялась", "Bitim amalga oshmadi"), final: "lost" },
    ],
  },
  {
    id: "pl_ax_leads", tenantId: "t_agencyx", entity: "lead", isDefault: true, name: loc("Лиды", "Lidlar"),
    stages: [
      { key: "new", label: loc("Новый", "Yangi"), color: "#ff7a3d", hint: loc("Обращение пришло", "Murojaat keldi") },
      { key: "qualification", label: loc("Квалификация", "Malaka"), color: "#0099ff", hint: loc("Выясняем цель и бюджет", "Maqsad va byudjet aniqlanmoqda") },
      { key: "in_progress", label: loc("В работе", "Ishda"), color: "#e0b341", hint: loc("Ждём решения семьи", "Oila qaroriga qaraymiz") },
      { key: "converted", label: loc("Конвертирован", "Konvertatsiya"), color: "#22c55e", hint: loc("Создан контакт", "Kontakt yaratildi"), final: "won" },
      { key: "junk", label: loc("Некачественный", "Sifatsiz"), color: "#ff5577", hint: loc("Не целевой", "Nomaqsad"), final: "lost" },
    ],
  },
  {
    id: "pl_ax_main", tenantId: "t_agencyx", entity: "deal", isDefault: true, name: loc("Поступление в вуз", "Universitetga qabul"),
    stages: [
      { key: "new", label: loc("Новая заявка", "Yangi ariza"), color: "#ff7a3d", hint: loc("Работа не начата", "Ish boshlanmadi") },
      { key: "consultation", label: loc("Консультация", "Konsultatsiya"), color: "#0099ff", hint: loc("Профиль собран", "Profil yig‘ilgan") },
      { key: "matching", label: loc("Подбор вузов", "Universitet tanlash"), color: "#6a4cf5", hint: loc("Формируем шорт-лист", "Qisqa ro‘yxat tuzilmoqda") },
      { key: "documents", label: loc("Сбор документов", "Hujjat yig‘ish"), color: "#e0b341", hint: loc("Апостиль и переводы", "Apostil va tarjimalar") },
      { key: "submitted", label: loc("Подано в вуз", "Topshirildi"), color: "#d44df0", hint: loc("Пакет отправлен", "Hujjatlar yuborildi") },
      { key: "university_review", label: loc("Ожидание вуза", "Universitet javobi"), color: "#8a8a8a", hint: loc("Вуз рассматривает", "Universitet ko‘rib chiqmoqda") },
      { key: "offer", label: loc("Получен offer", "Offer olindi"), color: "#22c55e", hint: loc("Пришло письмо о зачислении", "Qabul xati keldi") },
      { key: "visa", label: loc("Виза", "Viza"), color: "#0099ff", hint: loc("Подача в консульство", "Konsullikka topshirish") },
      { key: "departed", label: loc("Выехал", "Jo‘nab ketdi"), color: "#22c55e", hint: loc("Сделка закрыта успешно", "Bitim yopildi"), final: "won" },
      { key: "lost", label: loc("Отказ", "Rad javobi"), color: "#ff5577", hint: loc("Сделка не состоялась", "Bitim amalga oshmadi"), final: "lost" },
    ],
  },
  {
    id: "pl_hb_leads", tenantId: "t_hanbridge", entity: "lead", isDefault: true, name: loc("Лиды", "Lidlar"),
    stages: [
      { key: "new", label: loc("Новый", "Yangi"), color: "#ff7a3d", hint: loc("Обращение пришло", "Murojaat keldi") },
      { key: "qualification", label: loc("Квалификация", "Malaka"), color: "#0099ff", hint: loc("Выясняем цель", "Maqsad aniqlanmoqda") },
      { key: "in_progress", label: loc("В работе", "Ishda"), color: "#e0b341", hint: loc("Ждём решения", "Qaror kutilmoqda") },
      { key: "converted", label: loc("Конвертирован", "Konvertatsiya"), color: "#22c55e", hint: loc("Создан контакт", "Kontakt yaratildi"), final: "won" },
      { key: "junk", label: loc("Некачественный", "Sifatsiz"), color: "#ff5577", hint: loc("Не целевой", "Nomaqsad"), final: "lost" },
    ],
  },
  {
    id: "pl_hb_main", tenantId: "t_hanbridge", entity: "deal", isDefault: true, name: loc("Поступление в вуз", "Universitetga qabul"),
    stages: [
      { key: "new", label: loc("Новая заявка", "Yangi ariza"), color: "#ff7a3d", hint: loc("Работа не начата", "Ish boshlanmadi") },
      { key: "consultation", label: loc("Консультация", "Konsultatsiya"), color: "#0099ff", hint: loc("Профиль собран", "Profil yig‘ilgan") },
      { key: "matching", label: loc("Подбор вузов", "Universitet tanlash"), color: "#6a4cf5", hint: loc("Формируем шорт-лист", "Qisqa ro‘yxat tuzilmoqda") },
      { key: "documents", label: loc("Сбор документов", "Hujjat yig‘ish"), color: "#e0b341", hint: loc("Апостиль и переводы", "Apostil va tarjimalar") },
      { key: "submitted", label: loc("Подано в вуз", "Topshirildi"), color: "#d44df0", hint: loc("Пакет отправлен", "Hujjatlar yuborildi") },
      { key: "university_review", label: loc("Ожидание вуза", "Universitet javobi"), color: "#8a8a8a", hint: loc("Вуз рассматривает", "Universitet ko‘rib chiqmoqda") },
      { key: "offer", label: loc("Получен offer", "Offer olindi"), color: "#22c55e", hint: loc("Пришло письмо", "Xat keldi") },
      { key: "visa", label: loc("Виза", "Viza"), color: "#0099ff", hint: loc("Подача в консульство", "Konsullikka topshirish") },
      { key: "departed", label: loc("Выехал", "Jo‘nab ketdi"), color: "#22c55e", hint: loc("Сделка закрыта", "Bitim yopildi"), final: "won" },
      { key: "lost", label: loc("Отказ", "Rad javobi"), color: "#ff5577", hint: loc("Сделка не состоялась", "Bitim amalga oshmadi"), final: "lost" },
    ],
  },
];
