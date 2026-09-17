/* Orbis System — кликабельный прототип портала.
   Данные и логика подбора берутся из рабочего приложения: файл собирается
   скриптом scripts/prototype/build.mjs, а данные выгружает data.ts прямо
   из src/lib/data. Поэтому прототип не расходится с продуктом. */

const D = window.__ORBIS__;
const L = D.labels;

/* ── язык ────────────────────────────────────────────────── */
const t = (v) => (v && typeof v === "object" ? (v[S.locale] ?? v.ru) : v ?? "");
const ref = (dict, key) => dict[key] ?? { ru: key, uz: key };
const loc = (ru, uz) => ({ ru, uz });

/* ── даты и деньги ───────────────────────────────────────── */
const TODAY = new Date("2026-09-16T09:30:00");
const TODAY_ISO = "2026-09-16";
const MONTHS = {
  ru: ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"],
  uz: ["yan","fev","mar","apr","may","iyn","iyl","avg","sen","okt","noy","dek"],
};
const parseDate = (v) => new Date(v.length <= 10 ? v + "T00:00:00" : v);
const daysUntil = (v) => Math.round((parseDate(v) - new Date(TODAY.toDateString())) / 86400000);
const isPast = (v) => v < TODAY_ISO;
const isSoon = (v, d) => { const n = daysUntil(v); return n >= 0 && n <= d; };

function fmtDate(v) {
  if (!v) return "—";
  const d = parseDate(v);
  return `${d.getDate()} ${MONTHS[S.locale][d.getMonth()]} ${d.getFullYear()}`;
}
function fmtShort(v) {
  if (!v) return "—";
  const d = parseDate(v);
  return `${d.getDate()} ${MONTHS[S.locale][d.getMonth()]}`;
}
function pluralRu(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} ${one}`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}
const days = (n) => (S.locale === "ru" ? pluralRu(n, "день", "дня", "дней") : `${n} kun`);
const plural = (n, ru, uz) => (S.locale === "ru" ? pluralRu(n, ru[0], ru[1], ru[2]) : `${n} ${uz}`);

function relDeadline(v) {
  if (!v) return t(loc("без срока", "muddatsiz"));
  const n = daysUntil(v);
  if (n === 0) return t(loc("сегодня", "bugun"));
  if (n === 1) return t(loc("завтра", "ertaga"));
  if (n === -1) return t(loc("вчера", "kecha"));
  if (n < 0) return S.locale === "ru" ? `просрочено на ${days(-n)}` : `${days(-n)} kechikdi`;
  return S.locale === "ru" ? `через ${days(n)}` : `${days(n)}dan keyin`;
}
function relTime(v) {
  const mins = Math.round((TODAY - parseDate(v)) / 60000);
  if (mins < 60) return S.locale === "ru" ? `${mins} мин назад` : `${mins} daqiqa oldin`;
  const h = Math.round(mins / 60);
  if (h < 24) return S.locale === "ru" ? `${pluralRu(h, "час", "часа", "часов")} назад` : `${h} soat oldin`;
  const d = Math.round(h / 24);
  return S.locale === "ru" ? `${days(d)} назад` : `${days(d)} oldin`;
}

const nf = new Intl.NumberFormat("ru-RU");
const usd = (v) => "$" + nf.format(Math.round(v));
function som(v, compact) {
  const w = S.locale === "ru" ? { u: "сум", m: "млн", b: "млрд" } : { u: "so‘m", m: "mln", b: "mlrd" };
  if (compact) {
    if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace(".", ",")} ${w.b} ${w.u}`;
    if (v >= 1e6) return `${Math.round(v / 1e6)} ${w.m} ${w.u}`;
  }
  return `${nf.format(Math.round(v))} ${w.u}`;
}
const usdSom = (v, rate) => `${usd(v)} · ${som(Math.round((v * rate) / 1e5) * 1e5, true)}`;
const somPair = (paid, total) => {
  const w = S.locale === "ru" ? { u: "сум", m: "млн" } : { u: "so‘m", m: "mln" };
  return total >= 1e6
    ? `${Math.round(paid / 1e6)} / ${Math.round(total / 1e6)} ${w.m} ${w.u}`
    : `${som(paid)} / ${som(total)}`;
};
const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/* ── версии продукта и права ─────────────────────────────── */
const MODULES_BY_EDITION = {
  mvp: ["universities", "contacts", "settings"],
  crm: [
    "dashboard", "leads", "deals", "crmSettings", "documents",
    "tasks", "projects", "deadlines", "team", "structure",
    "staffReports", "finance", "admin",
  ],
  advanced: [],
};
const EDITION_ORDER = { mvp: 1, crm: 2, advanced: 3 };
function editionModules(edition) {
  return Object.entries(MODULES_BY_EDITION)
    .filter(([key]) => EDITION_ORDER[key] <= EDITION_ORDER[edition])
    .flatMap(([, mods]) => mods);
}
const roleDef = (role) => D.roles.find((r) => r.key === role);

