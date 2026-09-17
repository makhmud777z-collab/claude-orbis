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
      <span style="width:32px;height:32px;border-radius:999px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;flex:none">
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
        <span style="width:28px;height:28px;border-radius:7px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;flex:none">${esc(tenant().mark)}</span>
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

    ${w ? `<span class="workday live" data-pop="profile">
        <span class="live-dot"></span>
        <span class="clock" data-clock>${esc(clockText(sessionSeconds(w)))}</span>
        ${w.onBreak ? `<span class="t-micro faint">${t(loc("перерыв", "tanaffus"))}</span>` : ""}
      </span>`
      : `<button class="workday" data-act="work" data-value="start">${icon("play", 13)} ${t(loc("Начать рабочий день", "Ish kunini boshlash"))}</button>`}

    <button class="icon-btn">${icon("mail", 17)}</button>
    <button class="icon-btn" style="position:relative">${icon("bell", 17)}
      <span style="position:absolute;right:8px;top:8px;width:6px;height:6px;border-radius:999px;background:var(--new)"></span>
    </button>

    <span style="width:1px;height:20px;background:var(--hairline);margin:0 4px"></span>

    <span style="position:relative">
      <button data-pop="profile" style="display:flex;gap:10px;align-items:center;background:none;border:0;cursor:pointer;color:inherit;padding:4px 8px 4px 4px;border-radius:100px">
        <span style="position:relative">${avatar(user().name, 28)}
          <span style="position:absolute;right:-2px;bottom:-2px;width:10px;height:10px;border-radius:999px;border:2px solid var(--rail-bg);background:${color}"></span>
        </span>
        <span style="text-align:left" class="nowrap">
          <span class="t-caption" style="display:block">${esc(user().name)}</span>
          <span class="t-micro faint" style="display:block">${esc(t(roleDef(user().role).label))}</span>
        </span>
        ${icon("chevron", 14)}
      </button>
      ${open ? `<span class="pop" style="top:46px;right:0;left:auto;width:320px;padding:16px">
        <span style="display:block;border:1px solid var(--hairline);background:var(--surface-1);border-radius:10px;padding:14px;margin-bottom:16px;box-shadow:var(--shadow-card)">
          <span class="t-micro faint" style="display:flex;gap:8px;align-items:center;text-transform:uppercase;letter-spacing:.07em">
            ${w ? `<span class="live-dot" style="background:${color}"></span>` : dot(color)}
            ${w ? (w.onBreak ? t(loc("Перерыв", "Tanaffus")) : t(loc("Рабочий день идёт", "Ish kuni davom etmoqda"))) : t(loc("Рабочий день не начат", "Ish kuni boshlanmagan"))}
          </span>
          <span class="clock" data-clock style="display:block;font-size:34px;letter-spacing:-1.2px;margin-top:8px">${esc(clockText(sessionSeconds(w)))}</span>
          ${w && (w.breakSeconds || w.breakMinutes) ? `<span class="t-micro faint" style="display:block;margin-top:4px">${t(loc("перерыв", "tanaffus"))}: ${esc(hhmm(Math.round((w.breakSeconds ?? w.breakMinutes * 60) / 60)))}</span>` : ""}
          <span style="display:flex;gap:6px;margin-top:12px">
            ${w ? `<button class="btn btn-secondary" style="flex:1" data-act="work" data-value="break">${icon(w.onBreak ? "play" : "pause", 13)} ${w.onBreak ? t(loc("Вернуться", "Qaytish")) : t(loc("Перерыв", "Tanaffus"))}</button>
                   <button class="btn btn-primary" style="flex:1" data-act="work" data-value="end">${icon("stop", 13)} ${t(loc("Завершить", "Yakunlash"))}</button>`
                 : `<button class="btn btn-primary" style="width:100%" data-act="work" data-value="start">${icon("play", 13)} ${t(loc("Начать рабочий день", "Ish kunini boshlash"))}</button>`}
          </span>
        </span>

        <span class="t-micro faint" style="display:block;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">${t(loc("Тема портала", "Portal mavzusi"))}</span>
        <span style="display:flex;gap:6px;margin-bottom:16px">
          ${[["light", "sun", loc("Светлая", "Yorug‘")], ["dark", "moon", loc("Тёмная", "Qorong‘i")]].map(([key, ic, label]) =>
            `<button class="btn ${S.theme === key ? "btn-primary" : "btn-secondary"}" style="flex:1" data-act="theme" data-value="${key}">${icon(ic, 14)} ${esc(t(label))}</button>`).join("")}
        </span>

        <span class="t-micro faint" style="display:block;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">${t(loc("Агентство", "Agentlik"))}</span>
        <span style="display:flex;flex-direction:column;gap:2px;margin-bottom:16px">
          ${D.tenants.map((x) => `<button data-act="tenant" data-value="${esc(x.id)}"
            style="display:flex;gap:10px;align-items:center;padding:7px 8px;border-radius:8px;border:0;cursor:pointer;text-align:left;color:inherit;
            background:${x.id === S.tenant ? "var(--surface-1)" : "transparent"}">
            <span style="width:22px;height:22px;border-radius:6px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex:none">${esc(x.mark)}</span>
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
  if (m.kind === "savefilter") {
    return modal(t(loc("Сохранить фильтр", "Filtrni saqlash")), `
      <p class="t-caption muted" style="margin:0 0 14px">${t(loc(
        "Набор условий сохранится под именем и появится в левой колонке фильтра — у вас и только у вас.",
        "Shartlar to‘plami nom bilan saqlanadi va faqat sizda ko‘rinadi."))}</p>
      <input class="field" id="filter-name" placeholder="${t(loc("Например: мои горящие сделки", "Masalan: mening shoshilinch bitimlarim"))}">`,
      `<button class="btn btn-primary" data-act="filter.save">${t(loc("Сохранить", "Saqlash"))}</button>`);
  }
  if (m.kind === "event") {
    const times = [];
    for (let h = 7; h <= 21; h++) { times.push(`${String(h).padStart(2, "0")}:00`); times.push(`${String(h).padStart(2, "0")}:30`); }
    return modal(t(loc("Новое дело", "Yangi ish")), `
      <p class="t-caption muted" style="margin:0 0 14px">${esc(fmtDate(S.cal.date))}</p>
      <input class="field" id="ev-title" placeholder="${t(loc("Что за дело", "Qanday ish"))}" style="margin-bottom:14px">
      <span class="t-micro faint" style="display:block;margin-bottom:8px">${t(loc("Тип", "Turi"))}</span>
      <span style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
        ${Object.entries(EVENT_KIND).map(([key, k]) => `<button class="chip${m.kindValue === key ? " on" : ""}" data-act="cal.kind" data-value="${key}">${dot(k.color)}${esc(t(k.label))}</button>`).join("")}
      </span>
      <span style="display:flex;gap:10px;align-items:center">
        ${select("cal.start", m.start, times.map((x) => ({ value: x, label: x })), 120)}
        <span class="faint">—</span>
        ${select("cal.end", m.end, times.map((x) => ({ value: x, label: x })), 120)}
      </span>`,
      `<button class="btn btn-primary" data-act="cal.save">${t(loc("Добавить", "Qo‘shish"))}</button>`);
  }
  if (m.kind === "department") {
    const parents = allDepartments();
    return modal(t(loc("Новое подразделение", "Yangi bo‘lim")), `
      <input class="field" id="dep-name" placeholder="${t(loc("Название отдела", "Bo‘lim nomi"))}" style="margin-bottom:14px">
      <span class="t-micro faint" style="display:block;margin-bottom:8px">${t(loc("Входит в", "Tarkibida"))}</span>
      ${select("org.parent", m.parent ?? "", [{ value: "", label: t(loc("— верхний уровень —", "— yuqori daraja —")) },
        ...parents.map((d) => ({ value: d.id, label: t(d.name) }))], 260)}`,
      `<button class="btn btn-primary" data-act="org.save">${t(loc("Создать", "Yaratish"))}</button>`);
  }
  if (m.kind === "employee") {
    return modal(t(loc("Изменить карточку сотрудника", "Xodim kartasini o‘zgartirish")), `
      <p class="t-caption muted" style="margin:0 0 14px">${t(loc(
        "В продукте админ правит имя, должность, телефоны, почту, день рождения и дату приёма прямо в карточке. В прототипе правки не сохраняются.",
        "Mahsulotda admin kartani to‘g‘ridan-to‘g‘ri tahrirlaydi. Prototipda o‘zgarishlar saqlanmaydi."))}</p>`,
      `<button class="btn btn-primary" data-act="closemodal">${t(loc("Понятно", "Tushunarli"))}</button>`);
  }
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
    case "crmsettings": return screenCrmSettings();
    case "pipelines": return screenPipelines();
    case "channels": return screenChannels();
    case "tasks": return screenTasks();
    case "projects": return screenProjects();
    case "taskreports": return screenTaskReports();
    case "documents": return screenDocuments();
    case "deadlines": return screenDeadlines();
    case "calendar": return screenCalendar();
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
  document.documentElement.dataset.theme = S.theme;
  afterRender();
}

