/* =========================================================
   복약 시간 설정 (공용)
   - 사람마다 다른 복약 시간을 이름 + 시간으로 자유롭게 추가·삭제
   - 메인 프로필의 '복약 알림 설정'과 챙기기 페이지의 '시간 바꾸기'가
     같은 설정(user.medication.times)을 함께 고쳐요
   ========================================================= */
(function () {
  var MAX = 6;
  var PRESETS = [
    { label: "아침 약", time: "08:00" },
    { label: "점심 약", time: "13:00" },
    { label: "저녁 약", time: "19:00" },
    { label: "자기 전 약", time: "23:00" }
  ];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function newId() { return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  /** 사용자 복약 시간 목록 (예전 아침·저녁 설정도 자동으로 바꿔 줘요) */
  function times(user) {
    var m = (user && user.medication) || {};
    if (Array.isArray(m.times)) return m.times.slice();
    return [
      { id: "morning", label: "아침 약", time: m.morning || "09:00" },
      { id: "evening", label: "저녁 약", time: m.evening || "21:00" }
    ];
  }
  function sorted(list) {
    return list.slice().sort(function (a, b) { return (a.time || "99").localeCompare(b.time || "99"); });
  }
  function summary(user) {
    return sorted(times(user)).map(function (t) { return t.time; }).filter(Boolean).join(" · ");
  }

  function rowHTML(t) {
    return '<li class="mt-row" data-id="' + t.id + '">' +
      '<input type="text" class="mt-label" maxlength="12" value="' + esc(t.label) + '" aria-label="이름 (예: 아침 약)" placeholder="이름">' +
      '<input type="time" class="mt-time" value="' + esc(t.time || "") + '" aria-label="시간">' +
      '<button type="button" class="mt-del" aria-label="' + esc(t.label) + ' 삭제">×</button></li>';
  }

  /** 편집기 HTML */
  function editorHTML(list) {
    return '<div class="mt-editor">' +
      '<ul class="mt-list">' + sorted(list).map(rowHTML).join("") + "</ul>" +
      '<p class="mt-empty" hidden>복약 시간이 없어요. 아래에서 추가해 주세요.</p>' +
      '<div class="mt-add"><span>빠르게 추가</span>' +
      PRESETS.map(function (p, i) { return '<button type="button" class="mt-chip" data-preset="' + i + '">+ ' + p.label + "</button>"; }).join("") +
      '<button type="button" class="mt-chip" data-preset="custom">+ 직접 추가</button></div>' +
      '<p class="mt-note" role="status"></p></div>';
  }

  /** 편집기 동작 연결. read()로 현재 목록을 돌려줘요 */
  function bind(root) {
    var list = root.querySelector(".mt-list");
    function rows() { return Array.prototype.slice.call(list.querySelectorAll(".mt-row")); }
    function refresh() {
      var n = rows().length;
      root.querySelector(".mt-empty").hidden = n > 0;
      Array.prototype.forEach.call(root.querySelectorAll(".mt-chip"), function (c) { c.disabled = n >= MAX; });
      root.querySelector(".mt-note").textContent = n >= MAX ? "복약 시간은 " + MAX + "개까지 정할 수 있어요." : "";
    }
    root.addEventListener("click", function (e) {
      var del = e.target.closest(".mt-del");
      if (del) { del.closest(".mt-row").remove(); refresh(); return; }
      var chip = e.target.closest(".mt-chip");
      if (!chip || rows().length >= MAX) return;
      var key = chip.getAttribute("data-preset");
      var p = key === "custom" ? { label: "", time: "" } : PRESETS[Number(key)];
      list.insertAdjacentHTML("beforeend", rowHTML({ id: newId(), label: p.label, time: p.time }));
      var added = list.lastElementChild.querySelector(key === "custom" ? ".mt-label" : ".mt-time");
      added.focus();
      refresh();
    });
    refresh();
    return {
      read: function () {
        return rows().map(function (r, i) {
          return {
            id: r.getAttribute("data-id"),
            label: r.querySelector(".mt-label").value.trim() || "복약 " + (i + 1),
            time: r.querySelector(".mt-time").value || ""
          };
        });
      }
    };
  }

  window.TodakMed = { times: times, sorted: sorted, summary: summary, editorHTML: editorHTML, bind: bind, MAX: MAX };
})();