/**
 * Права роли с учётом настроек агентства: матрица правится в разделе
 * «Администрирование → Права доступа», её переопределения живут в S.perms.
 */
const effective = (role) => ({ ...roleDef(role).permissions, ...(S.perms[role] ?? {}) });
const allow = (role, module, action = "view") => (effective(role)[module] ?? []).includes(action);

/**
 * Меню повторяет портал Битрикс24: крупные разделы раскрываются в список
 * страниц. Раздел остаётся в меню, если доступна хотя бы одна его страница.
 */
const NAV = [
  { key: "dashboard", m: "dashboard", href: "dashboard", label: loc("Дашборд", "Boshqaruv paneli"), group: "work", icon: "grid" },
  {
    key: "crm", href: "deals", label: loc("CRM", "CRM"), group: "work", icon: "board",
    children: [
      { m: "leads", href: "leads", label: loc("Лиды", "Lidlar") },
      { m: "deals", href: "deals", label: loc("Сделки", "Bitimlar") },
      { m: "contacts", href: "contacts", label: loc("Контакты", "Kontaktlar") },
      { m: "crmSettings", href: "pipelines", label: loc("Воронки", "Voronkalar") },
      { m: "crmSettings", href: "channels", label: loc("Каналы продаж", "Sotuv kanallari") },
    ],
  },
  {
    key: "tasks", href: "tasks", label: loc("Задачи и проекты", "Vazifalar va loyihalar"), group: "work", icon: "check",
    children: [
      { m: "tasks", href: "tasks", label: loc("Задачи", "Vazifalar") },
      { m: "projects", href: "projects", label: loc("Проекты", "Loyihalar") },
      { m: "tasks", href: "taskreports", label: loc("Отчёты", "Hisobotlar") },
      { m: "tasks", href: "templates", label: loc("Шаблоны", "Shablonlar") },
    ],
  },
  { key: "documents", m: "documents", href: "documents", label: loc("Документы", "Hujjatlar"), group: "work", icon: "doc" },
  { key: "deadlines", m: "deadlines", href: "deadlines", label: loc("Дедлайны", "Muddatlar"), group: "work", icon: "clock" },
  {
    key: "universities", href: "universities", label: loc("Каталог вузов", "Universitetlar katalogi"), group: "base", icon: "bank",
    children: [
      { m: "universities", href: "universities", label: loc("Каталог", "Katalog") },
      { m: "universities", href: "compare", label: loc("Шорт-лист", "Qisqa ro‘yxat") },
    ],
  },
  { key: "finance", m: "finance", href: "finance", label: loc("Финансы", "Moliya"), group: "base", icon: "card" },
  {
    key: "team", href: "team", label: loc("Сотрудники", "Xodimlar"), group: "admin", icon: "people",
    children: [
      { m: "team", href: "team", label: loc("Сотрудники", "Xodimlar") },
      { m: "structure", href: "structure", label: loc("Структура компании", "Kompaniya tuzilmasi") },
      { m: "staffReports", href: "staffreports", label: loc("Отчётность", "Hisobot") },
    ],
  },
  {
    key: "admin", href: "users", label: loc("Администрирование", "Boshqaruv"), group: "admin", icon: "gear",
    children: [
      { m: "admin", href: "users", label: loc("Пользователи", "Foydalanuvchilar") },
      { m: "admin", href: "permissions", label: loc("Права доступа", "Kirish huquqlari") },
      { m: "settings", href: "settings", label: loc("Настройки портала", "Portal sozlamalari") },
    ],
  },
  { key: "settings", m: "settings", href: "settings", label: loc("Настройки", "Sozlamalar"), group: "admin", icon: "gear" },
];

