/* ── каркас и навигация ──────────────────────────────────── */

/**
 * Пункты меню: права роли ∩ модули версии продукта.
 * Раздел-контейнер остаётся, если доступна хотя бы одна его страница;
 * отдельная «Настройки» прячется там, где есть «Администрирование».
 */
function navItems() {
  const inEdition = new Set(editionModules(tenant().edition));
  const ok = (m) => m && inEdition.has(m) && allow(user().role, m);
  const list = NAV.map((entry) => {
    if (entry.children) {
      const children = entry.children.filter((c) => ok(c.m));
      return children.length ? { ...entry, children, href: children[0].href } : null;
    }
    return ok(entry.m) ? entry : null;
  }).filter(Boolean);
  const hasAdmin = list.some((e) => e.key === "admin");
  return list.filter((e) => !(hasAdmin && e.key === "settings"));
}

const isOn = (href) => S.route === href || (S.param && ROUTE_MODULE[S.route] === ROUTE_MODULE[href] && S.route !== "dashboard");

function renderRail() {
  const items = navItems();
  const groups = [["work", loc("Операционка", "Kundalik ish")], ["base", loc("База знаний", "Bilimlar bazasi")], ["admin", loc("Агентство", "Agentlik")]];
  return `
    <a href="#" data-go="${esc(items[0]?.href ?? "universities")}" style="display:flex;gap:12px;align-items:center;padding:0 8px;margin-bottom:26px">
      <span style="width:32px;height:32px;border-radius:999px;background:var(--ink);color:var(--canvas);display:flex;align-items:center;justify-content:center;flex:none">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3.4" fill="currentColor"/>
          <circle cx="19.6" cy="6.4" r="2.1" fill="currentColor"/>
        </svg>
      </span>
      <span style="min-width:0">
        <span style="display:block;font-size:16px;font-weight:600;letter-spacing:-.5px">Orbis</span>
        <span class="t-micro faint truncate" style="display:block">${esc(tenant().slug)}.orbisystem.us</span>
      </span>
    </a>

    <nav style="flex:1;display:flex;flex-direction:column;gap:22px;overflow-y:auto">
      ${groups.map(([group, label]) => {
        const list = items.filter((e) => e.group === group);
        if (!list.length) return "";
        return `<div>
          <div class="nav-group">${esc(t(label))}</div>
          <div style="display:flex;flex-direction:column;gap:2px">
            ${list.map((entry) => {
              const inside = (entry.children ?? []).some((c) => isOn(c.href));
              const open = S.openSection === entry.key || (S.openSection === undefined && inside) || (S.openSection !== entry.key && inside && S.openSection == null);
              return `<div>
                <div style="display:flex;align-items:center">
                  <a class="nav-item${isOn(entry.href) || inside ? " on" : ""}" style="flex:1" href="#" data-go="${esc(entry.href)}">
                    ${icon(entry.icon)}<span class="truncate">${esc(t(entry.label))}</span>
                  </a>
                  ${entry.children ? `<button class="icon-btn" style="width:28px;height:28px" data-act="section" data-value="${esc(entry.key)}"
                    aria-expanded="${open}"><span style="display:inline-flex;transform:rotate(${open ? 180 : 0}deg);transition:transform .16s ease">${icon("chevron", 13)}</span></button>` : ""}
                </div>
                ${entry.children && open ? `<div style="margin-left:22px;padding-left:12px;border-left:1px solid var(--hairline-soft);display:flex;flex-direction:column;gap:2px;margin-top:2px">
                  ${entry.children.map((c) => `<a class="t-caption truncate" style="padding:6px 10px;border-radius:8px;
                      color:${isOn(c.href) ? "var(--ink)" : "var(--ink-faint)"};background:${isOn(c.href) ? "var(--surface-1)" : "transparent"}"
                      href="#" data-go="${esc(c.href)}">${esc(t(c.label))}</a>`).join("")}
                </div>` : ""}
              </div>`;
            }).join("")}
          </div>
        </div>`;
      }).join("")}
    </nav>

    <div class="card" style="padding:12px;margin-top:20px">
      <div style="display:flex;gap:10px;align-items:center">
        <span style="width:28px;height:28px;border-radius:7px;background:var(--ink);color:#000;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;flex:none">${esc(tenant().mark)}</span>
        <span style="min-width:0">
          <span class="t-caption truncate" style="display:block">${esc(tenant().name)}</span>
          <span class="t-micro faint truncate" style="display:block">${esc(t(roleDef(user().role).label))}</span>
        </span>
      </div>
    </div>`;
}

