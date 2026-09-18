/* ── экраны: дашборд и CRM ───────────────────────────────── */

function screenDashboard() {
  const contacts = scopedContacts();
  const deals = scopedDeals();
  const dls = scopedDeadlines();
  const active = contacts.filter((s) => s.status === "active").length;
  const pipeline = deals.filter((d) => !["departed", "lost"].includes(currentStage(d)));
  const overdue = dls.filter((d) => isPast(d.date));
  const soon = dls.filter((d) => isSoon(d.date, 7));
  const contracted = pipeline.reduce((n, d) => n + d.contractValue, 0);
  const collected = pipeline.reduce((n, d) => n + d.paid, 0);
  const board = stagesOf(defaultPipeline("deal")).filter((s) => !s.final);
  const max = Math.max(1, ...board.map((s) => deals.filter((d) => currentStage(d) === s.key).length));
  const myTasks = scopedTasks().filter((x) => x.status !== "done").sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 5);

  return `
    ${head(`${t(loc("Добрый день", "Xayrli kun"))}, ${user().name.split(" ")[0]}`,
      `<span>${esc(tenant().name)}</span><span class="faint">·</span>
       <span>${t(loc("16 сентября 2026, среда", "2026-yil 16-sentabr, chorshanba"))}</span><span class="faint">·</span>
       <span>${plural(pipeline.length, ["сделка", "сделки", "сделок"], "bitim")} ${t(loc("в работе", "ishda"))} · ${plural(soon.length, ["дедлайн", "дедлайна", "дедлайнов"], "muddat")} ${t(loc("на неделе", "shu haftada"))}</span>`,
      `<button class="btn btn-primary" data-go="leads">${icon("plus", 15)} ${t(loc("Новый лид", "Yangi lid"))}</button>`)}

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(210px,1fr))">
      ${tile(t(loc("Контакты в работе", "Ishdagi kontaktlar")), String(active), `${t(loc("всего в базе", "bazada jami"))} ${contacts.length}`, "var(--accent)")}
      ${tile(t(loc("Сделки в воронке", "Voronkadagi bitimlar")), String(pipeline.length),
        `${deals.filter((d) => currentStage(d) === "offer").length} ${t(loc("с offer", "offer bilan"))} · ${deals.filter((d) => currentStage(d) === "visa").length} ${t(loc("на визе", "vizada"))}`, "var(--violet)")}
      ${tile(t(loc("Дедлайны ≤ 7 дней", "Muddatlar ≤ 7 kun")), String(soon.length),
        overdue.length ? `${overdue.length} ${t(loc("просрочено", "kechikkan"))}` : soon[0] ? `${t(loc("ближайший", "eng yaqini"))} — ${fmtShort(soon[0].date)}` : t(loc("всё спокойно", "hammasi joyida")), "var(--progress)")}
      ${tile(t(loc("Законтрактовано", "Shartnomalar summasi")), som(contracted, true),
        `${t(loc("оплачено", "to‘langan"))} ${som(collected, true)} · ${Math.round((collected / Math.max(1, contracted)) * 100)}%`, "var(--deal)")}
    </div>

    <section style="margin-top:34px">
      ${sectionTitle(t(loc("Воронка сделок", "Bitimlar voronkasi")),
        `<button class="t-caption muted" style="background:none;border:0;cursor:pointer" data-go="deals">${t(loc("Открыть доску", "Doskani ochish"))} ${icon("arrow", 12)}</button>`)}
      <div class="card grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:0">
        ${board.map((s, i) => {
          const count = deals.filter((d) => currentStage(d) === s.key).length;
          return `<button data-go="deals" style="background:none;border:0;border-right:${i < board.length - 1 ? "1px solid var(--hairline-soft)" : "0"};text-align:left;padding:18px;cursor:pointer;color:inherit">
            <span class="t-micro muted nowrap" style="display:flex;align-items:center;gap:8px">${dot(s.color)}${esc(t(s.label))}</span>
            <span class="num" style="display:block;font-size:24px;font-weight:500;letter-spacing:-1.1px;margin:10px 0">${count}</span>
            ${bar((count / max) * 100, s.color)}
          </button>`;
        }).join("")}
      </div>
    </section>

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));margin-top:34px;align-items:start">
      <section>
        ${sectionTitle(t(loc("Ближайшие дедлайны", "Eng yaqin muddatlar")),
          `<button class="t-caption muted" style="background:none;border:0;cursor:pointer" data-go="deadlines">${t(loc("Все дедлайны", "Barcha muddatlar"))}</button>`)}
        <div class="card divide">
          ${dls.slice(0, 6).map((d) => {
            const k = L.deadlineKind[d.kind];
            return `<a class="row" href="#" data-go="${esc(d.go)}">
              ${dot(k.dot)}
              <span style="flex:1;min-width:0">
                <span class="t-body-sm truncate" style="display:block">${esc(t(d.title))}</span>
                <span class="t-micro faint">${esc(t(k.label))} · ${esc(userById(d.ownerId)?.name ?? "—")}</span>
              </span>
              <span style="text-align:right">
                <span class="t-caption num" style="display:block">${esc(fmtShort(d.date))}</span>
                <span class="t-micro faint">${esc(relDeadline(d.date))}</span>
              </span>
            </a>`;
          }).join("")}
        </div>

        <div class="spotlight" style="margin-top:18px">
          <div class="t-caption" style="color:rgb(255 255 255 / .7);text-transform:uppercase;letter-spacing:.1em">${t(loc("Подбор вуза", "Universitet tanlash"))}</div>
          <div style="font-size:23px;font-weight:500;line-height:1.15;letter-spacing:-.9px;margin-top:12px;max-width:340px">
            ${t(loc("Соберите шорт-лист под профиль студента за пару минут", "Talaba profiliga qisqa ro‘yxatni bir necha daqiqada yig‘ing"))}
          </div>
          <button class="btn" style="background:#fff;color:#000;margin-top:20px" data-go="universities">${t(loc("Открыть каталог", "Katalogni ochish"))} ${icon("arrow", 14)}</button>
        </div>
      </section>

      <section>
        ${sectionTitle(t(loc("Мои задачи", "Mening vazifalarim")),
          `<button class="t-caption muted" style="background:none;border:0;cursor:pointer" data-go="tasks">${t(loc("Все задачи", "Barcha vazifalar"))}</button>`)}
        <div class="card divide">
          ${myTasks.map((task) => `<div class="row" style="align-items:flex-start">
            ${checkbox(false)}
            <span style="flex:1;min-width:0">
              <span class="t-body-sm" style="display:block">${esc(task.title)}</span>
              <span class="t-micro faint" style="display:flex;gap:8px;align-items:center;margin-top:5px">
                ${avatar(userById(task.assigneeId)?.name ?? "—", 18)}${esc(userById(task.assigneeId)?.name ?? "—")}<span>·</span>
                <span style="color:${isPast(task.dueAt) || isSoon(task.dueAt, 2) ? "var(--risk)" : "inherit"}">${esc(relDeadline(task.dueAt))}</span>
              </span>
            </span>
            ${task.priority === "high" ? chip(t(loc("важно", "muhim")), "var(--risk)") : ""}
          </div>`).join("")}
        </div>

        ${sectionTitle(t(loc("Лента агентства", "Agentlik lentasi")))}
        <div class="card divide">
          ${scopedActivity().slice(0, 7).map((e) => `<div class="row" style="align-items:flex-start">
            ${avatar(userById(e.authorId)?.name ?? "—", 26)}
            <span style="flex:1;min-width:0">
              <span class="t-body-sm" style="display:block">${esc(userById(e.authorId)?.name ?? "—")} <span class="muted">${esc(t(e.title))}</span></span>
              <span class="t-micro faint">${esc(relTime(e.at))}</span>
            </span>
          </div>`).join("")}
        </div>
      </section>
    </div>`;
}

