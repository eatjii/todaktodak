/* =========================================================
   집중 타이머
   - 3·5·10·30분 버튼을 누르면 바로 시작
   - 직접 정하기(1~180분), 잠깐 멈추기, 그만하기
   - 끝나거나 1분 이상 하고 멈추면 리포트에 기록
   - 새로고침하거나 다른 페이지에 다녀와도 이어져요
   ========================================================= */
(function () {
  var user = TodakStore.currentUser();
  if (!user || !document.getElementById("timer")) return;

  var KEY = "todak-timer:" + user.email;
  var R = 88, CIRC = 2 * Math.PI * R;
  var $ = function (id) { return document.getElementById(id); };
  var bar = document.querySelector(".timer-ring .bar");
  bar.style.strokeDasharray = CIRC;

  // state: { total(ms), endAt(ms|null), remaining(ms), running(bool) }
  var st = load() || { total: 180000, endAt: null, remaining: 180000, running: false, active: false };
  var tick = null;
  var baseTitle = document.title;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function left() { return st.running ? Math.max(0, st.endAt - Date.now()) : st.remaining; }
  function fmt(ms) {
    var s = Math.ceil(ms / 1000), m = Math.floor(s / 60);
    return (m < 10 ? "0" : "") + m + ":" + ("0" + (s % 60)).slice(-2);
  }

  function render() {
    var ms = left();
    $("t-time").textContent = fmt(ms);
    bar.style.strokeDashoffset = st.total ? CIRC * (1 - ms / st.total) : 0;
    $("t-state").textContent = !st.active ? "버튼 하나로 바로 시작해요"
      : st.running ? (ms < st.total / 2 ? "절반 넘게 왔어요!" : "천천히, 지금처럼만") : "잠깐 쉬는 중이에요";
    $("run-row").hidden = !st.active;
    $("t-pause").textContent = st.running ? "잠깐 멈추기" : "이어서 하기";
    document.querySelectorAll(".preset").forEach(function (p) {
      p.classList.toggle("is-active", st.active && Number(p.getAttribute("data-min")) * 60000 === st.total);
    });
    document.title = st.active ? fmt(ms) + " · " + baseTitle : baseTitle;
    if (st.running && ms <= 0) finish();
  }

  function loop() {
    clearInterval(tick);
    if (st.running) tick = setInterval(render, 250);
    render();
  }

  function start(min) {
    min = Math.min(180, Math.max(1, Math.round(min)));
    st = { total: min * 60000, remaining: min * 60000, endAt: Date.now() + min * 60000, running: true, active: true };
    $("t-done").hidden = true;
    persist();
    loop();
    unlockSound();
  }
  function pause() {
    if (!st.active) return;
    if (st.running) { st.remaining = left(); st.running = false; st.endAt = null; }
    else { st.endAt = Date.now() + st.remaining; st.running = true; }
    persist();
    loop();
  }
  function record(completed) {
    var doneMs = st.total - left();
    var minutes = Math.round(doneMs / 60000);
    if (minutes < 1 && !completed) return 0;
    TodakStore.log("focus", { minutes: Math.max(1, minutes), planned: Math.round(st.total / 60000), completed: completed });
    if (window.TodakMain) TodakMain.renderReport();
    return Math.max(1, minutes);
  }
  function stop() {
    if (!st.active) return;
    var m = record(false);
    st = { total: st.total, remaining: st.total, endAt: null, running: false, active: false };
    persist();
    loop();
    showDone(m ? "멈춰도 괜찮아요" : "시작한 것만으로도 좋아요",
      m ? m + "분 동안 해냈어요. 리포트에 기록해 둘게요." : "다음에 다시 눌러 보면 돼요.");
  }
  function finish() {
    var m = record(true);
    st = { total: st.total, remaining: st.total, endAt: null, running: false, active: false };
    persist();
    clearInterval(tick);
    render();
    chime();
    showDone("해냈어요! " + m + "분 완료", "작은 시작이 쌓이고 있어요. 정말 잘했어요.");
  }
  function showDone(title, text) {
    $("t-done-title").textContent = title;
    $("t-done-text").textContent = text;
    $("t-done").hidden = false;
  }

  /* 끝날 때 작은 소리 (부드러운 두 음) */
  var ctx = null;
  function unlockSound() {
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); }
    catch (e) { ctx = null; }
  }
  function chime() {
    if (!ctx) return;
    [[660, 0], [880, .22]].forEach(function (n) {
      var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + n[1];
      o.type = "sine"; o.frequency.value = n[0];
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.12, t + .03);
      g.gain.exponentialRampToValueAtTime(.001, t + .6);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + .65);
    });
  }

  /* 연결 */
  document.querySelectorAll(".preset").forEach(function (p) {
    p.addEventListener("click", function () { start(Number(p.getAttribute("data-min"))); });
  });
  var cin = $("c-min");
  function clampInput() { var v = Math.min(180, Math.max(1, parseInt(cin.value, 10) || 1)); cin.value = v; return v; }
  $("c-minus").addEventListener("click", function () { cin.value = clampInput() - 1 || 1; clampInput(); });
  $("c-plus").addEventListener("click", function () { cin.value = clampInput() + 1; clampInput(); });
  cin.addEventListener("change", clampInput);
  cin.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); start(clampInput()); } });
  $("c-start").addEventListener("click", function () { start(clampInput()); });
  $("t-pause").addEventListener("click", pause);
  $("t-stop").addEventListener("click", stop);
  $("t-more").addEventListener("click", function () { start(5); });
  $("t-rest").addEventListener("click", function () {
    $("t-done").hidden = true;
    if (window.TodakMain) TodakMain.toast("푹 쉬어요. 쉬는 것도 중요한 일이에요.");
  });

  // 다른 페이지에 있는 동안 끝났다면 돌아왔을 때 완료 처리
  loop();

  // 작은 행동에서 '타이머로 함께하기'를 누르고 오면 바로 시작 (main.html?timer=3)
  var q = /[?&]timer=(\d+)/.exec(location.search);
  if (q) {
    if (!st.active) start(Number(q[1]));
    history.replaceState(null, "", location.pathname + location.hash);
    if (window.TodakMain) TodakMain.toast("타이머를 시작했어요. 끝나면 오늘의 나에서 체크해 주세요.");
  }
  window.TodakTimer = { start: start, pause: pause, stop: stop, _state: function () { return st; } };
})();
