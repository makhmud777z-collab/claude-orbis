/* ── задачи и проекты ────────────────────────────────────── */
const TASK_ORDER = ["todo", "in_progress", "review", "done"];

const taskRow = (x) => ({
  search: `${x.title} ${x.description}`,
  status: x.status, assigneeId: x.assigneeId, priority: x.priority, projectId: x.projectId,
});

function screenTasks() {
  const all = scopedTasks();
  const fields = taskFields();
  const st = filterState("tasks");
  const list = all.filter((x) => matchesFilter(taskRow(x), fields, st.values, st.q));
  const projects = scopedProjects();

  return `
    ${head(t(loc("Задачи", "Vazifalar")),
      `<span>${list.filter((x) => taskStatusOf(x) !== "done").length} ${t(loc("в работе", "ishda"))}</span><span class="faint">·</span>
       <span>${list.filter((x) => taskStatusOf(x) !== "done" && isPast(x.dueAt)).length} ${t(loc("просрочено", "kechikkan"))}</span><span class="faint">·</span>
       <a href="#" data-go="projects">${t(loc("Проекты", "Loyihalar"))}</a>
       <a href="#" data-go="taskreports">${t(loc("Отчёты", "Hisobotlar"))}</a>`,
      `${viewSwitch("tasks")}
       ${viewOf("tasks") === "list" ? listColumnsPicker("tasks") : ""}
       ${allow(user().role, "tasks", "create")
        ? `<button class="btn btn-primary" data-act="newtask">${icon("plus", 15)} ${t(loc("Новая задача", "Yangi vazifa"))}</button>`
        : ""}`)}

    ${smartFilter("tasks", fields, taskPresets(), { shown: list.length, total: all.length })}

    ${viewOf("tasks") === "list" ? recordList("tasks", list.map((x) => {
      const status = L.taskStatus[taskStatusOf(x)];
      const overdue = taskStatusOf(x) !== "done" && isPast(x.dueAt);
      const project = projects.find((p) => p.id === x.projectId);
      return {
        // Своей страницы у задачи нет: ведём туда, из-за чего она появилась.
        go: x.relation?.type === "deal" ? "deal/" + x.relation.id
          : x.relation?.type === "student" ? "contact/" + x.relation.id : null,
        title: x.title,
        subtitle: x.relation?.type === "student" ? (studentById(x.relation.id)?.fullName ?? "")
          : x.relation?.type === "deal" ? `${t(loc("Сделка", "Bitim"))} ${x.relation.id.toUpperCase()}`
          : x.description,
        flag: overdue ? "var(--risk)" : x.priority === "high" ? "var(--progress)" : null,
        cells: {
          status: cellTag(t(status.label), status.dot),
          assignee: cellPerson(userById(x.assigneeId)?.name ?? "—"),
          due: cellNum(fmtShort(x.dueAt), relDeadline(x.dueAt), overdue ? "var(--risk)" : null),
          priority: cellText(t(ref(L.priority, x.priority))),
          project: project ? cellText(t(project.name)) : "",
          creator: cellPerson(userById(x.creatorId)?.name ?? "—"),
        },
      };
    })) : `
    ${board(
      allow(user().role, "tasks", "edit")
        ? t(loc("Перетащите задачу в другой столбец, чтобы сменить статус", "Holatni o‘zgartirish uchun vazifani boshqa ustunga torting"))
        : null,
      TASK_ORDER.map((status) => {
        const meta = L.taskStatus[status];
        const col = list.filter((x) => taskStatusOf(x) === status);
        const movable = allow(user().role, "tasks", "edit");
        return boardColumn({
          color: meta.dot,
          title: t(meta.label),
          count: col.length,
          drop: movable ? status : null,
          entity: "task",
          empty: t(loc("Пусто", "Bo‘sh")),
          cards: col.map((x) => {
            const overdue = taskStatusOf(x) !== "done" && isPast(x.dueAt);
            const flag = overdue ? "var(--risk)" : x.priority === "high" ? "var(--progress)" : null;
            return `<article class="card card-hover kan-card" style="cursor:${movable ? "grab" : "default"}"
                ${movable ? `draggable="true" data-drag="${esc(x.id)}" data-entity="task" data-pos="${list.indexOf(x)}"` : ""}>
              ${flag ? `<span class="kan-flag" style="background:${flag}"></span>` : ""}
              <div style="padding-left:${flag ? "8px" : "0"}">
                <div class="t-body-sm" style="font-weight:600">${esc(x.title)}</div>
                ${x.description ? `<p class="t-micro faint" style="margin:6px 0 0;line-height:1.5">${esc(x.description)}</p>` : ""}
                <div class="t-micro" style="display:flex;gap:8px;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid var(--hairline-soft)">
                  ${avatar(userById(x.assigneeId)?.name ?? "—", 20)}
                  <span class="truncate faint" style="flex:1;min-width:0">${esc(userById(x.assigneeId)?.name ?? "—")}</span>
                  <span class="nowrap" style="color:${overdue ? "var(--risk)" : "var(--ink-faint)"};font-weight:${overdue ? 600 : 400}">${esc(fmtShort(x.dueAt))}</span>
                </div>
              </div>
            </article>`;
          }),
        });
      }),
    )}`}`;
}

