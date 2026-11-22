/* =========================================================
   토닥토닥 회원가입 · 로그인 창
   - 메인 화면 위에 흐린 배경으로 떠요 (페이지 이동 없음)
   - 주소 끝이 #signup 이면 회원가입, #login 이면 로그인 창이 열려요
   - 회원가입: 계정 → 약관 → 닉네임 → 복약 기능 → 완료 → 메인(main.html)
   ========================================================= */
(function () {
  var MIN_PW = 4;            // 03번 IA: 비밀번호 4자 이상 (바꾸려면 이 숫자만 수정)
  var NICK_MAX = 10;
  var AFTER_LOGIN = "main.html";
  var ICON = "assets/icons/";

  var TERMS = [
    {
      id: "service", required: true, title: "서비스 이용약관",
      body: "[예시 문구 — 실제 약관으로 바꿔 주세요]\n토닥토닥은 사용자가 작은 실천으로 일상을 회복하도록 돕는 생활 관리 서비스예요. 이 약관은 서비스를 이용하는 방법과 서로의 약속을 담고 있어요. 토닥토닥은 의료 서비스가 아니며, 진단이나 치료를 대신하지 않아요."
    },
    {
      id: "privacy", required: true, title: "개인정보 수집·이용 동의",
      body: "[예시 문구 — 실제 내용으로 바꿔 주세요]\n수집 항목: 이메일, 닉네임, 기분·에너지 기록, 식사·복약 기록\n이용 목적: 회원 관리, 맞춤 행동 추천, 주간 생활 리포트 제공\n보유 기간: 회원 탈퇴 시까지 (탈퇴하면 바로 삭제해요)"
    },
    {
      id: "marketing", required: false, title: "마케팅 정보 수신 동의",
      body: "[예시 문구]\n새 기능 소식과 마음 챙김 팁을 받아볼 수 있어요. 동의하지 않아도 모든 기능을 그대로 쓸 수 있고, 언제든 끌 수 있어요."
    }
  ];
  var NICK_A = ["느긋한", "포근한", "말랑한", "반짝이는", "다정한", "산뜻한", "동글동글", "졸린", "씩씩한", "보송한"];
  var NICK_B = ["고래", "구름", "감자", "햇살", "고양이", "토끼", "펭귄", "별님", "모찌", "도토리"];

  var draft = null;          // 회원가입 중인 내용
  var lastFocus = null;

  /* ---------- 창 만들기 ---------- */
  var overlay = document.createElement("div");
  overlay.className = "auth-overlay";
  overlay.innerHTML =
    '<div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">' +
    '<button type="button" class="auth-close" aria-label="창 닫기">×</button>' +
    '<div class="auth-body"></div></div>';
  document.body.appendChild(overlay);
  var card = overlay.querySelector(".auth-card");
  var body = overlay.querySelector(".auth-body");

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(sel) { return body.querySelector(sel); }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }

  function head(o) {
    var steps = "";
    if (o.step) {
      steps = '<div class="auth-steps" aria-label="4단계 중 ' + o.step + '단계">';
      for (var i = 1; i <= 4; i++) steps += '<span class="' + (i < o.step ? "done" : i === o.step ? "now" : "") + '"></span>';
      steps += "</div>";
    }
    return (o.back ? '<button type="button" class="auth-back" data-go="' + o.back + '">← 이전</button>' : "") +
      steps +
      '<div class="auth-badge"><img src="' + ICON + o.icon + '" alt=""></div>' +
      (o.label ? '<span class="auth-step-label">' + o.label + "</span>" : "") +
      '<h2 class="auth-title" id="auth-title">' + o.title + "</h2>" +
      '<p class="auth-desc">' + o.desc + "</p>";
  }
  function pwField(id, label, placeholder, auto) {
    return '<div class="field"><label for="' + id + '">' + label + '</label>' +
      '<div class="input-wrap"><input type="password" id="' + id + '" placeholder="' + placeholder + '" autocomplete="' + auto + '">' +
      '<button type="button" class="peek" data-peek="' + id + '" aria-label="비밀번호 보기">보기</button></div>' +
      '<p class="hint" id="' + id + '-hint"></p></div>';
  }
  function setHint(input, msg, state) {
    var f = input.closest(".field");
    f.classList.toggle("has-error", state === "error");
    f.classList.toggle("is-ok", state === "ok");
    f.querySelector(".hint").textContent = msg || "";
  }
  function formMsg(html) {
    var m = $(".form-msg");
    if (!m) return;
    m.hidden = !html;
    m.innerHTML = html || "";
  }

  /* ---------- 화면들 ---------- */
  var views = {
    login: function () {
      body.innerHTML = head({
        icon: "hand-palm.svg", title: "다시 만나서 반가워요",
        desc: "오늘도 와 줘서 고마워요.<br>천천히 로그인해 볼까요?"
      }) +
        '<form novalidate>' +
        '<p class="form-msg" hidden></p>' +
        '<div class="field"><label for="li-email">이메일 <small>(체험용은 게스트 ID)</small></label>' +
        '<input type="text" id="li-email" placeholder="todak@example.com" autocomplete="username" autocapitalize="off" spellcheck="false"><p class="hint"></p></div>' +
        pwField("li-pw", "비밀번호", "비밀번호를 입력해 주세요", "current-password") +
        '<button class="btn btn-fill auth-submit" type="submit">로그인</button>' +
        "</form>" +
        '<p class="auth-switch"><button type="button" class="link-btn small" data-go="forgot">비밀번호를 잊어버렸어요</button></p>' +
        '<p class="auth-switch">아직 계정이 없나요? <button type="button" class="link-btn" data-go="account">회원가입</button></p>';

      var em = $("#li-email"), pw = $("#li-pw");
      if (draft && draft.email) em.value = draft.email;
      $("form").addEventListener("submit", function (e) {
        e.preventDefault();
        formMsg("");
        var ok = true;
        if (!validEmail(em.value) && !TodakStore.isGuestId(em.value)) { setHint(em, "이메일 주소를 한 번만 더 확인해 주세요.", "error"); ok = false; }
        else setHint(em, "");
        if (!pw.value) { setHint(pw, "비밀번호를 입력해 주세요.", "error"); ok = false; }
        else setHint(pw, "");
        if (!ok) return;
        TodakStore.checkLogin(em.value, pw.value).then(function (r) {
          if (r.ok) {
            TodakStore.setSession(r.user.email);
            body.innerHTML = head({ icon: "hand-heart-pink.svg", title: esc(r.user.nickname) + "님, 반가워요!", desc: "오늘의 토닥토닥으로 이동할게요." });
            setTimeout(function () { location.href = AFTER_LOGIN; }, 900);
          } else if (r.reason === "no-user") {
            formMsg('아직 가입되지 않은 이메일이에요. <button type="button" class="link-btn" data-go="account">회원가입하러 가기</button>');
          } else {
            formMsg("비밀번호가 맞지 않아요. 괜찮아요, 천천히 다시 입력해 보세요.");
            pw.select();
          }
        });
      });
      return em;
    },

    forgot: function () {
      body.innerHTML = head({
        back: "login", icon: "hand-crossed.svg", title: "비밀번호를 잊어버렸나요?",
        desc: "누구나 그럴 수 있어요.<br>가입한 이메일을 알려 주면 다시 설정하는 방법을 보내 드릴게요."
      }) +
        '<form novalidate><p class="form-msg" hidden></p>' +
        '<div class="field"><label for="fg-email">이메일</label><input type="email" id="fg-email" placeholder="todak@example.com" autocomplete="email"><p class="hint"></p></div>' +
        '<button class="btn btn-fill auth-submit" type="submit">안내 받기</button></form>';
      var em = $("#fg-email");
      $("form").addEventListener("submit", function (e) {
        e.preventDefault();
        if (!validEmail(em.value)) { setHint(em, "이메일 주소를 한 번만 더 확인해 주세요.", "error"); return; }
        setHint(em, "");
        formMsg("지금은 미리보기 버전이라 메일이 실제로 가지 않아요. 서버를 연결하는 단계에서 완성할게요.");
      });
      return em;
    },

    account: function () {
      draft = draft || { email: "", password: "", terms: {}, nickname: "", medication: null };
      body.innerHTML = head({
        back: "login", step: 1, icon: "hand-index-one.svg", label: "1단계 · 계정 만들기",
        title: "만나서 반가워요!", desc: "로그인할 때 쓸 이메일과 비밀번호를 정해 주세요."
      }) +
        '<form novalidate><p class="form-msg" hidden></p>' +
        '<div class="field"><label for="su-email">이메일</label>' +
        '<input type="email" id="su-email" placeholder="todak@example.com" autocomplete="email"><p class="hint"></p></div>' +
        pwField("su-pw", "비밀번호 <small>" + MIN_PW + "자 이상</small>", "비밀번호를 정해 주세요", "new-password") +
        pwField("su-pw2", "비밀번호 확인", "한 번 더 입력해 주세요", "new-password") +
        '<button class="btn btn-fill auth-submit" type="submit">다음</button></form>' +
        '<p class="auth-switch">이미 계정이 있나요? <button type="button" class="link-btn" data-go="login">로그인</button></p>';

      var em = $("#su-email"), pw = $("#su-pw"), pw2 = $("#su-pw2");
      em.value = draft.email; pw.value = draft.password; pw2.value = draft.password;

      function checkPw(final) {
        if (!pw.value) { setHint(pw, final ? "비밀번호를 정해 주세요." : "", final ? "error" : ""); return false; }
        if (pw.value.length < MIN_PW) {
          setHint(pw, MIN_PW + "자 이상이면 돼요. (지금 " + pw.value.length + "자)", final ? "error" : ""); return false;
        }
        setHint(pw, "좋아요!", "ok"); return true;
      }
      function checkPw2(final) {
        if (!pw2.value) { setHint(pw2, final ? "비밀번호를 한 번 더 입력해 주세요." : "", final ? "error" : ""); return false; }
        if (pw2.value !== pw.value) { setHint(pw2, "위에 쓴 비밀번호와 달라요.", "error"); return false; }
        setHint(pw2, "똑같이 입력했어요.", "ok"); return true;
      }
      pw.addEventListener("input", function () { checkPw(false); if (pw2.value) checkPw2(false); });
      pw2.addEventListener("input", function () { checkPw2(false); });
      em.addEventListener("blur", function () {
        if (em.value && !validEmail(em.value)) setHint(em, "이메일 형식을 확인해 주세요. (예: todak@example.com)", "error");
        else setHint(em, "");
      });

      $("form").addEventListener("submit", function (e) {
        e.preventDefault();
        formMsg("");
        var ok = true;
        if (!validEmail(em.value)) { setHint(em, "이메일 형식을 확인해 주세요. (예: todak@example.com)", "error"); ok = false; }
        else if (TodakStore.findUser(em.value)) {
          formMsg('이미 가입된 이메일이에요. <button type="button" class="link-btn" data-go="login">로그인하기</button>');
          ok = false;
        }
        ok = checkPw(true) && ok;
        ok = checkPw2(true) && ok;
        if (!ok) return;
        draft.email = em.value.trim();
        draft.password = pw.value;
        show("terms");
      });
      return em;
    },

    terms: function () {
      body.innerHTML = head({
        back: "account", step: 2, icon: "hand-ok.svg", label: "2단계 · 약관 동의",
        title: "편안한 공간을 위한 약속", desc: "꼭 필요한 항목만 동의하면 돼요.<br>선택 항목은 나중에 바꿀 수 있어요."
      }) +
        '<form novalidate>' +
        '<label class="terms-all"><input type="checkbox" class="check" id="t-all"> 모두 동의할게요</label>' +
        '<ul class="terms-list">' +
        TERMS.map(function (t) {
          return '<li><div class="terms-row">' +
            '<input type="checkbox" class="check" id="t-' + t.id + '" data-term="' + t.id + '">' +
            '<label for="t-' + t.id + '"><span class="tag ' + (t.required ? "req" : "opt") + '">[' + (t.required ? "필수" : "선택") + "]</span>" + t.title + "</label>" +
            '<button type="button" class="link-btn small" data-view="' + t.id + '" aria-expanded="false">보기</button></div>' +
            '<div class="terms-body" id="tb-' + t.id + '" hidden>' + esc(t.body).replace(/\n/g, "<br>") + "</div></li>";
        }).join("") +
        "</ul>" +
        '<button class="btn btn-fill auth-submit" type="submit" disabled>다음</button></form>';

      var all = $("#t-all");
      var boxes = Array.prototype.slice.call(body.querySelectorAll("[data-term]"));
      var next = $(".auth-submit");
      boxes.forEach(function (b) { b.checked = !!draft.terms[b.getAttribute("data-term")]; });
      function refresh() {
        boxes.forEach(function (b) { draft.terms[b.getAttribute("data-term")] = b.checked; });
        all.checked = boxes.every(function (b) { return b.checked; });
        next.disabled = !TERMS.every(function (t) { return !t.required || draft.terms[t.id]; });
      }
      all.addEventListener("change", function () { boxes.forEach(function (b) { b.checked = all.checked; }); refresh(); });
      boxes.forEach(function (b) { b.addEventListener("change", refresh); });
      body.querySelectorAll("[data-view]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var box = $("#tb-" + btn.getAttribute("data-view"));
          box.hidden = !box.hidden;
          btn.textContent = box.hidden ? "보기" : "접기";
          btn.setAttribute("aria-expanded", String(!box.hidden));
        });
      });
      refresh();
      $("form").addEventListener("submit", function (e) {
        e.preventDefault();
        if (next.disabled) return;
        draft.terms.agreedAt = new Date().toISOString();
        draft.terms.version = "v1-예시";
        show("nickname");
      });
      return all;
    },

    nickname: function () {
      body.innerHTML = head({
        back: "terms", step: 3, icon: "hand-gun.svg", label: "3단계 · 닉네임",
        title: "어떻게 불러 드릴까요?", desc: "토닥토닥이 이 이름으로 인사할게요.<br>떠오르지 않으면 추천을 받아 보세요."
      }) +
        '<form novalidate><div class="field"><label for="nk">닉네임 <small>' + NICK_MAX + "자까지</small></label>" +
        '<div class="nick-row"><input type="text" id="nk" maxlength="' + NICK_MAX + '" placeholder="예) 느긋한 고래" autocomplete="nickname">' +
        '<button type="button" class="btn btn-outline" id="nk-pick">추천 받기</button></div>' +
        '<p class="hint"></p></div>' +
        '<button class="btn btn-fill auth-submit" type="submit" disabled>다음</button></form>';
      var nk = $("#nk"), next = $(".auth-submit");
      nk.value = draft.nickname || "";
      function refresh() {
        var v = nk.value.trim();
        next.disabled = !v;
        if (v) setHint(nk, "“" + v + "”님, 좋은 이름이에요!", "ok"); else setHint(nk, "");
      }
      nk.addEventListener("input", refresh);
      $("#nk-pick").addEventListener("click", function () {
        var name;
        do {
          name = NICK_A[Math.floor(Math.random() * NICK_A.length)] + " " + NICK_B[Math.floor(Math.random() * NICK_B.length)];
        } while (name === nk.value);
        nk.value = name.slice(0, NICK_MAX);
        refresh();
      });
      refresh();
      $("form").addEventListener("submit", function (e) {
        e.preventDefault();
        if (!nk.value.trim()) return;
        draft.nickname = nk.value.trim();
        show("medication");
      });
      return nk;
    },

    medication: function () {
      body.innerHTML = head({
        back: "nickname", step: 4, icon: "hand-heart-pink.svg", label: "4단계 · 복약 기능",
        title: "복약 알림 기능을 쓸까요?", desc: "약 먹을 시간을 알려 주고,<br>먹었는지 가볍게 기록할 수 있어요."
      }) +
        '<form novalidate><div class="choice-grid">' +
        '<button type="button" class="choice" data-med="on" aria-pressed="false"><img src="' + ICON + 'hand-thumbs-up.svg" alt=""><div><b>사용할게요</b><span>알림 시간을 정할 수 있어요</span></div></button>' +
        '<div class="med-times" hidden>' +
        '<div class="field"><label for="med-am">아침 알림</label><input type="time" id="med-am" value="09:00"></div>' +
        '<div class="field"><label for="med-pm">저녁 알림</label><input type="time" id="med-pm" value="21:00"></div></div>' +
        '<button type="button" class="choice" data-med="off" aria-pressed="false"><img src="' + ICON + 'hand-palm.svg" alt=""><div><b>지금은 괜찮아요</b><span>복약 기능 없이 시작해요</span></div></button>' +
        "</div>" +
        '<p class="reassure">지금 정하지 않아도 괜찮아요. 프로필에서 언제든 켜고 끌 수 있어요.</p>' +
        '<p class="form-msg" hidden></p>' +
        '<button class="btn btn-fill auth-submit" type="submit" disabled>토닥토닥 시작하기</button></form>';

      var choices = Array.prototype.slice.call(body.querySelectorAll("[data-med]"));
      var times = $(".med-times"), next = $(".auth-submit");
      function pick(val) {
        choices.forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-med") === val)); });
        times.hidden = val !== "on";
        next.disabled = false;
        draft.medication = { enabled: val === "on" };
      }
      choices.forEach(function (c) { c.addEventListener("click", function () { pick(c.getAttribute("data-med")); }); });
      if (draft.medication) pick(draft.medication.enabled ? "on" : "off");

      $("form").addEventListener("submit", function (e) {
        e.preventDefault();
        if (!draft.medication) return;
        if (draft.medication.enabled) {
          draft.medication.morning = $("#med-am").value || null;
          draft.medication.evening = $("#med-pm").value || null;
        }
        next.disabled = true;
        TodakStore.createUser(draft).then(function (u) {
          TodakStore.setSession(u.email);
          draft = null;
          show("done", u);
        }).catch(function (err) {
          next.disabled = false;
          formMsg(err.message === "exists"
            ? '이미 가입된 이메일이에요. <button type="button" class="link-btn" data-go="login">로그인하기</button>'
            : "저장하는 중에 문제가 생겼어요. 잠시 후 다시 눌러 주세요.");
        });
      });
      return choices[0];
    },

    done: function (u) {
      body.innerHTML = '<div class="auth-done">' + head({
        icon: "hand-high-five-pink.svg", title: esc(u.nickname) + "님, 환영해요!",
        desc: "가입을 마쳤어요. 정말 잘했어요.<br>오늘은 아주 작은 것 하나부터 시작해 봐요."
      }) +
        '<a class="btn btn-fill auth-submit" href="' + AFTER_LOGIN + '">오늘의 토닥토닥 시작하기</a></div>';
      confetti();
      return $(".auth-submit");
    }
  };

  function confetti() {
    var wrap = document.createElement("div");
    wrap.className = "confetti";
    var colors = ["#fbde18", "#0791fe", "#ec82a3", "#70bf44"];
    for (var i = 0; i < 26; i++) {
      var p = document.createElement("i");
      p.style.left = Math.random() * 100 + "%";
      p.style.background = colors[i % 4];
      p.style.animationDelay = Math.random() * .5 + "s";
      wrap.appendChild(p);
    }
    card.appendChild(wrap);
    setTimeout(function () { wrap.remove(); }, 2400);
  }

  /* ---------- 열기 · 닫기 · 이동 ---------- */
  function show(name, arg) {
    var old = card.querySelector(".confetti");
    if (old) old.remove();
    var first = views[name](arg);
    body.firstElementChild && body.classList.remove("auth-pane");
    void body.offsetWidth;
    body.classList.add("auth-pane");
    if (first && first.focus) setTimeout(function () { first.focus(); }, 60);
  }
  function open(name) {
    if (!overlay.classList.contains("is-open")) {
      lastFocus = document.activeElement;
      overlay.classList.add("is-open");
      document.body.classList.add("auth-locked");
    }
    show(name);
  }
  function close() {
    overlay.classList.remove("is-open");
    document.body.classList.remove("auth-locked");
    if (/^#(signup|login)$/.test(location.hash)) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function fromHash() {
    if (location.hash === "#signup") open("account");
    else if (location.hash === "#login") open("login");
    else if (overlay.classList.contains("is-open")) close();
  }

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) return close();
    var go = e.target.closest && e.target.closest("[data-go]");
    if (go) { e.preventDefault(); show(go.getAttribute("data-go")); return; }
    var peek = e.target.closest && e.target.closest("[data-peek]");
    if (peek) {
      var inp = document.getElementById(peek.getAttribute("data-peek"));
      var showing = inp.type === "text";
      inp.type = showing ? "password" : "text";
      peek.textContent = showing ? "보기" : "숨기기";
      peek.setAttribute("aria-label", showing ? "비밀번호 보기" : "비밀번호 숨기기");
    }
  });
  overlay.querySelector(".auth-close").addEventListener("click", close);

  document.addEventListener("keydown", function (e) {
    if (!overlay.classList.contains("is-open")) return;
    if (e.key === "Escape") { close(); return; }
    if (e.key !== "Tab") return;
    // 창 안에서만 Tab 이동
    var f = Array.prototype.filter.call(
      card.querySelectorAll("button, a[href], input, [tabindex]:not([tabindex='-1'])"),
      function (el) { return !el.disabled && el.offsetParent !== null; });
    if (!f.length) return;
    var i = f.indexOf(document.activeElement);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });

  window.addEventListener("hashchange", fromHash);
  fromHash();

  window.TodakAuth = { open: open, close: close };
})();
