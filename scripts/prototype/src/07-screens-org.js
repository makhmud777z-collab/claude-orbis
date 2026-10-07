/** Подпись зоны видимости — нужна и в списке сотрудников, и в матрице прав. */
const scopeOf = (s) => t(s === "tenant" ? loc("всё агентство", "butun agentlik")
  : s === "branch" ? loc("свой филиал", "o‘z filiali")
  : loc("только свои записи", "faqat o‘z yozuvlari"));

/* ── сотрудники, структура, отчётность ───────────────────── */
const teamRow = (u) => ({
  search: `${u.name} ${u.title} ${u.email} ${u.phone}`,
  role: u.role, branchId: u.branchId, departmentId: departmentOf(u.id),
});

function screenTeam() {
  const all = scopedTeam();
  const fields = teamFields();
  const st = filterState("team");
  const team = all.filter((u) => matchesFilter(teamRow(u), fields, st.values, st.q));
  const contacts = scopedContacts();
  const deals = scopedDeals();
  const tasks = scopedTasks();
  const branches = new Map(tenant().branches.map((b) => [b.id, b]));
  const STATUS = { active: "var(--deal)", invited: "var(--progress)", suspended: "var(--hold)" };
  const STATUS_LABEL = { active: loc("активен", "faol"), invited: loc("приглашён", "taklif qilingan"), suspended: loc("заблокирован", "bloklangan") };

  return `
    ${head(t(loc("Сотрудники", "Xodimlar")),
      `<span>${plural(team.length, ["человек", "человека", "человек"], "kishi")} · ${tenant().seatsUsed} ${t(loc("из", "dan"))} ${tenant().seatsLimit} ${t(loc("мест", "o‘rin"))}</span><span class="faint">·</span>
       <a href="#" data-go="structure">${t(loc("Структура компании", "Kompaniya tuzilmasi"))}</a>
       <a href="#" data-go="staffreports">${t(loc("Отчётность", "Hisobot"))}</a>`,
      allow(user().role, "team", "create") ? `<button class="btn btn-primary" data-go="users">${icon("plus", 15)} ${t(loc("Пригласить", "Taklif qilish"))}</button>` : "")}

    ${smartFilter("team", fields, simplePresets(), { shown: team.length, total: all.length })}

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
      ${team.map((u) => {
        const role = roleById(u.role);
        const w = workOf(u.id);
        const dep = allDepartments().find((d) => d.id === departmentOf(u.id));
        return `<a class="card card-hover" style="padding:18px;display:block" href="#" data-go="employee/${esc(u.id)}">
          <span style="display:flex;gap:12px;align-items:flex-start">
            <span style="position:relative;flex:none">
              ${avatar(u.name, 40)}
              <span style="position:absolute;right:-2px;bottom:-2px;width:12px;height:12px;border-radius:999px;border:2px solid var(--surface-1);
                background:${w ? (w.onBreak ? "var(--progress)" : "var(--deal)") : "var(--hairline)"}"></span>
            </span>
            <span style="min-width:0;flex:1">
              <span class="t-body-sm truncate" style="display:block">${esc(u.name)}</span>
              <span class="t-micro faint truncate" style="display:block">${esc(u.title)}</span>
            </span>
            <span class="chip">${dot(STATUS[u.status])}${esc(t(STATUS_LABEL[u.status]))}</span>
          </span>
          <span style="display:flex;gap:6px;flex-wrap:wrap;margin-top:14px">
            ${chip(roleName(role), null, true)}${dep ? chip(t(dep.name)) : ""}
          </span>
          <span style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--hairline-soft)">
            ${[[contacts.filter((s) => s.ownerId === u.id).length, loc("контакты", "kontakt")],
               [deals.filter((d) => d.ownerId === u.id).length, loc("сделки", "bitim")],
               [tasks.filter((x) => x.assigneeId === u.id && x.status !== "done").length, loc("задачи", "vazifa")]]
              .map(([n, label]) => `<span>
                <span class="num" style="display:block;font-size:18px;font-weight:500;letter-spacing:-.6px">${n}</span>
                <span class="t-micro faint">${esc(t(label))}</span>
              </span>`).join("")}
          </span>
          <span class="t-micro faint" style="display:block;margin-top:14px">
            ${esc(branches.get(u.branchId) ? t(ref(L.city, branches.get(u.branchId).city)) : "—")} ·
            ${t(loc("в системе с", "tizimda"))} ${esc(fmtDate(u.joinedAt))}
            ${w ? ` · <span class="num">${esc(hhmm(sessionMinutes(w)))}</span> ${t(loc("на работе", "ishda"))}` : ""}
          </span>
        </a>`;
      }).join("")}
    </div>`;
}