const PROJECT_ORDER = ["active", "paused", "done"];
const PROJECT_STATUS = {
  active: { label: loc("Активен", "Faol"), dot: "var(--color-status-open)" },
  paused: { label: loc("На паузе", "To‘xtatilgan"), dot: "var(--hold)" },
  done: { label: loc("Завершён", "Yakunlangan"), dot: "var(--deal)" },
};

/**
 * Проекты. Доской их ведут, списком проверяют — как и всё остальное в
 * портале. Раньше здесь была сетка карточек, и статус проекта нельзя было
 * сменить с экрана вовсе; теперь проект переносят рукой между столбцами.
 */
function screenProjects() {
  const projects = scopedProjects();
  const tasks = scopedTasks();
  const movable = allow(user().role, "projects", "edit");
  const counts = (p) => {
    const mine = tasks.filter((x) => x.projectId === p.id);
    return {
      total: mine.length,
      done: mine.filter((x) => taskStatusOf(x) === "done").length,
      late: mine.filter((x) => taskStatusOf(x) !== "done" && isPast(x.dueAt)).length,
    };
  };

  return `
    ${head(t(loc("Проекты", "Loyihalar")),
      `<span>${plural(projects.length, ["проект", "проекта", "проектов"], "loyiha")}</span><span class="faint">·</span>
       <a href="#" data-go="tasks">${t(loc("Задачи", "Vazifalar"))}</a>`,
      `${viewSwitch("projects")}
       ${viewOf("projects") === "list" ? listColumnsPicker("projects") : ""}`)}

    ${viewOf("projects") === "list" ? recordList("projects", projects.map((p) => {
      const c = counts(p);
      const meta = PROJECT_STATUS[projectStatusOf(p)];
      return {
        title: t(p.name), subtitle: p.description,
        flag: c.late ? "var(--risk)" : null,
        cells: {
          status: cellTag(t(meta.label), meta.dot),
          lead: cellPerson(userById(p.leadId)?.name ?? "—"),
          due: cellNum(fmtDate(p.dueAt), relDeadline(p.dueAt)),
          progress: cellBar(c.total ? (c.done / c.total) * 100 : 0,
            `${c.done} / ${c.total} ${t(loc("выполнено", "bajarilgan"))}`),
          members: cellPeople(p.memberIds.map((m) => userById(m)?.name).filter(Boolean)),
        },
      };
    })) : `
    ${board(
      movable ? t(loc("Перетащите проект в другой столбец, чтобы сменить статус", "Holatni o‘zgartirish uchun loyihani boshqa ustunga torting")) : null,
      PROJECT_ORDER.map((status) => {
        const meta = PROJECT_STATUS[status];
        const col = projects.filter((p) => projectStatusOf(p) === status);
        return boardColumn({
          color: meta.dot,
          title: t(meta.label),
          count: col.length,
          drop: movable ? status : null,
          entity: "project",
          empty: t(loc("Пусто", "Bo‘sh")),
          cards: col.map((p) => {
            const c = counts(p);
            return `<article class="card card-hover kan-card" style="cursor:${movable ? "grab" : "default"}"
                ${movable ? `draggable="true" data-drag="${esc(p.id)}" data-entity="project" data-pos="${projects.indexOf(p)}"` : ""}>
              <div class="t-body-sm" style="font-weight:600">${esc(t(p.name))}</div>
              <p class="t-micro faint" style="margin:6px 0 0;line-height:1.5">${esc(p.description)}</p>
              <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--hairline-soft)">
                <div class="t-micro faint" style="display:flex;justify-content:space-between;margin-bottom:6px">
                  <span>${c.done} / ${c.total} ${t(loc("выполнено", "bajarilgan"))}</span>
                  ${c.late ? `<span style="color:var(--risk)">${c.late} ${t(loc("просрочено", "kechikkan"))}</span>` : ""}
                </div>
                ${bar(c.total ? (c.done / c.total) * 100 : 0)}
              </div>
              <div class="t-micro" style="display:flex;gap:8px;align-items:center;margin-top:10px">
                ${avatar(userById(p.leadId)?.name ?? "—", 20)}
                <span class="truncate faint" style="flex:1;min-width:0">${esc(userById(p.leadId)?.name ?? "—")}</span>
                <span class="nowrap faint">${esc(relDeadline(p.dueAt))}</span>
              </div>
            </article>`;
          }),
        });
      }),
    )}`}`;
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


/* ── календарь ───────────────────────────────────────────── */
const DOW = [loc("Пн", "Du"), loc("Вт", "Se"), loc("Ср", "Ch"), loc("Чт", "Pa"), loc("Пт", "Ju"), loc("Сб", "Sh"), loc("Вс", "Ya")];
const HOUR_PX = 52;
// Сетка дня — полные сутки, как в приложении: встреча в 6:30 и линия
// текущего времени ночью должны находить своё место, а не пропадать.
const DAY_START = 0;
const DAY_END = 23;

const itemColor = (x) => (x.source === "deadline" ? "var(--progress)" : EVENT_KIND[x.kind]?.color ?? "var(--accent)");

/** Красная линия настоящего времени — то, ради чего в календарь и заходят. */
function nowLine() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const top = ((minutes - DAY_START * 60) / 60) * HOUR_PX;
  const label = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return `<div class="now-line" data-now style="top:${top}px"><span class="now-badge">${label}</span></div>`;
}