/* ── лиды ────────────────────────────────────────────────── */
const leadRow = (l) => ({
  search: `${l.name} ${l.phone} ${l.email ?? ""} ${l.comment ?? ""}`,
  stage: currentStage(l), ownerId: l.ownerId, source: l.source,
});

function screenLeads() {
  const all = scopedLeads();
  const pipeline = defaultPipeline("lead");
  const stages = stagesOf(pipeline);
  const fields = leadFields();
  const st = filterState("leads");
  const leads = all.filter((l) => matchesFilter(leadRow(l), fields, st.values, st.q));
  return `
    ${head(t(loc("Лиды", "Lidlar")),
      `<span>${plural(all.length, ["лид", "лида", "лидов"], "lid")}</span><span class="faint">·</span>
       <span>${all.filter(isActiveLead).length} ${t(loc("в работе", "ishda"))}</span><span class="faint">·</span>
       <span>${esc(scopeLabel())}</span>`,
      `${viewSwitch()}
       ${pipelinePicker(pipeline)}
       ${allow(user().role, "leads", "create")
        ? `<button class="btn btn-primary" data-act="newlead">${icon("plus", 15)} ${t(loc("Новый лид", "Yangi lid"))}</button>` : ""}`)}
    ${smartFilter("leads", fields, leadPresets(), { shown: leads.length, total: all.length })}
    ${S.view === "list" ? crmList(leads.map((l) => {
      const stage = stageOf(pipeline, currentStage(l));
      const idle = idleDaysOf(l.stageEnteredAt);
      return {
        go: "lead/" + l.id, title: l.name,
        subtitle: `${t(ref(L.source, l.source))} · ${l.phone}`,
        stageLabel: stage ? t(stage.label) : currentStage(l),
        stageColor: stage?.color ?? "var(--ink-faint)",
        ownerName: userById(l.ownerId)?.name ?? "—",
        value: fmtShort(l.createdAt), valueHint: null,
        phone: l.phone, email: l.email, idleDays: idle,
        stale: isActiveLead(l) && idle >= STALE_DAYS,
      };
    }), loc("Создан", "Yaratilgan")) : kanban("lead", stages, leads.map(leadCard), {
      totals: false,
      fields: S.cardFields.filter((f) => ["phone", "source", "comment", "owner"].includes(f)).concat(["phone"]).filter((v, i, a) => a.indexOf(v) === i),
    })}`;
}