function screenEmployee(id) {
  const u = scopedTeam().find((x) => x.id === id);
  if (!u) return screenNotFound();
  const role = roleById(u.role);
  const dep = allDepartments().find((d) => d.id === departmentOf(u.id));
  const branch = tenant().branches.find((b) => b.id === u.branchId);
  const sessions = D.sessions.filter((s) => s.userId === u.id).sort((a, b) => b.date.localeCompare(a.date));
  const minutes = sessions.reduce((n, s) => n + sessionMinutes(s), 0);
  const tasks = scopedTasks().filter((x) => x.assigneeId === u.id);

  return `
    ${crumb("team", t(loc("Сотрудники", "Xodimlar")), u.name)}
    ${head(u.name,
      `<span>${esc(u.title)}</span><span class="faint">·</span>
       <span class="chip on">${esc(roleName(role))}</span>
       <span>${esc(branch ? t(ref(L.city, branch.city)) : "—")}</span>`,
      `<a class="btn btn-secondary" href="tel:${esc(u.phone)}">${icon("phone", 15)} ${t(loc("Позвонить", "Qo‘ng‘iroq"))}</a>
       <a class="btn btn-secondary" href="mailto:${esc(u.email)}">${icon("mail", 15)} ${t(loc("Написать", "Yozish"))}</a>
       ${allow(user().role, "team", "edit")
         ? `<button class="btn btn-primary" data-act="employee.edit" data-value="${esc(u.id)}">${t(loc("Изменить", "O‘zgartirish"))}</button>` : ""}`)}

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));align-items:start">
      <div class="grid">
        <div class="card" style="padding:18px">
          <div class="t-headline" style="margin-bottom:12px">${t(loc("Личные данные", "Shaxsiy ma’lumotlar"))}</div>
          ${kv(t(loc("День рождения", "Tug‘ilgan kun")), esc(fmtDate(u.birthDate)))}
          ${kv(t(loc("Рабочий телефон", "Ish telefoni")), esc(u.phone))}
          ${kv(t(loc("Второй номер", "Ikkinchi raqam")), esc(u.phone2 ?? "—"))}
          ${kv("Email", esc(u.email))}
          ${kv(t(loc("Принят на работу", "Ishga qabul qilingan")), esc(fmtDate(u.joinedAt)))}
          ${kv(t(loc("Подразделение", "Bo‘lim")), dep ? `<a href="#" data-go="structure">${esc(t(dep.name))}</a>` : "—")}
          ${kv(t(loc("Зона видимости", "Ko‘rish doirasi")), esc(t(role.scope === "tenant" ? loc("всё агентство", "butun agentlik") : role.scope === "branch" ? loc("свой филиал", "o‘z filiali") : loc("только свои записи", "faqat o‘z yozuvlari"))))}
        </div>
        <div class="card" style="padding:18px">
          <div class="t-headline" style="margin-bottom:12px">${t(loc("Отчётность", "Hisobot"))}</div>
          ${kv(t(loc("Дней", "Kunlar")), sessions.length)}
          ${kv(t(loc("Часов", "Soat")), Math.round(minutes / 60))}
          ${kv(t(loc("Средний день", "O‘rtacha kun")), sessions.length ? hhmm(Math.round(minutes / sessions.length)) : "—")}
        </div>
      </div>

      <div class="grid">
        <div>
          ${sectionTitle(t(loc("Рабочие дни", "Ish kunlari")))}
          <div class="card divide">
            ${sessions.length ? sessions.slice(0, 8).map((s) => `<div class="row">
              ${dot(s.endedAt ? "var(--deal)" : "var(--progress)")}
              <span class="t-body-sm" style="width:100px;flex:none">${esc(fmtShort(s.date))}</span>
              <span class="t-caption num muted" style="flex:1">${esc(s.startedAt.slice(11, 16))} — ${esc(s.endedAt ? s.endedAt.slice(11, 16) : "…")}</span>
              <span class="t-caption num">${esc(hhmm(sessionMinutes(s)))}</span>
              <span class="t-micro faint nowrap" style="width:72px;text-align:right">${s.breakMinutes ? `−${s.breakMinutes} ${t(loc("мин", "daq"))}` : ""}</span>
            </div>`).join("") : `<div class="t-body-sm muted" style="padding:32px;text-align:center">${t(loc("Отметок пока нет", "Belgilar yo‘q"))}</div>`}
          </div>
        </div>

        <div>
          ${sectionTitle(t(loc("Задачи", "Vazifalar")))}
          <div class="card divide">
            ${tasks.length ? tasks.slice(0, 8).map((x) => `<div class="row">
              ${dot(L.taskStatus[x.status].dot)}
              <span class="t-body-sm truncate" style="flex:1;min-width:0">${esc(x.title)}</span>
              <span class="t-micro faint nowrap">${esc(relDeadline(x.dueAt))}</span>
            </div>`).join("") : `<div class="t-body-sm muted" style="padding:32px;text-align:center">${t(loc("Задач нет", "Vazifalar yo‘q"))}</div>`}
          </div>
        </div>

        ${timeline("employee", u.id)}
      </div>
    </div>`;
}

/* ── структура компании ──────────────────────────────────── */
/**
 * Дерево как в Битриксе: холст с подразделениями по центру и панель справа
 * с руководителем и подчинёнными. Структура живая — отдел создаётся,
 * руководитель назначается, сотрудник переносится перетаскиванием.
 */
