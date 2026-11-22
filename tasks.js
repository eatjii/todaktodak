/* =========================================================
   할 일 쪼개기
   - 월/주 캘린더, 날짜를 누르면 그날 목록
   - 종류: 일정(수업·일·알바·병원·기타) / 과제·할 일 / 일상
   - 시간: 아무 때나 또는 시간 정하기
   - 반복: 안 함 · 매일 · 평일 · 매주(요일) · 매월
   - 다 못 한 일은 내일로 미루기 → 미룬 일은 맨 위에
   - 과제는 작은 단계로 쪼갤 수 있어요
   ========================================================= */
(function () {
  var user = TodakStore.currentUser();
  if (!user) return;
  var KEY = "todak-tasks:" + user.email;
  var ICON = "assets/icons/";
  var DOW = ["월", "화", "수", "목", "금", "토", "일"];
  var TYPES = {
    event: { n: "일정", icon: "hand-point-right.svg", hint: "수업, 일, 알바, 병원" },
    task: { n: "과제·할 일", icon: "hand-index-one.svg", hint: "해야 할 일" },
    daily: { n: "일상", icon: "hand-high-five-pink.svg", hint: "빨래, 장보기 등" }
  };
  var CATS = [
    { k: "class", n: "📚 수업" }, { k: "work", n: "💼 일" }, { k: "parttime", n: "🧾 알바" },
    { k: "hospital", n: "🏥 병원" }, { k: "etc", n: "📌 기타" }
  ];
  var REPEATS = [
    { k: "none", n: "안 함" }, { k: "daily", n: "매일" }, { k: "weekdays", n: "평일" },
    { k: "weekly", n: "매주" }, { k: "monthly", n: "매월" }
  ];

  /* ---------- 저장 ---------- */
  function load() {
    try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && d.items) return d; } catch (e) {}
    return { items: [], done: {}, moved: {}, steps: {}, dismiss: {}, carried: {} };
  }
  var db = load();
  db.steps = db.steps || {}; db.dismiss = db.dismiss || {}; db.carried = db.carried || {};
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }

  /* ---------- 날짜 ---------- */
  function ymd(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function add(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function dow(d) { return (d.getDay() + 6) % 7; }             // 월=0 … 일=6
  function weekStart(d) { return add(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -dow(d)); }
  var TODAY = ymd(new Date());
  function label(s) { var d = parse(s); return (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + DOW[dow(d)] + ")"; }

  /* ---------- 반복 계산 ---------- */
  function occursOn(it, s) {
    if (s < it.date) return false;
    var r = it.repeat || { kind: "none" };
    if (r.until && s > r.until) return false;
    var d = parse(s), start = parse(it.date);
    switch (r.kind) {
      case "daily": return true;
      case "weekdays": return dow(d) < 5;
      case "weekly": return (r.days && r.days.length ? r.days : [dow(start)]).indexOf(dow(d)) >= 0;
      case "monthly": return d.getDate() === start.getDate();
      default: return s === it.date;
    }
  }
  function occKey(it, s) { return it.id + "@" + s; }
  function itemsOn(s) {
    return db.items.filter(function (it) { return occursOn(it, s) && !db.moved[occKey(it, s)]; })
      .map(function (it) {
        var k = occKey(it, s);
        return { it: it, day: s, key: k, done: !!db.done[k], moved: !!it.moved || !!db.carried[k], movedFrom: it.movedFrom || db.carried[k] || "" };
      })
      .sort(function (a, b) {
        if (b.moved - a.moved) return b.moved - a.moved;   // 미룬 일 먼저
        var ta = a.it.anytime ? "99" : a.it.time || "99", tb = b.it.anytime ? "99" : b.it.time || "99";
        return ta.localeCompare(tb);
      });
  }

  /* ---------- 상태 ---------- */
  var view = (user.tasksView === "week") ? "week" : "month";
  var cursor = new Date();               // 보고 있는 달/주
  var sel = TODAY;                       // 고른 날

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var toastT;
  function toast(m) {
    var t = $("#toast"); t.textContent = m; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }
  function cls(o) { return o.it.type + (o.moved ? " moved" : "") + (o.done ? " done" : ""); }
  function timeText(it) {
    if (it.anytime || !it.time) return "아무 때나";
    return it.time + (it.end ? "~" + it.end : "");
  }
  // 한글 없이 숫자만 있는 글자는 DynaPuff 서체로 (시계와 같은 서체)
  function nf(t) { return /^[0-9:~\-\/.\s]+$/.test(t) ? '<span class="nf">' + t + "</span>" : t; }
  function timeHTML(it) { return nf(timeText(it)); }
  function catName(k) { var c = CATS.filter(function (x) { return x.k === k; })[0]; return c ? c.n : ""; }
  function repeatText(r) {
    if (!r || r.kind === "none") return "";
    if (r.kind === "weekly") return "매주 " + (r.days || []).slice().sort().map(function (i) { return DOW[i]; }).join("·");
    return { daily: "매일", weekdays: "평일마다", monthly: "매월" }[r.kind];
  }

  /* ---------- 캘린더 ---------- */
  function renderCalendar() {
    $$(".view-toggle button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === view)); });
    var html = "";
    if (view === "month") {
      var y = cursor.getFullYear(), m = cursor.getMonth();
      $("#cal-title").textContent = y + "년 " + (m + 1) + "월";
      var first = new Date(y, m, 1), start = add(first, -dow(first));
      var weeks = Math.ceil((dow(first) + new Date(y, m + 1, 0).getDate()) / 7);
      html += '<div class="dow">' + DOW.map(function (d) { return "<span>" + d + "</span>"; }).join("") + "</div><div class=\"month\">";
      for (var i = 0; i < weeks * 7; i++) {
        var d = add(start, i), s = ymd(d), list = itemsOn(s);
        var c = "day" + (d.getMonth() !== m ? " other" : "") + (s === TODAY ? " is-today" : "") + (s === sel ? " is-sel" : "");
        html += '<button type="button" class="' + c + '" data-day="' + s + '" aria-label="' + label(s) + ", " + list.length + '개">' +
          '<span class="num nf">' + d.getDate() + "</span>" +
          list.slice(0, 3).map(function (o) { return '<span class="pill ' + cls(o) + '">' + (o.moved ? "↪ " : "") + esc(o.it.title) + "</span>"; }).join("") +
          (list.length > 3 ? '<span class="more">+' + (list.length - 3) + "개 더</span>" : "") + "</button>";
      }
      html += "</div>";
    } else {
      var ws = weekStart(cursor), we = add(ws, 6);
      $("#cal-title").textContent = (ws.getMonth() + 1) + "월 " + ws.getDate() + "일 ~ " + (we.getMonth() + 1) + "월 " + we.getDate() + "일";
      html += '<div class="week">';
      for (var j = 0; j < 7; j++) {
        var dd = add(ws, j), ss = ymd(dd), l = itemsOn(ss);
        html += '<button type="button" class="wcol' + (ss === TODAY ? " is-today" : "") + (ss === sel ? " is-sel" : "") + '" data-day="' + ss + '" aria-label="' + label(ss) + ", " + l.length + '개">' +
          '<span class="whead"><b class="nf">' + dd.getDate() + "</b><span>" + DOW[j] + (ss === TODAY ? " · 오늘" : "") + "</span></span>" +
          (l.length ? l.map(function (o) {
            return '<span class="witem ' + cls(o) + '"><small>' + (o.moved ? "↪ 미룬 일 · " : "") + timeHTML(o.it) + "</small>" + esc(o.it.title) + "</span>";
          }).join("") : '<span class="wempty">비어 있어요</span>') + "</button>";
      }
      html += "</div>";
    }
    $("#calendar").innerHTML = html;
  }

  /* ---------- 고른 날 목록 ---------- */
  function itemHTML(o) {
    var it = o.it, steps = it.steps || [], sdone = db.steps[o.key] || {};
    var nDone = steps.filter(function (_, i) { return sdone[i]; }).length;
    var meta = '<span class="tag time">' + timeHTML(it) + "</span>" +
      '<span class="tag">' + (it.type === "event" && it.cat ? catName(it.cat) : TYPES[it.type].n) + "</span>" +
      (repeatText(it.repeat) ? '<span class="tag">🔁 ' + repeatText(it.repeat) + "</span>" : "") +
      (o.moved ? '<span class="tag moved">↪ ' + (o.movedFrom ? label(o.movedFrom).replace(/ \(.\)/, "") + "에서 " : "") + "미룬 일</span>" : "") +
      (steps.length ? '<span class="tag">작은 단계 ' + nDone + "/" + steps.length + "</span>" : "");
    return '<li class="item ' + cls(o) + '" data-key="' + o.key + '" data-id="' + it.id + '">' +
      '<button type="button" class="i-check" data-act="check" aria-pressed="' + o.done + '" aria-label="' + esc(it.title) + ' 완료">✓</button>' +
      '<div class="i-body"><p class="i-title">' + esc(it.title) + '</p><div class="i-meta">' + meta + "</div>" +
      (steps.length ? '<div class="steps-bar"><i style="width:' + (nDone / steps.length * 100) + '%"></i></div><ul class="steps">' +
        steps.map(function (st, i) {
          return '<li class="' + (sdone[i] ? "done" : "") + '"><label><input type="checkbox" data-step="' + i + '"' + (sdone[i] ? " checked" : "") + "><span>" + esc(st) + "</span></label></li>";
        }).join("") + "</ul>" : "") +
      "</div>" +
      '<div class="i-acts">' + (!o.done ? '<button type="button" class="defer" data-act="defer">내일로 미루기</button>' : "") +
      '<button type="button" data-act="edit">수정</button></div></li>';
  }
  function renderDay() {
    var list = itemsOn(sel);
    $("#day-title").textContent = label(sel) + (sel === TODAY ? " · 오늘" : "");
    var left = list.filter(function (o) { return !o.done; }).length;
    $("#day-sub").textContent = !list.length ? "아직 아무것도 없어요." :
      left ? "남은 일 " + left + "개 · 하나씩 해도 충분해요." : "모두 끝냈어요! 오늘 정말 잘했어요.";
    var moved = list.filter(function (o) { return o.moved; }),
      timed = list.filter(function (o) { return !o.moved && !o.it.anytime && o.it.time; }),
      any = list.filter(function (o) { return !o.moved && (o.it.anytime || !o.it.time); });
    var html = "";
    if (moved.length) html += '<p class="group-title moved">↪ 미룬 일</p><ul class="items">' + moved.map(itemHTML).join("") + "</ul>";
    if (timed.length) html += '<p class="group-title">🕘 시간 정한 일</p><ul class="items">' + timed.map(itemHTML).join("") + "</ul>";
    if (any.length) html += '<p class="group-title">🌿 하루 중 아무 때나</p><ul class="items">' + any.map(itemHTML).join("") + "</ul>";
    if (!list.length) html = '<div class="empty-day"><img src="' + ICON + 'hand-palm.svg" alt="">비어 있는 날이에요.<br>위에 빠르게 적거나 ‘+ 추가하기’를 눌러 보세요.</div>';
    $("#day-list").innerHTML = html;
    renderCarry();
  }

  /* 어제 못 한 일을 오늘로 가져오기 */
  function leftovers() {
    var y = ymd(add(parse(TODAY), -1));
    return itemsOn(y).filter(function (o) { return !o.done && o.it.type !== "event"; });
  }
  function renderCarry() {
    var l = sel === TODAY && !db.dismiss[TODAY] ? leftovers() : [];
    $("#carry").hidden = !l.length;
    if (l.length) $("#carry-text").textContent = "어제 다 못 한 일이 " + l.length + "개 있어요. 오늘로 가져올까요?";
  }
  $("#carry-yes").addEventListener("click", function () {
    var l = leftovers();
    l.forEach(function (o) { defer(o, TODAY); });
    save(); refresh();
    toast(l.length + "개를 오늘로 가져왔어요. 맨 위에서 볼 수 있어요.");
  });
  $("#carry-no").addEventListener("click", function () { db.dismiss[TODAY] = 1; save(); renderCarry(); });

  /* 미루기: 한 번만 있는 일은 날짜를 옮기고, 반복되는 일은 그날 것만 복사해서 옮겨요 */
  function defer(o, toDay) {
    var it = o.it, to = toDay || ymd(add(parse(o.day), 1));
    if (!it.repeat || it.repeat.kind === "none") {
      it.movedFrom = it.movedFrom || it.date;
      it.date = to; it.moved = true;
      if (db.steps[o.key]) { db.steps[it.id + "@" + to] = db.steps[o.key]; delete db.steps[o.key]; }
    } else if (occursOn(it, to)) {
      // 반복되는 일이 그날에도 있으면 새로 만들지 않고 그날 것을 '미룬 일'로 맨 위에 올려요
      db.moved[o.key] = 1;
      db.carried[occKey(it, to)] = o.day;
    } else {
      db.moved[o.key] = 1;
      db.items.push({
        id: "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        type: it.type, cat: it.cat, title: it.title, date: to, time: it.time, end: it.end, anytime: it.anytime,
        repeat: { kind: "none" }, steps: (it.steps || []).slice(), moved: true, movedFrom: o.day
      });
    }
  }

  $("#day-list").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var li = b.closest(".item"), key = li.getAttribute("data-key"), id = li.getAttribute("data-id");
    var it = db.items.filter(function (x) { return x.id === id; })[0];
    var o = { it: it, key: key, day: sel };
    var act = b.getAttribute("data-act");
    if (act === "check") {
      if (db.done[key]) delete db.done[key]; else db.done[key] = 1;
      save(); refresh();
      if (db.done[key]) {
        toast(["해냈어요! 잘했어요.", "하나 끝! 멋져요.", "체크 완료. 오늘도 한 걸음 나아갔어요."][Math.floor(Math.random() * 3)]);
        if (it.type !== "event") TodakStore.log("taskDone", { title: it.title, type: it.type });
      }
    } else if (act === "defer") {
      defer(o); save(); refresh();
      toast("내일로 미뤘어요. 괜찮아요, 내일 맨 위에서 다시 만나요.");
    } else if (act === "edit") {
      openEditor(it);
    }
  });
  $("#day-list").addEventListener("change", function (e) {
    if (!e.target.matches("[data-step]")) return;
    var key = e.target.closest(".item").getAttribute("data-key");
    db.steps[key] = db.steps[key] || {};
    db.steps[key][e.target.getAttribute("data-step")] = e.target.checked;
    save(); renderDay();
  });

  $("#quick").addEventListener("submit", function (e) {
    e.preventDefault();
    var t = $("#quick-text").value.trim();
    if (!t) { $("#quick-text").focus(); return; }
    db.items.push({ id: "i" + Date.now().toString(36), type: "task", title: t, date: sel, time: "", anytime: true, repeat: { kind: "none" }, steps: [] });
    save(); $("#quick-text").value = ""; refresh();
    toast("‘" + t + "’ 추가했어요.");
  });

  /* ---------- 추가 · 수정 창 ---------- */
  var overlay = document.createElement("div");
  overlay.className = "auth-overlay";
  overlay.innerHTML = '<div class="auth-card task-card" role="dialog" aria-modal="true" aria-labelledby="t-title">' +
    '<button type="button" class="auth-close" aria-label="창 닫기">×</button><div class="t-body"></div></div>';
  document.body.appendChild(overlay);
  var lastFocus = null;
  function closeEditor() {
    overlay.classList.remove("is-open");
    document.body.classList.remove("auth-locked");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeEditor(); });
  $(".auth-close", overlay).addEventListener("click", closeEditor);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && overlay.classList.contains("is-open")) closeEditor(); });

  function openEditor(it) {
    var isNew = !it;
    var f = it ? JSON.parse(JSON.stringify(it)) : { type: "task", cat: "class", title: "", date: sel, time: "", end: "", anytime: true, repeat: { kind: "none", days: [], until: "" }, steps: [] };
    f.repeat = f.repeat || { kind: "none" };
    f.repeat.days = f.repeat.days || [];
    var body = $(".t-body", overlay);
    body.innerHTML =
      '<h2 class="auth-title" id="t-title" style="margin-bottom:18px">' + (isNew ? "무엇을 추가할까요?" : "고치기") + "</h2>" +
      '<form class="t-form" novalidate>' +
      '<span class="row-label">종류</span><div class="types">' +
      Object.keys(TYPES).map(function (k) {
        return '<button type="button" data-type="' + k + '" aria-pressed="' + (f.type === k) + '"><span class="ti"><img src="' + ICON + TYPES[k].icon + '" alt=""></span>' + TYPES[k].n + "<small>" + TYPES[k].hint + "</small></button>";
      }).join("") + "</div>" +
      '<div id="f-cat-wrap"><span class="row-label">어떤 일정인가요?</span><div class="seg" id="f-cat">' +
      CATS.map(function (c) { return '<button type="button" data-cat="' + c.k + '" aria-pressed="' + (f.cat === c.k) + '">' + c.n + "</button>"; }).join("") + "</div></div>" +
      '<label class="row-label" for="f-title">제목</label><input type="text" id="f-title" maxlength="40" value="' + esc(f.title) + '">' +
      '<label class="row-label" for="f-date">날짜 <small>(반복하면 시작하는 날)</small></label><input type="date" id="f-date" value="' + f.date + '">' +
      '<span class="row-label">시간</span><div class="seg" id="f-when">' +
      '<button type="button" data-when="any" aria-pressed="' + !!f.anytime + '">하루 중 아무 때나</button>' +
      '<button type="button" data-when="time" aria-pressed="' + !f.anytime + '">시간 정하기</button></div>' +
      '<div class="two" id="f-times"><label>시작<input type="time" id="f-time" value="' + (f.time || "") + '"></label>' +
      '<label id="f-end-wrap">끝 <small>(선택)</small><input type="time" id="f-end" value="' + (f.end || "") + '"></label></div>' +
      '<span class="row-label">반복</span><div class="seg" id="f-rep">' +
      REPEATS.map(function (r) { return '<button type="button" data-rep="' + r.k + '" aria-pressed="' + (f.repeat.kind === r.k) + '">' + r.n + "</button>"; }).join("") + "</div>" +
      '<div id="f-days-wrap"><span class="row-label">무슨 요일마다?</span><div class="seg days" id="f-days">' +
      DOW.map(function (d, i) { return '<button type="button" data-d="' + i + '" aria-pressed="' + (f.repeat.days.indexOf(i) >= 0) + '">' + d + "</button>"; }).join("") + "</div></div>" +
      '<div id="f-until-wrap"><label class="row-label" for="f-until">언제까지 <small>(비워 두면 계속)</small></label><input type="date" id="f-until" value="' + (f.repeat.until || "") + '"></div>' +
      '<div id="f-steps-wrap"><span class="row-label">작게 쪼개기 <small>(선택 · 큰 일을 작은 단계로)</small></span><div class="step-edit" id="f-steps"></div>' +
      '<button type="button" class="add-step" id="f-add-step">+ 단계 추가</button></div>' +
      '<p class="t-note" id="f-note" role="status"></p>' +
      '<div class="t-actions">' + (isNew ? "" : '<button type="button" class="btn btn-ghost del" id="f-del">삭제</button>') +
      '<button type="submit" class="btn btn-fill">' + (isNew ? "추가하기" : "저장하기") + "</button></div></form>";

    var PH = { event: "예) 디자인사고 수업", task: "예) 리포트 서론 쓰기", daily: "예) 빨래 돌리기" };
    function sync() {
      $$("[data-type]", body).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-type") === f.type)); });
      $("#f-cat-wrap", body).hidden = f.type !== "event";
      $$("[data-cat]", body).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-cat") === f.cat)); });
      $("#f-title", body).placeholder = PH[f.type];
      $$("[data-when]", body).forEach(function (b) { b.setAttribute("aria-pressed", String((b.getAttribute("data-when") === "any") === !!f.anytime)); });
      $("#f-times", body).hidden = !!f.anytime;
      $("#f-end-wrap", body).hidden = f.type !== "event";
      $$("[data-rep]", body).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-rep") === f.repeat.kind)); });
      $("#f-days-wrap", body).hidden = f.repeat.kind !== "weekly";
      $$("[data-d]", body).forEach(function (b) { b.setAttribute("aria-pressed", String(f.repeat.days.indexOf(+b.getAttribute("data-d")) >= 0)); });
      $("#f-until-wrap", body).hidden = f.repeat.kind === "none";
      $("#f-steps-wrap", body).hidden = f.type === "event";
    }
    function stepRow(v) { return '<div class="srow"><input type="text" maxlength="40" value="' + esc(v) + '" placeholder="예) 자료 하나 찾기"><button type="button" aria-label="단계 지우기">×</button></div>'; }
    $("#f-steps", body).innerHTML = (f.steps || []).map(stepRow).join("");

    body.onclick = function (e) {
      var t = e.target.closest("button");
      if (!t) return;
      if (t.hasAttribute("data-type")) {
        f.type = t.getAttribute("data-type");
        if (isNew) f.anytime = f.type !== "event";          // 일정은 보통 시간이 있으니 '시간 정하기'로
      }
      if (t.hasAttribute("data-cat")) f.cat = t.getAttribute("data-cat");
      if (t.hasAttribute("data-when")) f.anytime = t.getAttribute("data-when") === "any";
      if (t.hasAttribute("data-rep")) {
        f.repeat.kind = t.getAttribute("data-rep");
        if (f.repeat.kind === "weekly" && !f.repeat.days.length) f.repeat.days = [dow(parse($("#f-date", body).value || sel))];
      }
      if (t.hasAttribute("data-d")) {
        var d = +t.getAttribute("data-d"), i = f.repeat.days.indexOf(d);
        if (i >= 0) f.repeat.days.splice(i, 1); else f.repeat.days.push(d);
      }
      if (t.id === "f-add-step") { $("#f-steps", body).insertAdjacentHTML("beforeend", stepRow("")); $("#f-steps .srow:last-child input", body).focus(); }
      if (t.closest(".srow") && t.tagName === "BUTTON") t.closest(".srow").remove();
      if (t.id === "f-del") {
        if (t.dataset.sure) {
          db.items = db.items.filter(function (x) { return x.id !== it.id; });
          save(); closeEditor(); refresh(); toast("지웠어요.");
          return;
        }
        t.dataset.sure = "1";
        t.textContent = it.repeat && it.repeat.kind !== "none" ? "반복 전체 삭제?" : "정말 삭제?";
      }
      sync();
    };
    $("form", body).onsubmit = function (e) {
      e.preventDefault();
      var title = $("#f-title", body).value.trim();
      var note = $("#f-note", body);
      if (!title) { note.textContent = "제목만 적어 주면 돼요."; $("#f-title", body).focus(); return; }
      f.title = title;
      f.date = $("#f-date", body).value || sel;
      f.time = f.anytime ? "" : $("#f-time", body).value;
      f.end = f.anytime || f.type !== "event" ? "" : $("#f-end", body).value;
      if (!f.anytime && !f.time) { note.textContent = "시작 시간을 골라 주세요. 아니면 ‘하루 중 아무 때나’로 해도 돼요."; return; }
      if (f.repeat.kind === "weekly" && !f.repeat.days.length) { note.textContent = "반복할 요일을 하나 이상 골라 주세요."; return; }
      f.repeat.until = f.repeat.kind === "none" ? "" : $("#f-until", body).value;
      if (f.type !== "event") f.cat = "";
      f.steps = f.type === "event" ? [] : $$("#f-steps input", body).map(function (i) { return i.value.trim(); }).filter(Boolean);
      if (isNew) { f.id = "i" + Date.now().toString(36); db.items.push(f); }
      else { db.items = db.items.map(function (x) { return x.id === it.id ? f : x; }); }
      save();
      sel = f.date; cursor = parse(f.date);
      closeEditor(); refresh();
      toast(isNew ? "‘" + f.title + "’ 추가했어요." : "고쳤어요.");
    };
    sync();
    lastFocus = document.activeElement;
    overlay.classList.add("is-open");
    document.body.classList.add("auth-locked");
    setTimeout(function () { $("#f-title", body).focus(); }, 80);
  }
  $("#add-btn").addEventListener("click", function () { openEditor(null); });

  /* ---------- 캘린더 조작 ---------- */
  $("#calendar").addEventListener("click", function (e) {
    var b = e.target.closest("[data-day]");
    if (!b) return;
    sel = b.getAttribute("data-day");
    if (view === "month" && parse(sel).getMonth() !== cursor.getMonth()) cursor = parse(sel);
    refresh();
    if (window.innerWidth < 760) $("#day-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#prev").addEventListener("click", function () { move(-1); });
  $("#next").addEventListener("click", function () { move(1); });
  function move(n) {
    if (view === "month") cursor = new Date(cursor.getFullYear(), cursor.getMonth() + n, 1);
    else cursor = add(cursor, 7 * n);
    renderCalendar();
  }
  $("#go-today").addEventListener("click", function () { cursor = new Date(); sel = TODAY; refresh(); });
  $$(".view-toggle button").forEach(function (b) {
    b.addEventListener("click", function () {
      view = b.getAttribute("data-view");
      cursor = parse(sel);
      TodakStore.updateUser(user.email, { tasksView: view });
      renderCalendar();
    });
  });

  function refresh() { renderCalendar(); renderDay(); }
  refresh();

  window.TodakTasks = { itemsOn: itemsOn, ymd: ymd };
})();
