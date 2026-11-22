/* =========================================================
   토닥토닥 임시 저장소 (프로토타입용)
   회원 정보를 이 브라우저(localStorage)에만 저장해요.
   실제 서비스에서는 Supabase 같은 서버로 바꿔야 해요.
   ========================================================= */
(function () {
  var USERS = "todak-users";
  var SESSION = "todak-session";

  function read(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }

  // 비밀번호는 그대로 저장하지 않고 해시로 바꿔서 저장해요
  function hash(text) {
    var salted = "todaktodak:" + text;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(salted)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        }).join("");
      });
    }
    var h = 5381;
    for (var i = 0; i < salted.length; i++) h = ((h << 5) + h + salted.charCodeAt(i)) | 0;
    return Promise.resolve("djb2-" + (h >>> 0).toString(16));
  }

  function norm(email) { return String(email || "").trim().toLowerCase(); }

  /* 체험용 게스트 계정 — ID: Guest1 / PW: 1234
     처음 로그인할 때 이 브라우저에 자동으로 만들어져요 (기록도 이 브라우저에 남아요) */
  var GUEST = { id: "guest1", password: "1234", nickname: "게스트" };
  function isGuest(id) { return norm(id) === GUEST.id; }

  window.TodakStore = {
    findUser: function (email) {
      return read(USERS, {})[norm(email)] || null;
    },
    createUser: function (data) {
      var users = read(USERS, {});
      var key = norm(data.email);
      if (users[key]) return Promise.reject(new Error("exists"));
      return hash(data.password).then(function (h) {
        users[key] = {
          email: key,
          password: h,
          nickname: data.nickname,
          terms: data.terms,
          medication: data.medication,
          role: "user",
          createdAt: new Date().toISOString()
        };
        if (!write(USERS, users)) throw new Error("storage");
        return users[key];
      });
    },
    isGuestId: isGuest,
    checkLogin: function (email, password) {
      var self = this;
      if (isGuest(email) && !this.findUser(GUEST.id)) {
        if (password !== GUEST.password) return Promise.resolve({ ok: false, reason: "wrong-password" });
        return this.createUser({
          email: GUEST.id, password: GUEST.password, nickname: GUEST.nickname,
          terms: { agreedAt: new Date().toISOString(), version: "guest" },
          medication: { enabled: false }
        }).then(function () { return self.checkLogin(email, password); });
      }
      var u = this.findUser(email);
      if (!u) return Promise.resolve({ ok: false, reason: "no-user" });
      return hash(password).then(function (h) {
        return h === u.password ? { ok: true, user: u } : { ok: false, reason: "wrong-password" };
      });
    },
    updateUser: function (email, patch) {
      var users = read(USERS, {});
      var key = norm(email);
      if (!users[key]) return null;
      for (var k in patch) users[key][k] = patch[k];
      write(USERS, users);
      return users[key];
    },
    setSession: function (email) { write(SESSION, { email: norm(email), at: Date.now() }); },
    /* 기록(타이머, 기분, 식사 등)을 사용자별로 저장해요 */
    log: function (type, data) {
      var u = this.currentUser();
      if (!u) return null;
      var key = "todak-data:" + u.email;
      var list = read(key, []);
      var item = { type: type, at: new Date().toISOString() };
      for (var k in data) item[k] = data[k];
      list.push(item);
      write(key, list);
      return item;
    },
    events: function (type) {
      var u = this.currentUser();
      if (!u) return [];
      return read("todak-data:" + u.email, []).filter(function (e) { return !type || e.type === type; });
    },
    currentUser: function () {
      var s = read(SESSION, null);
      return s ? this.findUser(s.email) : null;
    },
    logout: function () {
      try { localStorage.removeItem(SESSION); } catch (e) {}
    }
  };
})();
