/* =========================================================
   토닥토닥 편집 모드
   주소 끝에 ?edit 또는 #edit 를 붙이면 켜져요.
     예) .../web/index.html?edit   또는   .../web/index.html#edit
   - 요소를 끌어서 이동 / 화살표 1px · Shift+화살표 10px
   - + / − 키 또는 패널에서 크기 조절
   - PC(641px 이상)와 모바일(640px 이하) 위치는 따로 저장돼요
   - [파일 내려받기] → 받은 파일로 js/layout/ 안의 같은 이름 파일을 바꿔요
   ========================================================= */
(function () {
  function isEditUrl() {
    return /(^|[?&#])edit(=|&|$)/.test(location.search.slice(1)) ||
      /(^|[#&])edit(=|&|$)/.test(location.hash.slice(1));
  }
  if (!isEditUrl()) return;

  var page = document.body.getAttribute("data-page") || "page";
  var DRAFT = "todak-layout-draft:" + page;
  var fileLayout = clone(window.TODAK_LAYOUT || { page: page, pc: {}, mobile: {} });
  var L = clone(fileLayout);
  try {
    var d = localStorage.getItem(DRAFT);
    if (d) L = JSON.parse(d);
  } catch (e) {}
  L.pc = L.pc || {};
  L.mobile = L.mobile || {};

  var mq = window.matchMedia(window.TodakLayout.MOBILE);
  var selected = null;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function bp() { return mq.matches ? "mobile" : "pc"; }
  function val(name) {
    var v = L[bp()][name] || {};
    return { x: v.x || 0, y: v.y || 0, s: v.s == null ? 1 : v.s };
  }
  function set(name, v) {
    L[bp()][name] = { x: Math.round(v.x), y: Math.round(v.y), s: Math.round(v.s * 100) / 100 };
    window.TodakLayout.render(L);
    try { localStorage.setItem(DRAFT, JSON.stringify(L)); } catch (e) {}
    dirty(true);
    sync();
  }

  // 모든 편집 가능한 요소를 데이터에 등록
  var els = Array.prototype.slice.call(document.querySelectorAll("[data-edit]"));
  els.forEach(function (el) {
    var n = el.getAttribute("data-edit");
    if (!L.pc[n]) L.pc[n] = { x: 0, y: 0, s: 1 };
    if (!L.mobile[n]) L.mobile[n] = { x: 0, y: 0, s: 1 };
    el.title = n;
  });
  window.TodakLayout.render(L);

  /* ---------- 스타일 ---------- */
  var css = document.createElement("style");
  css.textContent = [
    "body.todak-editing *{animation-play-state:paused!important}",
    "body.todak-editing [data-edit]{outline:2px dashed rgba(7,145,254,.55);outline-offset:4px;pointer-events:auto!important;cursor:move!important;touch-action:none}",
    "body.todak-editing [data-edit]:hover{outline-color:#0791fe}",
    "body.todak-editing [data-edit].todak-sel{outline:3px solid #fbde18;outline-offset:4px}",
    "#todak-panel{position:fixed;right:16px;bottom:16px;z-index:99999;width:290px;padding:16px;border-radius:20px;background:#fff;color:#231f20;",
    "box-shadow:0 12px 40px rgba(0,0,0,.18);font:14px/1.45 'Pretendard Variable',Pretendard,sans-serif;cursor:auto}",
    "#todak-panel *{cursor:auto}",
    "#todak-panel h2{margin:0 0 2px;font-size:15px}",
    "#todak-panel .bp{display:inline-block;margin-left:6px;padding:2px 8px;border-radius:99px;background:#e6f3ff;color:#0791fe;font-size:12px}",
    "#todak-panel .name{margin:10px 0 8px;font-weight:800;color:#0791fe;min-height:20px}",
    "#todak-panel .row{display:flex;gap:8px;align-items:center;margin:6px 0}",
    "#todak-panel label{width:34px;font-size:13px;color:#5b6470}",
    "#todak-panel input[type=number]{width:74px;padding:6px 8px;border:2px solid #e5e9ee;border-radius:10px;font:inherit}",
    "#todak-panel input[type=range]{flex:1}",
    "#todak-panel .btns{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:12px}",
    "#todak-panel button{padding:9px 6px;border-radius:12px;border:2px solid #0791fe;background:#fff;color:#0791fe;font:700 13px inherit;font-family:inherit;cursor:pointer}",
    "#todak-panel button.fill{background:#0791fe;color:#fff}",
    "#todak-panel button.wide{grid-column:1/-1}",
    "#todak-panel .tip{margin-top:10px;font-size:12px;color:#5b6470}",
    "#todak-panel .state{font-size:12px;margin-top:6px;color:#5b6470}",
    "#todak-panel .state.dirty{color:#d9480f}",
    "#todak-panel.min .body{display:none}"
  ].join("\n");
  document.head.appendChild(css);
  document.body.classList.add("todak-editing");

  /* ---------- 패널 ---------- */
  var panel = document.createElement("div");
  panel.id = "todak-panel";
  panel.innerHTML =
    '<h2>편집 모드<span class="bp"></span> <button type="button" data-a="min" style="float:right;padding:2px 8px;border:0">—</button></h2>' +
    '<div class="body">' +
    '<div class="name">요소를 눌러 선택하세요</div>' +
    '<div class="row"><label>가로</label><input type="number" data-k="x"> px</div>' +
    '<div class="row"><label>세로</label><input type="number" data-k="y"> px</div>' +
    '<div class="row"><label>크기</label><input type="range" min="30" max="200" data-k="sr"><input type="number" min="30" max="200" data-k="s" style="width:62px"> %</div>' +
    '<div class="btns">' +
    '<button type="button" data-a="reset-one">이 요소 원래대로</button>' +
    '<button type="button" data-a="revert">변경 모두 취소</button>' +
    '<button type="button" data-a="copy">코드 복사</button>' +
    '<button type="button" class="fill" data-a="download">파일 내려받기</button>' +
    '<button type="button" class="wide" data-a="exit">편집 끝내기</button>' +
    "</div>" +
    '<div class="state"></div>' +
    '<div class="tip">끌어서 이동 · 화살표 1px · Shift+화살표 10px · +/− 크기<br>창 너비 640px 이하에서는 모바일 위치가 따로 저장돼요.</div>' +
    "</div>";
  document.body.appendChild(panel);

  var q = function (s) { return panel.querySelector(s); };
  var inX = q('[data-k="x"]'), inY = q('[data-k="y"]'), inS = q('[data-k="s"]'), inSR = q('[data-k="sr"]');

  function dirty(on) {
    var st = q(".state");
    var changed = JSON.stringify(L) !== JSON.stringify(withAll(fileLayout));
    st.textContent = changed ? "● 파일에 저장 안 된 변경이 있어요 (이 브라우저에 임시 보관 중)" : "파일과 같은 상태예요";
    st.className = "state" + (changed ? " dirty" : "");
  }
  function withAll(F) {
    var c = clone(F); c.pc = c.pc || {}; c.mobile = c.mobile || {};
    els.forEach(function (el) {
      var n = el.getAttribute("data-edit");
      if (!c.pc[n]) c.pc[n] = { x: 0, y: 0, s: 1 };
      if (!c.mobile[n]) c.mobile[n] = { x: 0, y: 0, s: 1 };
    });
    return c;
  }
  function sync() {
    q(".bp").textContent = bp() === "mobile" ? "모바일" : "PC";
    var dis = !selected;
    [inX, inY, inS, inSR].forEach(function (i) { i.disabled = dis; });
    if (!selected) { q(".name").textContent = "요소를 눌러 선택하세요"; return; }
    var n = selected.getAttribute("data-edit"), v = val(n);
    q(".name").textContent = n;
    if (document.activeElement !== inX) inX.value = v.x;
    if (document.activeElement !== inY) inY.value = v.y;
    if (document.activeElement !== inS) inS.value = Math.round(v.s * 100);
    inSR.value = Math.round(v.s * 100);
  }
  function select(el) {
    if (selected) selected.classList.remove("todak-sel");
    selected = el;
    if (el) el.classList.add("todak-sel");
    sync();
  }

  [inX, inY].forEach(function (inp) {
    inp.addEventListener("input", function () {
      if (!selected) return;
      var n = selected.getAttribute("data-edit"), v = val(n);
      v[inp.getAttribute("data-k")] = Number(inp.value) || 0;
      set(n, v);
    });
  });
  [inS, inSR].forEach(function (inp) {
    inp.addEventListener("input", function () {
      if (!selected) return;
      var n = selected.getAttribute("data-edit"), v = val(n);
      v.s = Math.min(200, Math.max(30, Number(inp.value) || 100)) / 100;
      set(n, v);
    });
  });

  function fileText() {
    var out = { page: page, pc: L.pc, mobile: L.mobile };
    return "/* 토닥토닥 위치 설정 — " + page + " 페이지\n" +
      "   편집 모드(주소 끝에 ?edit)의 [파일 내려받기]로 만든 파일이에요.\n" +
      "   x, y = 원래 자리에서 옮긴 거리(px) / s = 크기 배율(1 = 100%) */\n" +
      "window.TODAK_LAYOUT = " + JSON.stringify(out, null, 2) + ";\n";
  }
  function copy(text) {
    function fallback() {
      var t = document.createElement("textarea");
      t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch (e) {}
      t.remove();
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).catch(fallback);
    else fallback();
  }

  panel.addEventListener("click", function (e) {
    var a = e.target.getAttribute && e.target.getAttribute("data-a");
    if (!a) return;
    if (a === "min") { panel.classList.toggle("min"); return; }
    if (a === "reset-one" && selected) set(selected.getAttribute("data-edit"), { x: 0, y: 0, s: 1 });
    if (a === "revert") {
      if (!confirmSoft("저장 안 된 변경을 모두 취소하고 파일 상태로 돌아갈까요?")) return;
      L = withAll(fileLayout);
      try { localStorage.removeItem(DRAFT); } catch (err) {}
      window.TodakLayout.render(L); dirty(); sync();
    }
    if (a === "copy") { copy(fileText()); flash(e.target, "복사했어요!"); }
    if (a === "download") {
      var blob = new Blob([fileText()], { type: "text/javascript" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "layout-" + page + ".js";
      panel.appendChild(link); link.click(); link.remove();  // 패널 안에서 눌러야 링크 차단에 걸리지 않아요
      flash(e.target, "내려받았어요!");
    }
    if (a === "exit") {
      location.href = location.href.replace(/[?#&]edit\b(=[^&#]*)?/, "");
    }
  });
  function flash(btn, msg) {
    var t = btn.textContent; btn.textContent = msg;
    setTimeout(function () { btn.textContent = t; }, 1400);
  }
  // 브라우저 확인창 대신 패널 안에서 두 번 누르기로 확인
  var pending = 0;
  function confirmSoft(msg) {
    var now = Date.now();
    if (now - pending < 2500) { pending = 0; return true; }
    pending = now;
    var st = q(".state"); st.textContent = "한 번 더 누르면 " + msg.replace(/할까요\?$/, "해요"); st.className = "state dirty";
    return false;
  }

  /* ---------- 끌어서 이동 ---------- */
  var drag = null;
  document.addEventListener("pointerdown", function (e) {
    if (panel.contains(e.target)) return;
    var el = e.target.closest && e.target.closest("[data-edit]");
    if (!el) { select(null); return; }
    e.preventDefault();
    select(el);
    var v = val(el.getAttribute("data-edit"));
    drag = { el: el, sx: e.clientX, sy: e.clientY, x: v.x, y: v.y, s: v.s };
    el.setPointerCapture && el.setPointerCapture(e.pointerId);
  }, true);
  document.addEventListener("pointermove", function (e) {
    if (!drag) return;
    set(drag.el.getAttribute("data-edit"), {
      x: drag.x + (e.clientX - drag.sx), y: drag.y + (e.clientY - drag.sy), s: drag.s
    });
  });
  document.addEventListener("pointerup", function () { drag = null; });

  // 편집 중에는 링크로 넘어가지 않게
  document.addEventListener("click", function (e) {
    if (!panel.contains(e.target)) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* ---------- 키보드 ---------- */
  document.addEventListener("keydown", function (e) {
    if (!selected || panel.contains(document.activeElement)) return;
    var n = selected.getAttribute("data-edit"), v = val(n), step = e.shiftKey ? 10 : 1;
    var k = e.key;
    if (k === "ArrowLeft") v.x -= step;
    else if (k === "ArrowRight") v.x += step;
    else if (k === "ArrowUp") v.y -= step;
    else if (k === "ArrowDown") v.y += step;
    else if (k === "+" || k === "=") v.s += e.shiftKey ? .1 : .01;
    else if (k === "-" || k === "_") v.s -= e.shiftKey ? .1 : .01;
    else if (k === "Escape") { select(null); return; }
    else return;
    e.preventDefault();
    v.s = Math.min(2, Math.max(.3, v.s));
    set(n, v);
  });

  mq.addEventListener("change", function () { sync(); });
  sync();
  dirty();
})();
