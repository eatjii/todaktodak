/* =========================================================
   오늘의 나: 하루 에너지 · 상태 기록 · 작은 행동 추천
   ========================================================= */
(function () {
  var user = TodakStore.currentUser();
  if (!user) return;
  var W = TodakWeather, A = TodakActions;

  var SLOTS = [
    { k: "morning", n: "아침", time: "5~11시", from: 5, to: 11 },
    { k: "lunch", n: "점심", time: "11~16시", from: 11, to: 16 },
    { k: "evening", n: "저녁", time: "16~21시", from: 16, to: 21 },
    { k: "night", n: "밤", time: "21~5시", from: 21, to: 29 }
  ];
  var ENERGY = ["방전 직전", "누워 있고 싶음", "시동 거는 중", "제법 여유", "활력 넘침"];
  var FOCUS = ["멍해요", "흐릿해요", "보통이에요", "잘 돼요", "아주 맑아요"];

  function $(s) { return document.querySelector(s); }
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

  /* 토닥 하루는 새벽 5시에 시작해요 (밤 1시 기록은 전날 '밤'으로) */
  function dayKey(d) {
    d = new Date(d.getTime() - 5 * 3600 * 1000);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function slotOf(d) {
    var h = d.getHours(); if (h < 5) h += 24;
    return SLOTS.filter(function (s) { return h >= s.from && h < s.to; })[0] || SLOTS[0];
  }
  function todayRecords() {
    var key = dayKey(new Date()), map = {};
    TodakStore.events("mood").forEach(function (ev) {
      if (ev.day === key) map[ev.slot] = ev;          // 같은 때는 가장 마지막 기록
    });
    return map;
  }

  var style = "todak";   // 토닥 아이콘으로 고정
  var nowSlot = slotOf(new Date()).k;
  var state = { slot: nowSlot, mood: 0, energy: 0, focus: 0 };

  /* ---------- 하루 에너지 ---------- */
  function meter(kind, label, v) {
    var dots = "";
    for (var i = 1; i <= 5; i++) dots += '<span class="' + (i <= v ? "on" : "") + '"></span>';
    return '<span class="meter ' + kind + '">' + label + " <i>" + dots + "</i></span>";
  }
  function renderSlots() {
    var rec = todayRecords();
    var nowIdx = SLOTS.map(function (s) { return s.k; }).indexOf(nowSlot);
    var tIdx = SLOTS.map(function (s) { return s.k; }).indexOf(state.slot);
    var html = '<li class="track" aria-hidden="true"><span class="fill" style="width:' + (nowIdx / 3 * 100) + '%"></span></li>';
    html += SLOTS.map(function (s, i) {
      var r = rec[s.k];
      var st = r ? "done" : i === nowIdx ? "now" : i < nowIdx ? "missed" : "future";
      var label = s.n + (r ? " 기록: " + W.MOODS[r.weather - 1].name + ", 에너지 " + r.energy + ", 집중 " + r.focus : " 기록 없음") + ". 눌러서 기록하기";
      var inner = r ? W.icon(r.weather, style) : st === "future" ? String(i + 1) : "+";
      return '<li class="step ' + st + (i === nowIdx ? " is-now" : "") + (i === tIdx ? " is-target" : "") + '">' +
        '<button type="button" data-slot="' + s.k + '" aria-label="' + label + '"' + (i === tIdx ? ' aria-current="step"' : "") + ">" +
        '<span class="node">' + inner + "</span>" +
        '<span class="s-name">' + s.n + (i === nowIdx ? ' <em>지금</em>' : "") + "</span>" +
        '<span class="s-time">' + s.time + "</span>" +
        (r ? meter("energy", "에너지", r.energy) + meter("focus", "집중", r.focus) : "") +
        "</button></li>";
    }).join("");
    $("#slots").innerHTML = html;
    $("#check").style.setProperty("--notch", (12.5 + tIdx * 25) + "%");

    var list = SLOTS.filter(function (s) { return rec[s.k]; });
    var sum = $("#day-summary");
    if (!list.length) sum.textContent = "아직 오늘 기록이 없어요. 지금 상태부터 가볍게 남겨 볼까요?";
    else if (list.length === 1) sum.textContent = list[0].n + "에 기록했어요. 다른 때도 생각나면 동그라미를 눌러 남겨 주세요.";
    else {
      var best = list.reduce(function (a, b) { return rec[b.k].energy > rec[a.k].energy ? b : a; });
      sum.textContent = "오늘 에너지가 가장 높았던 때는 " + best.n + "이에요. 그 시간에 작은 일을 해 보면 좋아요.";
    }
  }

  /* ---------- 상태 기록 ---------- */
  function renderMoods() {
    $("#moods").setAttribute("role", "radiogroup");
    $("#moods").setAttribute("aria-label", "기분 날씨");
    $("#moods").innerHTML = W.MOODS.map(function (m) {
      return '<button type="button" class="mood" role="radio" aria-checked="' + (state.mood === m.v) + '" data-mood="' + m.v + '">' +
        '<span class="wx">' + W.icon(m.v, style) + "</span><b>" + m.name + "</b><small>" + m.desc + "</small></button>";
    }).join("");
  }
  function renderLevels(id, names, val) {
    var box = $("#" + id);
    box.setAttribute("role", "radiogroup");
    box.setAttribute("aria-label", id === "energy" ? "몸의 에너지" : "집중력");
    box.innerHTML = names.map(function (n, i) {
      return '<button type="button" class="lv" role="radio" aria-checked="' + (val === i + 1) + '" data-v="' + (i + 1) + '"><b>' + (i + 1) + "</b><small>" + n + "</small></button>";
    }).join("");
    $("#" + id + "-now").textContent = val ? val + "단계 · " + names[val - 1] : "";
  }
  function renderForm() {
    var s = SLOTS.filter(function (x) { return x.k === state.slot; })[0];
    $("#slot-tag").textContent = s.n;
    renderMoods();
    renderLevels("energy", ENERGY, state.energy);
    renderLevels("focus", FOCUS, state.focus);
  }
  function loadSlot(k) {
    state.slot = k;
    var r = todayRecords()[k];
    state.mood = r ? r.weather : 0;
    state.energy = r ? r.energy : 0;
    state.focus = r ? r.focus : 0;
    $("#memo").value = r ? (r.memo || "") : "";
    $("#save-btn").textContent = r ? "기록 고치기" : "기록하기";
    $("#form-note").textContent = "";
    renderForm();
    renderSlots();
  }

  $("#slots").addEventListener("click", function (e) {
    var b = e.target.closest("[data-slot]");
    if (!b) return;
    loadSlot(b.getAttribute("data-slot"));
    $("#check").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#moods").addEventListener("click", function (e) {
    var b = e.target.closest("[data-mood]");
    if (!b) return;
    state.mood = Number(b.getAttribute("data-mood"));
    renderForm();
    renderActs();
  });
  ["energy", "focus"].forEach(function (id) {
    $("#" + id).addEventListener("click", function (e) {
      var b = e.target.closest("[data-v]");
      if (!b) return;
      state[id] = Number(b.getAttribute("data-v"));
      renderForm();
      if (id === "energy") renderActs();
    });
  });
  $("#check-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var miss = [];
    if (!state.mood) miss.push("기분 날씨");
    if (!state.energy) miss.push("에너지");
    if (!state.focus) miss.push("집중력");
    if (miss.length) { $("#form-note").textContent = miss.join(", ") + "만 골라 주면 돼요."; return; }
    TodakStore.log("mood", {
      day: dayKey(new Date()), slot: state.slot, weather: state.mood,
      energy: state.energy, focus: state.focus, memo: $("#memo").value.trim()
    });
    $("#form-note").textContent = "";
    $("#save-btn").textContent = "기록 고치기";
    renderSlots();
    renderActs(true);
    toast("기록했어요. 솔직하게 알려 줘서 고마워요.");
    setTimeout(function () { $("#acts").scrollIntoView({ behavior: "smooth", block: "start" }); }, 400);
  });

  /* ---------- 작은 행동 ---------- */
  var shown = [], opened = null;
  function currentEnergy() {
    if (state.energy) return state.energy;
    var rec = todayRecords(), last = null;
    SLOTS.forEach(function (s) { if (rec[s.k]) last = rec[s.k]; });
    return last ? last.energy : 0;
  }
  function renderActs(fresh, firstAction) {
    var e = currentEnergy();
    $("#act-reason").textContent = e
      ? "에너지 " + e + "단계(" + ENERGY[e - 1] + ")에 맞춰 골랐어요. 하나만 해도 충분해요."
      : "아직 기록이 없어서 아주 가벼운 것부터 골랐어요.";
    var list = A.recommend(e || 2, firstAction ? 2 : 3, fresh ? [] : shown.map(function (a) { return a.id; }));
    if (firstAction) list.unshift(firstAction);
    shown = list;
    opened = null;
    $("#act-list").innerHTML = list.map(cardHTML).join("");
  }
  function cardHTML(a) {
    return '<li class="act" data-id="' + a.id + '">' +
      '<div class="act-top"><span class="act-emoji" aria-hidden="true"><img src="assets/icons/' + A.iconOf(a) + '" alt=""></span>' +
      '<div class="act-meta"><span class="chip time">⏱ ' + A.timeLabel(a.sec) + '</span><span class="chip">' + a.cat + "</span></div></div>" +
      '<p class="act-title">' + esc(a.t) + "</p>" +
      '<div class="act-btns"><button type="button" class="btn btn-fill" data-do="open">해 볼까요?</button></div></li>';
  }
  function openCard(li, a) {
    li.classList.add("is-open");
    li.querySelector(".act-btns").innerHTML =
      '<div class="row"><button type="button" class="btn btn-fill" data-do="done">다 했어요</button>' +
      '<button type="button" class="btn btn-outline" data-do="partial">조금 했어요</button></div>' +
      (a.sec >= 60 ? '<a class="btn btn-outline" href="main.html?timer=' + Math.round(a.sec / 60) + '#timer">⏱ 타이머로 함께하기 (' + A.timeLabel(a.sec) + ")</a>" : "") +
      '<button type="button" class="btn btn-ghost" data-do="later">다음에 할게요</button>';
  }
  $("#act-list").addEventListener("click", function (e) {
    var b = e.target.closest("[data-do]");
    if (!b) return;
    var li = b.closest(".act"), a = A.find(li.getAttribute("data-id")), act = b.getAttribute("data-do");
    if (act === "open") {
      if (opened && opened !== li) renderCardReset(opened);
      opened = li; openCard(li, a);
    } else if (act === "later") {
      renderCardReset(li);
    } else {
      var msg = A.complete(a, act);
      li.classList.remove("is-open");
      li.classList.add("is-done");
      li.querySelector(".act-btns").innerHTML = '<p class="act-msg">' + (act === "done" ? "✔ " : "🌱 ") + esc(msg) + "</p>";
      renderDone();
    }
  });
  function renderCardReset(li) {
    li.classList.remove("is-open");
    li.querySelector(".act-btns").innerHTML = '<button type="button" class="btn btn-fill" data-do="open">해 볼까요?</button>';
    if (opened === li) opened = null;
  }
  $("#shuffle").addEventListener("click", function () { renderActs(false); });

  function renderDone() {
    var list = A.doneToday();
    $("#done-box").hidden = !list.length;
    $("#done-list").innerHTML = list.map(function (ev) {
      return '<li class="' + (ev.partial ? "partial" : "") + '">' + (ev.partial ? "🌱 " : "✔ ") + esc(ev.title) + "</li>";
    }).join("");
  }

  $("#custom-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var t = $("#custom-text").value.trim();
    if (!t) { $("#custom-text").focus(); return; }
    var a = A.addCustom(t, Number($("#custom-time").value), currentEnergy() || 2);
    $("#custom-text").value = "";
    renderActs(true, a);
    toast("“" + t + "” 추가했어요. 지금 바로 해 봐도 좋아요.");
  });

  loadSlot(nowSlot);
  renderActs(true);
  renderDone();
})();