function hourGrid(isoDate) {
  const items = itemsOn(isoDate);
  const hours = [];
  for (let h = DAY_START; h <= DAY_END; h++) hours.push(h);
  return `<div class="card" style="padding:0;overflow:hidden">
    <div class="card-head" style="display:flex;align-items:center;gap:10px">
      <span class="t-caption">${esc(fmtDate(isoDate))}</span>
      <span class="t-micro faint">${plural(items.length, ["дело", "дела", "дел"], "ish")}</span>
    </div>
    <div style="position:relative;overflow-y:auto;max-height:560px" data-scroll="day">
      <div class="hours" style="position:relative">
        <div>${hours.map((h) => `<div class="hour-label">${String(h).padStart(2, "0")}:00</div>`).join("")}</div>
        <div style="position:relative">
          ${hours.map(() => `<div class="hour-slot"></div>`).join("")}
          ${items.map((x) => {
            const from = Math.max(minutesOf(x.startTime), DAY_START * 60);
            const to = Math.max(minutesOf(x.endTime), from + 30);
            const top = ((from - DAY_START * 60) / 60) * HOUR_PX;
            const height = Math.max(24, ((to - from) / 60) * HOUR_PX - 4);
            const color = itemColor(x);
            return `<div class="ev-card" style="top:${top}px;height:${height}px;border-left-color:${color};background:color-mix(in srgb, ${color} 12%, var(--surface-1))">
              <span class="t-micro" style="font-weight:600">${esc(x.title)}</span>
              <span class="t-micro faint" style="display:block">${esc(x.startTime)}–${esc(x.endTime)}${x.relation ? " · " + esc(x.relation) : ""}</span>
            </div>`;
          }).join("")}
        </div>
      </div>
      ${nowLine()}
    </div>
  </div>`;
}