/** Какому модулю принадлежит экран — нужно и меню, и защите маршрута. */
const ROUTE_MODULE = {
  dashboard: "dashboard",
  leads: "leads", lead: "leads",
  deals: "deals", deal: "deals",
  contacts: "contacts", contact: "contacts",
  pipelines: "crmSettings", channels: "crmSettings",
  tasks: "tasks", taskreports: "tasks", templates: "tasks", projects: "projects",
  documents: "documents", deadlines: "deadlines",
  universities: "universities", compare: "universities",
  finance: "finance",
  team: "team", employee: "team", structure: "structure", staffreports: "staffReports",
  users: "admin", permissions: "admin",
  settings: "settings",
};
const GROUPS = {
  work: loc("Операционка", "Kundalik ish"),
  base: loc("База знаний", "Bilimlar bazasi"),
  admin: loc("Агентство", "Agentlik"),
};

const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="8" rx="1.6"/><rect x="14" y="3" width="7" height="5" rx="1.6"/><rect x="14" y="11" width="7" height="10" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/>',
  cap: '<path d="M12 3 2.5 7.5 12 12l9.5-4.5L12 3Z"/><path d="M6.5 10v5.2c0 1.6 2.5 2.9 5.5 2.9s5.5-1.3 5.5-2.9V10"/>',
  board: '<rect x="3" y="3" width="6" height="18" rx="1.6"/><rect x="11" y="3" width="6" height="12" rx="1.6"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/><path d="M9 13h6"/>',
  check: '<rect x="3" y="4" width="18" height="17" rx="2.4"/><path d="M8 3v3"/><path d="M16 3v3"/><path d="m8.5 13.5 2 2 4.5-4.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  bank: '<path d="M3 10.5 12 5l9 5.5"/><path d="M5 11v8"/><path d="M9.5 11v8"/><path d="M14.5 11v8"/><path d="M19 11v8"/><path d="M3 21h18"/>',
  card: '<rect x="2.5" y="5.5" width="19" height="13" rx="2.4"/><path d="M2.5 10h19"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M2.8 20c.6-3.2 3.2-5 6.2-5s5.6 1.8 6.2 5"/><path d="M16.5 5.2a3.2 3.2 0 0 1 0 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.46V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.46-.97H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9 4.6a1.6 1.6 0 0 0 .97-1.46V3a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 15 4.6a1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 19.4 9v.03a1.6 1.6 0 0 0 1.46.97H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5.5Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
  phone: '<path d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z"/>',
  menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  export: '<path d="M12 15V3"/><path d="m8 7 4-4 4 4"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  arrow: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  tick: '<path d="m4.5 12.5 5 5 10-11"/>',
  alert: '<path d="M12 4.5 2.8 20h18.4L12 4.5Z"/><path d="M12 10v4"/><path d="M12 17.2h.01"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.4"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  mail: '<rect x="2.5" y="5" width="19" height="14" rx="2.4"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  bell: '<path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5Z"/><path d="M10.3 19a2 2 0 0 0 3.4 0"/>',
};
const icon = (name, size = 17) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ""}</svg>`;
