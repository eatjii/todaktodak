/* =========================================================
   로그인 후 메인: 인사, 프로필 메뉴, 작은 창(모달), 주간 리포트 요약
   ========================================================= */
(function () {
  var user = TodakStore.currentUser();
  if (!user) return;
  var ICON = "assets/icons/";

  function $(s, root) { return (root || document).querySelector(s); }
  function $$(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function save(patch) { user = TodakStore.updateUser(user.email, patch) || user; paint(); }

  /* ---------- 프로필 사진 (아이콘 + 배경색) ---------- */
  var AVATAR_ICONS = [
    "hand-palm.svg", "hand-heart-pink.svg", "hand-index-one.svg", "hand-ok.svg", "hand-thumbs-up.svg", "hand-high-five-pink.svg",
    "hand-peace.svg", "hand-rock.svg", "hand-shaka.svg", "hand-gun.svg", "hand-crossed.svg", "hand-fist.svg",
    "hand-point-right.svg", "hand-clasp-pink.svg", "hand-high-five.svg", "point-up-green.svg", "point-up-yellow.svg", "symbol"
  ];
  var AVATAR_COLORS = [
    { v: "#ffd400", n: "진한 노랑" }, { v: "#fbde18", n: "노랑" }, { v: "#e6f3ff", n: "하늘" }, { v: "#0791fe", n: "파랑" },
    { v: "#fde3ec", n: "연분홍" }, { v: "#e3f4da", n: "연두" }, { v: "#d0e2ec", n: "회청" }, { v: "#ffffff", n: "흰색" }
  ];
  function iconSrc(name) { return name === "symbol" ? "assets/symbol-heart.png" : ICON + name; }
  function avatarOf(u) { return u.avatar || { icon: "hand-palm.svg", bg: "#ffd400" }; }
  function applyAvatar(el, av) {
    el.style.backgroundColor = av.bg;
    var img = el.querySelector("img");
    if (img) img.src = iconSrc(av.icon);
  }

  /* ---------- 토스트 ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2400);
  }

  /* ---------- 이름·인사·복약 상태 ---------- */
  function paint() {
    $$("[data-nick]").forEach(function (el) { el.textContent = user.nickname; });
    $$("[data-email]").forEach(function (el) { el.textContent = user.email; });
    $$("[data-avatar]").forEach(function (el) { applyAvatar(el, avatarOf(user)); });
    var h = new Date().getHours();
    var hello = h < 5 ? "늦은 밤이에요" : h < 11 ? "좋은 아침이에요" : h < 17 ? "좋은 오후예요" : h < 22 ? "편안한 저녁이에요" : "늦은 밤이에요";
    $("#greet").textContent = hello + ", " + user.nickname + "님";
    if (h >= 22 || h < 5) $("#greet-sub").innerHTML = "오늘 하루도 정말 수고했어요.<br>남은 시간은 편하게 쉬어도 괜찮아요.";

    var on = !!(user.medication && user.medication.enabled);
    var tog = $("#med-toggle");
    tog.setAttribute("aria-checked", String(on));
    var times = on ? TodakMed.summary(user) : "";
    $("#med-sub").textContent = on ? "켜져 있어요" + (times ? " (" + times + ")" : "") : "꺼져 있어요";
    $("#care-desc").textContent = on ? "식사 · 복약" : "식사 챙기기";
  }

  /* ---------- 프로필 메뉴 ---------- */
  var btn = $("#profile-btn"), menu = $("#profile-menu");
  function openMenu(v) {
    menu.hidden = !v;
    btn.setAttribute("aria-expanded", String(v));
    if (v) setTimeout(function () { var f = $(".pm-item", menu); f && f.focus(); }, 30);
  }
  btn.addEventListener("click", function () { openMenu(menu.hidden); });
  document.addEventListener("click", function (e) {
    if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) openMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !menu.hidden) { openMenu(false); btn.focus(); }
  });
  $$("[data-open]").forEach(function (b) {
    b.addEventListener("click", function () { openMenu(false); modals[b.getAttribute("data-open")](); });
  });
  $("#med-toggle").addEventListener("click", function () {
    var on = !(user.medication && user.medication.enabled);
    var m = user.medication || {};
    m.enabled = on;
    if (on && !m.times) m.times = TodakMed.times(user);
    save({ medication: m });
    toast(on ? "복약 기능을 켰어요. 알림 시간은 바로 아래에서 바꿀 수 있어요." : "복약 기능을 껐어요. 언제든 다시 켤 수 있어요.");
  });
  $$("[data-logout]").forEach(function (b) {
    b.addEventListener("click", function () {
      TodakStore.logout();
      location.href = "index.html";
    });
  });

  /* ---------- 작은 창(모달) ---------- */
  var overlay = document.createElement("div");
  overlay.className = "auth-overlay";
  overlay.innerHTML = '<div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="m-title">' +
    '<button type="button" class="auth-close" aria-label="창 닫기">×</button><div class="m-body"></div></div>';
  document.body.appendChild(overlay);
  var mbody = $(".m-body", overlay), lastFocus = null, onClose = null;

  function badge(icon) {
    return '<div class="auth-badge"><img src="' + ICON + icon + '" alt=""></div>';
  }
  function openModal(html, mount, closeCb) {
    lastFocus = document.activeElement;
    mbody.innerHTML = html;
    overlay.classList.add("is-open");
    document.body.classList.add("auth-locked");
    onClose = closeCb || null;
    if (mount) mount(mbody);
    setTimeout(function () {
      var f = mbody.querySelector("input, button, a[href]");
      (f || $(".auth-close", overlay)).focus();
    }, 60);
  }
  function closeModal() {
    if (!overlay.classList.contains("is-open")) return;
    overlay.classList.remove("is-open");
    overlay.querySelector(".auth-card").classList.remove("wide");
    document.body.classList.remove("auth-locked");
    var cb = onClose; onClose = null;
    if (cb) cb();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });
  $(".auth-close", overlay).addEventListener("click", closeModal);
  document.addEventListener("keydown", function (e) {
    if (!overlay.classList.contains("is-open")) return;
    if (e.key === "Escape") return closeModal();
    if (e.key !== "Tab") return;
    var f = $$("button, a[href], input", overlay.querySelector(".auth-card")).filter(function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
    var i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });

  var NICK_A = ["느긋한", "포근한", "말랑한", "반짝이는", "다정한", "산뜻한", "동글동글", "졸린", "씩씩한", "보송한"];
  var NICK_B = ["고래", "구름", "감자", "햇살", "고양이", "토끼", "펭귄", "별님", "모찌", "도토리"];

  var GUIDE = [
    { icons: ["hand-ok.svg", "hand-clasp-pink.svg", "hand-index-one.svg"], title: "노란 동그라미 세 개", desc: "<b>오늘의 나</b>에서 기분을 체크하고, <b>챙기기</b>에서 식사·복약을 기록하고,<br><b>할 일 쪼개기</b>에서 큰 일을 작게 나눠요." },
    { icon: "hand-thumbs-up.svg", title: "타이머는 3분만 해도 성공", desc: "아래로 내리면 타이머가 있어요.<br>버튼 하나만 누르면 바로 시작해요. 중간에 멈춰도 괜찮아요." },
    { icon: "hand-high-five-pink.svg", title: "한 주를 돌아보는 리포트", desc: "기록이 모이면 이번 주 리포트에 쌓여요.<br>잘한 점부터 먼저 보여 드릴게요." },
    { icon: "hand-gun.svg", title: "설정은 언제든 프로필에서", desc: "오른쪽 맨 위 내 프로필을 누르면<br>프로필 사진, 복약 기능, 이 설명을 다시 볼 수 있어요." }
  ];

  var modals = {
    guide: function () {
      var i = 0;
      openModal('<div class="guide-slide"></div>', function (root) {
        function render() {
          var g = GUIDE[i];
          var top = g.icons
            ? '<div class="auth-badge" style="visibility:hidden;height:8px;margin:0"></div><div class="guide-icons">' +
              g.icons.map(function (ic) { return '<span><img src="' + ICON + ic + '" alt=""></span>'; }).join("") + "</div>"
            : badge(g.icon);
          $(".guide-slide", root).innerHTML = top +
            '<span class="auth-step-label">사용설명 ' + (i + 1) + " / " + GUIDE.length + "</span>" +
            '<h2 class="auth-title" id="m-title">' + g.title + "</h2>" +
            '<p class="auth-desc">' + g.desc + "</p>" +
            '<div class="guide-dots">' + GUIDE.map(function (_, k) { return '<span class="' + (k === i ? "now" : "") + '"></span>'; }).join("") + "</div>" +
            '<div class="guide-nav">' +
            (i > 0 ? '<button type="button" class="btn btn-outline" data-g="prev">이전</button>' : "") +
            '<button type="button" class="btn btn-fill" data-g="next">' + (i < GUIDE.length - 1 ? "다음" : "시작하기") + "</button></div>";
          $('[data-g="next"]', root).focus();
        }
        root.addEventListener("click", function (e) {
          var g = e.target.getAttribute && e.target.getAttribute("data-g");
          if (g === "prev") { i--; render(); }
          if (g === "next") { if (i < GUIDE.length - 1) { i++; render(); } else closeModal(); }
        });
        render();
      }, function () {
        if (!user.seenGuide) save({ seenGuide: true });
      });
    },

    profile: function () {
      var av = { icon: avatarOf(user).icon, bg: avatarOf(user).bg };
      openModal(
        '<h2 class="auth-title" id="m-title" style="margin-top:8px">프로필 변경</h2>' +
        '<p class="auth-desc" style="margin-bottom:16px">마음에 드는 손 친구와 색을 골라 보세요.</p>' +
        '<div class="avatar-preview" id="pf-preview"><img src="" alt=""></div>' +
        '<form novalidate>' +
        '<p class="pick-label">프로필 사진</p>' +
        '<div class="icon-grid" role="group" aria-label="프로필 아이콘 고르기">' +
        AVATAR_ICONS.map(function (ic) {
          return '<button type="button" class="icon-opt" data-icon="' + ic + '" aria-pressed="' + (ic === av.icon) + '" aria-label="아이콘"><img src="' + iconSrc(ic) + '" alt=""></button>';
        }).join("") + "</div>" +
        '<p class="pick-label">배경색</p>' +
        '<div class="color-row" role="group" aria-label="배경색 고르기">' +
        AVATAR_COLORS.map(function (c) {
          return '<button type="button" class="color-opt" data-color="' + c.v + '" aria-pressed="' + (c.v === av.bg) + '" aria-label="' + c.n + '" title="' + c.n + '" style="background:' + c.v + '"></button>';
        }).join("") + "</div>" +
        '<div class="field" style="margin-top:18px"><label for="pf-nick">닉네임 <small>10자까지</small></label>' +
        '<div class="nick-row"><input type="text" id="pf-nick" maxlength="10" value="' + esc(user.nickname) + '">' +
        '<button type="button" class="btn btn-outline" id="pf-pick">추천 받기</button></div><p class="hint"></p></div>' +
        '<button class="btn btn-fill auth-submit" type="submit">저장하기</button></form>',
        function (root) {
          overlay.querySelector(".auth-card").classList.add("wide");
          var preview = $("#pf-preview", root), inp = $("#pf-nick", root);
          function refresh() {
            applyAvatar(preview, av);
            $$(".icon-opt", root).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-icon") === av.icon)); });
            $$(".color-opt", root).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-color") === av.bg)); });
          }
          root.addEventListener("click", function (e) {
            var ic = e.target.closest && e.target.closest("[data-icon]");
            var co = e.target.closest && e.target.closest("[data-color]");
            if (ic) { av.icon = ic.getAttribute("data-icon"); refresh(); }
            if (co) { av.bg = co.getAttribute("data-color"); refresh(); }
          });
          $("#pf-pick", root).addEventListener("click", function () {
            inp.value = NICK_A[Math.floor(Math.random() * NICK_A.length)] + " " + NICK_B[Math.floor(Math.random() * NICK_B.length)];
            inp.focus();
          });
          $("form", root).addEventListener("submit", function (e) {
            e.preventDefault();
            var v = inp.value.trim();
            if (!v) {
              inp.closest(".field").classList.add("has-error");
              $(".hint", root).textContent = "한 글자 이상 적어 주세요.";
              return;
            }
            save({ nickname: v, avatar: av });
            closeModal();
            toast("프로필을 바꿨어요. 잘 어울려요!");
          });
          refresh();
        });
    },

    med: function () {
      var m = user.medication || {};
      openModal(badge("hand-clasp-pink.svg") +
        '<h2 class="auth-title" id="m-title">복약 알림 설정</h2>' +
        '<p class="auth-desc">약 먹는 시간은 사람마다 달라요.<br>내 시간에 맞게 이름과 시간을 정해 주세요.</p>' +
        '<form novalidate>' +
        '<button type="button" class="choice" id="md-on" aria-pressed="' + (!!m.enabled) + '"><img src="' + ICON + 'hand-thumbs-up.svg" alt=""><div><b>복약 기능 사용하기</b><span id="md-on-sub">' + (m.enabled ? "켜져 있어요" : "꺼져 있어요") + "</span></div></button>" +
        '<div id="md-times" style="margin-top:16px"' + (m.enabled ? "" : " hidden") + '>' + TodakMed.editorHTML(TodakMed.times(user)) + "</div>" +
        '<p class="reassure">복약 기록은 나만 볼 수 있어요. 한 번 놓쳐도 괜찮아요.</p>' +
        '<button class="btn btn-fill auth-submit" type="submit">저장하기</button></form>',
        function (root) {
          overlay.querySelector(".auth-card").classList.add("wide");
          var on = !!m.enabled, b = $("#md-on", root);
          var editor = TodakMed.bind($("#md-times", root));
          b.addEventListener("click", function () {
            on = !on;
            b.setAttribute("aria-pressed", String(on));
            $("#md-on-sub", root).textContent = on ? "켜져 있어요" : "꺼져 있어요";
            $("#md-times", root).hidden = !on;
          });
          $("form", root).addEventListener("submit", function (e) {
            e.preventDefault();
            save({ medication: { enabled: on, times: editor.read() } });
            closeModal();
            toast(on ? "복약 시간을 저장했어요." : "복약 기능을 껐어요. 언제든 다시 켤 수 있어요.");
          });
        });
    },

    help: function () {
      openModal(badge("hand-heart-pink.svg") +
        '<h2 class="auth-title" id="m-title">혼자 버티지 않아도 돼요</h2>' +
        '<p class="auth-desc">마음이 많이 힘들 때는 이야기를 들어 줄 사람이 있어요.<br>전화는 24시간 언제든 받아요.</p>' +
        '<ul class="help-list">' +
        '<li><a href="tel:109"><span class="num">109</span><span><b>자살예방 상담전화</b><small>24시간 · 카카오톡 채널 ‘마들랜’ 상담도 있어요</small></span></a></li>' +
        '<li><a href="tel:15770199"><span class="num" style="font-size:20px">1577-0199</span><span><b>정신건강 상담전화</b><small>24시간 · 우울·불안 등 마음 건강 상담</small></span></a></li>' +
        '<li><a href="tel:119"><span class="num">119</span><span><b>지금 위험한 상황이라면</b><small>응급 상황은 바로 119에 연락해 주세요</small></span></a></li>' +
        "</ul>", null);
    }
  };

  /* ---------- 주간 리포트 요약 ---------- */
  var DAYS = ["월", "화", "수", "목", "금", "토", "일"];
  function weekStart(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var dow = (x.getDay() + 6) % 7;     // 월요일 = 0
    x.setDate(x.getDate() - dow);
    return x;
  }
  function renderReport() {
    var now = new Date(), start = weekStart(now);
    var end = new Date(start); end.setDate(start.getDate() + 7);
    var mins = [0, 0, 0, 0, 0, 0, 0], done = 0, active = {};
    TodakStore.events("focus").forEach(function (ev) {
      var t = new Date(ev.at);
      if (t < start || t >= end) return;
      var i = (t.getDay() + 6) % 7;
      mins[i] += ev.minutes || 0;
      if (ev.completed) done++;
      active[i] = 1;
    });
    // 챙기기에서 [완료]한 물 기록 (하루마다 마지막 기록만)
    var waterByDay = {};
    TodakStore.events("water").forEach(function (ev) {
      var t = new Date(ev.at);
      if (t < start || t >= end) return;
      waterByDay[ev.day] = ev.cups || 0;
      active[(t.getDay() + 6) % 7] = 1;
    });
    var water = Object.keys(waterByDay).reduce(function (a, k) { return a + waterByDay[k]; }, 0);
    TodakStore.events("meal").forEach(function (ev) {
      var t = new Date(ev.at);
      if (t >= start && t < end && ev.done) active[(t.getDay() + 6) % 7] = 1;
    });
    var max = Math.max.apply(null, mins.concat([10]));
    var todayIdx = (now.getDay() + 6) % 7;
    $("#week").innerHTML = mins.map(function (m, i) {
      var h = m ? Math.max(12, Math.round(m / max * 100)) : 6;
      return '<div class="day' + (i === todayIdx ? " today" : "") + '">' +
        '<div class="bar-wrap"><div class="bar' + (m ? " has" : "") + '" style="height:' + h + '%">' +
        (m ? '<span class="min">' + m + "분</span>" : "") + "</div></div>" +
        '<span class="dname">' + DAYS[i] + "</span></div>";
    }).join("");
    var total = mins.reduce(function (a, b) { return a + b; }, 0);
    var days = Object.keys(active).length;
    $("#s-min").textContent = total + "분";
    $("#s-done").textContent = done + "번";
    $("#s-water").textContent = water + "잔";
    $("#s-days").textContent = days + "일";
    var last = new Date(end); last.setDate(end.getDate() - 1);
    $("#week-range").textContent = (start.getMonth() + 1) + "월 " + start.getDate() + "일 ~ " + (last.getMonth() + 1) + "월 " + last.getDate() + "일";
    $("#report-msg").textContent =
      !days ? "이번 주는 이제 시작이에요. 타이머를 한 번 켜 보면 여기에 쌓여요."
        : days === 1 ? "이번 주 첫 기록이 생겼어요. 시작한 것만으로도 충분히 잘했어요."
          : "이번 주 " + days + "일 동안 함께했어요. 조금씩 나아가고 있어요.";
  }

  paint();
  renderReport();
  if (!user.seenGuide) setTimeout(function () { modals.guide(); }, 700);

  window.TodakMain = { toast: toast, renderReport: renderReport };
})();