/**
 * Две прокрутки, которые нельзя выразить разметкой: день открывается на
 * текущем часе, а дерево компании — по центру, а не прижатым влево.
 */
function afterRender() {
  const day = document.querySelector('[data-scroll="day"]');
  const now = day?.querySelector("[data-now]");
  if (day && now) day.scrollTop = Math.max(0, now.offsetTop - day.clientHeight / 2);
  const tree = document.querySelector('[data-scroll="tree"]');
  if (tree) tree.scrollLeft = Math.max(0, (tree.scrollWidth - tree.clientWidth) / 2);
}

/** Счётчик рабочего дня тикает сам, без перерисовки всей страницы. */
setInterval(() => {
  const w = workOf(S.userId);
  if (!w) return;
  const sec = sessionSeconds(w);
  document.querySelectorAll("[data-clock]").forEach((el) => { el.textContent = clockText(sec); });
}, 1000);

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

/**
 * Профиль студента заполняет тот же фильтр каталога, которым пользуется
 * человек руками, — второй механики подбора в системе нет.
 */
function applyStudentProfile() {
  const st = filterState("universities");
  st.values = {};
  st.q = "";
  st.draft = { q: "", values: {} };
  const s = studentById(S.catalog.student);
  if (!s) { S.catalog.strict = false; return; }
  st.values.degree = s.profile.degreeLevel;
  if (S.catalog.strict) {
    Object.assign(st.values, {
      city: s.profile.preferredCities[0] ?? "",
      ownership: s.profile.preferredOwnership[0] ?? "",
      field: s.profile.preferredMajors[0] ?? "",
      intake: s.profile.intake,
      topikFrom: String(s.profile.topik),
      tuitionTo: String(Math.round(s.profile.budgetPerYear * 1.15)),
      ...(s.profile.needsDorm ? { dorm: "yes" } : {}),
    });
  }
  st.draft = { q: "", values: { ...st.values } };
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
    const w = workOf(S.userId);
    if (v === "start") {
      S.work[S.userId] = { startedAt: new Date().toISOString().slice(0, 19), startedMs: Date.now(),
        endedAt: null, breakMinutes: 0, breakSeconds: 0, onBreak: false, breakSince: null };
    }
    if (v === "end" && w) S.work[S.userId] = null;
    if (v === "break" && w) {
      // перерыв обязан останавливать счёт: прибор, который врёт, бесполезен
      const back = w.onBreak;
      S.work[S.userId] = {
        ...w,
        onBreak: !back,
        breakSince: back ? null : Date.now(),
        breakSeconds: (w.breakSeconds ?? 0) + (back && w.breakSince ? Math.round((Date.now() - w.breakSince) / 1000) : 0),
      };
    }
  },
  theme: (v) => { S.theme = v; try { localStorage.setItem("orbis-theme", v); } catch { /* приватное окно */ } },
  move: (v) => { const [entity, id, stage] = v.split(":"); moveCard(entity, id, stage); },
  pipeline: () => { S.popover = null; },
  "cal.view": (v) => { S.cal.view = v; },
  "cal.day": (v) => { S.cal.date = v; S.cal.view = "day"; },
  "cal.today": () => { S.cal.date = TODAY_ISO; },
  "cal.shift": (v) => { S.cal.date = shiftDay(S.cal.date, Number(v)); },
  "cal.new": () => { S.modal = { kind: "event", kindValue: "meeting", start: "10:00", end: "11:00" }; },
  "cal.kind": (v) => { S.modal = { ...S.modal, kindValue: v }; S.popover = null; },
  "cal.start": (v) => { S.modal = { ...S.modal, start: v }; S.popover = null; },
  "cal.end": (v) => { S.modal = { ...S.modal, end: v }; S.popover = null; },
  "cal.save": () => {
    const title = document.getElementById("ev-title")?.value.trim();
    if (!title) return;
    S.events.push({
      id: "ev_" + Math.random().toString(36).slice(2, 7), date: S.cal.date,
      startTime: S.modal.start, endTime: S.modal.end, kind: S.modal.kindValue,
      title, ownerId: S.userId, relation: "",
    });
    S.cal.view = "day";
    S.modal = null;
  },
  "org.pick": (v) => { S.org.selected = v; },
  "org.zoom": (v) => { S.org.zoom = Math.min(140, Math.max(50, S.org.zoom + Number(v))); },
  "org.q": (v) => { S.org.q = v; },
  "org.me": () => { S.org.selected = departmentOf(S.userId); S.org.q = user().name; },
  "org.head": (v) => { if (S.org.selected) S.heads[S.org.selected] = v || null; S.popover = null; },
  "org.new": () => { S.modal = { kind: "department", parent: S.org.selected ?? allDepartments()[0]?.id ?? null }; },
  "org.parent": (v) => { S.modal = { ...S.modal, parent: v }; S.popover = null; },
  "org.save": () => {
    const name = document.getElementById("dep-name")?.value.trim();
    if (!name) return;
    const id = "dep_" + Math.random().toString(36).slice(2, 7);
    S.depts.push({ id, tenantId: S.tenant, name: { ru: name, uz: name }, parentId: S.modal.parent, headId: null });
    S.org.selected = id;
    S.modal = null;
  },
  "filter.save": () => {
    const name = document.getElementById("filter-name")?.value.trim();
    if (!name) return;
    const scopeKey = S.modal.scope;
    const st = filterState(scopeKey);
    const key = savedKey(scopeKey);
    S.saved[key] = [...(S.saved[key] ?? []).filter((f) => f.name !== name),
      { name, q: st.q, values: { ...st.values } }];
    S.modal = null;
  },
  "employee.edit": () => { S.modal = { kind: "employee" }; },
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
  "catalog.student": (v) => { S.catalog.student = v; S.catalog.strict = false; S.popover = null; applyStudentProfile(); },
  "catalog.strict": () => { S.catalog.strict = !S.catalog.strict; applyStudentProfile(); },
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
  "docs.open": (v) => { S.docs.open = v; },
};