function monthGrid(isoDate) {
  const anchor = parseDate(isoDate);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = parseDate(weekStart(iso(first)));
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(iso(d));
  }
  return `<div class="cal-month">
    ${DOW.map((d) => `<div class="cal-dow">${esc(t(d))}</div>`).join("")}
    ${cells.map((day) => {
      const items = itemsOn(day);
      const out = parseDate(day).getMonth() !== anchor.getMonth();
      return `<button class="cal-day${out ? " out" : ""}${day === TODAY_ISO ? " today" : ""}" data-act="cal.day" data-value="${day}">
        <span class="cal-num">${parseDate(day).getDate()}</span>
        ${items.slice(0, 3).map((x) => `<span class="cal-ev">${dot(itemColor(x))}${esc(x.startTime)} ${esc(x.title)}</span>`).join("")}
        ${items.length > 3 ? `<span class="t-micro faint">+${items.length - 3}</span>` : ""}
      </button>`;
    }).join("")}
  </div>`;
}

function weekGrid(isoDate) {
  const start = weekStart(isoDate);
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
  return `<div class="grid" style="grid-template-columns:repeat(7,minmax(0,1fr));gap:10px">
    ${days.map((day) => {
      const items = itemsOn(day);
      return `<section class="card" style="padding:0;min-width:0">
        <button class="card-head" style="width:100%;border:0;cursor:pointer;color:inherit;text-align:left;display:flex;gap:8px;align-items:center"
          data-act="cal.day" data-value="${day}">
          <span class="t-micro faint">${esc(t(DOW[(parseDate(day).getDay() + 6) % 7]))}</span>
          <span class="cal-num" style="${day === TODAY_ISO ? "background:var(--accent);color:#fff;font-weight:600" : ""}">${parseDate(day).getDate()}</span>
        </button>
        <div style="padding:10px;display:grid;gap:6px">
          ${items.length ? items.map((x) => `<span class="t-micro truncate" style="display:flex;gap:6px;align-items:center">
            ${dot(itemColor(x))}<span class="num">${esc(x.startTime)}</span>
            <span class="truncate" style="min-width:0">${esc(x.title)}</span></span>`).join("")
            : `<span class="t-micro faint">—</span>`}
        </div>
      </section>`;
    }).join("")}
  </div>`;
}

function screenCalendar() {
  const view = S.cal.view;
  const date = S.cal.date;
  const views = [["month", loc("Месяц", "Oy")], ["week", loc("Неделя", "Hafta")], ["day", loc("День", "Kun")]];
  const step = view === "month" ? 30 : view === "week" ? 7 : 1;
  const title = view === "day" ? fmtDate(date) : `${t(loc("Месяц", "Oy"))} · ${esc(fmtShort(date))}`;

  return `
    ${head(t(loc("Календарь", "Kalendar")),
      `<span>${t(loc("свои встречи и сроки из других разделов — в одной сетке", "o‘z uchrashuvlari va boshqa bo‘limlardagi muddatlar"))}</span>`,
      `<button class="btn btn-primary" data-act="cal.new">${icon("plus", 15)} ${t(loc("Добавить дело", "Ish qo‘shish"))}</button>`)}

    <div class="toolbar">
      <button class="btn btn-secondary" data-act="cal.shift" data-value="${-step}">${t(loc("Назад", "Orqaga"))}</button>
      <button class="btn btn-secondary" data-act="cal.today">${t(loc("Сегодня", "Bugun"))}</button>
      <button class="btn btn-secondary" data-act="cal.shift" data-value="${step}">${t(loc("Вперёд", "Oldinga"))}</button>
      <span class="t-body-sm" style="margin-left:6px">${esc(title)}</span>
      <span style="margin-left:auto;display:flex;gap:6px">
        ${views.map(([key, label]) => `<button class="chip${view === key ? " on" : ""}" data-act="cal.view" data-value="${key}">${esc(t(label))}</button>`).join("")}
      </span>
    </div>

    ${view === "month" ? monthGrid(date) : view === "week" ? weekGrid(date) : hourGrid(date)}

    ${view === "day" ? "" : `<p class="t-micro faint" style="margin-top:12px">${t(loc(
      "Нажмите на число — откроется разбивка по часам с красной линией текущего времени.",
      "Sanani bosing — soatlar bo‘yicha kesim va joriy vaqt chizig‘i ochiladi."))}</p>`}`;
}