function screenLead(id) {
  const lead = scopedLeads().find((l) => l.id === id);
  if (!lead) return screenNotFound();
  const pipeline = defaultPipeline("lead");
  const stage = stageOf(pipeline, currentStage(lead));
  const owner = userById(lead.ownerId);
  const ch = channelById(lead.channelId);
  const converted = currentStage(lead) === "converted";

  return `
    ${crumb("leads", t(loc("Лиды", "Lidlar")), lead.name)}
    ${head(lead.name,
      `<span class="num">${esc(lead.id.toUpperCase())}</span><span class="faint">·</span>
       <span class="chip">${dot(stage?.color ?? "var(--ink-faint)")}${esc(t(stage?.label ?? loc("—", "—")))}</span>
       <span>${esc(fmtDate(lead.createdAt))}</span>`,
      converted
        ? (lead.convertedContactId ? `<button class="btn btn-secondary" data-go="contact/${esc(lead.convertedContactId)}">${t(loc("Открыть контакт", "Kontaktni ochish"))}</button>` : "")
        : `<button class="btn btn-primary" data-act="convert" data-value="${esc(lead.id)}">${icon("arrow", 15)} ${t(loc("Конвертировать", "Konvertatsiya qilish"))}</button>`)}

    <div style="margin-bottom:22px">
      ${stageBar("lead", lead, pipeline)}
      ${converted ? "" : `<p class="t-micro faint" style="margin:8px 0 0">${t(loc(
        "Создаст контакт и первую сделку, лид закроется и останется в истории.",
        "Kontakt va birinchi bitim yaratiladi, lid yopiladi va tarixda qoladi."))}</p>`}
    </div>

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));align-items:start">
      <div class="grid">
        ${fieldsCard(t(loc("Основные поля", "Asosiy maydonlar")), [
          [t(loc("ФИО", "F.I.Sh.")), esc(lead.name)],
          [t(loc("Телефон", "Telefon")), esc(lead.phone)],
          ["Email", esc(lead.email ?? "—")],
          [t(loc("Комментарий", "Izoh")), esc(lead.comment || "—")],
        ])}
        <div class="card" style="padding:16px">
          <div class="t-headline" style="margin-bottom:12px">${t(loc("Источник", "Manba"))}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${chip(t(ref(L.source, lead.source)))}
            ${ch ? chip(`${ch.title} · ${ch.handle}`, "var(--magenta)") : ""}
            ${chip(`${t(loc("Ответственный", "Mas’ul"))}: ${owner?.name ?? "—"}`)}
            ${lead.junkReason ? chip(lead.junkReason, "var(--risk)") : ""}
          </div>
        </div>
      </div>
      ${timeline("lead", lead.id)}
    </div>`;
}

/* ── сделки ──────────────────────────────────────────────── */
const dealRow = (d) => {
  const contact = studentById(d.studentId);
  const uni = uniById(d.universityId);
  return {
    search: `${contact?.fullName ?? ""} ${uni?.name ?? ""} ${d.note ?? ""}`,
    stage: currentStage(d), ownerId: d.ownerId, universityId: d.universityId,
    intake: d.intake, degreeLevel: d.degreeLevel, priority: d.priority,
    contractValue: d.contractValue, deadline: d.deadline,
  };
};