/**
 * Действия фильтра, календаря и структуры несут аргументы в самом имени
 * (f.set:contacts:status), поэтому разбираются до таблицы ACTIONS.
 */
function handlePrefixed(act, value) {
  const [name, scopeKey, key] = act.split(":");
  if (name.startsWith("f.")) {
    const st = filterState(scopeKey);
    st.draft ??= { q: st.q, values: { ...st.values } };
    switch (name) {
      case "f.open": S.filterOpen = S.filterOpen === scopeKey ? null : scopeKey; break;
      case "f.q": st.draft.q = value; break;
      case "f.set": st.draft.values[key] = value; S.popover = null; break;
      case "f.apply":
        st.q = st.draft.q;
        st.values = { ...st.draft.values };
        st.preset = null;
        S.filterOpen = null;
        break;
      case "f.clear":
        st.q = ""; st.values = {}; st.preset = null;
        st.draft = { q: "", values: {} };
        break;
      case "f.drop": {
        delete st.values[key];
        delete st.draft.values[key];
        break;
      }
      case "f.field": {
        const fieldsNow = st.fields ?? defaultFieldKeys(scopeKey);
        st.fields = fieldsNow.includes(key) ? fieldsNow.filter((x) => x !== key) : [...fieldsNow, key];
        S.popover = null;
        break;
      }
      case "f.default": st.fields = null; break;
      case "f.preset": {
        const preset = presetsFor(scopeKey).find((x) => x.key === key);
        if (preset) {
          st.values = { ...preset.values };
          st.q = "";
          st.preset = preset.key;
          st.draft = { q: "", values: { ...preset.values } };
        }
        break;
      }
      case "f.save": S.modal = { kind: "savefilter", scope: scopeKey }; break;
      case "f.saved": {
        const item = savedFilters(scopeKey)[Number(key)];
        if (item) {
          st.values = { ...item.values };
          st.q = item.q ?? "";
          st.preset = null;
          st.draft = { q: st.q, values: { ...st.values } };
        }
        break;
      }
      default: return false;
    }
    render();
    return true;
  }
  return false;
}

