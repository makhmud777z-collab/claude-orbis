/* ── сотрудники, структура, отчётность ───────────────────── */
function screenTeam() {
  const team = scopedTeam();
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

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
      ${team.map((u) => {
        const role = roleDef(u.role);
        const w = workOf(u.id);
        const dep = D.departments.find((d) => d.id === D.departmentOf[u.id]);
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
            ${chip(t(role.label), null, true)}${dep ? chip(t(dep.name)) : ""}
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
  const role = roleDef(u.role);
  const dep = D.departments.find((d) => d.id === D.departmentOf[u.id]);
  const branch = tenant().branches.find((b) => b.id === u.branchId);
  const sessions = D.sessions.filter((s) => s.userId === u.id).sort((a, b) => b.date.localeCompare(a.date));
  const minutes = sessions.reduce((n, s) => n + sessionMinutes(s), 0);
  const tasks = scopedTasks().filter((x) => x.assigneeId === u.id);

  return `
    ${crumb("team", t(loc("Сотрудники", "Xodimlar")), u.name)}
    ${head(u.name,
      `<span>${esc(u.title)}</span><span class="faint">·</span>
       <span class="chip on">${esc(t(role.label))}</span>
       <span>${esc(branch ? t(ref(L.city, branch.city)) : "—")}</span>`,
      `<a class="btn btn-secondary" href="tel:${esc(u.phone)}">${icon("phone", 15)} ${t(loc("Позвонить", "Qo‘ng‘iroq"))}</a>
       <a class="btn btn-secondary" href="mailto:${esc(u.email)}">${icon("mail", 15)} ${t(loc("Написать", "Yozish"))}</a>`)}

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

function screenStructure() {
  const team = scopedTeam();
  const departments = D.departments.filter((d) => d.tenantId === S.tenant);
  const members = (id) => team.filter((u) => D.departmentOf[u.id] === id);

  const node = (dep, depth) => {
    const head2 = dep.headId ? userById(dep.headId) : null;
    const list = members(dep.id);
    const children = departments.filter((d) => d.parentId === dep.id);
    return `<div style="margin-left:${depth ? 20 : 0}px">
      <section class="card" style="padding:18px;${depth ? "border-left:2px solid var(--hairline)" : ""}">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
          <div>
            <h2 class="t-headline">${esc(t(dep.name))}</h2>
            <div class="t-micro faint" style="margin-top:4px">${plural(list.length, ["сотрудник", "сотрудника", "сотрудников"], "xodim")}</div>
          </div>
          ${head2 ? `<a href="#" data-go="employee/${esc(head2.id)}" style="display:flex;gap:10px;align-items:center">
            ${avatar(head2.name, 28)}
            <span><span class="t-caption" style="display:block">${esc(head2.name)}</span>
            <span class="t-micro faint">${t(loc("Руководитель", "Rahbar"))}</span></span>
          </a>` : ""}
        </div>
        ${list.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
          ${list.map((m) => `<a href="#" data-go="employee/${esc(m.id)}">
            <span class="chip${m.id === dep.headId ? " on" : ""}">${avatar(m.name, 18)}${esc(m.name)}</span></a>`).join("")}
        </div>` : ""}
      </section>
      ${children.length ? `<div class="grid" style="gap:12px;margin-top:12px">${children.map((c) => node(c, depth + 1)).join("")}</div>` : ""}
    </div>`;
  };

  return `
    ${head(t(loc("Структура компании", "Kompaniya tuzilmasi")),
      `<span>${t(loc("подразделения и руководители", "bo‘limlar va rahbarlar"))}</span>`)}
    <div class="grid" style="gap:12px">${departments.filter((d) => !d.parentId).map((d) => node(d, 0)).join("")}</div>`;
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
  const scopeOf = (s) => t(s === "tenant" ? loc("всё агентство", "butun agentlik") : s === "branch" ? loc("свой филиал", "o‘z filiali") : loc("только свои записи", "faqat o‘z yozuvlari"));
  const STATUS_LABEL = { active: loc("активен", "faol"), invited: loc("приглашён", "taklif qilingan"), suspended: loc("заблокирован", "bloklangan") };
  const STATUS_DOT = { active: "var(--deal)", invited: "var(--progress)", suspended: "var(--hold)" };

  return `
    ${head(t(loc("Пользователи", "Foydalanuvchilar")),
      `<span>${tenant().seatsUsed} ${t(loc("из", "dan"))} ${tenant().seatsLimit} ${t(loc("мест по тарифу", "tarif bo‘yicha o‘rin"))}</span><span class="faint">·</span>
       <a href="#" data-go="permissions">${t(loc("Права доступа", "Kirish huquqlari"))}</a>`,
      canEdit ? `<button class="btn btn-primary">${icon("plus", 15)} ${t(loc("Пригласить", "Taklif qilish"))}</button>` : "")}
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
                ? select("role:" + u.id, u.role, D.roles.map((r) => ({ value: r.key, label: t(r.label), hint: scopeOf(r.scope) })), 200)
                : `<span class="t-caption">${esc(t(roleDef(u.role).label))}</span>`}</td>
              <td class="t-caption muted">${esc(scopeOf(roleDef(u.role).scope))}</td>
              <td><span class="chip">${dot(STATUS_DOT[u.status])}${esc(t(STATUS_LABEL[u.status]))}</span></td>
              <td class="t-caption num nowrap">${esc(fmtDate(u.joinedAt))}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
}

const ACTIONS_LIST = ["view", "create", "edit", "delete", "export", "assign"];

function screenPermissions() {
  const modules = editionModules(tenant().edition);
  const canEdit = allow(user().role, "admin", "edit");
  const level = (role, module) => {
    const list = effective(role)[module] ?? [];
    if (!list.length) return { text: "—", tone: "var(--hairline)" };
    if (list.includes("delete")) return { text: t(loc("полный", "to‘liq")), tone: "var(--ink)" };
    if (list.includes("edit")) return { text: t(loc("правка", "tahrir")), tone: "var(--ink-muted)" };
    return { text: t(loc("чтение", "o‘qish")), tone: "var(--ink-faint)" };
  };

  return `
    ${head(t(loc("Права доступа", "Kirish huquqlari")),
      `<span>${t(loc("Роли и разделы", "Rollar va bo‘limlar"))}: ${D.roles.length} × ${modules.length}</span><span class="faint">·</span>
       <a href="#" data-go="users">${t(loc("Пользователи", "Foydalanuvchilar"))}</a>`)}
    <div class="banner" style="margin-bottom:20px">
      ${dot("var(--accent)")}
      <span class="t-caption">${t(loc(
        "Матрица прав редактируется прямо здесь: изменения сразу влияют на меню и данные сотрудников.",
        "Huquqlar matritsasi shu yerda tahrirlanadi: o‘zgarishlar darhol menyuga ta’sir qiladi."))}</span>
    </div>
    <div class="card scroll-x">
      <table style="min-width:1080px">
        <thead><tr>
          <th style="position:sticky;left:0;background:var(--surface-1)">${t(loc("Роль", "Rol"))}</th>
          ${modules.map((m) => `<th style="text-align:center">${esc(t(L.module[m]))}</th>`).join("")}
        </tr></thead>
        <tbody>
          ${D.roles.map((r) => `<tr>
            <td style="position:sticky;left:0;background:var(--surface-1)">
              <div class="t-body-sm">${esc(t(r.label))}</div>
              <div class="t-micro faint" style="max-width:240px">${esc(t(r.description))}</div>
            </td>
            ${modules.map((m) => {
              const st = level(r.key, m);
              return `<td style="text-align:center">
                <button class="t-micro" style="background:none;border:0;padding:6px 8px;border-radius:7px;color:${st.tone};cursor:${canEdit ? "pointer" : "default"}"
                  ${canEdit ? `data-act="perm" data-value="${esc(r.key)}:${esc(m)}"` : ""}>${esc(st.text)}</button>
              </td>`;
            }).join("")}
          </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}
