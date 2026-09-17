/* ── мелкие кирпичики разметки ───────────────────────────── */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const dot = (color) => `<span class="dot" style="background:${color}"></span>`;
const chip = (text, color, on) => `<span class="chip${on ? " on" : ""}">${color ? dot(color) : ""}${esc(text)}</span>`;
const avatar = (name, size = 30) =>
  `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.36)}px" title="${esc(name)}">${esc(initials(name))}</span>`;
const bar = (percent, color) =>
  `<span class="progress"><i style="width:${Math.max(2, Math.min(100, percent))}%;background:${color ?? "var(--ink)"}"></i></span>`;
const head = (title, meta, actions) => `
  <div class="head">
    <div style="min-width:0">
      <h1 class="t-display">${esc(title)}</h1>
      ${meta ? `<div class="meta t-caption">${meta}</div>` : ""}
    </div>
    ${actions ? `<div style="display:flex;gap:8px;flex-wrap:wrap">${actions}</div>` : ""}
  </div>`;
const sectionTitle = (text, right) => `
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 14px">
    <h2 class="t-headline">${esc(text)}</h2>${right ?? ""}
  </div>`;
const tile = (label, value, hint, color) => `
  <div class="card card-hover" style="padding:18px">
    <div class="t-micro muted" style="display:flex;align-items:center;gap:8px">${color ? dot(color) : ""}${esc(label)}</div>
    <div class="t-display-sm num" style="margin-top:10px">${esc(value)}</div>
    ${hint ? `<div class="t-micro faint" style="margin-top:6px">${esc(hint)}</div>` : ""}
  </div>`;
const kv = (label, value) =>
  `<div class="kv"><span class="t-caption muted">${esc(label)}</span><span class="t-body-sm" style="text-align:right">${value}</span></div>`;
const crumb = (backHref, backLabel, current) => `
  <div class="t-caption faint" style="display:flex;gap:8px;align-items:center;margin-bottom:14px">
    <a href="#" data-go="${backHref}">${esc(backLabel)}</a><span>/</span><span class="muted">${esc(current)}</span>
  </div>`;
const emptyCard = (text) => `<div class="card" style="padding:44px;text-align:center" class="muted"><span class="t-body-sm muted">${esc(text)}</span></div>`;

const scopeLabel = () => t(scope() === "tenant" ? loc("всё агентство", "butun agentlik") : scope() === "branch" ? loc("свой филиал", "o‘z filiali") : loc("только свои записи", "faqat o‘z yozuvlari"));

/**
 * Свой выпадающий список вместо нативного <select>: последний рисует
 * операционная система, и на тёмном портале он выглядит чужеродно.
 */
function select(id, value, options, width) {
  const current = options.find((o) => o.value === value);
  const open = S.popover === id;
  return `<span style="position:relative;display:inline-block">
    <button class="select" data-pop="${esc(id)}" style="${width ? `width:${width}px` : ""}">
      ${current?.color ? dot(current.color) : ""}
      <span class="truncate" style="flex:1;min-width:0;text-align:left">${esc(current?.label ?? "—")}</span>
      ${icon("chevron", 13)}
    </button>
    ${open ? `<span class="pop" style="top:38px;left:0">${options.map((o) => `
      <button data-act="${esc(id)}" data-value="${esc(o.value)}">
        ${o.color ? dot(o.color) : ""}
        <span style="flex:1;min-width:0">
          <span class="truncate" style="display:block">${esc(o.label)}</span>
          ${o.hint ? `<span class="t-micro faint truncate" style="display:block">${esc(o.hint)}</span>` : ""}
        </span>
        ${o.value === value ? icon("tick", 13) : ""}
      </button>`).join("")}</span>` : ""}
  </span>`;
}

const checkbox = (on) =>
  `<span class="check" style="border-color:${on ? "var(--accent)" : "var(--hairline)"};background:${on ? "var(--accent)" : "transparent"};color:#fff">${on ? icon("tick", 11) : ""}</span>`;

/** Палитра стадии: готовые цвета плюс ручной HEX, как в настройках воронки. */
const PALETTE = ["#ff7a3d", "#ff5577", "#d44df0", "#6a4cf5", "#0099ff", "#22c55e",
  "#e0b341", "#8a8a8a", "#f97316", "#ec4899", "#a855f7", "#3b82f6",
  "#06b6d4", "#10b981", "#84cc16", "#eab308", "#64748b", "#ffffff"];