/** Поля и пресеты раздела нужны обработчику так же, как экрану. */
const SECTION_FILTERS = {
  contacts: () => ({ fields: contactFields(), presets: contactPresets() }),
  leads: () => ({ fields: leadFields(), presets: leadPresets() }),
  deals: () => ({ fields: dealFields(), presets: dealPresets() }),
  finance: () => ({ fields: dealFields(), presets: simplePresets() }),
  tasks: () => ({ fields: taskFields(), presets: taskPresets() }),
  deadlines: () => ({ fields: deadlineFields(), presets: simplePresets() }),
  documents: () => ({ fields: documentFields(), presets: simplePresets() }),
  team: () => ({ fields: teamFields(), presets: simplePresets() }),
  universities: () => ({ fields: universityFields(), presets: simplePresets() }),
};
const presetsFor = (scopeKey) => SECTION_FILTERS[scopeKey]?.().presets ?? [];
const defaultFieldKeys = (scopeKey) =>
  (SECTION_FILTERS[scopeKey]?.().fields ?? []).filter((f) => f.def).map((f) => f.key);

function handle(act, value) {
  if (handlePrefixed(act, value)) return;
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

/* перетаскивание карточек по доске и сотрудников по отделам */
document.addEventListener("dragstart", (e) => {
  const person = e.target.closest("[data-drag-user]");
  if (person) {
    S.dragUser = person.dataset.dragUser;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", S.dragUser);
    return;
  }
  const card = e.target.closest("[data-drag]");
  if (!card) return;
  S.drag = { id: card.dataset.drag, entity: card.dataset.entity };
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", card.dataset.drag);
});
document.addEventListener("dragover", (e) => {
  if (S.dragUser) {
    const dept = e.target.closest("[data-drop-dept]");
    if (dept) e.preventDefault();
    return;
  }
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
  if (S.dragUser) {
    const dept = e.target.closest("[data-drop-dept]");
    if (dept) {
      e.preventDefault();
      S.moves[S.dragUser] = dept.dataset.dropDept;
      S.org.selected = dept.dataset.dropDept;
    }
    S.dragUser = null;
    render();
    return;
  }
  const col = e.target.closest("[data-drop]");
  if (!col || !S.drag) return;
  e.preventDefault();
  moveCard(S.drag.entity, S.drag.id, col.dataset.drop);
  S.drag = null;
  S.over = null;
  render();
});
document.addEventListener("dragend", () => { S.drag = null; S.dragUser = null; S.over = null; render(); });

document.addEventListener("keydown", (e) => {
  // Enter в строке фильтра = «Найти»: набрал и нажал, как в Битриксе
  if (e.key === "Enter") {
    const el = e.target.closest("input[data-enter]");
    if (el) { e.preventDefault(); handle(el.dataset.enter, ""); return; }
  }
  if (e.key !== "Escape") return;
  if (S.modal) { S.modal = null; render(); return; }
  if (S.popover) { S.popover = null; render(); }
});

document.getElementById("scrim").addEventListener("click", () => { S.menu = false; render(); });

// Наружу отдаём ровно два входа: их использует прогон прототипа браузером.
window.go = go;
window.handle = handle;
window.S = S;
window.workOf = workOf;

ensureRoute();
render();
