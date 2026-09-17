/* ── задачи и проекты ────────────────────────────────────── */
const TASK_ORDER = ["todo", "in_progress", "review", "done"];

function screenTasks() {
  const all = scopedTasks();
  const list = all.filter((x) => {
    if (S.tasks.mine && x.assigneeId !== S.userId) return false;
    if (S.tasks.assignee !== "all" && x.assigneeId !== S.tasks.assignee) return false;
    return true;
  });
  return `
    ${head(t(loc("Задачи", "Vazifalar")),
      `<span>${list.filter((x) => x.status !== "done").length} ${t(loc("в работе", "ishda"))}</span><span class="faint">·</span>
       <a href="#" data-go="projects">${t(loc("Проекты", "Loyihalar"))}</a>
       <a href="#" data-go="taskreports">${t(loc("Отчёты", "Hisobotlar"))}</a>
       <a href="#" data-go="templates">${t(loc("Шаблоны", "Shablonlar"))}</a>`,
      allow(user().role, "tasks", "create") ? `<button class="btn btn-primary">${icon("plus", 15)} ${t(loc("Новая задача", "Yangi vazifa"))}</button>` : "")}

    <div class="toolbar">
      <button class="chip${S.tasks.mine ? " on" : ""}" data-act="tasks.mine">${t(loc("Только мои", "Faqat meniki"))}</button>
      ${select("tasks.assignee", S.tasks.assignee, [{ value: "all", label: t(loc("Все исполнители", "Barcha ijrochilar")) },
        ...scopedTeam().map((u) => ({ value: u.id, label: u.name }))], 190)}
      <span class="t-micro faint" style="margin-left:auto">
        ${list.filter((x) => x.status !== "done" && isPast(x.dueAt)).length} ${t(loc("просрочено", "kechikkan"))}
      </span>
    </div>

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(250px,1fr));align-items:start">
      ${TASK_ORDER.map((status) => {
        const meta = L.taskStatus[status];
        const col = list.filter((x) => x.status === status);
        return `<section>
          <div class="col-head">${dot(meta.dot)}<span class="t-caption" style="flex:1">${esc(t(meta.label))}</span><span class="t-micro num faint">${col.length}</span></div>
          <div class="grid" style="gap:10px">
            ${col.map((x) => `<article class="card card-hover" style="padding:14px">
              <div class="t-body-sm">${esc(x.title)}</div>
              <p class="t-micro muted" style="margin:6px 0 0;line-height:1.5">${esc(x.description)}</p>
              <div class="t-micro faint" style="display:flex;gap:8px;align-items:center;margin-top:12px">
                ${avatar(userById(x.assigneeId)?.name ?? "—", 20)}
                <span class="truncate" style="flex:1;min-width:0">${esc(userById(x.assigneeId)?.name ?? "—")}</span>
                <span class="nowrap" style="color:${x.status !== "done" && isPast(x.dueAt) ? "var(--risk)" : "inherit"}">${esc(fmtShort(x.dueAt))}</span>
              </div>
            </article>`).join("") || `<div class="empty-col">${t(loc("Пусто", "Bo‘sh"))}</div>`}
          </div>
        </section>`;
      }).join("")}
    </div>`;
}

function screenProjects() {
  const projects = scopedProjects();
  const tasks = scopedTasks();
  const STATUS = {
    active: { label: loc("Активен", "Faol"), dot: "var(--accent)" },
    done: { label: loc("Завершён", "Yakunlangan"), dot: "var(--deal)" },
    paused: { label: loc("На паузе", "To‘xtatilgan"), dot: "var(--hold)" },
  };
  return `
    ${head(t(loc("Проекты", "Loyihalar")),
      `<span>${plural(projects.length, ["проект", "проекта", "проектов"], "loyiha")}</span><span class="faint">·</span>
       <a href="#" data-go="tasks">${t(loc("Задачи", "Vazifalar"))}</a>`)}
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
      ${projects.map((p) => {
        const mine = tasks.filter((x) => x.projectId === p.id);
        const done = mine.filter((x) => x.status === "done").length;
        const late = mine.filter((x) => x.status !== "done" && isPast(x.dueAt)).length;
        const st = STATUS[p.status];
        return `<article class="card" style="padding:18px">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
            <h2 class="t-headline" style="min-width:0">${esc(t(p.name))}</h2>
            <span class="chip">${dot(st.dot)}${esc(t(st.label))}</span>
          </div>
          <p class="t-caption muted" style="margin:10px 0 0;line-height:1.5">${esc(p.description)}</p>
          <div style="margin-top:14px">
            <div class="t-micro faint" style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span>${done} / ${mine.length} ${t(loc("выполнено", "bajarilgan"))}</span>
              ${late ? `<span style="color:var(--risk)">${late} ${t(loc("просрочено", "kechikkan"))}</span>` : ""}
            </div>
            ${bar(mine.length ? (done / mine.length) * 100 : 0)}
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:14px">
            ${chip(userById(p.leadId)?.name ?? "—", null, true)}
            ${p.memberIds.slice(0, 4).map((m) => chip(userById(m)?.name.split(" ")[0] ?? "—")).join("")}
          </div>
          <div class="t-micro faint" style="margin-top:14px">${t(loc("Срок", "Muddat"))}: ${esc(fmtDate(p.dueAt))} · ${esc(relDeadline(p.dueAt))}</div>
        </article>`;
      }).join("")}
    </div>`;
}