function renderTopbar() {
  const w = workOf(S.userId);
  const color = w ? (w.onBreak ? "var(--progress)" : "var(--deal)") : "var(--ink-faint)";
  const open = S.popover === "profile";
  return `
    <button class="icon-btn menu-toggle" data-act="menu">${icon("menu", 18)}</button>

    <label style="position:relative;display:flex;align-items:center;flex:1;max-width:320px">
      <span style="position:absolute;left:12px;color:var(--ink-faint);pointer-events:none">${icon("search", 15)}</span>
      <input class="field" style="border-radius:100px;padding-left:34px;height:36px" placeholder="${t(loc("Поиск контакта, сделки, вуза…", "Kontakt, bitim, universitet qidirish"))}">
    </label>

    <span style="flex:1"></span>

    <span style="display:flex;gap:2px;background:var(--surface-1);border-radius:100px;padding:2px">
      ${[["ru", "RU"], ["uz", "UZ"]].map(([key, short]) => `<button class="t-micro" data-act="locale" data-value="${key}"
        style="border:0;border-radius:100px;padding:6px 10px;cursor:pointer;
        background:${S.locale === key ? "var(--surface-2)" : "transparent"};color:${S.locale === key ? "var(--ink)" : "var(--ink-faint)"}">${short}</button>`).join("")}
    </span>

    <button class="icon-btn">${icon("mail", 17)}</button>
    <button class="icon-btn" style="position:relative">${icon("bell", 17)}
      <span style="position:absolute;right:8px;top:8px;width:6px;height:6px;border-radius:999px;background:var(--new)"></span>
    </button>

    <span style="width:1px;height:20px;background:var(--hairline);margin:0 4px"></span>

    <span style="position:relative">
      <button data-pop="profile" style="display:flex;gap:10px;align-items:center;background:none;border:0;cursor:pointer;color:inherit;padding:4px 8px 4px 4px;border-radius:100px">
        <span style="position:relative">${avatar(user().name, 28)}
          <span style="position:absolute;right:-2px;bottom:-2px;width:10px;height:10px;border-radius:999px;border:2px solid var(--canvas);background:${color}"></span>
        </span>
        <span style="text-align:left" class="nowrap">
          <span class="t-caption" style="display:block">${esc(user().name)}</span>
          <span class="t-micro faint" style="display:block">${esc(t(roleDef(user().role).label))}</span>
        </span>
        ${icon("chevron", 14)}
      </button>
      ${open ? `<span class="pop" style="top:46px;right:0;left:auto;width:320px;padding:16px">
        <span style="display:block;border:1px solid var(--hairline-soft);background:var(--surface-1);border-radius:10px;padding:12px;margin-bottom:16px">
          <span class="t-caption" style="display:flex;gap:8px;align-items:center">${dot(color)}
            ${w ? (w.onBreak ? t(loc("Перерыв", "Tanaffus")) : t(loc("Рабочий день идёт", "Ish kuni davom etmoqda"))) : t(loc("Рабочий день не начат", "Ish kuni boshlanmagan"))}
          </span>
          ${w ? `<span class="t-micro faint" style="display:block;margin-top:6px">${t(loc("Сегодня отработано", "Bugun ishlangan"))}: <span class="num">${esc(hhmm(sessionMinutes(w)))}</span></span>` : ""}
          <span style="display:flex;gap:6px;margin-top:12px">
            ${w ? `<button class="btn btn-secondary" style="flex:1" data-act="work" data-value="break">${w.onBreak ? t(loc("Вернуться к работе", "Ishga qaytish")) : t(loc("Перерыв", "Tanaffus"))}</button>
                   <button class="btn btn-primary" style="flex:1" data-act="work" data-value="end">${t(loc("Завершить", "Yakunlash"))}</button>`
                 : `<button class="btn btn-primary" style="width:100%" data-act="work" data-value="start">${t(loc("Начать рабочий день", "Ish kunini boshlash"))}</button>`}
          </span>
        </span>

        <span class="t-micro faint" style="display:block;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">${t(loc("Агентство", "Agentlik"))}</span>
        <span style="display:flex;flex-direction:column;gap:2px;margin-bottom:16px">
          ${D.tenants.map((x) => `<button data-act="tenant" data-value="${esc(x.id)}"
            style="display:flex;gap:10px;align-items:center;padding:7px 8px;border-radius:8px;border:0;cursor:pointer;text-align:left;color:inherit;
            background:${x.id === S.tenant ? "var(--surface-1)" : "transparent"}">
            <span style="width:22px;height:22px;border-radius:6px;background:var(--ink);color:#000;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex:none">${esc(x.mark)}</span>
            <span style="min-width:0"><span class="t-caption truncate" style="display:block">${esc(x.name)}</span>
            <span class="t-micro faint truncate" style="display:block">${esc(x.slug)} · ${esc(x.edition === "mvp" ? "01 / MVP" : "02 / CRM")}</span></span>
          </button>`).join("")}
        </span>

        <span class="t-micro faint" style="display:block;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">${t(loc("Войти как сотрудник", "Xodim sifatida kirish"))}</span>
        <span style="display:flex;flex-direction:column;gap:2px;max-height:210px;overflow-y:auto">
          ${D.users.filter((u) => u.tenantId === S.tenant).map((u) => `<button data-act="user" data-value="${esc(u.id)}"
            style="display:flex;gap:10px;align-items:center;padding:6px 8px;border-radius:8px;border:0;cursor:pointer;text-align:left;color:inherit;
            background:${u.id === S.userId ? "var(--surface-1)" : "transparent"}">
            ${avatar(u.name, 24)}
            <span style="min-width:0"><span class="t-caption truncate" style="display:block">${esc(u.name)}</span>
            <span class="t-micro faint truncate" style="display:block">${esc(u.title)}</span></span>
          </button>`).join("")}
        </span>
      </span>` : ""}
    </span>`;
}

/* ── модальные окна ──────────────────────────────────────── */
function renderModal() {
  if (!S.modal) return "";
  const m = S.modal;
  if (m.kind === "cardfields") {
    return modal(t(loc("Карточка просмотра", "Ko‘rish kartasi")), `
      <p class="t-caption muted" style="margin:0 0 14px">${t(loc(
        "Какие поля показывать на карточке канбана и в каком порядке.",
        "Kanban kartasida qaysi maydonlar ko‘rsatilsin."))}</p>
      ${CARD_FIELDS.map((f) => `<button data-act="togglefield" data-value="${esc(f.key)}"
        style="display:flex;gap:12px;align-items:center;width:100%;padding:8px 10px;border:0;border-radius:10px;background:none;cursor:pointer;color:inherit;text-align:left">
        ${checkbox(S.cardFields.includes(f.key))}<span class="t-caption" style="flex:1">${esc(t(f.label))}</span>
      </button>`).join("")}`);
  }
  if (m.kind === "stage") {
    const pipeline = pipelineById(m.pipelineId);
    const stage = stageOf(pipeline, m.stageKey);
    return modal(t(loc("Изменить стадию", "Bosqichni o‘zgartirish")), `
      <p class="t-caption muted" style="margin:0 0 14px">${esc(t(stage.hint))}</p>
      <label style="display:block;margin-bottom:12px">
        <span class="t-micro faint" style="display:block;margin-bottom:5px">${t(loc("Название стадии", "Bosqich nomi"))} · RU</span>
        <input class="field" id="stage-ru" value="${esc(stage.label.ru)}">
      </label>
      <label style="display:block;margin-bottom:16px">
        <span class="t-micro faint" style="display:block;margin-bottom:5px">${t(loc("Название стадии", "Bosqich nomi"))} · UZ</span>
        <input class="field" id="stage-uz" value="${esc(stage.label.uz)}">
      </label>
      <span class="t-micro faint" style="display:block;margin-bottom:8px">${t(loc("Цвет", "Rang"))}</span>
      <div style="display:grid;grid-template-columns:repeat(9,1fr);gap:8px">
        ${PALETTE.map((c) => `<button class="swatch" data-act="stagecolor" data-value="${esc(c)}"
          style="background:${c};border-color:${c.toLowerCase() === (m.color ?? stage.color).toLowerCase() ? "var(--ink)" : "transparent"};
          border-width:${c.toLowerCase() === (m.color ?? stage.color).toLowerCase() ? 2 : 1}px"></button>`).join("")}
      </div>
      <label style="display:flex;gap:8px;align-items:center;margin-top:16px">
        <span class="t-micro faint">${t(loc("Код цвета", "Rang kodi"))}</span>
        <span style="display:flex;gap:8px;align-items:center;background:var(--surface-1);border:1px solid var(--hairline-soft);border-radius:10px;padding:6px 10px">
          <span style="width:16px;height:16px;border-radius:999px;background:${esc(m.color ?? stage.color)}"></span>
          <input id="stage-hex" class="num" style="background:none;border:0;width:80px;font-size:13px;outline:none" value="${esc(m.color ?? stage.color)}">
        </span>
      </label>`,
      `<button class="btn btn-primary" data-act="savestage">${t(loc("Сохранить", "Saqlash"))}</button>`);
  }
  if (m.kind === "perm") {
    const list = effective(m.role)[m.module] ?? [];
    const def = roleDef(m.role);
    return modal(`${t(def.label)} · ${t(L.module[m.module])}`, `
      <p class="t-caption muted" style="margin:0 0 14px">${esc(t(def.description))}</p>
      ${ACTIONS_LIST.map((a) => `<button data-act="toggleperm" data-value="${esc(a)}"
        style="display:flex;gap:12px;align-items:center;width:100%;padding:8px 10px;border:0;border-radius:10px;background:none;cursor:pointer;color:inherit;text-align:left">
        ${checkbox((m.draft ?? list).includes(a))}<span class="t-caption" style="flex:1">${esc(t(L.action[a]))}</span>
        ${a === "view" ? dot("var(--accent)") : ""}
      </button>`).join("")}`,
      `<button class="btn btn-primary" data-act="saveperm">${t(loc("Сохранить", "Saqlash"))}</button>`);
  }
  if (m.kind === "newlead") {
    const dup = S.lead.checked ? findDuplicate(S.lead.phone, "") : null;
    return modal(t(loc("Новый лид", "Yangi lid")), `
      <label style="display:block;margin-bottom:12px">
        <span class="t-micro faint" style="display:block;margin-bottom:5px">${t(loc("ФИО", "F.I.Sh."))}</span>
        <input class="field" id="lead-name" value="${esc(S.lead.name)}">
      </label>
      <label style="display:block;margin-bottom:12px">
        <span class="t-micro faint" style="display:block;margin-bottom:5px">${t(loc("Телефон", "Telefon"))}</span>
        <input class="field" id="lead-phone" value="${esc(S.lead.phone)}" placeholder="+998 90 000-00-00">
      </label>
      <button class="btn btn-secondary" data-act="checkdup">${t(loc("Проверить дубль", "Dublikatni tekshirish"))}</button>
      ${dup ? `<div style="margin-top:14px;border:1px solid rgb(255 85 119 / .3);background:var(--surface-1);border-radius:10px;padding:14px">
        <div class="t-caption" style="display:flex;gap:8px;align-items:center">
          <span style="color:var(--risk)">${icon("alert", 14)}</span>
          ${t(loc("Найден дубль", "Dublikat topildi"))} — ${t(loc("по номеру телефона", "telefon raqami bo‘yicha"))}
        </div>
        <p class="t-micro muted" style="margin:8px 0 0;line-height:1.5">${t(loc(
          "Такой человек уже есть в системе. Новая запись не создаётся — обращение уходит в существующую карточку.",
          "Bunday odam tizimda bor. Yangi yozuv yaratilmaydi."))}</p>
        <button class="btn btn-secondary" style="margin-top:12px" data-act="opendup" data-value="${dup.kind === "contact" ? "contact" : "lead"}/${esc(dup.id)}">
          ${t(loc("Открыть карточку", "Kartani ochish"))}: ${esc(dup.name)}
        </button>
      </div>` : S.lead.checked ? `<p class="t-micro faint" style="margin:12px 0 0">${t(loc("Совпадений не найдено — можно создавать.", "Mos keladigan yozuv yo‘q — yaratish mumkin."))}</p>` : ""}`,
      `<button class="btn btn-primary" data-act="savelead" style="${dup ? "opacity:.4;pointer-events:none" : ""}">${t(loc("Сохранить", "Saqlash"))}</button>`);
  }
  return "";
}

const modal = (title, body, footer) => `
  <div class="modal-scrim" data-act="closemodal">
    <div class="modal" data-stop="1">
      <div class="t-headline" style="margin-bottom:14px">${esc(title)}</div>
      ${body}
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px">
        <button class="btn btn-secondary" data-act="closemodal">${t(loc("Отмена", "Bekor qilish"))}</button>
        ${footer ?? ""}
      </div>
    </div>
  </div>`;

/* ── маршрутизация ───────────────────────────────────────── */
function renderScreen() {
  const module = ROUTE_MODULE[S.route];
  if (module && !editionModules(tenant().edition).includes(module)) return screenNotInEdition(module);
  if (module && !allow(user().role, module)) return screenNoAccess(module);

  switch (S.route) {
    case "dashboard": return screenDashboard();
    case "leads": return screenLeads();
    case "lead": return screenLead(S.param);
    case "deals": return screenDeals();
    case "deal": return screenDeal(S.param);
    case "contacts": return screenContacts();
    case "contact": return screenContact(S.param);
    case "pipelines": return screenPipelines();
    case "channels": return screenChannels();
    case "tasks": return screenTasks();
    case "projects": return screenProjects();
    case "taskreports": return screenTaskReports();
    case "templates": return screenTemplates();
    case "documents": return screenDocuments();
    case "deadlines": return screenDeadlines();
    case "universities": return screenUniversities();
    case "compare": return screenCompare();
    case "finance": return screenFinance();
    case "team": return screenTeam();
    case "employee": return screenEmployee(S.param);
    case "structure": return screenStructure();
    case "staffreports": return screenStaffReports();
    case "users": return screenAdminUsers();
    case "permissions": return screenPermissions();
    case "settings": return screenSettings();
    default: return screenNotFound();
  }
}

function render() {
  document.getElementById("rail").innerHTML = renderRail();
  document.getElementById("topbar").innerHTML = renderTopbar();
  document.getElementById("content").innerHTML = renderScreen() + renderModal();
  document.getElementById("rail").classList.toggle("open", S.menu);
  document.getElementById("scrim").hidden = !S.menu;
  document.documentElement.lang = S.locale;
}

function go(href, extra = {}) {
  const [route, param] = href.split("/");
  S.route = route;
  S.param = param ?? null;
  if (extra.student) { S.catalog.student = extra.student; S.catalog.strict = false; applyStudentProfile(); }
  S.menu = false;
  S.popover = null;
  window.scrollTo({ top: 0, behavior: "instant" });
  render();
}

/** Первый доступный роли раздел — у MVP и у части ролей дашборда нет. */
function ensureRoute() {
  const items = navItems();
  const module = ROUTE_MODULE[S.route];
  const open = new Set(items.flatMap((e) => (e.children ? e.children.map((c) => c.m) : [e.m])));
  if (!module || !open.has(module)) {
    S.route = items[0]?.href ?? "universities";
    S.param = null;
  }
}

const EMPTY_CATALOG = { q: "", cities: [], ownership: [], fields: [], degree: "all", topik: "all", budget: "all", intake: "all", dorm: false, grant: false, english: false };
function applyStudentProfile() {
  const s = studentById(S.catalog.student);
  Object.assign(S.catalog, EMPTY_CATALOG);
  if (!s) { S.catalog.strict = false; return; }
  if (S.catalog.strict) {
    Object.assign(S.catalog, {
      cities: [...s.profile.preferredCities], ownership: [...s.profile.preferredOwnership],
      fields: [...s.profile.preferredMajors], degree: s.profile.degreeLevel,
      topik: String(s.profile.topik), budget: String(s.profile.budgetPerYear),
      intake: s.profile.intake, dorm: s.profile.needsDorm, grant: s.profile.needsScholarship,
    });
  } else {
    S.catalog.degree = s.profile.degreeLevel;
  }
}

const toggleIn = (list, value) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
function saveShortlist() {
  try { localStorage.setItem("orbis-shortlist", JSON.stringify(S.shortlist)); } catch { /* не критично */ }
}

/** Перенос карточки по стадиям — с записью в историю, как в продукте. */
function moveCard(entity, id, stageKey) {
  const record = entity === "deal" ? dealById(id) : leadById(id);
  if (!record) return;
  const pipeline = entity === "deal" ? (pipelineById(record.pipelineId) ?? defaultPipeline("deal")) : defaultPipeline("lead");
  const from = stageOf(pipeline, currentStage(record));
  const to = stageOf(pipeline, stageKey);
  if (!to || currentStage(record) === stageKey) return;
  S.moved[id] = stageKey;
  addNote(entity, id, "stage",
    loc(`Стадия изменена: ${from?.label.ru ?? "—"} → ${to.label.ru}`,
        `Bosqich o‘zgardi: ${from?.label.uz ?? "—"} → ${to.label.uz}`));
}

const ACTIONS = {
  menu: () => { S.menu = !S.menu; },
  locale: (v) => { S.locale = v; S.popover = null; },
  section: (v) => { S.openSection = S.openSection === v ? "" : v; },
  tenant: (v) => {
    S.tenant = v;
    S.userId = D.users.find((u) => u.tenantId === v).id;
    S.catalog.student = "none";
    S.popover = null;
    applyStudentProfile();
    ensureRoute();
  },
  user: (v) => { S.userId = v; S.catalog.student = "none"; S.popover = null; applyStudentProfile(); ensureRoute(); },
  work: (v) => {
    const now = "2026-09-16T09:30:00";
    const w = workOf(S.userId);
    if (v === "start") S.work[S.userId] = { startedAt: now, endedAt: null, breakMinutes: 0, onBreak: false };
    if (v === "end" && w) S.work[S.userId] = null;
    if (v === "break" && w) S.work[S.userId] = { ...w, onBreak: !w.onBreak, breakMinutes: w.breakMinutes + (w.onBreak ? 0 : 15) };
    S.popover = null;
  },
  move: (v) => { const [entity, id, stage] = v.split(":"); moveCard(entity, id, stage); },
  cardfields: () => { S.modal = { kind: "cardfields" }; },
  togglefield: (v) => { S.cardFields = toggleIn(S.cardFields, v); },
  stage: (v) => { const [pipelineId, stageKey] = v.split(":"); S.modal = { kind: "stage", pipelineId, stageKey }; },
  stagecolor: (v) => { S.modal = { ...S.modal, color: v }; },
  savestage: () => {
    const m = S.modal;
    const hex = document.getElementById("stage-hex")?.value.trim() ?? "";
    const color = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : (m.color ?? null);
    const ru = document.getElementById("stage-ru")?.value.trim();
    const uz = document.getElementById("stage-uz")?.value.trim();
    S.stages[m.pipelineId] ??= {};
    S.stages[m.pipelineId][m.stageKey] = {
      ...(ru && uz ? { label: { ru, uz } } : {}),
      ...(color ? { color } : {}),
    };
    S.modal = null;
  },
  perm: (v) => { const [role, module] = v.split(":"); S.modal = { kind: "perm", role, module, draft: effective(role)[module] ?? [] }; },
  toggleperm: (v) => {
    const draft = S.modal.draft ?? [];
    let next = v === "view" && draft.includes("view") ? [] : toggleIn(draft, v);
    if (next.length && !next.includes("view")) next = ["view", ...next];
    S.modal = { ...S.modal, draft: next };
  },
  saveperm: () => {
    const m = S.modal;
    S.perms[m.role] ??= {};
    S.perms[m.role][m.module] = m.draft ?? [];
    S.modal = null;
    ensureRoute();
  },
  "role:": () => {},
  newlead: () => { S.lead = { name: "", phone: "", checked: false }; S.modal = { kind: "newlead" }; },
  checkdup: () => {
    S.lead.name = document.getElementById("lead-name")?.value ?? "";
    S.lead.phone = document.getElementById("lead-phone")?.value ?? "";
    S.lead.checked = true;
  },
  savelead: () => {
    const name = document.getElementById("lead-name")?.value.trim() ?? "";
    const phone = document.getElementById("lead-phone")?.value.trim() ?? "";
    if (!name || !phone || findDuplicate(phone, "")) return;
    const id = "l_" + Math.random().toString(36).slice(2, 7);
    D.leads.push({
      id, tenantId: S.tenant, name, phone, email: null, source: "instagram", channelId: null,
      comment: "", stage: "new", stageEnteredAt: TODAY_ISO, ownerId: S.userId,
      branchId: user().branchId, createdAt: TODAY_ISO,
      convertedContactId: null, convertedDealId: null, junkReason: null,
    });
    addNote("lead", id, "system", loc("Лид создан", "Lid yaratildi"));
    S.modal = null;
    go("lead/" + id);
  },
  opendup: (v) => { S.modal = null; go(v); },
  convert: (v) => {
    const lead = leadById(v);
    if (!lead) return;
    const existing = findDuplicate(lead.phone, lead.email);
    let studentId = existing?.kind === "contact" ? existing.id : null;
    if (!studentId) {
      studentId = "s_" + Math.random().toString(36).slice(2, 7);
      D.students.push({
        id: studentId, tenantId: S.tenant, branchId: lead.branchId, fullName: lead.name,
        latinName: lead.name, birthDate: "2006-01-01", phone: lead.phone, email: lead.email ?? "",
        city: "Ташкент", source: lead.source, ownerId: lead.ownerId, referredById: null,
        leadId: lead.id, passport: null, status: "active",
        profile: { topik: 0, topikExpiresAt: null, ielts: null, gpa: null, education: "—", graduationYear: 2026,
          budgetPerYear: 8000, preferredCities: [], preferredMajors: [], preferredOwnership: ["private", "public", "national"],
          degreeLevel: "bachelor", intake: "2027 Весна", needsDorm: true, needsScholarship: false },
        tags: [], createdAt: TODAY_ISO, lastTouchAt: TODAY_ISO,
      });
      addNote("contact", studentId, "system", loc("Контакт создан из лида", "Kontakt liddan yaratildi"));
    }
    const dealId = "d_" + Math.random().toString(36).slice(2, 7);
    D.deals.push({
      id: dealId, tenantId: S.tenant, pipelineId: defaultPipeline("deal").id, studentId,
      universityId: "", programId: "", degreeLevel: "bachelor", intake: "2027 Весна",
      stage: "new", stageEnteredAt: TODAY_ISO, ownerId: lead.ownerId, priority: "normal",
      deadline: null, contractValue: 0, paid: 0, createdAt: TODAY_ISO, note: lead.comment, leadId: lead.id,
    });
    lead.convertedContactId = studentId;
    lead.convertedDealId = dealId;
    S.moved[lead.id] = "converted";
    addNote("lead", lead.id, "system", loc("Лид конвертирован", "Lid konvertatsiya qilindi"),
      existing?.kind === "contact" ? "Контакт уже существовал — создана только сделка." : "Созданы контакт и первая сделка.");
    go("deal/" + dealId);
  },
  notekind: (v) => { S.noteKind = v; },
  addnote: (v) => {
    const [entity, entityId] = v.split(":");
    const body = document.getElementById("note-body")?.value.trim();
    if (!body) return;
    const kind = S.noteKind ?? "activity";
    const title = kind === "comment" ? loc("Комментарий", "Izoh") : kind === "message" ? loc("Сообщение", "Xabar") : loc("Дело", "Ish");
    addNote(entity, entityId, kind, title, body);
  },
  edit: () => { S.modal = null; },
  closemodal: () => { S.modal = null; },
  "contacts.status": (v) => { S.contacts.status = v; },
  "contacts.owner": (v) => { S.contacts.owner = v; S.popover = null; },
  "contacts.topik": (v) => { S.contacts.topik = v; S.popover = null; },
  "contacts.q": (v) => { S.contacts.q = v; },
  "catalog.student": (v) => { S.catalog.student = v; S.catalog.strict = false; S.popover = null; applyStudentProfile(); },
  "catalog.strict": () => { S.catalog.strict = !S.catalog.strict; applyStudentProfile(); },
  "catalog.q": (v) => { S.catalog.q = v; },
  "catalog.city": (v) => { S.catalog.cities = toggleIn(S.catalog.cities, v); },
  "catalog.ownership": (v) => { S.catalog.ownership = toggleIn(S.catalog.ownership, v); },
  "catalog.field": (v) => { S.catalog.fields = toggleIn(S.catalog.fields, v); },
  "catalog.degree": (v) => { S.catalog.degree = v; S.popover = null; },
  "catalog.topik": (v) => { S.catalog.topik = v; S.popover = null; },
  "catalog.budget": (v) => { S.catalog.budget = v; S.popover = null; },
  "catalog.intake": (v) => { S.catalog.intake = v; S.popover = null; },
  "catalog.dorm": () => { S.catalog.dorm = !S.catalog.dorm; },
  "catalog.grant": () => { S.catalog.grant = !S.catalog.grant; },
  "catalog.english": () => { S.catalog.english = !S.catalog.english; },
  "catalog.reset": () => { Object.assign(S.catalog, EMPTY_CATALOG); S.catalog.student = "none"; S.catalog.strict = false; },
  shortlist: (v) => {
    const key = S.catalog.student !== "none" ? S.catalog.student : "_";
    const list = S.shortlist[key] ?? [];
    if (list.includes(v)) S.shortlist[key] = list.filter((x) => x !== v);
    else if (list.length < 6) S.shortlist[key] = [...list, v];
    saveShortlist();
  },
  "shortlist.clear": () => {
    const key = S.catalog.student !== "none" ? S.catalog.student : "_";
    delete S.shortlist[key];
    saveShortlist();
  },
  "docs.tab": (v) => { S.docs.tab = v; S.docs.open = null; },
  "docs.open": (v) => { S.docs.open = v; },
  "tasks.mine": () => { S.tasks.mine = !S.tasks.mine; },
  "tasks.assignee": (v) => { S.tasks.assignee = v; S.popover = null; },
};

function handle(act, value) {
  // смена роли сотрудника в «Пользователях»: ключ несёт id в самом имени
  if (act.startsWith("role:")) {
    const u = userById(act.slice(5));
    if (u) u.role = value;
    S.popover = null;
    ensureRoute();
    render();
    return;
  }
  const fn = ACTIONS[act];
  if (!fn) return;
  fn(value);
  render();
}

/* ── события ─────────────────────────────────────────────── */
document.addEventListener("click", (e) => {
  const pop = e.target.closest("[data-pop]");
  if (pop) {
    e.preventDefault();
    S.popover = S.popover === pop.dataset.pop ? null : pop.dataset.pop;
    render();
    return;
  }
  const actor = e.target.closest("[data-act]");
  if (actor && actor.tagName !== "INPUT") {
    // клик внутри модального окна не должен закрывать его самим фоном
    if (actor.dataset.act === "closemodal" && e.target.closest("[data-stop]")) return;
    e.preventDefault();
    handle(actor.dataset.act, actor.dataset.value);
    return;
  }
  const link = e.target.closest("[data-go]");
  if (link) {
    e.preventDefault();
    go(link.dataset.go, { student: link.dataset.student });
    return;
  }
  if (S.popover) { S.popover = null; render(); }
});

document.addEventListener("input", (e) => {
  const el = e.target.closest("input[data-act]");
  if (!el) return;
  const pos = el.selectionStart;
  handle(el.dataset.act, el.value);
  const next = document.querySelector(`input[data-act="${el.dataset.act}"]`);
  if (next) { next.focus(); try { next.setSelectionRange(pos, pos); } catch { /* не текстовое поле */ } }
});

/* перетаскивание карточек по доске */
document.addEventListener("dragstart", (e) => {
  const card = e.target.closest("[data-drag]");
  if (!card) return;
  S.drag = { id: card.dataset.drag, entity: card.dataset.entity };
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", card.dataset.drag);
});
document.addEventListener("dragover", (e) => {
  const col = e.target.closest("[data-drop]");
  if (!col || !S.drag) return;
  e.preventDefault();
  // Подсветку колонки ставим прямо в DOM: перерисовка во время перетаскивания
  // уничтожает элемент, который тащит браузер, и жест обрывается.
  if (S.over !== col.dataset.drop) {
    document.querySelectorAll(".kan-col.over").forEach((el) => el.classList.remove("over"));
    col.classList.add("over");
    S.over = col.dataset.drop;
  }
});
document.addEventListener("drop", (e) => {
  const col = e.target.closest("[data-drop]");
  if (!col || !S.drag) return;
  e.preventDefault();
  moveCard(S.drag.entity, S.drag.id, col.dataset.drop);
  S.drag = null;
  S.over = null;
  render();
});
document.addEventListener("dragend", () => { S.drag = null; S.over = null; render(); });

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (S.modal) { S.modal = null; render(); return; }
  if (S.popover) { S.popover = null; render(); }
});

document.getElementById("scrim").addEventListener("click", () => { S.menu = false; render(); });

// Наружу отдаём ровно два входа: их использует прогон прототипа браузером.
window.go = go;
window.handle = handle;

ensureRoute();
render();