function screenStructure() {
  const departments = allDepartments();
  const zoom = S.org.zoom;
  const roots = departments.filter((d) => !d.parentId);

  /** Сколько людей в отделе с учётом вложенных — иначе цифра врёт. */
  const deep = (dep) => staffOf(dep.id).length
    + departments.filter((d) => d.parentId === dep.id).reduce((n, d) => n + deep(d), 0);

  const box = (dep) => {
    const head2 = headOf(dep.id) ? userById(headOf(dep.id)) : null;
    const on = S.org.selected === dep.id;
    return `<section class="card card-hover tree-box" style="padding:12px;text-align:left;cursor:pointer;${on ? "border-color:var(--accent)" : ""}"
        data-act="org.pick" data-value="${esc(dep.id)}" data-drop-dept="${esc(dep.id)}">
      <div class="t-caption truncate">${esc(t(dep.name))}</div>
      <div class="t-micro faint" style="margin-top:3px">${plural(deep(dep), ["сотрудник", "сотрудника", "сотрудников"], "xodim")}</div>
      ${head2 ? `<div style="display:flex;gap:7px;align-items:center;margin-top:10px">
        ${avatar(head2.name, 22)}
        <span class="t-micro truncate" style="min-width:0">${esc(head2.name)}</span>
      </div>` : `<div class="t-micro faint" style="margin-top:10px">${t(loc("Руководитель не назначен", "Rahbar tayinlanmagan"))}</div>`}

      ${allow(user().role, "structure", "edit") ? `<div style="display:flex;gap:2px;margin-top:10px;padding-top:8px;border-top:1px solid var(--hairline-soft)">
        <button class="icon-btn" style="width:26px;height:26px" data-act="org.new" data-value="${esc(dep.id)}"
          title="${t(loc("Добавить подразделение внутрь", "Ichkariga bo‘lim qo‘shish"))}">${icon("plus", 12)}</button>
        <button class="icon-btn" style="width:26px;height:26px" data-act="org.rename" data-value="${esc(dep.id)}"
          title="${t(loc("Переименовать подразделение", "Bo‘lim nomini o‘zgartirish"))}">${icon("pencil", 12)}</button>
        ${dep.parentId ? `<button class="icon-btn" style="width:26px;height:26px" data-act="org.del" data-value="${esc(dep.id)}"
          title="${t(loc("Удалить подразделение", "Bo‘limni o‘chirish"))}">${icon("trash", 12)}</button>` : ""}
        <span style="flex:1"></span>
        <button class="icon-btn" style="width:26px;height:26px" data-act="org.addperson" data-value="${esc(dep.id)}"
          title="${t(loc("Добавить сотрудника", "Xodim qo‘shish"))}">${icon("people", 12)}</button>
      </div>` : ""}
    </section>`;
  };

  const branch = (dep) => {
    const children = departments.filter((d) => d.parentId === dep.id);
    return `<div class="tree-node">
      ${box(dep)}
      ${children.length ? `<div class="tree-stem"></div>
        <div class="tree-children">
          ${children.map((c) => `<div class="tree-child" data-drop-dept="${esc(c.id)}">${branch(c)}</div>`).join("")}
        </div>` : ""}
    </div>`;
  };

  const selected = departments.find((d) => d.id === S.org.selected) ?? roots[0];
  const selHead = selected && headOf(selected.id) ? userById(headOf(selected.id)) : null;
  const nested = (dep) => [...staffOf(dep.id), ...departments.filter((d) => d.parentId === dep.id).flatMap(nested)];
  const people = selected ? nested(selected).filter((u) => !S.org.q
    || `${u.name} ${u.title}`.toLowerCase().includes(S.org.q.toLowerCase())) : [];

  return `
    ${head(t(loc("Структура компании", "Kompaniya tuzilmasi")),
      `<span>${plural(departments.length, ["подразделение", "подразделения", "подразделений"], "bo‘lim")}</span><span class="faint">·</span>
       <span>${t(loc("сотрудника можно перетащить в другой отдел", "xodimni boshqa bo‘limga tortib o‘tkazish mumkin"))}</span>`,
      allow(user().role, "structure", "edit")
        ? `<button class="btn btn-primary" data-act="org.new">${icon("plus", 15)} ${t(loc("Добавить отдел", "Bo‘lim qo‘shish"))}</button>` : "")}

    <div class="grid" style="grid-template-columns:minmax(0,1fr) 300px;align-items:start">
      <div class="card" style="padding:0;overflow:hidden;min-width:0">
        <div class="card-head" style="display:flex;align-items:center;gap:8px">
          <button class="icon-btn" data-act="org.zoom" data-value="-10" aria-label="${t(loc("Уменьшить", "Kichraytirish"))}">−</button>
          <span class="t-micro num" style="width:44px;text-align:center">${zoom}%</span>
          <button class="icon-btn" data-act="org.zoom" data-value="10" aria-label="${t(loc("Увеличить", "Kattalashtirish"))}">+</button>
          <span style="flex:1"></span>
          <button class="btn btn-secondary" data-act="org.me">${t(loc("Найти меня", "Meni topish"))}</button>
        </div>
        <div style="overflow:auto;padding:26px 16px" data-scroll="tree">
          <div class="tree" style="transform:scale(${zoom / 100});transform-origin:top center;min-width:max-content;margin:0 auto">
            ${roots.map(branch).join("")}
          </div>
        </div>
      </div>

      <aside class="card" style="padding:0;position:sticky;top:76px;min-width:0">
        <div class="card-head">
          <div class="t-caption truncate">${esc(selected ? t(selected.name) : "—")}</div>
          <div class="t-micro faint" style="margin-top:3px">${plural(people.length, ["человек", "человека", "человек"], "kishi")}</div>
        </div>
        <div style="padding:14px">
          <div class="t-micro faint" style="text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">${t(loc("Руководитель", "Rahbar"))}</div>
          ${selHead ? `<a href="#" data-go="employee/${esc(selHead.id)}" style="display:flex;gap:10px;align-items:center;margin-bottom:6px">
            ${avatar(selHead.name, 30)}
            <span style="min-width:0"><span class="t-caption truncate" style="display:block">${esc(selHead.name)}</span>
            <span class="t-micro faint truncate" style="display:block">${esc(selHead.title)}</span></span>
          </a>` : `<div class="t-micro faint" style="margin-bottom:6px">${t(loc("Не назначен", "Tayinlanmagan"))}</div>`}
          ${selected && allow(user().role, "structure", "edit")
            ? select("org.head", headOf(selected.id) ?? "", [
                { value: "", label: t(loc("— не назначен —", "— tayinlanmagan —")) },
                ...staffOf(selected.id).map((u) => ({ value: u.id, label: u.name })),
              ], 250) : ""}

          <div style="border-top:1px solid var(--hairline-soft);margin:14px 0;padding-top:14px">
            <div class="t-micro faint" style="text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">${t(loc("Подчинённые", "Bo‘ysunuvchilar"))}</div>
            <input class="field" style="border-radius:100px;margin-bottom:10px" placeholder="${t(loc("Поиск по сотрудникам", "Xodimlardan qidirish"))}" value="${esc(S.org.q)}" data-act="org.q">
            <div style="display:grid;gap:4px;max-height:320px;overflow-y:auto">
              ${people.length ? people.map((u) => `<div draggable="true" data-drag-user="${esc(u.id)}"
                style="display:flex;gap:9px;align-items:center;padding:6px;border-radius:8px;cursor:grab">
                ${avatar(u.name, 24)}
                <span style="min-width:0"><span class="t-caption truncate" style="display:block">${esc(u.name)}</span>
                <span class="t-micro faint truncate" style="display:block">${esc(u.title)}</span></span>
              </div>`).join("") : `<span class="t-micro faint">${t(loc("Никого не найдено", "Hech kim topilmadi"))}</span>`}
            </div>
          </div>
        </div>
      </aside>
    </div>`;
}

