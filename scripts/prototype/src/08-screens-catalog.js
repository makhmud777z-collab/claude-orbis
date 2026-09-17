function screenUniversities() {
  const rate = tenant().usdRate;
  const students = scopedContacts().filter((s) => s.status !== "lost");
  const student = students.find((s) => s.id === S.catalog.student);
  const key = student ? student.id : "_";
  const picked = S.shortlist[key] ?? [];
  const fields = universityFields();
  const st = filterState("universities");
  const v = st.values;

  /**
   * Фильтр сужает и вуз, и его программы: «TOPIK от 3» — это не свойство
   * вуза, а условие для программ, которые ему подходят.
   */
  const rows = [];
  for (const u of D.universities) {
    const uniRow = {
      search: `${u.name} ${u.nameKo} ${u.city}`,
      city: u.city, ownership: u.ownership, field: u.fields, intake: u.intakes,
      dorm: u.dormAvailable ? "yes" : "no", english: hasEnglish(u) ? "yes" : "no",
    };
    if (!matchesFilter(uniRow, fields.filter((f) => !["topik", "tuition", "degree"].includes(f.key)), v, st.q)) continue;
    const programs = u.programs.filter((p) => {
      if (v.degree && p.degreeLevel !== v.degree) return false;
      if (v.topikFrom && p.topikMin > Number(v.topikFrom)) return false;
      if (v.tuitionFrom && p.tuitionPerYear < Number(v.tuitionFrom)) return false;
      if (v.tuitionTo && p.tuitionPerYear > Number(v.tuitionTo)) return false;
      return true;
    });
    if (!programs.length) continue;
    const match = student ? programs.map((p) => matchProgram(student, u, p)).sort((a, b) => b.score - a.score)[0] : null;
    rows.push({ u, programs, match });
  }
  rows.sort((a, b) => (a.match && b.match ? b.match.score - a.match.score : (a.u.nationalRank ?? 999) - (b.u.nationalRank ?? 999)));

  return `
    ${head(t(loc("Каталог вузов", "Universitetlar katalogi")),
      `<span>${t(loc("Корея", "Koreya"))} · ${D.universities.length} ${t(loc("вузов", "universitet"))}</span><span class="faint">·</span>
       <span>${D.universities.reduce((n, u) => n + u.programs.length, 0)} ${t(loc("программ", "dastur"))}</span>`,
      `<button class="btn btn-secondary">${icon("export", 15)} ${t(loc("Выгрузить шорт-лист", "Qisqa ro‘yxatni yuklash"))}</button>`)}

    <div class="banner t-caption" style="margin-bottom:20px">
      ${dot("var(--progress)")}
      <span style="line-height:1.55">${t(loc(
        "Этап 1: структура и фильтры. Карточки заполнены демо-данными и помечены как «черновик». На этапе 2 записи заполняются с официальных страниц вузов и файлов admission guideline.",
        "1-bosqich: tuzilma va filtrlar. Kartalar demo ma’lumotlar bilan to‘ldirilgan va «qoralama» deb belgilangan. 2-bosqichda ma’lumotlar universitetlarning rasmiy sahifalaridan olinadi."))}</span>
    </div>

    ${smartFilter("universities", fields, simplePresets(), { shown: rows.length, total: D.universities.length })}

    <div class="grid" style="grid-template-columns:272px minmax(0,1fr);align-items:start">
      <aside class="card" style="padding:18px;min-width:0">
        <div class="t-micro faint" style="text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">${t(loc("Подобрать под студента", "Talaba uchun tanlash"))}</div>
        ${select("catalog.student", S.catalog.student, [
          { value: "none", label: t(loc("— выбрать контакт —", "— kontaktni tanlang —")) },
          ...students.map((s) => ({ value: s.id, label: s.fullName })),
        ], 224)}
        ${student ? `
          <button class="chip ${S.catalog.strict ? "on" : ""}" style="margin-top:10px" data-act="catalog.strict">${t(loc("Фильтровать по профилю", "Profil bo‘yicha filtrlash"))}</button>
          <div class="t-micro faint" style="margin-top:8px;line-height:1.5">
            TOPIK ${student.profile.topik || "—"} · ${student.profile.ielts ? "IELTS " + student.profile.ielts + " · " : ""}${t(loc("бюджет", "byudjet"))} ${usd(student.profile.budgetPerYear)}
          </div>
          <p class="t-micro faint" style="margin:14px 0 0;line-height:1.55">${t(loc(
            "Профиль сортирует выдачу и объясняет каждый вуз. Жёсткая фильтрация включается отдельно — иначе список схлопывается до одного варианта.",
            "Profil ro‘yxatni saralaydi va har bir universitetni izohlaydi."))}</p>` : ""}
      </aside>

      <div style="min-width:0">
        <div class="t-caption muted" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:14px">
          <span>${t(loc("Найдено", "Topildi"))} ${plural(rows.length, ["вуз", "вуза", "вузов"], "universitet")}${student ? ` · ${t(loc("отсортировано по совпадению с профилем", "profil bo‘yicha saralangan"))}: ${esc(student.fullName)}` : ""}</span>
          <span style="display:flex;align-items:center;gap:8px">
            <span class="t-micro faint">${picked.length} / 6 ${t(loc("в шорт-листе", "qisqa ro‘yxatda"))}</span>
            <button class="btn ${picked.length ? "btn-primary" : "btn-secondary"}" data-go="compare">${t(loc("Сравнить", "Solishtirish"))}</button>
          </span>
        </div>

        <div class="grid">
          ${rows.map(({ u, programs, match }) => {
            const low = Math.min(...programs.map((p) => p.tuitionPerYear));
            const high = Math.max(...programs.map((p) => p.tuitionPerYear));
            const dl = nextDeadline(u);
            const on = picked.includes(u.id);
            return `<div class="card card-hover" style="padding:18px">
              <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between">
                <div style="min-width:0">
                  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                    <span style="font-size:17px;font-weight:500;letter-spacing:-.3px">${esc(u.name)}</span>
                    <span class="t-micro faint">${esc(u.nameKo)}</span>
                  </div>
                  <div class="t-caption muted" style="margin-top:6px">${esc(t(ref(L.city, u.city)))} · ${esc(t(L.ownership[u.ownership]))} · ${u.nationalRank ? "#" + u.nationalRank + " " + t(loc("в стране", "mamlakatda")) : t(loc("без рейтинга", "reytingsiz"))}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                  ${match ? `<span class="chip on">${dot(VERDICT[match.verdict].dot)}${esc(t(VERDICT[match.verdict].label))} · ${match.score}</span>` : chip(t(loc("черновик данных", "ma’lumot qoralamasi")))}
                  <button class="btn ${on ? "btn-primary" : "btn-secondary"}" data-act="shortlist" data-value="${u.id}">${t(on ? loc("В шорт-листе", "Ro‘yxatda") : loc("В шорт-лист", "Qisqa ro‘yxatga"))}</button>
                </div>
              </div>

              <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-top:16px">
                <span><span class="t-micro faint" style="display:block">${t(loc("Обучение в год", "Yillik o‘qish"))}</span>
                  <span class="t-body-sm">${low === high ? usd(low) : usd(low) + " – " + usd(high)}</span>
                  <span class="t-micro faint" style="display:block">${som(low * rate, true)}</span></span>
                <span><span class="t-micro faint" style="display:block">${t(loc("Общежитие", "Yotoqxona"))}</span>
                  <span class="t-body-sm">${u.dormAvailable ? usd(u.dormCostPerYear) + " / " + t(loc("год", "yil")) : t(loc("нет", "yo‘q"))}</span></span>
                <span><span class="t-micro faint" style="display:block">${t(loc("Требования", "Talablar"))}</span>
                  <span class="t-body-sm">TOPIK ${u.requirements.topikMin}+${u.requirements.ieltsMin ? " · IELTS " + u.requirements.ieltsMin : ""} · GPA ${u.requirements.gpaMin ?? "—"}</span>
                  <span class="t-micro faint" style="display:block">${dl ? t(loc("Дедлайн", "Muddat")) + ": " + fmtShort(dl.deadline) + " · " + t(ref(L.intake, dl.intake)) : t(loc("набор закрыт", "qabul yopilgan"))}</span></span>
              </div>

              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px">
                ${programs.slice(0, 4).map((p) => chip(`${p.name} · ${usd(p.tuitionPerYear)}`)).join("")}
                ${programs.length > 4 ? chip(`+${programs.length - 4} ${t(loc("программ", "dastur"))}`) : ""}
              </div>

              ${match ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;padding-top:14px;border-top:1px solid var(--hairline-soft)">
                ${match.reasons.slice(0, 4).map((r) => chip(t(r.label), levelDot(r.level))).join("")}</div>` : ""}
            </div>`;
          }).join("") || `<div class="card" style="padding:56px;text-align:center">
              <div style="font-size:17px">${t(loc("Под эти условия вузов нет", "Bu shartlarga mos universitet yo‘q"))}</div>
              <div class="t-caption muted" style="margin-top:8px">${t(loc("Снимите часть фильтров — обычно первым мешает бюджет или уровень TOPIK.", "Ba’zi filtrlarni olib tashlang — odatda byudjet yoki TOPIK to‘sqinlik qiladi."))}</div>
            </div>`}
        </div>
      </div>
    </div>`;
}

function screenCompare() {
  const rate = tenant().usdRate;
  const student = studentById(S.catalog.student);
  const key = student ? student.id : "_";
  const list = (S.shortlist[key] ?? []).map(uniById).filter(Boolean);

  if (!list.length) {
    return `${head(t(loc("Сравнение вузов", "Universitetlarni solishtirish")))}
      <div class="card" style="padding:56px;text-align:center">
        <div style="font-size:17px">${t(loc("Шорт-лист пуст", "Qisqa ro‘yxat bo‘sh"))}</div>
        <div class="t-caption muted" style="margin:10px auto 0;max-width:420px">${t(loc("Откройте каталог, отфильтруйте вузы под профиль студента и добавьте подходящие — здесь они встанут рядом для сравнения.", "Katalogni oching, universitetlarni talaba profiliga moslab filtrlang va mos kelganlarini qo‘shing."))}</div>
        <button class="btn btn-primary" style="margin-top:22px" data-go="universities">${t(loc("Каталог вузов", "Universitetlar katalogi"))}</button>
      </div>`;
  }

  const verdicts = new Map(student ? list.map((u) => [u.id, matchStudent(student, [u])[0]]) : []);
  const rows = [
    [loc("Город", "Shahar"), (u) => `${t(ref(L.city, u.city))}, ${t(ref(L.region, u.region))}`],
    [loc("Форма собственности", "Mulkchilik shakli"), (u) => t(L.ownership[u.ownership])],
    [loc("Обучение в год", "Yillik o‘qish"), (u) => {
      const lo = Math.min(...u.programs.map((p) => p.tuitionPerYear)), hi = Math.max(...u.programs.map((p) => p.tuitionPerYear));
      return lo === hi ? usd(lo) : `${usd(lo)} – ${usd(hi)}`;
    }],
    [loc("Общежитие", "Yotoqxona"), (u) => (u.dormAvailable ? usdSom(u.dormCostPerYear, rate) : t(loc("нет", "yo‘q")))],
    [loc("Вступительный взнос", "Ariza to‘lovi"), (u) => usd(u.admissionFee)],
    [loc("Грант", "Grant"), (u) => `${t(loc("до", "gacha"))} ${u.scholarshipMax}%`],
    [loc("Полная стоимость года", "Yillik to‘liq narx"), (u) =>
      usdSom(Math.min(...u.programs.map((p) => p.tuitionPerYear)) + (u.dormCostPerYear ?? 0) + u.admissionFee, rate)],
    [loc("TOPIK", "TOPIK"), (u) => String(u.requirements.topikMin || t(loc("не требуется", "talab qilinmaydi")))],
    [loc("IELTS", "IELTS"), (u) => String(u.requirements.ieltsMin ?? "—")],
    [loc("GPA", "GPA"), (u) => String(u.requirements.gpaMin ?? "—")],
    [loc("Счёт в банке", "Bankdagi hisob"), (u) => usd(u.requirements.bankBalance)],
    [loc("Программы на английском", "Ingliz tilidagi dasturlar"), (u) => t(hasEnglish(u) ? loc("есть", "bor") : loc("нет", "yo‘q"))],
    [loc("Языковой центр", "Til markazi"), (u) => t(u.hasLanguageCenter ? loc("есть", "bor") : loc("нет", "yo‘q"))],
    [loc("Дедлайн подачи", "Topshirish muddati"), (u) => {
      const d = nextDeadline(u);
      return d ? `${fmtShort(d.deadline)} · ${t(ref(L.intake, d.intake))}` : t(loc("набор закрыт", "qabul yopilgan"));
    }],
    [loc("Визовый статус", "Viza maqomi"), (u) => t(L.visaGrade[u.visaGrade])],
    [loc("Наборы", "Qabullar"), (u) => u.intakes.map((i) => t(ref(L.intake, i))).join(", ")],
  ];

  return `
    <div class="t-caption faint" style="display:flex;gap:8px;margin-bottom:14px">
      <button style="background:none;border:0;color:inherit;cursor:pointer" data-go="universities">${t(loc("Каталог вузов", "Universitetlar katalogi"))}</button>
      <span>/</span><span class="muted">${t(loc("Сравнение", "Solishtirish"))}</span>
    </div>
    ${head(t(loc("Сравнение вузов", "Universitetlarni solishtirish")),
      `<span>${plural(list.length, ["вуз", "вуза", "вузов"], "universitet")} ${t(loc("в шорт-листе", "qisqa ro‘yxatda"))}</span><span class="faint">·</span>
       <span>${student ? t(loc("для студента", "talaba uchun")) + ": " + esc(student.fullName) : t(loc("без студента", "talabasiz"))}</span>`,
      `<button class="btn btn-secondary" data-go="universities">${t(loc("К каталогу", "Katalogga"))}</button>
       <button class="btn btn-secondary" data-act="shortlist.clear">${t(loc("Очистить", "Tozalash"))}</button>`)}

    <div class="card" style="overflow:hidden"><div class="scroll-x">
      <table style="min-width:${180 + list.length * 200}px">
        <thead><tr><th>${t(loc("Критерий", "Mezon"))}</th>
          ${list.map((u) => `<th style="text-transform:none;letter-spacing:-.14px;font-size:14px;color:var(--ink);padding-top:16px;padding-bottom:16px">
            ${esc(u.name)}<span class="t-micro faint" style="display:block;font-weight:400;margin-top:3px">${esc(u.nameKo)}</span></th>`).join("")}
        </tr></thead>
        <tbody>
          ${student ? `<tr><td class="t-caption muted">${t(loc("Вердикт подбора", "Tanlov xulosasi"))}</td>
            ${list.map((u) => {
              const m = verdicts.get(u.id);
              return `<td>${m ? `<span class="chip on">${dot(VERDICT[m.verdict].dot)}${esc(t(VERDICT[m.verdict].label))} · ${m.score}</span>` : "—"}</td>`;
            }).join("")}</tr>` : ""}
          ${rows.map(([label, value]) => `<tr>
            <td class="t-caption muted">${esc(t(label))}</td>
            ${list.map((u) => `<td class="t-body-sm">${esc(value(u))}</td>`).join("")}
          </tr>`).join("")}
        </tbody>
      </table>
    </div></div>`;
}

/** Папка попадает в выдачу, если ей подходит хоть один документ. */
const docRow = (d, owner) => ({
  search: `${t(d.kind)} ${owner} ${d.fileName ?? ""}`,
  status: d.status, apostille: d.needsApostille ? "yes" : "no",
});

function screenDocuments() {
  const fields = documentFields();
  const st = filterState("documents");
  const folders = scopedContacts().map((s) => {
    const items = D.documents.filter((d) => d.studentId === s.id);
    const verified = items.filter((d) => d.status === "verified").length;
    const problems = items.filter((d) => ["missing", "rejected", "expiring"].includes(d.status)).length;
    return { s, items, verified, problems, percent: items.length ? Math.round((verified / items.length) * 100) : 0 };
  }).filter((f) => f.items.length).sort((a, b) => b.problems - a.problems);

  const visible = folders.filter((f) => f.items.some((d) => matchesFilter(docRow(d, f.s.fullName), fields, st.values, st.q)));
  const open = visible.find((f) => f.s.id === S.docs.open) ?? visible[0];

  return `
    ${head(t(loc("Документы", "Hujjatlar")),
      `<span>${folders.length} ${t(loc("папок студентов", "talaba papkasi"))}</span><span class="faint">·</span>
       <span>${folders.reduce((n, f) => n + f.items.length, 0)} ${t(loc("документов", "hujjat"))}</span><span class="faint">·</span>
       <span>${folders.reduce((n, f) => n + f.problems, 0)} ${t(loc("требуют внимания", "e’tibor talab qiladi"))}</span>`,
      `<button class="btn btn-primary">${icon("plus", 15)} ${t(loc("Загрузить документ", "Hujjat yuklash"))}</button>`)}

    ${smartFilter("documents", fields, simplePresets(), { shown: visible.length, total: folders.length })}

    <div class="grid" style="grid-template-columns:320px minmax(0,1fr);align-items:start">
      <div class="grid" style="gap:10px;min-width:0">
        ${visible.map((f) => `
          <button class="card card-hover" style="padding:15px;text-align:left;cursor:pointer;${open && open.s.id === f.s.id ? "background:var(--surface-2);border-color:var(--hairline)" : ""}" data-act="docs.open" data-value="${f.s.id}">
            <span style="display:flex;align-items:center;gap:11px">
              ${avatar(f.s.fullName, 30)}
              <span style="flex:1;min-width:0">
                <span class="t-body-sm truncate" style="display:block">${esc(f.s.fullName)}</span>
                <span class="t-micro faint truncate" style="display:block">${f.items.length} ${t(loc("документов", "hujjat"))} · ${esc(userById(f.s.ownerId)?.name ?? "")}</span>
              </span>
              ${f.problems ? `<span class="t-micro num" style="background:rgb(255 85 119 / .12);color:var(--risk);border-radius:999px;padding:2px 8px">${f.problems}</span>` : ""}
            </span>
            <span style="display:flex;align-items:center;gap:10px;margin-top:12px">
              ${bar(f.percent, f.percent >= 80 ? "var(--deal)" : f.percent >= 40 ? "var(--progress)" : "var(--risk)")}
              <span class="t-micro num faint" style="width:36px;text-align:right">${f.percent}%</span>
            </span>
          </button>`).join("")}
      </div>

      ${open ? `<div class="card" style="min-width:0">
        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--hairline-soft)">
          <span style="display:flex;align-items:center;gap:11px;min-width:0">
            <span class="avatar" style="width:36px;height:36px;border-radius:10px">${icon("doc", 17)}</span>
            <span style="min-width:0">
              <span class="t-body-sm truncate" style="display:block">${t(loc("Досье", "Dosye"))} — ${esc(open.s.fullName)}</span>
              <span class="t-micro faint">${open.verified} ${t(loc("проверено", "tekshirilgan"))} · ${open.problems} ${t(loc("требуют внимания", "e’tibor talab qiladi"))}</span>
            </span>
          </span>
          <span style="display:flex;gap:8px">
            <button class="btn btn-secondary" data-go="contact/${open.s.id}">${t(loc("Карточка контакта", "Kontakt kartasi"))}</button>
            <button class="btn btn-primary">${t(loc("Загрузить файл", "Fayl yuklash"))}</button>
          </span>
        </div>
        <div class="divide">
          ${open.items.map((d) => {
            const st = L.documentStatus[d.status];
            return `<div class="row" style="flex-wrap:wrap">
              ${dot(st.dot)}
              <span style="flex:1;min-width:180px">
                <span class="t-body-sm" style="display:block">${esc(t(d.kind))}</span>
                <span class="t-micro faint">${esc(d.fileName ?? t(loc("файл не загружен", "fayl yuklanmagan")))}${d.sizeKb ? " · " + (d.sizeKb / 1024).toFixed(1) + " MB" : ""}</span>
              </span>
              ${d.needsApostille ? chip(t(loc("апостиль", "apostil"))) : ""}
              ${d.expiresAt ? chip(`${t(loc("до", "gacha"))} ${fmtShort(d.expiresAt)}`, "var(--progress)") : ""}
              <span class="t-caption muted nowrap" style="width:96px;text-align:right">${esc(t(st.label))}</span>
            </div>`;
          }).join("")}
        </div>
      </div>` : `<div class="card" style="padding:56px;text-align:center" class="muted">${t(loc("Папок нет", "Papkalar yo‘q"))}</div>`}
    </div>`;
}

const deadlineRow = (d) => ({ search: t(d.title), kind: d.kind, ownerId: d.ownerId });

function screenDeadlines() {
  const all = scopedDeadlines();
  const fields = deadlineFields();
  const st = filterState("deadlines");
  const items = all.filter((d) => matchesFilter(deadlineRow(d), fields, st.values, st.q));
  const groups = [
    [loc("Просрочено", "Kechikkan"), (n) => n < 0],
    [loc("Сегодня и завтра", "Bugun va ertaga"), (n) => n >= 0 && n <= 1],
    [loc("Ближайшие 7 дней", "Yaqin 7 kun"), (n) => n > 1 && n <= 7],
    [loc("8–30 дней", "8–30 kun"), (n) => n > 7 && n <= 30],
    [loc("Позже", "Keyinroq"), (n) => n > 30],
  ];

  return `
    ${head(t(loc("Дедлайны", "Muddatlar")),
      `<span>${items.length} ${t(loc("событий", "hodisa"))}</span><span class="faint">·</span>
       <span>${items.filter((d) => isPast(d.date)).length} ${t(loc("просрочено", "kechikkan"))}</span><span class="faint">·</span>
       <span>${t(loc("собираются автоматически из заявок, документов и задач", "arizalar, hujjatlar va vazifalardan avtomatik yig‘iladi"))}</span>`,
      `<button class="btn btn-secondary" data-go="calendar">${icon("calendar", 15)} ${t(loc("Открыть календарь", "Kalendarni ochish"))}</button>`)}

    ${smartFilter("deadlines", fields, simplePresets(), { shown: items.length, total: all.length })}

    ${groups.map(([label, test]) => {
      const list = items.filter((d) => test(daysUntil(d.date)));
      if (!list.length) return "";
      return `<section style="margin-bottom:30px">
        ${sectionTitle(t(label), `<span class="t-caption faint">${list.length}</span>`)}
        <div class="card divide">
          ${list.map((d) => {
            const kind = L.deadlineKind[d.kind];
            const n = daysUntil(d.date);
            return `<div class="row" style="flex-wrap:wrap;cursor:pointer" data-go="${d.go}">
              ${dot(kind.dot)}
              <span style="flex:1;min-width:200px">
                <span class="t-body-sm" style="display:block">${esc(t(d.title))}</span>
                <span class="t-micro faint">${esc(t(kind.label))}</span>
              </span>
              <span style="display:flex;align-items:center;gap:8px">${avatar(userById(d.ownerId)?.name ?? "—", 22)}<span class="t-caption muted nowrap">${esc(userById(d.ownerId)?.name ?? "")}</span></span>
              <span style="width:140px;text-align:right">
                <span class="t-caption num" style="display:block">${fmtDate(d.date)}</span>
                <span class="t-micro" style="color:${n < 0 ? "var(--risk)" : n <= 3 ? "var(--progress)" : "var(--ink-faint)"}">${relDeadline(d.date)}</span>
              </span>
            </div>`;
          }).join("")}
        </div>
      </section>`;
    }).join("")}`;
}

function screenFinance() {
  const withContract = scopedDeals().filter((a) => a.contractValue > 0);
  const fields = dealFields();
  const st = filterState("finance");
  const apps = withContract.filter((a) => matchesFilter(dealRow(a), fields, st.values, st.q));
  const contracted = apps.reduce((n, a) => n + a.contractValue, 0);
  const paid = apps.reduce((n, a) => n + a.paid, 0);
  const won = apps.filter((a) => currentStage(a) === "departed");
  const byManager = scopedTeam().map((u) => {
    const mine = apps.filter((a) => a.ownerId === u.id);
    return { u, count: mine.length, contracted: mine.reduce((n, a) => n + a.contractValue, 0), paid: mine.reduce((n, a) => n + a.paid, 0) };
  }).filter((r) => r.count).sort((a, b) => b.contracted - a.contracted);

  return `
    ${head(t(loc("Финансы", "Moliya")),
      `<span>${apps.length} ${t(loc("договоров в работе", "ishdagi shartnoma"))}</span><span class="faint">·</span>
       <span>${t(loc("суммы договоров с семьями в сумах", "oilalar bilan shartnoma summalari so‘mda"))}</span><span class="faint">·</span>
       <span>${t(loc("курс", "kurs"))}: 1$ = ${som(tenant().usdRate)}</span>`,
      `<button class="btn btn-secondary">${icon("export", 15)} ${t(loc("Выгрузить реестр", "Reestrni yuklash"))}</button>`)}

    ${smartFilter("finance", fields, simplePresets(), { shown: apps.length, total: withContract.length })}

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(210px,1fr))">
      ${tile(t(loc("Законтрактовано", "Shartnomalar summasi")), som(contracted, true), "", "var(--accent)")}
      ${tile(t(loc("Оплачено", "To‘langan")), som(paid, true), `${Math.round((paid / Math.max(1, contracted)) * 100)}% ${t(loc("от суммы договоров", "shartnoma summasidan"))}`, "var(--deal)")}
      ${tile(t(loc("Дебиторка", "Qarzdorlik")), som(contracted - paid, true), "", "var(--progress)")}
      ${tile(t(loc("Закрыто успешно", "Muvaffaqiyatli yopilgan")), String(won.length), `${som(won.reduce((n, a) => n + a.paid, 0), true)} ${t(loc("получено", "olingan"))}`, "var(--violet)")}
    </div>

    <section style="margin-top:34px">
      ${sectionTitle(t(loc("По менеджерам", "Menejerlar bo‘yicha")))}
      <div class="card divide">
        ${byManager.map((r) => `<div class="row" style="flex-wrap:wrap">
          ${avatar(r.u.name, 30)}
          <span style="flex:1;min-width:150px"><span class="t-body-sm" style="display:block">${esc(r.u.name)}</span><span class="t-micro faint">${esc(r.u.title)}</span></span>
          <span style="width:150px">${bar((r.paid / Math.max(1, r.contracted)) * 100)}</span>
          <span class="t-caption num muted" style="width:70px;text-align:right">${r.count} ${t(loc("дог.", "shart."))}</span>
          <span class="t-body-sm num" style="width:140px;text-align:right">${som(r.paid, true)}<span class="t-micro faint" style="display:block">${t(loc("из", "dan"))} ${som(r.contracted, true)}</span></span>
        </div>`).join("")}
      </div>
    </section>`;
}

function screenSettings() {
  const tn = tenant();
  const plans = { trial: loc("Пробный период", "Sinov davri"), standard: loc("Standard", "Standard"), pro: loc("Pro", "Pro"), enterprise: loc("Enterprise", "Enterprise") };
  return `
    ${head(t(loc("Настройки агентства", "Agentlik sozlamalari")),
      `<span>${esc(tn.name)}</span><span class="faint">·</span><span>${esc(t(plans[tn.plan]))}</span><span class="faint">·</span>
       <span>${tn.seatsUsed} / ${tn.seatsLimit} ${t(loc("мест", "o‘rin"))}</span>`,
      `<button class="btn btn-primary">${t(loc("Сохранить изменения", "O‘zgarishlarni saqlash"))}</button>`)}

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));align-items:start">
      <div class="card" style="padding:22px;min-width:0">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
          <span class="avatar" style="width:36px;height:36px;border-radius:10px">${icon("globe", 17)}</span>
          <span style="min-width:0">
            <span class="t-body-sm" style="display:block">${t(loc("Адрес системы", "Tizim manzili"))}</span>
            <span class="t-micro faint">${t(loc("Каждое агентство работает на своём поддомене — сотрудники и клиенты видят только его.", "Har bir agentlik o‘z subdomenida ishlaydi."))}</span>
          </span>
        </div>
        <div class="t-micro faint" style="text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">${t(loc("Поддомен платформы", "Platforma subdomeni"))}</div>
        <div style="display:flex;border:1px solid var(--hairline-soft);border-radius:10px;overflow:hidden;background:var(--surface-1)">
          <span class="t-body-sm" style="padding:10px 12px;flex:1;min-width:0">${esc(tn.slug)}</span>
          <span class="t-body-sm faint" style="padding:10px 12px;border-left:1px solid var(--hairline-soft)">.orbisystem.us</span>
        </div>
        <div class="t-micro faint" style="display:flex;align-items:center;gap:8px;margin-top:10px">${dot("var(--deal)")}https://${esc(tn.slug)}.orbisystem.us</div>

        <div style="border-top:1px solid var(--hairline-soft);margin-top:18px;padding-top:18px">
          <div class="t-micro faint" style="text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">${t(loc("Собственный домен агентства", "Agentlikning o‘z domeni"))}</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px">
            ${chip(tn.customDomain ?? t(loc("домен не подключён", "domen ulanmagan")), tn.customDomainStatus === "verified" ? "var(--deal)" : tn.customDomainStatus === "pending" ? "var(--progress)" : "var(--hold)")}
            <span class="t-micro faint">${t(tn.customDomainStatus === "verified" ? loc("DNS проверен, сертификат выпущен", "DNS tekshirildi, sertifikat berildi")
              : tn.customDomainStatus === "pending" ? loc("ждём проверки DNS", "DNS tekshiruvi kutilmoqda") : loc("можно подключить свой домен", "o‘z domeningizni ulash mumkin"))}</span>
          </div>
          <div style="border:1px solid var(--hairline-soft);border-radius:10px;background:var(--canvas);padding:14px;overflow-x:auto">
            <div class="t-micro faint" style="margin-bottom:8px">${t(loc("Что добавить в DNS домена агентства:", "Agentlik domeni DNS’iga qo‘shiladigan yozuvlar:"))}</div>
            <pre class="t-micro num muted" style="margin:0">CNAME   crm      →  ${esc(tn.slug)}.orbisystem.us