function screenDeals() {
  const all = scopedDeals();
  const pipeline = defaultPipeline("deal");
  const fields = dealFields();
  const st = filterState("deals");
  const deals = all.filter((d) => matchesFilter(dealRow(d), fields, st.values, st.q));
  // В шапке — вся воронка, а не текущий срез: сколько показано из скольких,
  // говорит сама строка фильтра.
  const total = all.reduce((n, d) => n + d.contractValue, 0);
  return `
    ${head(t(loc("Сделки", "Bitimlar")),
      `<span>${plural(all.length, ["сделка", "сделки", "сделок"], "bitim")}</span><span class="faint">·</span>
       <span class="num">${esc(som(total, true))}</span><span class="faint">·</span>
       <span>${esc(scopeLabel())}</span>`,
      `${viewSwitch()}
       ${pipelinePicker(pipeline)}
       ${allow(user().role, "deals", "create")
        ? `<button class="btn btn-primary" data-go="leads">${icon("plus", 15)} ${t(loc("Новая сделка", "Yangi bitim"))}</button>` : ""}`)}
    ${smartFilter("deals", fields, dealPresets(), { shown: deals.length, total: all.length })}
    ${S.view === "list" ? crmList(deals.map((d) => {
      const stage = stageOf(pipeline, currentStage(d));
      const contact = studentById(d.studentId);
      const idle = idleDaysOf(d.stageEnteredAt);
      return {
        go: "deal/" + d.id, title: contact?.fullName ?? d.id.toUpperCase(),
        subtitle: uniById(d.universityId)?.name ?? "—",
        stageLabel: stage ? t(stage.label) : currentStage(d),
        stageColor: stage?.color ?? "var(--ink-faint)",
        ownerName: userById(d.ownerId)?.name ?? "—",
        value: d.contractValue ? som(d.contractValue, true) : "—",
        valueHint: d.deadline ? relDeadline(d.deadline) : null,
        phone: contact?.phone ?? null, email: contact?.email ?? null,
        idleDays: idle, stale: !stage?.final && idle >= STALE_DAYS,
      };
    }), loc("Договор", "Shartnoma")) : kanban("deal", stagesOf(pipeline), deals.map(dealCard))}`;
}

function screenDeal(id) {
  const deal = scopedDeals().find((d) => d.id === id);
  if (!deal) return screenNotFound();
  const contact = studentById(deal.studentId);
  const uni = uniById(deal.universityId);
  const program = programById(deal.programId);
  const pipeline = pipelineById(deal.pipelineId) ?? defaultPipeline("deal");
  const stage = stageOf(pipeline, currentStage(deal));
  const dos = contact ? dossier(contact.id) : { done: 0, total: 0, percent: 0, docs: [] };
  const tasks = scopedTasks().filter((x) => x.relation?.type === "deal" && x.relation.id === deal.id);

  return `
    ${crumb("deals", t(loc("Сделки", "Bitimlar")), contact?.fullName ?? deal.id)}
    ${head(contact?.fullName ?? "—",
      `<span class="num">${esc(deal.id.toUpperCase())}</span><span class="faint">·</span>
       <span class="chip">${dot(stage?.color ?? "var(--ink-faint)")}${esc(t(stage?.label ?? loc("—", "—")))}</span>
       <span>${esc(uni?.name ?? t(loc("вуз не выбран", "universitet tanlanmagan")))}</span>`,
      contact ? `<button class="btn btn-secondary" data-go="contact/${esc(contact.id)}">${avatar(contact.fullName, 20)} ${t(loc("Контакт", "Kontakt"))}</button>` : "")}

    <div style="margin-bottom:22px">${stageBar("deal", deal, pipeline)}</div>

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));align-items:start">
      <div class="grid">
        ${fieldsCard(t(loc("Основные поля", "Asosiy maydonlar")), [
          [t(loc("Набор", "Qabul")), esc(t(ref(L.intake, deal.intake)))],
          [t(loc("Дедлайн", "Muddat")), deal.deadline ? `${esc(fmtDate(deal.deadline))} · ${esc(relDeadline(deal.deadline))}` : "—"],
          [t(loc("Приоритет", "Ustuvorlik")), esc(t(L.priority[deal.priority]))],
          [t(loc("Договор", "Shartnoma")), esc(som(deal.contractValue))],
          [t(loc("Оплачено", "To‘langan")), esc(som(deal.paid))],
          [t(loc("Комментарий", "Izoh")), esc(deal.note || "—")],
        ])}

        <div class="card" style="padding:16px">
          <div class="t-headline" style="margin-bottom:10px">${t(loc("Вуз", "Universitet"))}</div>
          ${kv(t(loc("Вуз", "Universitet")), uni ? `<a href="#" data-go="universities" data-student="${esc(contact ? contact.id : "none")}">${esc(uni.name)} · ${esc(t(ref(L.city, uni.city)))}</a>` : "—")}
          ${kv(t(loc("Программа", "Dastur")), esc(program?.name ?? "—"))}
          ${kv(t(loc("Уровень", "Daraja")), esc(t(L.degree[deal.degreeLevel])))}
          ${kv(t(loc("Ответственный", "Mas’ul")), esc(userById(deal.ownerId)?.name ?? "—"))}
        </div>

        <div class="card" style="padding:16px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:10px">
            <div class="t-headline">${t(loc("Документы по сделке", "Bitim hujjatlari"))}</div>
            <span class="t-caption muted num">${dos.done} / ${dos.total}</span>
          </div>
          ${bar(dos.percent)}
          <div style="margin-top:12px">
            ${dos.docs.slice(0, 8).map((d) => {
              const st = L.documentStatus[d.status];
              return `<div class="t-caption" style="display:flex;gap:8px;align-items:center;padding:4px 0">
                ${dot(st.dot)}<span class="truncate" style="flex:1;min-width:0">${esc(t(d.kind))}</span>
                <span class="t-micro faint nowrap">${esc(t(st.label))}</span>
              </div>`;
            }).join("")}
          </div>
        </div>

        ${tasks.length ? `<div class="card" style="padding:16px">
          <div class="t-headline" style="margin-bottom:10px">${t(loc("Задачи по сделке", "Bitim vazifalari"))}</div>
          ${tasks.map((x) => `<div class="t-caption" style="display:flex;gap:10px;align-items:center;padding:5px 0">
            ${avatar(userById(x.assigneeId)?.name ?? "—", 20)}
            <span class="truncate" style="flex:1;min-width:0">${esc(x.title)}</span>
            <span class="t-micro faint nowrap">${esc(relDeadline(x.dueAt))}</span>
          </div>`).join("")}
        </div>` : ""}
      </div>
      ${timeline("deal", deal.id)}
    </div>`;
}