function screenTaskReports() {
  const tasks = scopedTasks();
  const team = scopedTeam();
  const open = tasks.filter((x) => x.status !== "done");
  const overdue = open.filter((x) => isPast(x.dueAt));
  const week = open.filter((x) => isSoon(x.dueAt, 7));
  const rows = team.map((u) => {
    const mine = tasks.filter((x) => x.assigneeId === u.id);
    return {
      u, total: mine.length,
      open: mine.filter((x) => x.status !== "done").length,
      late: mine.filter((x) => x.status !== "done" && isPast(x.dueAt)).length,
    };
  }).filter((r) => r.total).sort((a, b) => b.open - a.open);
  const max = Math.max(1, ...rows.map((r) => r.open));

  return `
    ${head(t(loc("Отчёты по задачам", "Vazifalar hisoboti")),
      `<span>${plural(tasks.length, ["задача", "задачи", "задач"], "vazifa")}</span><span class="faint">·</span>
       <a href="#" data-go="tasks">${t(loc("Задачи", "Vazifalar"))}</a>
       <a href="#" data-go="projects">${t(loc("Проекты", "Loyihalar"))}</a>`)}
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(210px,1fr))">
      ${tile(t(loc("В работе", "Ishda")), String(open.length), `${tasks.length - open.length} ${t(loc("выполнено", "bajarilgan"))}`, "var(--accent)")}
      ${tile(t(loc("Просрочено", "Kechikkan")), String(overdue.length), overdue[0] ? relDeadline(overdue[0].dueAt) : t(loc("всё спокойно", "hammasi joyida")), "var(--risk)")}
      ${tile(t(loc("На неделе", "Shu haftada")), String(week.length), t(loc("сроки ближайших 7 дней", "yaqin 7 kun muddatlari")), "var(--progress)")}
      ${tile(t(loc("Проекты", "Loyihalar")), String(scopedProjects().filter((p) => p.status === "active").length), t(loc("активных", "faol")), "var(--violet)")}
    </div>

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));margin-top:30px;align-items:start">
      <div class="card" style="padding:18px">
        <h2 class="t-headline" style="margin:0 0 14px">${t(loc("Загрузка сотрудников", "Xodimlar yuklamasi"))}</h2>
        ${rows.map((r) => `<a class="row" href="#" data-go="employee/${esc(r.u.id)}" style="padding:8px 0">
          ${avatar(r.u.name, 26)}
          <span style="flex:1;min-width:0">
            <span class="t-caption truncate" style="display:block">${esc(r.u.name)}</span>
            <span style="display:block;margin-top:6px">${bar((r.open / max) * 100, r.late ? "var(--risk)" : "var(--ink)")}</span>
          </span>
          <span class="t-caption num nowrap">${r.open}${r.late ? ` <span style="color:var(--risk)">· ${r.late}</span>` : ""}</span>
        </a>`).join("")}
      </div>
      <div class="card" style="padding:18px">
        <h2 class="t-headline" style="margin:0 0 14px">${t(loc("По статусам", "Holatlar bo‘yicha"))}</h2>
        ${TASK_ORDER.map((status) => {
          const count = tasks.filter((x) => x.status === status).length;
          const meta = L.taskStatus[status];
          return `<div style="margin-bottom:12px">
            <div class="t-caption" style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="display:flex;gap:8px;align-items:center">${dot(meta.dot)}${esc(t(meta.label))}</span>
              <span class="num muted">${count}</span>
            </div>
            ${bar(tasks.length ? (count / tasks.length) * 100 : 0, meta.dot)}
          </div>`;
        }).join("")}
      </div>
    </div>`;
}

function screenTemplates() {
  const templates = D.templates.filter((x) => x.tenantId === S.tenant);
  return `
    ${head(t(loc("Шаблоны задач", "Vazifa shablonlari")),
      `<span>${plural(templates.length, ["шаблон", "шаблона", "шаблонов"], "shablon")}</span><span class="faint">·</span>
       <a href="#" data-go="tasks">${t(loc("Задачи", "Vazifalar"))}</a>`)}
    ${templates.length ? `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
      ${templates.map((x) => `<article class="card" style="padding:18px">
        <h2 class="t-headline">${esc(t(x.title))}</h2>
        <p class="t-caption muted" style="margin:10px 0 0;line-height:1.5">${esc(t(x.description))}</p>
        <div class="t-micro faint" style="margin-top:14px;text-transform:uppercase;letter-spacing:.07em">
          ${t(loc("Чек-лист", "Ro‘yxat"))} · ${x.checklist.length}
        </div>
        <ul style="list-style:none;margin:8px 0 0;padding:0">
          ${x.checklist.map((item) => `<li class="t-caption muted" style="display:flex;gap:8px;align-items:flex-start;padding:3px 0">
            <span class="faint" style="margin-top:2px">${icon("tick", 11)}</span>${esc(t(item))}
          </li>`).join("")}
        </ul>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:14px">
          ${chip(t(roleDef(x.defaultAssigneeRole).label))}
          <button class="btn btn-secondary">${t(loc("Создать по шаблону", "Shablon bo‘yicha yaratish"))}</button>
        </div>
      </article>`).join("")}
    </div>` : emptyCard(t(loc("Пусто", "Bo‘sh")))}`;
}