TXT     _orbis   →  orbis-verify=${esc(tn.slug)}-8f2a41</pre>
          </div>
        </div>
      </div>

      <div class="grid" style="min-width:0">
        <div class="card" style="padding:18px">
          <div class="t-caption faint" style="text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">${t(loc("Агентство", "Agentlik"))}</div>
          ${kv(t(loc("Название", "Nomi")), esc(tn.name))}
          ${kv(t(loc("Юридическое лицо", "Yuridik shaxs")), esc(tn.legalName))}
          ${kv(t(loc("Версия продукта", "Mahsulot versiyasi")), tn.edition === "mvp" ? "01 / MVP" : tn.edition === "crm" ? "02 / CRM" : "03 / Advanced")}
          ${kv(t(loc("Валюта договоров", "Shartnoma valyutasi")), S.locale === "ru" ? "Сум (UZS)" : "So‘m (UZS)")}
          ${kv(t(loc("Курс доллара", "Dollar kursi")), "1 $ = " + som(tn.usdRate))}
          ${kv(t(loc("В системе с", "Tizimda")), fmtDate(tn.createdAt))}
        </div>
        <div class="card" style="padding:18px">
          <div class="t-caption faint" style="text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">${t(loc("Филиалы", "Filiallar"))}</div>
          ${tn.branches.map((b) => kv(t(ref(L.city, b.city)), esc(t(ref(L.branch, b.name))))).join("")}
        </div>
      </div>
    </div>`;
}

function screenNotInEdition(module) {
  const required = Object.entries(MODULES_BY_EDITION).find(([, mods]) => mods.includes(module))?.[0] ?? "advanced";
  const code = required === "mvp" ? "01 / MVP" : required === "crm" ? "02 / CRM" : "03 / ADVANCED";
  const label = t(L.module[module] ?? loc("Раздел", "Bo‘lim"));
  const home = navItems()[0];
  return `<div class="card" style="max-width:520px;margin:64px auto;padding:44px 32px;text-align:center">
    <div class="t-micro faint" style="text-transform:uppercase;letter-spacing:.12em">${code}</div>
    <div class="t-headline" style="margin-top:12px">${esc(label)}</div>
    <p class="t-body-sm muted" style="margin:12px 0 0;line-height:1.55">${t(loc(
      "Модуль не входит в версию продукта этого агентства. Он открывается вместе с версией CRM — со всей работой по студентам: лиды, сделки, документы, задачи и сроки.",
      "Modul bu agentlikning mahsulot versiyasiga kirmaydi. U CRM versiyasi bilan ochiladi."))}</p>
    <p class="t-caption faint" style="margin-top:16px">${t(loc("Версия агентства", "Agentlik versiyasi"))}: ${tenant().edition === "mvp" ? "01 / MVP" : "02 / CRM"}</p>
    ${home ? `<button class="btn btn-primary" style="margin-top:24px" data-go="${home.href}">${esc(t(home.label))}</button>` : ""}
  </div>`;
}

function screenNoAccess(module) {
  const label = t(L.module[module] ?? loc("Раздел", "Bo‘lim"));
  return `<div class="card" style="max-width:480px;margin:64px auto;padding:44px 32px;text-align:center">
    <div class="t-headline">${t(loc("Раздел недоступен", "Bo‘lim mavjud emas"))}</div>
    <p class="t-body-sm muted" style="margin:12px 0 0;line-height:1.55">${esc(t(roleDef(user().role).label))} · ${esc(label)}</p>
    <p class="t-body-sm muted" style="margin:8px 0 0;line-height:1.55">${t(loc(
      "У роли нет прав на этот модуль. Матрица прав редактируется в разделе «Администрирование → Права доступа».",
      "Bu rolda modulga huquq yo‘q. Huquqlar «Boshqaruv → Kirish huquqlari» bo‘limida tahrirlanadi."))}</p>
  </div>`;
}

const screenNotFound = () => `<div class="card" style="max-width:440px;margin:64px auto;padding:44px 32px;text-align:center">
  <div class="t-display-sm num faint">404</div>
  <div class="t-headline" style="margin-top:10px">${t(loc("Запись не найдена", "Yozuv topilmadi"))}</div>
  <p class="t-body-sm muted" style="margin:12px 0 0;line-height:1.55">${t(loc(
    "Её нет либо она вне вашей зоны видимости: система не показывает записи чужого агентства, филиала или коллеги.",
    "U mavjud emas yoki ko‘rish doirangizdan tashqarida."))}</p>
</div>`;
