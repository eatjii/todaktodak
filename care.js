/* =========================================================
   챙기기: 삼시세끼 체크 + 먹은 음식 · 물 기록 · 복약 체크
   기록은 하루(새벽 5시 기준)마다 따로 쌓이고 주간 리포트에서 함께 봐요
   ========================================================= */
(function () {
  var user = TodakStore.currentUser();
  if (!user) return;

  var MEALS = [
    { k: "breakfast", n: "아침", time: "7~10시", hint: "사과 한 조각, 우유 한 팩, 토스트 한 장도 훌륭해요" },
    { k: "lunch", n: "점심", time: "11시 30분~14시", hint: "학식이나 편의점 도시락으로 든든하게 채워 봐요" },
    { k: "dinner", n: "저녁", time: "17시 30분~20시 30분", hint: "지친 하루 끝, 따뜻한 국물이나 밥 한 공기 어때요?" }
  ];
  var CUPS = 8;

  function $(s) { return document.querySelector(s); }
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
  /* 토닥 하루는 새벽 5시에 시작해요 (오늘의 나와 같은 기준) */
  function dayKey(d) {
    d = new Date((d || new Date()).getTime() - 5 * 3600 * 1000);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  var DAY = dayKey();
  function latest(type) {           // 오늘 기록 중 칸(slot)마다 가장 마지막 것
    var map = {};
    TodakStore.events(type).forEach(function (ev) { if (ev.day === DAY) map[ev.slot || "all"] = ev; });
    return map;
  }

  /* ---------- 식사 ---------- */
  var meals = latest("meal");
  function mealDone(k) { return !!(meals[k] && meals[k].done); }
  function mealCount() { return MEALS.filter(function (m) { return mealDone(m.k); }).length; }

  function renderMeals() {
    $("#meals").innerHTML = MEALS.map(function (m) {
      var r = meals[m.k] || {}, done = !!r.done;
      return '<li class="meal' + (done ? " is-done" : "") + '" data-k="' + m.k + '">' +
        '<div class="meal-row">' +
        '<button type="button" class="check-btn" aria-pressed="' + done + '" aria-label="' + m.n + " 먹었어요" + '">✓</button>' +
        '<div class="meal-info"><b>' + m.n + '</b><span class="time">' + m.time + "</span><p>" + m.hint + "</p></div>" +
        '<span class="status">' + (done ? "챙겨 먹음" : "아직이에요") + "</span></div>" +
        '<div class="food"><label for="food-' + m.k + '">무엇을 먹었나요?</label>' +
        '<input type="text" id="food-' + m.k + '" maxlength="40" placeholder="예) 토스트, 우유" value="' + esc(r.food || "") + '">' +
        '<span class="saved">저장했어요</span></div></li>';
    }).join("");
    $("#meal-count").textContent = mealCount() + " / 3끼";
  }
  function saveMeal(k, patch) {
    var r = meals[k] || { done: false, food: "" };
    var next = { day: DAY, slot: k, done: patch.done != null ? patch.done : r.done, food: patch.food != null ? patch.food : r.food };
    meals[k] = TodakStore.log("meal", next);
  }

  $("#meals").addEventListener("click", function (e) {
    var b = e.target.closest(".check-btn");
    if (!b) return;
    var k = b.closest(".meal").getAttribute("data-k");
    var before = mealCount();
    saveMeal(k, { done: !mealDone(k) });
    var food = $("#food-" + k).value;              // 입력 중이던 음식도 같이 저장
    if (food !== (meals[k].food || "")) saveMeal(k, { food: food.trim() });
    renderMeals();
    renderSummary();
    var after = mealCount();
    if (after === 3 && before < 3) celebrate();
    else $("#celebrate").hidden = after < 3;
    if (after < 3 && mealDone(k)) toast(MEALS.filter(function (m) { return m.k === k; })[0].n + " 챙겨 먹었어요. 잘했어요!");
  });
  // 음식 메모: 입력을 멈추거나 다른 곳을 누르면 저장
  var foodTimer;
  $("#meals").addEventListener("input", function (e) {
    if (!e.target.matches(".food input")) return;
    var input = e.target, k = input.closest(".meal").getAttribute("data-k");
    clearTimeout(foodTimer);
    foodTimer = setTimeout(function () {
      saveMeal(k, { food: input.value.trim() });
      var s = input.parentNode.querySelector(".saved");
      s.classList.add("show");
      setTimeout(function () { s.classList.remove("show"); }, 1400);
    }, 700);
  });
  $("#meals").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.matches(".food input")) { e.preventDefault(); e.target.blur(); }
  });

  function celebrate() {
    $("#celebrate").hidden = false;
    var wrap = document.createElement("div");
    wrap.className = "burst";
    var r = $("#celebrate").getBoundingClientRect();
    var cx = r.left + 40, cy = r.top + r.height / 2;
    var colors = ["#ffd400", "#0791fe", "#ec82a3", "#70bf44"];
    for (var i = 0; i < 40; i++) {
      var p = document.createElement("i");
      var ang = Math.random() * Math.PI * 2, dist = 120 + Math.random() * 260;
      p.style.left = cx + "px"; p.style.top = cy + "px";
      p.style.background = colors[i % 4];
      p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      p.style.setProperty("--dy", Math.sin(ang) * dist - 80 + "px");
      p.style.setProperty("--r", (Math.random() * 720 - 360) + "deg");
      p.style.animationDelay = Math.random() * .15 + "s";
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(function () { wrap.remove(); }, 1800);
  }

  /* ---------- 물 ---------- */
  var DRAFT = "todak-water-draft:" + user.email + ":" + DAY;
  var savedWater = latest("water").all;
  var cups = savedWater ? savedWater.cups : 0;
  try { var d = localStorage.getItem(DRAFT); if (d != null) cups = Number(d); } catch (e) {}

  function renderWater() {
    var html = "";
    for (var i = 0; i < CUPS; i++) html += '<span class="cup' + (i < Math.min(cups, CUPS) ? " full" : "") + '"></span>';
    $("#cups").innerHTML = html;
    $("#w-num").textContent = cups;
    $("#water-ml").textContent = cups * 200 + "ml";
    $("#w-minus").disabled = cups <= 0;
    var saved = latest("water").all;
    var same = saved && saved.cups === cups;
    $("#w-done").textContent = saved ? (same ? "기록 완료 ✓" : "바뀐 잔 수 저장하기") : "완료";
    $("#w-done").disabled = !!same;
  }
  function setCups(n) {
    cups = Math.max(0, Math.min(30, n));
    try { localStorage.setItem(DRAFT, String(cups)); } catch (e) {}
    $("#w-note").textContent = "";
    renderWater();
    renderSummary();
  }
  $("#w-plus").addEventListener("click", function () { setCups(cups + 1); });
  $("#w-minus").addEventListener("click", function () { setCups(cups - 1); });
  $("#w-done").addEventListener("click", function () {
    TodakStore.log("water", { day: DAY, cups: cups, ml: cups * 200 });
    $("#w-note").textContent = cups
      ? "오늘 " + cups + "잔(" + cups * 200 + "ml)을 이번 주 리포트에 기록했어요."
      : "0잔으로 기록했어요. 지금 한 잔 마셔 보는 건 어때요?";
    renderWater();
  });

  /* ---------- 수면 ---------- */
  var sleep = latest("sleep").all || null;
  var sl = { hours: sleep ? sleep.hours : 0, quality: sleep ? sleep.quality : "" };   // 기록 전에는 0시간에서 시작
  var touched = !!sleep;
  var QUAL = { good: "푹 잤어요", ok: "그럭저럭", bad: "뒤척였어요" };
  function sleepComment(h) {
    if (h < 5) return "짧게 잤네요. 오늘은 무리하지 말고 쉬엄쉬엄 해요.";
    if (h < 7) return "조금 부족했어요. 틈날 때 눈을 감고 잠깐 쉬어도 좋아요.";
    if (h <= 9) return "적당히 잤어요. 몸이 조금 가벼웠으면 좋겠어요.";
    return "오래 잤네요. 몸이 많이 지쳤을 수 있어요. 괜찮아요.";
  }
  function hoursLabel(h) { return (h % 1 ? Math.floor(h) + "시간 반" : h + "시간"); }
  function renderSleep() {
    var input = $("#sleep-hours");
    input.value = sl.hours;
    input.style.setProperty("--fill", (sl.hours / 12 * 100) + "%");
    input.setAttribute("aria-valuetext", hoursLabel(sl.hours));
    $("#sleep-pill").textContent = (sl.hours ? "약 " : "") + hoursLabel(sl.hours);
    $("#sleep-comment").textContent = touched ? sleepComment(sl.hours) : "슬라이더를 옮겨서 잔 시간을 알려 주세요.";
    Array.prototype.forEach.call(document.querySelectorAll("#quality [data-q]"), function (b) {
      b.setAttribute("aria-checked", String(b.getAttribute("data-q") === sl.quality));
    });
    var same = sleep && sleep.hours === sl.hours && sleep.quality === sl.quality;
    $("#sleep-save").textContent = sleep ? (same ? "기록 완료 ✓" : "바뀐 내용 저장하기") : "기록하기";
    $("#sleep-save").disabled = !!same;
  }
  $("#sleep-hours").addEventListener("input", function (e) {
    sl.hours = Number(e.target.value); touched = true; $("#sleep-note").textContent = ""; renderSleep();
  });
  $("#quality").addEventListener("click", function (e) {
    var b = e.target.closest("[data-q]");
    if (!b) return;
    sl.quality = b.getAttribute("data-q"); $("#sleep-note").textContent = ""; renderSleep();
  });
  $("#sleep-save").addEventListener("click", function () {
    sleep = TodakStore.log("sleep", { day: DAY, hours: sl.hours, quality: sl.quality });
    $("#sleep-note").textContent = "어젯밤 " + hoursLabel(sl.hours) + (sl.quality ? ", ‘" + QUAL[sl.quality] + "’" : "") + "로 기록했어요.";
    renderSleep();
    renderSummary();
  });

  /* ---------- 복약 (기능을 켠 사람만, 시간은 사람마다 직접 정해요) ---------- */
  var medOn = !!(user.medication && user.medication.enabled);
  var MEDS = TodakMed.sorted(TodakMed.times(user));
  var meds = latest("med");
  function medStatus(k) { return meds[k] ? meds[k].status : ""; }
  function renderMeds() {
    $("#med-card").hidden = !medOn;
    $("#med-off").hidden = medOn;
    if (!medOn) return;
    $("#meds").innerHTML = MEDS.length ? MEDS.map(function (m) {
      var st = medStatus(m.id);
      return '<li class="med' + (st === "taken" ? " is-taken" : "") + '" data-k="' + m.id + '">' +
        '<div class="label"><b>' + esc(m.label) + "</b>" + (m.time ? "<span>" + m.time + "</span>" : "") +
        "<p>" + (st === "taken" ? "먹었어요. 잘 챙겼어요!" : st === "skip" ? "괜찮아요, 다음 시간에 다시 챙겨요." : "아직 기록하지 않았어요") + "</p></div>" +
        '<div class="med-btns"><button type="button" data-v="taken" aria-pressed="' + (st === "taken") + '">먹었어요</button>' +
        '<button type="button" data-v="skip" aria-pressed="' + (st === "skip") + '">못 먹었어요</button></div></li>';
    }).join("") : '<li class="empty">아직 복약 시간이 없어요. 오른쪽 위 ‘시간 바꾸기’에서 추가해 주세요.</li>';
    var taken = MEDS.filter(function (m) { return medStatus(m.id) === "taken"; }).length;
    $("#med-count").textContent = taken + " / " + MEDS.length;
  }
  $("#meds").addEventListener("click", function (e) {
    var b = e.target.closest("[data-v]");
    if (!b) return;
    var k = b.closest(".med").getAttribute("data-k"), v = b.getAttribute("data-v");
    meds[k] = TodakStore.log("med", { day: DAY, slot: k, status: medStatus(k) === v ? "" : v });
    renderMeds();
    renderSummary();
  });

  // 시간 바꾸기 (프로필의 복약 시간 설정과 같은 설정)
  var editor = null;
  function toggleEdit(open) {
    $("#med-edit").hidden = !open;
    $("#med-edit-btn").setAttribute("aria-expanded", String(open));
    if (open) {
      $("#med-editor").innerHTML = TodakMed.editorHTML(TodakMed.times(TodakStore.currentUser()));
      editor = TodakMed.bind($("#med-editor"));
      var f = $("#med-editor .mt-time"); if (f) f.focus();
    }
  }
  $("#med-edit-btn").addEventListener("click", function () { toggleEdit($("#med-edit").hidden); });
  $("#med-cancel").addEventListener("click", function () { toggleEdit(false); });
  $("#med-save").addEventListener("click", function () {
    var u = TodakStore.currentUser();
    user = TodakStore.updateUser(u.email, { medication: { enabled: true, times: editor.read() } }) || u;
    MEDS = TodakMed.sorted(TodakMed.times(user));
    toggleEdit(false);
    renderMeds();
    renderSummary();
    toast("복약 시간을 저장했어요.");
  });

  /* ---------- 맨 위 요약 ---------- */
  function renderSummary() {
    var parts = ['<span>식사 <b>' + mealCount() + "/3</b>끼</span>", "<span>물 <b>" + cups + "</b>잔</span>"];
    if (sleep) parts.unshift("<span>수면 <b>" + hoursLabel(sleep.hours) + "</b></span>");
    if (medOn) parts.push("<span>복약 <b>" + MEDS.filter(function (m) { return medStatus(m.id) === "taken"; }).length + "/" + MEDS.length + "</b></span>");
    $("#care-sum").innerHTML = parts.join("");
  }

  renderSleep();
  renderMeals();
  $("#celebrate").hidden = mealCount() < 3;
  renderWater();
  renderMeds();
  renderSummary();
})();