function screenStaffReports() {
  const team = scopedTeam();
  const rows = team.map((u) => {
    const mine = D.sessions.filter((s) => s.userId === u.id);
    const minutes = mine.reduce((n, s) => n + sessionMinutes(s), 0);
    return {
      u, days: mine.length, minutes,
      breaks: mine.reduce((n, s) => n + s.breakMinutes, 0),
      late: mine.filter((s) => s.startedAt.slice(11, 16) > "09:30").length,
      today: mine.find((s) => s.date === TODAY_ISO),
      avg: mine.length ? Math.round(minutes / mine.length) : 0,
    };
  }).sort((a, b) => b.minutes - a.minutes);
  const max = Math.max(1, ...rows.map((r) => r.minutes));

  return `
    ${head(t(loc("Отчётность сотрудников", "Xodimlar hisoboti")),
      `<span>${t(loc("часы считаются из отметок «начать» и «завершить рабочий день»", "soatlar ish kuni belgilaridan hisoblanadi"))}</span><span class="faint">·</span>
       <span>${rows.filter((r) => r.today && !r.today.endedAt).length} ${t(loc("на работе", "ishda"))}</span>`)}
    <div class="card scroll-x">
      <table style="min-width:820px">
        <thead><tr>${[loc("Сотрудник", "Xodim"), loc("Дней", "Kunlar"), loc("Часов", "Soat"),
          loc("Средний день", "O‘rtacha kun"), loc("Перерывы", "Tanaffuslar"), loc("Опозданий", "Kechikishlar"), loc("Сегодня", "Bugun")]
          .map((h) => `<th>${esc(t(h))}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((r) => `<tr>
            <td><a href="#" data-go="employee/${esc(r.u.id)}" style="display:flex;gap:12px;align-items:center">
              ${avatar(r.u.name, 28)}
              <span style="min-width:0"><span class="t-body-sm truncate" style="display:block">${esc(r.u.name)}</span>
              <span class="t-micro faint truncate" style="display:block">${esc(r.u.title)}</span></span></a></td>
            <td class="t-body-sm num">${r.days || "—"}</td>
            <td><div class="t-body-sm num">${esc(hhmm(r.minutes))}</div><div style="width:90px;margin-top:6px">${bar((r.minutes / max) * 100)}</div></td>
            <td class="t-body-sm num">${r.avg ? esc(hhmm(r.avg)) : "—"}</td>
            <td class="t-caption num muted">${r.breaks ? `${r.breaks} ${t(loc("мин", "daq"))}` : "—"}</td>
            <td class="t-caption num" style="color:${r.late ? "var(--progress)" : "inherit"}">${r.late || "—"}</td>
            <td>${r.today
              ? `<span class="chip">${dot(r.today.endedAt ? "var(--deal)" : "var(--progress)")}${esc(r.today.startedAt.slice(11, 16))}${r.today.endedAt ? ` — ${esc(r.today.endedAt.slice(11, 16))}` : ""}</span>`
              : `<span class="t-micro faint">${t(loc("не начат", "boshlanmagan"))}</span>`}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

/* ── администрирование ───────────────────────────────────── */
function screenAdminUsers() {
  const team = scopedTeam();
  const owners = team.filter((u) => u.role === "owner");
  const canEdit = allow(user().role, "admin", "edit");
  const STATUS_LABEL = { active: loc("активен", "faol"), invited: loc("приглашён", "taklif qilingan"), suspended: loc("заблокирован", "bloklangan") };
  const STATUS_DOT = { active: "var(--deal)", invited: "var(--progress)", suspended: "var(--hold)" };

  return `
    ${head(t(loc("Пользователи", "Foydalanuvchilar")),
      `<span>${tenant().seatsUsed} ${t(loc("из", "dan"))} ${tenant().seatsLimit} ${t(loc("мест по тарифу", "tarif bo‘yicha o‘rin"))}</span><span class="faint">·</span>
       <a href="#" data-go="permissions">${t(loc("Права доступа", "Kirish huquqlari"))}</a>`,
      canEdit ? `<button class="btn btn-primary" data-act="invite">${icon("plus", 15)} ${t(loc("Пригласить", "Taklif qilish"))}</button>` : "")}
    <div class="card scroll-x">
      <table style="min-width:900px">
        <thead><tr>${[loc("Сотрудник", "Xodim"), loc("Роль", "Rol"), loc("Зона видимости", "Ko‘rish doirasi"),
          loc("Статус", "Holat"), loc("Принят", "Qabul qilingan")].map((h) => `<th>${esc(t(h))}</th>`).join("")}</tr></thead>
        <tbody>
          ${team.map((u) => {
            const last = u.role === "owner" && owners.length === 1;
            return `<tr>
              <td><a href="#" data-go="employee/${esc(u.id)}" style="display:flex;gap:12px;align-items:center">
                ${avatar(u.name, 30)}
                <span style="min-width:0"><span class="t-body-sm truncate" style="display:block">${esc(u.name)}</span>
                <span class="t-micro faint truncate" style="display:block">${esc(u.email)}</span></span></a></td>
              <td>${canEdit && !last
                ? select("role:" + u.id, u.role, rolesList().map((r) => ({ value: r.id, label: roleName(r), hint: scopeOf(r.scope) })), 200)
                : `<span class="t-caption">${esc(roleName(roleById(u.role)))}</span>`}</td>
              <td class="t-caption muted">${esc(scopeOf(roleById(u.role).scope))}</td>
              <td><span class="chip">${dot(STATUS_DOT[u.status])}${esc(t(STATUS_LABEL[u.status]))}</span></td>
              <td class="t-caption num nowrap">${esc(fmtDate(u.joinedAt))}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
}

const ACTIONS_LIST = ["view", "create", "edit", "delete", "export", "assign"];

/**
 * Права доступа агентства.
 *
 * Роли стоят колонками, права — строками: матрицу читают сравнением ролей
 * между собой («у кого ещё открыты финансы»), а это главный вопрос к этому
 * экрану. Состав ролей нигде не зашит — агентство заводит свои и называет
 * как хочет, поэтому колонку добавляют прямо в шапке.
 */
function screenPermissions() {
  const open = new Set(editionModules(tenant().edition));
  const canEdit = allow(user().role, "admin", "edit");
  const roles = rolesList();

  const sections = (D.moduleGroups ?? [])
    .map((g) => ({
      id: g.id,
      title: t(g.title),
      rows: g.modules.filter((m) => open.has(m)).flatMap((m) =>
        (D.moduleActions?.[m] ?? ["view"]).map((a) => ({
          key: `${m}.${a}`, module: m, action: a,
          label: `${t(L.module[m])} — ${t(L.action[a]).toLowerCase()}`,
        })),
      ),
    }))
    .filter((g) => g.rows.length);

  const total = sections.reduce((n, g) => n + g.rows.length, 0);
  const on = (role, row) => (role.permissions[row.module] ?? []).includes(row.action);
  const staffOf = (role) => scopedTeam().filter((u) => u.role === role.id);

  const toggle = (role, row) => {
    if (!canEdit || role.system) return "";
    return `data-act="permtg" data-value="${esc(role.id)}:${esc(row.key)}"`;
  };

  const colHead = (role) => {
    const staff = staffOf(role);
    return `<th style="min-width:162px;text-align:center;vertical-align:top;border-left:1px solid var(--hairline-soft);padding:12px 10px">
      ${role.system || !canEdit
        ? `<div class="t-body-sm" style="font-weight:600">${esc(roleName(role))}</div>`
        : `<input class="role-name" data-role="${esc(role.id)}" value="${esc(roleName(role))}" title="${esc(roleName(role))}"
             style="width:100%;text-align:center;font-weight:600;font-size:14px;background:none;border:0;border-radius:7px;padding:3px 4px;color:inherit">`}
      <div style="display:flex;align-items:center;justify-content:center;gap:5px;margin-top:8px">
        ${staff.slice(0, 3).map((u) => avatar(u.name, 22)).join("")}
        ${staff.length > 3 ? `<span class="t-micro faint num">+${staff.length - 3}</span>` : ""}
        ${role.system
          ? `<span class="faint" title="${esc(t(loc("Роль владельца защищена", "Egasi roli himoyalangan")))}">${icon("lock", 12)}</span>`
          : canEdit
            ? `<button class="t-micro" title="${esc(staff.length
                ? t(loc("Сначала переведите сотрудников на другую роль", "Avval xodimlarni boshqa rolga o‘tkazing"))
                : t(loc("Удалить роль", "Rolni o‘chirish")))}"
                ${staff.length ? "disabled" : `data-act="roledel" data-value="${esc(role.id)}"`}
                style="background:none;border:0;padding:2px 5px;border-radius:5px;color:var(--ink-faint);cursor:${staff.length ? "not-allowed" : "pointer"};opacity:${staff.length ? ".35" : "1"}">✕</button>`
            : ""}
      </div>
    </th>`;
  };

  const scopeRow = `
    <tr style="border-bottom:1px solid var(--hairline-soft)">
      <td style="position:sticky;left:0;background:var(--surface-1);z-index:1;padding:10px 16px">
        <span class="t-body-sm">${t(loc("Зона видимости", "Ko‘rish doirasi"))}</span></td>
      ${roles.map((r) => `<td style="text-align:center;border-left:1px solid var(--hairline-soft);padding:10px">
        <button class="t-micro" ${canEdit && !r.system ? `data-act="rolescope" data-value="${esc(r.id)}"` : "disabled"}
          style="background:none;border:0;padding:4px 8px;border-radius:6px;cursor:${canEdit && !r.system ? "pointer" : "default"};
                 color:${r.system ? "var(--ink-muted)" : "var(--accent)"};${r.system ? "" : "text-decoration:underline dashed;text-underline-offset:4px"}">
          ${esc(scopeOf(r.scope))}</button></td>`).join("")}
      ${canEdit ? '<td style="border-left:1px solid var(--hairline-soft)"></td>' : ""}
    </tr>`;

  const sectionRows = (g) => {
    const folded = S.folded[g.id] ?? g.id !== sections[0].id;
    const span = roles.length + (canEdit ? 2 : 1);
    const headRow = `
      <tr><td colspan="${span}" style="padding:0;background:var(--surface-2)">
        <button data-act="secfold" data-value="${esc(g.id)}:${folded ? 1 : 0}"
          style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 16px;border:0;background:none;color:inherit;cursor:pointer;text-align:left">
          <span class="faint" style="display:inline-flex;transition:transform .15s ease;transform:rotate(${folded ? -90 : 0}deg)">${icon("chevron", 12)}</span>
          <span class="t-caption" style="font-weight:600">${esc(g.title)}</span>
          <span class="t-micro faint num" style="margin-left:auto">${g.rows.length}</span>
        </button></td></tr>`;
    if (folded) return headRow;
    return headRow + g.rows.map((row) => `
      <tr style="border-bottom:1px solid var(--hairline-soft)">
        <td style="position:sticky;left:0;background:var(--surface-1);z-index:1;padding:7px 16px">
          <span class="t-body-sm">${esc(row.label)}</span></td>
        ${roles.map((r) => `<td style="text-align:center;border-left:1px solid var(--hairline-soft);padding:7px 10px">
          <button class="tg${on(r, row) ? " on" : ""}" ${toggle(r, row)} ${!canEdit || r.system ? "disabled" : ""}
            aria-label="${esc(row.label)} — ${esc(roleName(r))}"></button></td>`).join("")}
        ${canEdit ? '<td style="border-left:1px solid var(--hairline-soft)"></td>' : ""}
      </tr>`).join("");
  };

  return `
    ${head(t(loc("Права доступа", "Kirish huquqlari")),
      `<span>${plural(roles.length, ["роль", "роли", "ролей"], "rol")}</span><span class="faint">·</span>
       <a href="#" data-go="users">${t(loc("Пользователи", "Foydalanuvchilar"))}</a>`)}
    <div class="banner" style="margin-bottom:20px">
      ${dot("var(--accent)")}
      <span class="t-caption">${t(loc(
        "Матрица прав редактируется прямо здесь: изменения сразу влияют на меню и данные сотрудников.",
        "Huquqlar matritsasi shu yerda tahrirlanadi: o‘zgarishlar darhol menyuga ta’sir qiladi."))}</span>
    </div>
    <div class="card scroll-x">
      <table style="min-width:${260 + roles.length * 162}px">
        <thead><tr style="border-bottom:1px solid var(--hairline)">
          <th style="position:sticky;left:0;background:var(--surface-1);z-index:2;min-width:260px;text-align:left;vertical-align:top;padding:12px 16px">
            <div class="t-body-sm" style="font-weight:600">${t(loc("Роль", "Rol"))}</div>
            <div class="t-micro faint num" style="margin-top:4px">${roles.length} · ${total} ${t(loc("прав", "huquq"))}</div>
          </th>
          ${roles.map(colHead).join("")}
          ${canEdit ? `<th style="width:64px;border-left:1px solid var(--hairline-soft);padding:12px 10px;text-align:center;vertical-align:top">
            <button class="icon-btn" data-act="roleadd" title="${esc(t(loc("Добавить роль", "Rol qo‘shish")))}"
              style="border:1px solid var(--hairline)">${icon("plus", 15)}</button></th>` : ""}
        </tr></thead>
        <tbody>
          ${scopeRow}
          ${sections.map(sectionRows).join("")}
        </tbody>
      </table>
    </div>`;
}

/* ── администрирование: один вход во все настройки ───────── */
/**
 * Замок. Настройки портала — не раздел меню, а зона ответственности:
 * сюда заходит тот, кто портал ведёт, и делает это осознанно, набрав код.
 */
function screenAdminLock() {
  return `
    <div style="display:flex;align-items:center;justify-content:center;min-height:70vh;padding:0 16px">
      <div class="card" style="width:100%;max-width:420px;padding:32px;text-align:center">
        <span style="display:inline-flex;width:48px;height:48px;border-radius:999px;align-items:center;justify-content:center;margin-bottom:18px;
          background:color-mix(in srgb, var(--accent) 12%, transparent);color:var(--accent)">${icon("lock", 20)}</span>
        <h1 class="t-headline">${t(loc("Настройки портала", "Portal sozlamalari"))}</h1>
        <p class="t-caption muted" style="margin:10px 0 0;line-height:1.6">${t(loc(
          "Раздел закрыт кодом: здесь меняются воронки, права и тариф. Сотрудникам он не нужен и не виден.",
          "Bo‘lim kod bilan yopilgan: bu yerda voronkalar, huquqlar va tarif o‘zgaradi."))}</p>
        <input id="admin-code" type="password" inputmode="numeric" class="field num" data-enter="unlock"
          placeholder="${t(loc("Код", "Kod"))}" style="margin-top:22px;height:44px;text-align:center;letter-spacing:.4em">
        ${S.adminError ? `<p class="t-caption" style="margin:10px 0 0;color:var(--risk)">${t(loc("Неверный код", "Kod noto‘g‘ri"))}</p>` : ""}
        <button class="btn btn-primary" style="width:100%;height:40px;margin-top:16px" data-act="unlock">${t(loc("Войти", "Kirish"))}</button>
      </div>
    </div>`;
}

/** Пульт портала: всё, что настраивается, собрано плитками по смыслу. */
function screenAdmin() {
  if (!S.adminUnlocked) return screenAdminLock();
  const pipelines = [...pipelinesOf("lead"), ...pipelinesOf("deal")];
  const channels = channelsOf();
  /*
   * Группы идут в том порядке, в каком агентство к ним приходит: путь
   * карточки по воронке, работа со студентом, откуда берутся заявки, люди,
   * сам портал. Пояснение под заголовком — потому что «CRM» ничего не
   * говорит тому, кто ищет, где поменять набор документов.
   */
  const groups = [
    { label: loc("Продажи и воронки", "Sotuv va voronkalar"),
      hint: loc("как карточка идёт по воронке", "karta voronka bo‘ylab qanday ketadi"),
      icon: "board", items: [
      { go: "pipelines", title: loc("Воронки", "Voronkalar"),
        hint: loc("стадии, порядок, цвета и финалы", "bosqichlar, tartib, ranglar"), value: String(pipelines.length) },
      { go: "cards", title: loc("Карточка просмотра", "Ko‘rish kartasi"),
        hint: loc("какие поля показывать на канбане", "kanbanda qaysi maydonlar"), value: String(S.cardFields.length) },
    ] },
    { label: loc("Откуда приходят заявки", "Arizalar qayerdan keladi"),
      hint: loc("каналы продаж и реклама Meta", "sotuv kanallari va Meta reklamasi"),
      icon: "board", items: [
      { go: "channels", title: loc("Каналы продаж", "Sotuv kanallari"),
        hint: loc("откуда приходят обращения", "murojaatlar qayerdan keladi"),
        value: `${channels.filter((c) => c.status === "connected").length} / ${channels.length}` },
    ] },
    { label: loc("Люди и доступы", "Odamlar va huquqlar"),
      hint: loc("кто работает в портале и что кому видно", "portalda kim ishlaydi va kimga nima ko‘rinadi"),
      icon: "people", items: [
      { go: "users", title: loc("Пользователи", "Foydalanuvchilar"),
        hint: loc("мест по тарифу", "tarif bo‘yicha o‘rin"), value: `${tenant().seatsUsed} / ${tenant().seatsLimit}` },
      { go: "permissions", title: loc("Права доступа", "Kirish huquqlari"),
        hint: loc("матрица ролей и разделов", "rollar va bo‘limlar matritsasi"), value: "—" },
      { go: "structure", title: loc("Оргструктура", "Tashkiliy tuzilma"),
        hint: loc("подразделения, руководители, кто кому подчиняется", "bo‘limlar, rahbarlar, kim kimga bo‘ysunadi"),
        value: String(allDepartments().length) },
    ] },
    { label: loc("Портал агентства", "Agentlik portali"),
      hint: loc("адрес, реквизиты, код входа в этот раздел", "manzil, rekvizitlar, kirish kodi"),
      icon: "gear", items: [
      { go: "portal", title: loc("Настройки портала", "Portal sozlamalari"),
        hint: loc("домен, брендинг, филиалы, тариф", "domen, brending, filiallar, tarif"), value: tenant().slug },
      { go: "demo", title: loc("Демо-режим", "Demo rejim"),
        hint: loc("агентство и сотрудник для показа", "ko‘rsatish uchun agentlik va xodim"), value: user().name.split(" ")[0] },
    ] },
  ];

  return `
    ${head(t(loc("Администрирование", "Boshqaruv")),
      `<span>${t(loc("один вход во все настройки портала: воронки, каналы, права, тариф и домен",
        "portal sozlamalariga yagona kirish"))}</span>`,
      `<button class="btn btn-secondary" data-act="lock">${icon("lock", 14)} ${t(loc("Закрыть настройки", "Sozlamalarni yopish"))}</button>`)}

    ${groups.map((g) => `
      <div style="display:flex;gap:12px;align-items:flex-start;margin:0 0 14px">
        <span style="width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex:none;margin-top:2px;
          background:color-mix(in srgb, var(--accent) 10%, transparent);color:var(--accent)">${icon(g.icon, 16)}</span>
        <span style="min-width:0">
          <span class="t-headline" style="display:block">${esc(t(g.label))}</span>
          <span class="t-caption faint" style="display:block;margin-top:2px">${esc(t(g.hint))}</span>
        </span>
      </div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
        ${g.items.map((x) => `<a class="card card-hover" href="#" data-go="${x.go}" style="display:flex;gap:14px;align-items:center;padding:16px 18px">
          <span style="flex:1;min-width:0">
            <span class="t-body-sm" style="display:block">${esc(t(x.title))}</span>
            <span class="t-micro faint" style="display:block;margin-top:2px">${esc(t(x.hint))}</span>
          </span>
          <span class="t-caption num muted nowrap">${esc(x.value)}</span>
          ${icon("right", 15)}
        </a>`).join("")}
      </div>`).join("")}`;
}

/** Показ портала: выбор агентства и сотрудника — это настройка, а не шапка. */
function screenDemo() {
  const staff = D.users.filter((u) => u.tenantId === S.tenant);
  return `
    ${crumb("admin", t(loc("Администрирование", "Boshqaruv")), t(loc("Демо-режим", "Demo rejim")))}
    ${head(t(loc("Демо-режим", "Demo rejim")),
      `<span>${t(loc("агентство и сотрудник, от лица которого вы смотрите систему", "agentlik va siz kimning nomidan ko‘rayotganingiz"))}</span>`)}

    ${sectionTitle(t(loc("Агентство", "Agentlik")))}
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
      ${D.tenants.map((x) => `<button class="card card-hover" data-act="tenant" data-value="${esc(x.id)}"
        style="display:flex;gap:12px;align-items:center;padding:14px 16px;text-align:left;cursor:pointer;color:inherit;
        ${x.id === S.tenant ? "border-color:var(--accent)" : ""}">
        <span style="width:32px;height:32px;border-radius:8px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex:none">${esc(x.mark)}</span>
        <span style="min-width:0">
          <span class="t-body-sm truncate" style="display:block">${esc(x.name)}</span>
          <span class="t-micro faint truncate" style="display:block">${esc(x.slug)} · ${esc(x.edition === "mvp" ? "01 / MVP" : "02 / CRM")}</span>
        </span>
      </button>`).join("")}
    </div>

    ${sectionTitle(t(loc("Войти как сотрудник", "Xodim sifatida kirish")))}
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
      ${staff.map((u) => `<button class="card card-hover" data-act="user" data-value="${esc(u.id)}"
        style="display:flex;gap:12px;align-items:center;padding:14px 16px;text-align:left;cursor:pointer;color:inherit;
        ${u.id === S.userId ? "border-color:var(--accent)" : ""}">
        ${avatar(u.name, 32)}
        <span style="min-width:0;flex:1">
          <span class="t-body-sm truncate" style="display:block">${esc(u.name)}</span>
          <span class="t-micro faint truncate" style="display:block">${esc(roleName(roleById(u.role)))} · ${esc(u.title)}</span>
        </span>
      </button>`).join("")}
    </div>`;
}

/** Какие поля показывать на карточке канбана. */
function screenCards() {
  return `
    ${crumb("admin", t(loc("Администрирование", "Boshqaruv")), t(loc("Карточка просмотра", "Ko‘rish kartasi")))}
    ${head(t(loc("Карточка просмотра", "Ko‘rish kartasi")),
      `<span>${t(loc("какие поля показывать на карточке канбана и в каком порядке", "kanban kartasida qaysi maydonlar"))}</span>`)}
    <div class="card" style="max-width:520px;padding:0;overflow:hidden">
      ${CARD_FIELDS.map((f) => `<button data-act="togglefield" data-value="${esc(f.key)}"
        style="display:flex;gap:12px;align-items:center;width:100%;padding:12px 18px;border:0;border-top:1px solid var(--hairline-soft);
        background:none;cursor:pointer;color:inherit;text-align:left">
        ${checkbox(S.cardFields.includes(f.key))}<span class="t-body-sm" style="flex:1">${esc(t(f.label))}</span>
      </button>`).join("")}
    </div>`;
}