/* ── контакты ────────────────────────────────────────────── */
/** Плоская строка контакта для фильтра — всё, по чему его можно искать. */
const contactRow = (s) => ({
  search: `${s.fullName} ${s.latinName} ${s.phone} ${s.email} ${s.city}`,
  status: s.status, ownerId: s.ownerId, city: s.city, source: s.source,
  topik: s.profile.topik, budget: s.profile.budgetPerYear,
});

function screenContacts() {
  const deals = scopedDeals();
  const all = scopedContacts();
  const fields = contactFields();
  const st = filterState("contacts");
  const rows = all.filter((s) => matchesFilter(contactRow(s), fields, st.values, st.q));

  return `
    ${head(t(loc("Контакты", "Kontaktlar")),
      `<span>${plural(all.length, ["контакт", "контакта", "контактов"], "kontakt")}</span><span class="faint">·</span>
       <span>${t(loc("один человек — одна карточка: повторные обращения падают в её историю", "bir odam — bitta karta"))}</span>`,
      allow(user().role, "contacts", "export")
        ? `<button class="btn btn-secondary" data-act="csv.contacts">${icon("export", 15)} ${t(loc("Экспорт", "Eksport"))}</button>`
        : "")}

    ${smartFilter("contacts", fields, contactPresets(), { shown: rows.length, total: all.length })}

    <div class="card scroll-x">
      <table style="min-width:960px">
        <thead><tr>
          ${[loc("Контакт", "Kontakt"), loc("Профиль", "Profil"), loc("Бюджет", "Byudjet"), loc("Цель", "Maqsad"),
             loc("Куратор", "Kurator"), loc("Досье", "Dosye"), loc("Статус", "Holat")]
            .map((h) => `<th>${esc(t(h))}</th>`).join("")}
        </tr></thead>
        <tbody>
          ${rows.map((s) => {
            const st = L.studentStatus[s.status];
            const dos = dossier(s.id);
            return `<tr>
              <td><a href="#" data-go="contact/${esc(s.id)}" style="display:flex;gap:12px;align-items:center">
                ${avatar(s.fullName, 32)}
                <span style="min-width:0">
                  <span class="t-body-sm truncate" style="display:block">${esc(s.fullName)}</span>
                  <span class="t-micro faint truncate" style="display:block">${esc(t(ref(L.city, s.city)))} · ${esc(t(L.source[s.source]))} · ${esc(fmtShort(s.createdAt))}</span>
                </span></a></td>
              <td><span style="display:flex;gap:6px;flex-wrap:wrap">
                ${chip("TOPIK " + (s.profile.topik || "—"))}
                ${s.profile.ielts ? chip("IELTS " + s.profile.ielts) : ""}
                ${s.profile.gpa ? chip("GPA " + s.profile.gpa) : ""}
              </span></td>
              <td class="t-body-sm num nowrap">${esc(usd(s.profile.budgetPerYear))}</td>
              <td>
                <div class="t-body-sm nowrap">${esc(s.profile.preferredMajors[0] ? t(ref(L.field, s.profile.preferredMajors[0])) : t(loc("не определено", "aniqlanmagan")))}</div>
                <div class="t-micro faint nowrap">${esc(t(L.degree[s.profile.degreeLevel]))}</div>
              </td>
              <td><span style="display:flex;gap:8px;align-items:center">${avatar(userById(s.ownerId)?.name ?? "—", 22)}<span class="t-caption nowrap">${esc(userById(s.ownerId)?.name ?? "—")}</span></span></td>
              <td>
                <div class="t-caption num">${dos.percent}%</div>
                <div class="t-micro faint nowrap">${plural(deals.filter((d) => d.studentId === s.id).length, ["сделка", "сделки", "сделок"], "bitim")}</div>
              </td>
              <td><span class="chip">${dot(st.dot)}${esc(t(st.label))}</span></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
      ${rows.length ? "" : `<div class="t-body-sm muted" style="padding:44px;text-align:center">${t(loc("Ничего не найдено — попробуйте снять фильтры.", "Hech narsa topilmadi."))}</div>`}
    </div>`;
}

function screenContact(id) {
  const s = scopedContacts().find((x) => x.id === id);
  if (!s) return screenNotFound();
  const deals = scopedDeals().filter((d) => d.studentId === s.id);
  const dos = dossier(s.id);
  const st = L.studentStatus[s.status];
  const rate = tenant().usdRate;
  const shortlist = matchStudent(s, D.universities).filter((m) => m.verdict !== "not_suitable").slice(0, 4);

  return `
    ${crumb("contacts", t(loc("Контакты", "Kontaktlar")), s.fullName)}
    ${head(s.fullName,
      `<span class="chip">${dot(st.dot)}${esc(t(st.label))}</span>
       <span>${esc(s.latinName)} · ${esc(t(ref(L.city, s.city)))}</span><span class="faint">·</span>
       <span>${t(loc("Источник", "Manba"))}: ${esc(t(L.source[s.source]))}</span>`,
      `<a class="btn btn-secondary" href="tel:${esc(s.phone)}">${icon("phone", 15)} ${t(loc("Позвонить", "Qo‘ng‘iroq"))}</a>
       <button class="btn btn-primary" data-go="universities" data-student="${esc(s.id)}">${icon("plus", 15)} ${t(loc("Подобрать вуз", "Universitet tanlash"))}</button>`)}

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));align-items:start">
      <div class="grid">
        ${fieldsCard(t(loc("Основные поля", "Asosiy maydonlar")), [
          [t(loc("Телефон", "Telefon")), esc(s.phone)],
          ["Email", esc(s.email)],
          [t(loc("Дата рождения", "Tug‘ilgan sana")), esc(fmtDate(s.birthDate))],
          [t(loc("Город", "Shahar")), esc(t(ref(L.city, s.city)))],
          [t(loc("Паспорт", "Pasport")), esc(s.passport ?? "—")],
          [t(loc("Куратор", "Kurator")), esc(userById(s.ownerId)?.name ?? "—")],
          ...(s.leadId ? [[t(loc("Создан из лида", "Liddan yaratilgan")), `<a href="#" data-go="lead/${esc(s.leadId)}">${esc(s.leadId.toUpperCase())}</a>`]] : []),
        ])}

        <div class="card" style="padding:16px">
          <div class="t-headline" style="margin-bottom:10px">${t(loc("Портфолио", "Portfel"))}</div>
          ${kv("TOPIK", s.profile.topik || t(loc("нет сертификата", "sertifikat yo‘q")))}
          ${kv("IELTS", s.profile.ielts ?? "—")}
          ${kv("GPA", s.profile.gpa ?? "—")}
          ${kv(t(loc("Бюджет на год", "Yillik byudjet")), esc(usdSom(s.profile.budgetPerYear, rate)))}
          ${kv(t(loc("Уровень", "Daraja")), esc(t(L.degree[s.profile.degreeLevel])))}
          ${kv(t(loc("Набор", "Qabul")), esc(t(ref(L.intake, s.profile.intake))))}
          ${kv(t(loc("Города", "Shaharlar")), esc(s.profile.preferredCities.map((c) => t(ref(L.city, c))).join(", ") || t(loc("любой", "istalgan"))))}
        </div>

        <div class="card" style="padding:16px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:10px">
            <div class="t-headline">${t(loc("Досье", "Dosye"))}</div>
            <span class="t-caption muted num">${dos.done} / ${dos.total}</span>
          </div>
          ${bar(dos.percent)}
        </div>
      </div>

      <div class="grid">
        <div>
          ${sectionTitle(t(loc("Сделки контакта", "Kontakt bitimlari")))}
          <div class="card divide">
            ${deals.length ? deals.map((d) => {
              const uni = uniById(d.universityId);
              const stage = stageOf(pipelineById(d.pipelineId) ?? defaultPipeline("deal"), currentStage(d));
              return `<a class="row" href="#" data-go="deal/${esc(d.id)}" style="flex-wrap:wrap">
                <span style="flex:1;min-width:200px">
                  <span class="t-body-sm" style="display:block">${esc(uni?.name ?? t(loc("вуз не выбран", "universitet tanlanmagan")))}</span>
                  <span class="t-micro faint">${esc(programById(d.programId)?.name ?? "—")} · ${esc(t(ref(L.intake, d.intake)))}</span>
                </span>
                <span class="chip">${dot(stage?.color ?? "var(--ink-faint)")}${esc(t(stage?.label ?? loc("—", "—")))}</span>
                <span class="t-caption num muted nowrap" style="width:110px;text-align:right">${esc(relDeadline(d.deadline))}</span>
                <span class="t-caption num nowrap" style="width:140px;text-align:right">${esc(somPair(d.paid, d.contractValue))}</span>
              </a>`;
            }).join("") : `<div class="t-body-sm muted" style="padding:32px;text-align:center">${t(loc("Сделок пока нет", "Hozircha bitimlar yo‘q"))}</div>`}
          </div>
        </div>

        ${timeline("contact", s.id)}

        ${shortlist.length ? `<div>
          ${sectionTitle(t(loc("Рекомендуем", "Tavsiya etamiz")))}
          <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
            ${shortlist.map((m) => `<a class="card card-hover" style="padding:16px;display:block" href="#" data-go="universities">
              <span style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
                <span style="min-width:0">
                  <span class="t-body-sm truncate" style="display:block">${esc(m.university.name)}</span>
                  <span class="t-micro faint truncate" style="display:block">${esc(m.program.name)}</span>
                </span>
                <span class="chip">${dot(VERDICT[m.verdict].dot)}${m.score}</span>
              </span>
              <span class="t-micro muted" style="display:block;margin-top:10px">${esc(t(VERDICT[m.verdict].label))} · ${esc(usdSom(m.yearCost, rate))}</span>
            </a>`).join("")}
          </div>
        </div>` : ""}
      </div>
    </div>`;
}

/* ── настройки CRM, воронки и каналы ─────────────────────── */
function screenPipelines() {
  const list = [...pipelinesOf("lead"), ...pipelinesOf("deal")];
  const cardsOn = (p, key) => (p.entity === "lead"
    ? scopedLeads().filter((l) => currentStage(l) === key)
    : scopedDeals().filter((d) => d.pipelineId === p.id && currentStage(d) === key)).length;

  return `
    ${crumb("admin", t(loc("Администрирование", "Boshqaruv")), t(loc("Воронки", "Voronkalar")))}
    ${head(t(loc("Воронки", "Voronkalar")),
      `<span>${t(loc("стадии, их порядок, цвета и финалы — то, как агентство видит свою работу", "bosqichlar, tartibi, ranglari va yakunlari"))}</span>`,
      `<button class="btn btn-secondary" data-act="newpipeline">${icon("plus", 15)} ${t(loc("Новая воронка", "Yangi voronka"))}</button>`)}

    <div class="grid" style="gap:20px">
      ${list.map((p) => `<section class="card" style="padding:0;overflow:hidden">
        <div class="card-head" style="display:flex;flex-wrap:wrap;align-items:center;gap:10px">
          <span class="t-body-sm" style="flex:1;min-width:0" class="truncate">${esc(t(p.name))}</span>
          <span class="chip">${t(p.entity === "lead" ? loc("Для лидов", "Lidlar uchun") : loc("Для сделок", "Bitimlar uchun"))}</span>
          ${p.isDefault ? `<span class="chip on">${t(loc("Основная", "Asosiy"))}</span>` : ""}
          <span class="t-micro faint">${plural(p.stages.length, ["стадия", "стадии", "стадий"], "bosqich")}</span>
        </div>

        <div class="divide">
          ${stagesOf(p).map((stage, i, all) => {
            const cards = cardsOn(p, stage.key);
            return `<div class="row" style="gap:12px">
              <span style="width:4px;height:30px;border-radius:999px;background:${stage.color};flex:none"></span>
              <button style="flex:1;min-width:0;text-align:left;background:none;border:0;cursor:pointer;color:inherit;padding:0"
                data-act="stage" data-value="${esc(p.id)}:${esc(stage.key)}">
                <span class="t-body-sm truncate" style="display:flex;gap:8px;align-items:center">
                  ${esc(stage.label.ru)}
                  ${stage.final ? dot(stage.final === "won" ? "var(--deal)" : "var(--risk)") : ""}
                </span>
                <span class="t-micro faint truncate" style="display:block">
                  ${esc(stage.label.uz)}${cards ? ` · ${plural(cards, ["карточка", "карточки", "карточек"], "karta")}` : ""}
                </span>
              </button>
              <span style="display:flex;gap:2px;flex:none">
                <button class="icon-btn" style="width:28px;height:28px" data-act="movestage" data-value="${esc(p.id)}:${esc(stage.key)}:-1"
                  ${i === 0 ? "disabled" : ""} title="${t(loc("Выше", "Yuqoriga"))}">${icon("arrow-up", 13)}</button>
                <button class="icon-btn" style="width:28px;height:28px" data-act="movestage" data-value="${esc(p.id)}:${esc(stage.key)}:1"
                  ${i === all.length - 1 ? "disabled" : ""} title="${t(loc("Ниже", "Pastga"))}">${icon("arrow-down", 13)}</button>
                <button class="icon-btn" style="width:28px;height:28px" data-act="delstage" data-value="${esc(p.id)}:${esc(stage.key)}"
                  ${cards ? "disabled" : ""} title="${t(cards ? loc("На стадии есть карточки", "Bosqichda kartalar bor") : loc("Удалить стадию", "Bosqichni o‘chirish"))}">${icon("trash", 13)}</button>
              </span>
            </div>`;
          }).join("")}
        </div>

        <div style="padding:14px 18px;border-top:1px solid var(--hairline-soft)">
          <button class="btn btn-secondary" data-act="newstage" data-value="${esc(p.id)}">${icon("plus", 14)} ${t(loc("Добавить стадию", "Bosqich qo‘shish"))}</button>
        </div>
      </section>`).join("")}
    </div>`;
}

/** Настоящие иконки каналов: глобус на месте Instagram выглядел заглушкой. */
const CHANNEL_ICON = {
  instagram: { icon: "instagram", color: "var(--magenta)" },
  telegram: { icon: "telegram", color: "var(--accent)" },
  email: { icon: "mail", color: "var(--violet)" },
  phone: { icon: "phone", color: "var(--deal)" },
};

function screenChannels() {
  const channels = channelsOf();
  const STATUS = {
    connected: { label: loc("Подключён", "Ulangan"), dot: "var(--deal)" },
    pending: { label: loc("Ожидает подключения", "Ulanish kutilmoqda"), dot: "var(--progress)" },
    off: { label: loc("Отключён", "O‘chirilgan"), dot: "var(--ink-faint)" },
  };
  return `
    ${head(t(loc("Каналы продаж", "Sotuv kanallari")),
      `<span>${t(loc("откуда приходят обращения: каждое новое попадает в лиды", "murojaatlar qayerdan keladi"))}</span><span class="faint">·</span>
       <span class="num">${plural(channels.reduce((n, c) => n + c.leadsPerMonth, 0), ["лид", "лида", "лидов"], "lid")} ${t(loc("в месяц", "oyiga"))}</span>`)}
    <div class="banner" style="margin-bottom:20px">
      ${dot("var(--progress)")}
      <span class="t-caption">${t(loc(
        "Интерфейс подключения готов; обмен сообщениями включается на этапе интеграций.",
        "Ulanish interfeysi tayyor; xabar almashish integratsiya bosqichida yoqiladi."))}</span>
    </div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
      ${channels.map((c) => {
        const st = STATUS[c.status];
        return `<article class="card" style="padding:18px">
          <div style="display:flex;gap:12px;align-items:flex-start">
            <span class="avatar" style="width:36px;height:36px;border-radius:10px;color:${CHANNEL_ICON[c.kind]?.color ?? "var(--ink-muted)"};background:color-mix(in srgb, ${CHANNEL_ICON[c.kind]?.color ?? "var(--ink-muted)"} 12%, var(--surface-2))">${icon(CHANNEL_ICON[c.kind]?.icon ?? "globe", 17)}</span>
            <span style="min-width:0;flex:1">
              <span class="t-body-sm truncate" style="display:block">${esc(c.title)}</span>
              <span class="t-micro faint truncate" style="display:block">${esc(c.handle)}</span>
            </span>
          </div>
          <div style="display:flex;gap:6px;margin-top:14px;flex-wrap:wrap">
            <span class="chip">${dot(st.dot)}${esc(t(st.label))}</span>
          </div>
          <div class="t-micro faint" style="margin-top:10px">
            ${esc(c.connectedAt ? fmtDate(c.connectedAt) : t(loc("не подключён", "ulanmagan")))} ·
            <span class="num">${plural(c.leadsPerMonth, ["лид", "лида", "лидов"], "lid")}</span> ${t(loc("в месяц", "oyiga"))}
          </div>
          <button class="btn btn-secondary" style="width:100%;margin-top:14px" data-act="channel" data-value="${esc(c.id)}">
            ${c.status === "connected" ? t(loc("Отключить", "O‘chirish")) : t(loc("Подключить", "Ulash"))}
          </button>
        </article>`;
      }).join("")}
    </div>`;
}