/* ── канбан ──────────────────────────────────────────────── */
const CARD_FIELDS = [
  { key: "phone", label: loc("Телефон", "Telefon") },
  { key: "source", label: loc("Источник", "Manba") },
  { key: "comment", label: loc("Комментарий", "Izoh") },
  { key: "university", label: loc("Вуз", "Universitet") },
  { key: "program", label: loc("Программа", "Dastur") },
  { key: "intake", label: loc("Набор", "Qabul") },
  { key: "dossier", label: loc("Готовность досье", "Dosye tayyorligi") },
  { key: "amount", label: loc("Сумма договора", "Shartnoma summasi") },
  { key: "deadline", label: loc("Дедлайн", "Muddat") },
  { key: "owner", label: loc("Ответственный", "Mas’ul") },
];

/**
 * Доска: колонки — стадии воронки, карточку можно перетащить мышью.
 * Пустые поля на карточке не показываем: столбик прочерков ничего не сообщает.
 */
function kanban(entity, stages, cards, opts = {}) {
  const fields = opts.fields ?? S.cardFields;
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px">
    <span class="t-micro faint">${t(loc("Перетащите карточку на другую стадию", "Kartani boshqa bosqichga torting"))}</span>
    <button class="icon-btn" data-act="cardfields" title="${t(loc("Карточка просмотра", "Ko‘rish kartasi"))}">${icon("gear", 16)}</button>
  </div>
  <div class="scroll-x"><div class="kan">
    ${stages.map((stage) => {
      const list = cards.filter((c) => c.stage === stage.key);
      const total = list.reduce((n, c) => n + (c.amount ?? 0), 0);
      return `<section class="kan-col${S.over === stage.key ? " over" : ""}" data-drop="${esc(stage.key)}" data-entity="${esc(entity)}">
        <header class="kan-head">
          <div style="display:flex;align-items:center;gap:8px">
            ${dot(stage.color)}
            <span class="t-caption truncate" style="flex:1;min-width:0">${esc(t(stage.label))}</span>
            <span class="t-micro num faint">${list.length}</span>
          </div>
          ${opts.totals === false ? "" : `<div class="t-micro num faint" style="margin-top:4px;padding-left:14px">${total ? som(total, true) : "—"}</div>`}
          <div class="kan-rule" style="background:${stage.color};opacity:${list.length ? .9 : .25}"></div>
        </header>
        ${list.map((c) => card(c, fields, entity)).join("") ||
          `<div class="empty-col">${t(loc("Пусто", "Bo‘sh"))}</div>`}
      </section>`;
    }).join("")}
  </div></div>`;
}

function card(c, fields, entity) {
  const lines = fields
    .map((key) => c.lines.find((l) => l.key === key))
    .filter((l) => l && l.value && l.value !== "—");
  return `<a class="card card-hover kan-card${S.drag === c.id ? " drag" : ""}" draggable="true"
      data-drag="${esc(c.id)}" data-entity="${esc(entity)}" href="#" data-go="${esc(c.go)}">
    ${c.flag ? `<span class="kan-flag" style="background:${c.flag}"></span>` : ""}
    <span style="display:flex;gap:8px;align-items:flex-start">
      <span style="min-width:0;flex:1">
        <span class="t-body-sm truncate" style="display:block">${esc(c.title)}</span>
        <span class="t-micro faint truncate" style="display:block">${esc(c.subtitle)}</span>
      </span>
      ${avatar(c.ownerName, 22)}
    </span>
    ${lines.length ? `<span style="display:block;margin-top:8px">${lines.map((l) => `
      <span class="t-micro muted truncate" style="display:flex;gap:6px;align-items:center">
        ${l.accent ? dot(l.accent) : ""}${esc(l.value)}
      </span>`).join("")}</span>` : ""}
  </a>`;
}

/** Карточка лида для доски. */
function leadCard(l) {
  const owner = userById(l.ownerId);
  const ch = channelById(l.channelId);
  const source = t(ref(L.source, l.source));
  return {
    id: l.id, go: "lead/" + l.id, title: l.name, subtitle: fmtDate(l.createdAt),
    stage: currentStage(l), amount: null, ownerName: owner?.name ?? "—", flag: null,
    lines: [
      { key: "phone", value: l.phone },
      { key: "source", value: ch ? `${source} · ${ch.handle}` : source },
      { key: "comment", value: l.comment },
      { key: "owner", value: owner?.name ?? "—" },
    ],
  };
}

/** Карточка сделки для доски. */
function dealCard(d) {
  const contact = studentById(d.studentId);
  const owner = userById(d.ownerId);
  const uni = uniById(d.universityId);
  const program = programById(d.programId);
  const dos = contact ? dossier(contact.id) : null;
  const flag = d.deadline && isPast(d.deadline) ? "var(--risk)"
    : d.priority === "high" ? "var(--progress)" : null;
  const dlAccent = d.deadline
    ? (isPast(d.deadline) ? "var(--risk)" : isSoon(d.deadline, 14) ? "var(--progress)" : null)
    : null;
  return {
    id: d.id, go: "deal/" + d.id,
    title: contact?.fullName ?? "—",
    subtitle: uni?.name ?? t(loc("вуз не выбран", "universitet tanlanmagan")),
    stage: currentStage(d), amount: d.contractValue || null,
    ownerName: owner?.name ?? "—", flag,
    lines: [
      { key: "phone", value: contact?.phone ?? "" },
      { key: "source", value: contact ? t(ref(L.source, contact.source)) : "" },
      { key: "comment", value: d.note },
      { key: "university", value: uni?.name ?? "" },
      { key: "program", value: program?.name ?? "" },
      { key: "intake", value: t(ref(L.intake, d.intake)) },
      { key: "dossier", value: dos ? `${t(loc("Готовность досье", "Dosye tayyorligi"))} ${dos.percent}%` : "", accent: dos && dos.percent < 50 ? "var(--progress)" : null },
      { key: "amount", value: d.contractValue ? som(d.contractValue, true) : "" },
      { key: "deadline", value: d.deadline ? `${fmtShort(d.deadline)} · ${relDeadline(d.deadline)}` : "", accent: dlAccent },
      { key: "owner", value: `${userById(d.ownerId)?.name ?? "—"} · ${t(L.priority[d.priority])}` },
    ],
  };
}

/* ── полоса стадий в карточке ────────────────────────────── */
function stageBar(entity, record, pipeline) {
  const stages = stagesOf(pipeline);
  const at = stages.findIndex((s) => s.key === currentStage(record));
  return `<div class="stages">${stages.map((s, i) => {
    const passed = i <= at;
    const active = i === at;
    return `<button class="stage-btn" data-act="move" data-value="${esc(entity)}:${esc(record.id)}:${esc(s.key)}"
      title="${esc(t(s.hint))}"
      style="background:${passed ? s.color : "var(--surface-1)"};color:${passed ? "#0b0b0b" : "var(--ink-faint)"};
             font-weight:${active ? 600 : 500};opacity:${passed && !active ? .55 : 1}">${esc(t(s.label))}</button>`;
  }).join("")}</div>`;
}

/* ── история карточки ────────────────────────────────────── */
const KIND_COLOR = {
  stage: "var(--accent)", comment: "var(--ink-faint)", activity: "var(--progress)",
  reminder: "var(--progress)", message: "var(--magenta)", task: "var(--hold)",
  payment: "var(--deal)", document: "var(--violet)", system: "var(--ink-faint)",
};

function timeline(entity, entityId) {
  const items = timelineOf(entity, entityId);
  return `<div class="card" style="padding:16px">
    <div class="t-headline" style="margin-bottom:12px">${t(loc("История", "Tarix"))}</div>

    <div style="border:1px solid var(--hairline-soft);background:var(--surface-1);border-radius:10px;padding:10px;margin-bottom:18px">
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
        ${[["activity", loc("Дело", "Ish")], ["comment", loc("Комментарий", "Izoh")], ["message", loc("Сообщение", "Xabar")]]
          .map(([k, label]) => `<button class="chip${S.noteKind === k ? " on" : ""}" data-act="notekind" data-value="${k}">${esc(t(label))}</button>`).join("")}
      </div>
      <textarea class="field" rows="2" id="note-body" placeholder="${t(loc("Что нужно сделать", "Nima qilish kerak"))}" style="resize:none"></textarea>
      <div style="display:flex;justify-content:flex-end;margin-top:8px">
        <button class="btn btn-primary" data-act="addnote" data-value="${esc(entity)}:${esc(entityId)}">${t(loc("Добавить", "Qo‘shish"))}</button>
      </div>
    </div>

    ${items.length ? `<ol class="tl">${items.map((e) => `
      <li>
        <span class="tl-dot" style="background:${KIND_COLOR[e.kind] ?? "var(--ink-faint)"}"></span>
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:baseline">
          <span class="t-body-sm">${esc(t(e.title))}</span>
          <span class="t-micro faint nowrap">${esc(relTime(e.at))}</span>
        </div>
        ${e.body ? `<p class="t-caption muted" style="margin:6px 0 0;line-height:1.5">${esc(e.body)}</p>` : ""}
        ${e.source ? `<div class="t-micro faint" style="margin-top:6px;display:flex;gap:6px;align-items:center">${dot(KIND_COLOR[e.kind] ?? "var(--ink-faint)")}${esc(t(e.source))}</div>` : ""}
        <div class="t-micro faint" style="margin-top:6px;display:flex;gap:8px;align-items:center">
          ${avatar(userById(e.authorId)?.name ?? "—", 18)}${esc(userById(e.authorId)?.name ?? "—")}
          ${e.dueAt ? `<span>·</span><span>${t(loc("Сделать до", "Bajarish muddati"))} ${esc(fmtShort(e.dueAt))}</span>` : ""}
        </div>
      </li>`).join("")}</ol>`
      : `<div class="t-caption faint" style="text-align:center;padding:24px 0">${t(loc("Событий пока нет", "Hozircha hodisalar yo‘q"))}</div>`}
  </div>`;
}

/* ── блок «Основные поля» ────────────────────────────────── */
const fieldsCard = (title, rows) => `
  <div class="card" style="padding:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px">
      <div class="t-headline">${esc(title)}</div>
      <button class="btn btn-secondary" data-act="edit">${t(loc("Изменить", "O‘zgartirish"))}</button>
    </div>
    ${rows.map(([label, value]) => kv(label, value)).join("")}
  </div>`;

/* ── умный фильтр: один на все разделы ───────────────────── */
/**
 * Повторяет фильтр Битрикса: свёрнутая строка с поиском и чипами условий,
 * развёрнутая панель — пресеты слева, поля справа. Условия применяются
 * кнопкой «Найти»: список, который пересобирается на каждое нажатие
 * клавиши, работать мешает.
 */
function smartFilter(scopeKey, fields, presets, counts) {
  const st = filterState(scopeKey);
  st.draft ??= { q: st.q, values: { ...st.values } };
  const shown = activeFields(scopeKey, fields);
  const open = S.filterOpen === scopeKey;
  const conditions = activeConditions(fields, st.values);
  const saved = savedFilters(scopeKey);

  const control = (f) => {
    const d = st.draft.values;
    if (f.range) {
      return `<span style="display:flex;gap:8px">
        <input class="field" style="border-radius:100px" placeholder="${t(loc("от", "dan"))}" value="${esc(d[f.key + "From"] ?? "")}" data-act="f.set:${scopeKey}:${f.key}From">
        <input class="field" style="border-radius:100px" placeholder="${t(loc("до", "gacha"))}" value="${esc(d[f.key + "To"] ?? "")}" data-act="f.set:${scopeKey}:${f.key}To">
      </span>`;
    }
    if (f.kind === "select") {
      const options = [{ value: "", label: loc("Любое", "Har qanday") }, ...f.options];
      return select(`f.set:${scopeKey}:${f.key}`, d[f.key] ?? "", options.map((o) => ({ value: String(o.value), label: t(o.label), color: o.color })), 210);
    }
    return `<input class="field" style="border-radius:100px" placeholder="${esc(t(f.label))}" value="${esc(d[f.key] ?? "")}" data-act="f.set:${scopeKey}:${f.key}">`;
  };

  const hidden = fields.filter((f) => !shown.includes(f.key));

  return `<div class="filter">
    <div class="filter-bar">
      <span class="faint" style="display:flex">${icon("search", 15)}</span>
      <input placeholder="${t(loc("Поиск и фильтр", "Qidiruv va filtr"))}" value="${esc(st.draft.q ?? "")}" data-act="f.q:${scopeKey}" data-enter="f.apply:${scopeKey}">
      ${conditions.map((c) => `<span class="chip on">${esc(c.label)}: ${esc(c.value)}
        <button class="chip-x" data-act="f.drop:${scopeKey}:${c.key}" aria-label="${t(loc("Убрать условие", "Shartni olib tashlash"))}">${icon("close", 11)}</button>
      </span>`).join("")}
      ${counts ? `<span class="t-micro faint nowrap">${counts.shown} ${t(loc("из", "dan"))} ${counts.total}</span>` : ""}
      <button class="btn ${open ? "btn-primary" : "btn-secondary"}" data-act="f.open:${scopeKey}">${icon("filter", 14)} ${t(loc("Фильтр", "Filtr"))}</button>
    </div>

    ${open ? `<div class="filter-panel">
      <div class="filter-presets">
        <div class="t-micro faint" style="text-transform:uppercase;letter-spacing:.07em;padding:0 10px 8px">${t(loc("Фильтры", "Filtrlar"))}</div>
        ${presets.map((p) => `<button class="filter-preset${st.preset === p.key ? " on" : ""}" data-act="f.preset:${scopeKey}:${p.key}">${esc(t(p.label))}</button>`).join("")}
        ${saved.length ? `<div class="t-micro faint" style="text-transform:uppercase;letter-spacing:.07em;padding:12px 10px 8px">${t(loc("Мои фильтры", "Mening filtrlarim"))}</div>
          ${saved.map((f, i) => `<button class="filter-preset" data-act="f.saved:${scopeKey}:${i}">${esc(f.name)}</button>`).join("")}` : ""}
      </div>
      <div class="filter-fields">
        ${shown.map((key) => {
          const f = fields.find((x) => x.key === key);
          if (!f) return "";
          return `<div class="filter-field">
            <label>${esc(t(f.label))}</label>
            ${control(f)}
            <button class="chip-x" data-act="f.field:${scopeKey}:${f.key}" aria-label="${t(loc("Убрать поле", "Maydonni olib tashlash"))}">${icon("close", 13)}</button>
          </div>`;
        }).join("")}
        <div style="position:relative">
          <button class="btn btn-secondary" data-pop="ffields">${icon("plus", 14)} ${t(loc("Добавить поле", "Maydon qo‘shish"))}</button>
          ${S.popover === "ffields" ? `<span class="pop" style="top:42px;left:0">
            ${hidden.length ? hidden.map((f) => `<button data-act="f.field:${scopeKey}:${f.key}">${esc(t(f.label))}</button>`).join("")
              : `<span class="t-micro faint" style="display:block;padding:10px 12px">${t(loc("Все поля уже добавлены", "Barcha maydonlar qo‘shilgan"))}</span>`}
          </span>` : ""}
        </div>
      </div>
      <div class="filter-foot">
        <button class="btn btn-primary" data-act="f.apply:${scopeKey}">${t(loc("Найти", "Topish"))}</button>
        <button class="btn btn-secondary" data-act="f.clear:${scopeKey}">${t(loc("Сбросить", "Tozalash"))}</button>
        <span style="flex:1"></span>
        <button class="btn btn-secondary" data-act="f.default:${scopeKey}">${t(loc("Вернуть поля по умолчанию", "Standart maydonlar"))}</button>
        <button class="btn btn-secondary" data-act="f.save:${scopeKey}">${icon("plus", 13)} ${t(loc("Сохранить фильтр", "Filtrni saqlash"))}</button>
      </div>
    </div>` : ""}
  </div>`;
}

/* ── поля и пресеты фильтра по разделам ──────────────────── */
const opt = (value, label, color) => ({ value: String(value), label, color });
const teamOptions = () => scopedTeam().map((u) => opt(u.id, loc(u.name, u.name)));
const stageOptions = (entity) => pipelinesOf(entity).flatMap((p) => stagesOf(p).map((s) => opt(s.key, s.label, s.color)));

function contactFields() {
  return [
    { key: "status", label: loc("Статус", "Holat"), kind: "select", def: true,
      options: Object.entries(L.studentStatus).map(([k, v]) => opt(k, v.label, v.dot)) },
    { key: "ownerId", label: loc("Куратор", "Kurator"), kind: "select", def: true, options: teamOptions() },
    { key: "topik", label: "TOPIK", kind: "number", range: true, def: true },
    { key: "city", label: loc("Город", "Shahar"), kind: "select",
      options: [...new Set(scopedContacts().map((s) => s.city))].map((c) => opt(c, ref(L.city, c))) },
    { key: "source", label: loc("Источник", "Manba"), kind: "select",
      options: Object.entries(L.source).map(([k, v]) => opt(k, v)) },
    { key: "budget", label: loc("Бюджет на год, $", "Yillik byudjet, $"), kind: "number", range: true },
  ];
}
function leadFields() {
  return [
    { key: "stage", label: loc("Стадия", "Bosqich"), kind: "select", def: true, options: stageOptions("lead") },
    { key: "ownerId", label: loc("Ответственный", "Mas’ul"), kind: "select", def: true, options: teamOptions() },
    { key: "source", label: loc("Источник", "Manba"), kind: "select", def: true,
      options: Object.entries(L.source).map(([k, v]) => opt(k, v)) },
  ];
}
function dealFields() {
  return [
    { key: "stage", label: loc("Стадия", "Bosqich"), kind: "select", def: true, options: stageOptions("deal") },
    { key: "ownerId", label: loc("Куратор", "Kurator"), kind: "select", def: true, options: teamOptions() },
    { key: "universityId", label: loc("Вуз", "Universitet"), kind: "select",
      options: D.universities.map((u) => opt(u.id, loc(u.name, u.name))) },
    { key: "intake", label: loc("Набор", "Qabul"), kind: "select",
      options: [...new Set(D.deals.map((d) => d.intake))].map((i) => opt(i, ref(L.intake, i))) },
    { key: "degreeLevel", label: loc("Уровень", "Bosqich"), kind: "select",
      options: Object.entries(L.degree).map(([k, v]) => opt(k, v)) },
    { key: "priority", label: loc("Приоритет", "Ustuvorlik"), kind: "select", def: true,
      options: Object.entries(L.priority).map(([k, v]) => opt(k, v.label ?? v, v.dot)) },
    { key: "contractValue", label: loc("Сумма договора", "Shartnoma summasi"), kind: "number", range: true },
  ];
}
function taskFields() {
  return [
    { key: "status", label: loc("Статус", "Holat"), kind: "select", def: true,
      options: Object.entries(L.taskStatus).map(([k, v]) => opt(k, v.label ?? v, v.dot)) },
    { key: "assigneeId", label: loc("Исполнитель", "Ijrochi"), kind: "select", def: true, options: teamOptions() },
    { key: "priority", label: loc("Приоритет", "Ustuvorlik"), kind: "select", def: true,
      options: Object.entries(L.priority).map(([k, v]) => opt(k, v.label ?? v, v.dot)) },
    { key: "projectId", label: loc("Проект", "Loyiha"), kind: "select",
      options: D.projects.filter((p) => p.tenantId === S.tenant).map((p) => opt(p.id, p.name)) },
  ];
}
function deadlineFields() {
  return [
    { key: "kind", label: loc("Тип срока", "Muddat turi"), kind: "select", def: true,
      options: Object.entries(L.deadlineKind).map(([k, v]) => opt(k, v.label ?? v, v.dot)) },
    { key: "ownerId", label: loc("Ответственный", "Mas’ul"), kind: "select", def: true, options: teamOptions() },
  ];
}
function documentFields() {
  return [
    { key: "status", label: loc("Статус", "Holat"), kind: "select", def: true,
      options: Object.entries(L.documentStatus).map(([k, v]) => opt(k, v.label ?? v, v.dot)) },
    { key: "apostille", label: loc("Апостиль", "Apostil"), kind: "select",
      options: [opt("yes", loc("Нужен", "Kerak")), opt("no", loc("Не нужен", "Kerak emas"))] },
  ];
}
function teamFields() {
  return [
    { key: "role", label: loc("Роль", "Rol"), kind: "select", def: true,
      options: D.roles.map((r) => opt(r.key, r.label)) },
    { key: "branchId", label: loc("Филиал", "Filial"), kind: "select", def: true,
      options: tenant().branches.map((b) => opt(b.id, loc(b.name, b.name))) },
    { key: "departmentId", label: loc("Подразделение", "Bo‘lim"), kind: "select",
      options: allDepartments().map((d) => opt(d.id, d.name)) },
  ];
}
function universityFields() {
  return [
    { key: "city", label: loc("Город", "Shahar"), kind: "select", def: true,
      options: [...new Set(D.universities.map((u) => u.city))].sort().map((c) => opt(c, ref(L.city, c))) },
    { key: "ownership", label: loc("Форма собственности", "Mulkchilik shakli"), kind: "select", def: true,
      options: Object.entries(L.ownership).map(([k, v]) => opt(k, v)) },
    { key: "field", label: loc("Направление", "Yo‘nalish"), kind: "select", def: true,
      options: [...new Set(D.universities.flatMap((u) => u.fields))].sort().map((f) => opt(f, ref(L.field, f))) },
    { key: "degree", label: loc("Уровень обучения", "Ta’lim bosqichi"), kind: "select",
      options: Object.entries(L.degree).map(([k, v]) => opt(k, v)) },
    { key: "topik", label: loc("TOPIK студента", "Talabaning TOPIK darajasi"), kind: "number", range: true },
    { key: "tuition", label: loc("Стоимость года, $", "Yillik narx, $"), kind: "number", range: true },
    { key: "intake", label: loc("Набор", "Qabul"), kind: "select",
      options: [...new Set(D.universities.flatMap((u) => u.intakes))].sort().map((i) => opt(i, ref(L.intake, i))) },
    { key: "dorm", label: loc("Общежитие", "Yotoqxona"), kind: "select",
      options: [opt("yes", loc("Есть", "Bor"))] },
    { key: "english", label: loc("Английский трек", "Ingliz tilida"), kind: "select",
      options: [opt("yes", loc("Есть", "Bor"))] },
  ];
}

/** Готовые срезы: то, что сотрудник открывает каждый день. */
const simplePresets = () => [{ key: "all", label: loc("Все", "Barchasi"), values: {} }];
const minePreset = (key) => ({ key: "mine", label: loc("Мои", "Meniki"), values: { [key]: S.userId } });
const contactPresets = () => [
  { key: "all", label: loc("Все контакты", "Barcha kontaktlar"), values: {} },
  minePreset("ownerId"),
  { key: "active", label: loc("В работе", "Ishda"), values: { status: "active" } },
  { key: "enrolled", label: loc("Зачислены", "Qabul qilingan"), values: { status: "enrolled" } },
];
const dealPresets = () => [
  { key: "all", label: loc("Все сделки", "Barcha bitimlar"), values: {} },
  minePreset("ownerId"),
  { key: "hot", label: loc("Высокий приоритет", "Yuqori ustuvorlik"), values: { priority: "high" } },
];
const leadPresets = () => [
  { key: "all", label: loc("Все лиды", "Barcha lidlar"), values: {} },
  minePreset("ownerId"),
  { key: "new", label: loc("Новые", "Yangi"), values: { stage: "new" } },
];
const taskPresets = () => [
  { key: "all", label: loc("Все задачи", "Barcha vazifalar"), values: {} },
  minePreset("assigneeId"),
  { key: "open", label: loc("В работе", "Ishda"), values: { status: "in_progress" } },
];

/**
 * Воронка переключается прямо в шапке «Лидов» и «Сделок», как в Битриксе,
 * а настраивается по шестерёнке рядом — отдельного пункта меню больше нет.
 */
function pipelinePicker(pipeline) {
  const list = pipelinesOf(pipeline.entity);
  return `<span style="display:inline-flex;align-items:center;gap:6px">
    ${select("pipeline", pipeline.id, list.map((p) => ({ value: p.id, label: t(p.name) })), 200)}
    <button class="icon-btn" data-go="pipelines" title="${t(loc("Настроить воронку", "Voronkani sozlash"))}">${icon("gear", 16)}</button>
  </span>`;
}
