/* =========================================================
   생활 리포트 (주간 · 월간)
   오늘의 나 · 챙기기 · 할 일 쪼개기 기록을 선 그래프로 보여 줘요
   - 주간: 요일별 기록을 그대로 이어요 (기록 없는 날은 선을 끊어요)
   - 월간: 그날 기록은 옅은 점, 선은 최근 7일 평균 → 큰 흐름이 보여요
   - ‹ › 버튼으로 지난주 / 지난달도 볼 수 있어요
   ========================================================= */
(function () {
  var user = TodakStore.currentUser();
  if (!user) return;

  var DOW = ["월", "화", "수", "목", "금", "토", "일"];
  var DOW_LONG = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];
  var C = { blue: "#0791fe", pink: "#e0558a", gray: "#97a6b5" };
  var MAX_BACK = { week: 12, month: 12 };

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function add(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function dow(d) { return (d.getDay() + 6) % 7; }
  /* 오늘의 나·챙기기 하루 키 (새벽 5시 기준) / 할 일 쪼개기 날짜 키 */
  function careKey(d) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function ymd(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function round1(v) { return Math.round(v * 10) / 10; }
  function vals(a) { return a.filter(function (v) { return v != null; }); }
  function count(a) { return vals(a).length; }
  function sum(a) { return a.reduce(function (x, y) { return x + (y || 0); }, 0); }
  function avg(a) { var f = vals(a); return f.length ? sum(f) / f.length : null; }
  function hoursLabel(h) { var m = Math.round(h * 60); return Math.floor(m / 60) + "시간" + (m % 60 ? " " + (m % 60) + "분" : ""); }

  /* 지금의 '토닥 하루' (새벽 5시 전이면 어제) */
  var nowDay = new Date(Date.now() - 5 * 3600 * 1000);
  nowDay = new Date(nowDay.getFullYear(), nowDay.getMonth(), nowDay.getDate());
  var thisWeek = add(nowDay, -dow(nowDay));
  var thisMonth = new Date(nowDay.getFullYear(), nowDay.getMonth(), 1);

  var mode = /month/.test(location.hash) ? "month" : "week";
  var offset = 0;                                        // 0 = 이번 주(달), 1 = 지난주(달) …

  /* ---------- 기록 모으기 ---------- */
  function lastBy(type, keyFn) {                         // 날짜·칸마다 마지막 기록
    var map = {};
    TodakStore.events(type).forEach(function (ev) { if (ev.day) map[keyFn(ev)] = ev; });
    return map;
  }
  function byDay(map) {                                  // 'day|slot' → { day: [기록…] }
    var out = {};
    Object.keys(map).forEach(function (k) { var d = k.split("|")[0]; (out[d] = out[d] || []).push(map[k]); });
    return out;
  }
  function loadTasks() {
    var db;
    try { db = JSON.parse(localStorage.getItem("todak-tasks:" + user.email)); } catch (e) {}
    db = db && db.items ? db : { items: [] };
    db.done = db.done || {}; db.moved = db.moved || {};
    return db;
  }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function occursOn(it, s) {                             // tasks.js와 같은 반복 계산
    if (!it.date || s < it.date) return false;
    var r = it.repeat || { kind: "none" };
    if (r.until && s > r.until) return false;
    var d = parse(s), st = parse(it.date);
    switch (r.kind) {
      case "daily": return true;
      case "weekdays": return dow(d) < 5;
      case "weekly": return (r.days && r.days.length ? r.days : [dow(st)]).indexOf(dow(d)) >= 0;
      case "monthly": return d.getDate() === st.getDate();
      default: return s === it.date;
    }
  }

  /* start부터 n일 동안의 기록 */
  function collect(start, n) {
    var mood = byDay(lastBy("mood", function (e) { return e.day + "|" + e.slot; }));
    var meal = byDay(lastBy("meal", function (e) { return e.day + "|" + e.slot; }));
    var med = byDay(lastBy("med", function (e) { return e.day + "|" + e.slot; }));
    var water = lastBy("water", function (e) { return e.day; });
    var sleep = lastBy("sleep", function (e) { return e.day; });
    var medTimes = (TodakMed.times(user) || []).length;
    var db = loadTasks();
    var first = db.items.filter(function (it) { return it.type !== "event" && it.date; })
      .map(function (it) { return it.date; }).sort()[0] || "9999";   // 첫 할 일을 넣기 전 날은 비워요

    var R = { days: [], futureFrom: n, energy: [], focus: [], weather: [], meals: [], water: [], sleep: [], med: [], planned: [], done: [], moved: 0 };
    for (var i = 0; i < n; i++) {
      var d = add(start, i), ck = careKey(d), tk = ymd(d), future = d > nowDay;
      if (future && R.futureFrom === n) R.futureFrom = i;
      R.days.push(d);
      var m = mood[ck] || [];
      R.energy.push(m.length ? round1(avg(m.map(function (e) { return e.energy; }))) : null);
      R.focus.push(m.length ? round1(avg(m.map(function (e) { return e.focus; }))) : null);
      R.weather.push(m.length ? Math.round(avg(m.map(function (e) { return e.weather; }))) : null);
      var ml = meal[ck] || [];
      R.meals.push(ml.length ? ml.filter(function (e) { return e.done; }).length : null);
      R.water.push(water[ck] ? water[ck].cups || 0 : null);
      R.sleep.push(sleep[ck] ? sleep[ck].hours : null);
      var md = med[ck] || [];
      R.med.push(md.length && medTimes ? Math.min(100, Math.round(md.filter(function (e) { return e.status === "taken"; }).length / medTimes * 100)) : null);

      var p = 0, dn = 0;
      db.items.forEach(function (it) {
        if (it.type === "event" || !occursOn(it, tk)) return;
        var k = it.id + "@" + tk;
        if (db.moved[k]) { if (!future) R.moved++; return; }    // 다음 날로 미룬 일
        p++; if (db.done[k]) dn++;
      });
      if (tk < first) { R.planned.push(null); R.done.push(null); continue; }
      R.planned.push(future && !p ? null : p);          // 앞으로 남은 날은 계획만
      R.done.push(future ? null : dn);
    }
    // 할 일이 하나도 없던 기간은 빈 그래프로
    if (!sum(R.planned)) { R.planned = R.planned.map(function () { return null; }); R.done = R.done.map(function () { return null; }); }
    return R;
  }

  /* 최근 7일 평균 (기록한 날만으로, 앞으로 남은 날은 비워요) */
  function roll(a, futureFrom) {
    return a.map(function (v, i) {
      if (i >= futureFrom) return null;
      var w = vals(a.slice(Math.max(0, i - 6), i + 1));
      return w.length ? sum(w) / w.length : null;
    });
  }

  /* ---------- 선 그래프 (SVG) ----------
     opt: series[{name,color,values,dash,fmt}], min, max, ticks, height,
          month(true면 점+7일 평균), weeks(월간 주 띠), icons(주간 날씨), todayIdx, empty, tipTitle(i) */
  var charts = [];
  function lineChart(host, opt) { charts.push({ host: host, opt: opt }); draw(host, opt); }
  function draw(host, opt) {
    var n = opt.series[0].values.length, M = !!opt.month;
    var W = Math.max(240, host.clientWidth), H = opt.height || 220;
    var iconRow = opt.icons ? 34 : 0;
    var L = 30, Rr = M ? 8 : 10, T = M ? 18 : 12, B = 26 + iconRow;
    var pw = W - L - Rr, ph = H - T - B, col = pw / n;
    function x(i) { return L + col * (i + .5); }
    function y(v) { return T + (1 - (v - opt.min) / (opt.max - opt.min)) * ph; }
    var s = '<svg width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(opt.label || "") + '">';

    if (M && opt.weeks) {                                // 1주 · 2주 … 띠
      opt.weeks.forEach(function (w, k) {
        if (k % 2 === 0) s += '<rect class="wk-band" x="' + (L + col * w[0]) + '" y="' + (T - 14) + '" width="' + col * (w[1] - w[0] + 1) + '" height="' + (ph + 14) + '" rx="8"/>';
        if (!opt.mini && w[1] - w[0] >= 5) s += '<text class="wk-name" x="' + (L + col * (w[0] + w[1] + 1) / 2) + '" y="' + (T - 4) + '" text-anchor="middle">' + (k + 1) + "주</text>";
      });
    }
    if (opt.todayIdx != null) {
      s += M ? '<rect class="today-band" x="' + (L + col * opt.todayIdx) + '" y="' + (T - 14) + '" width="' + col + '" height="' + (ph + 14) + '" rx="4"/>'
        : '<rect class="today-band" x="' + (L + col * opt.todayIdx) + '" y="' + (T - 6) + '" width="' + col + '" height="' + (ph + 12) + '" rx="12"/>';
    }
    s += '<g class="grid">';
    opt.ticks.forEach(function (t) {
      s += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>' +
        '<text class="ax" x="' + (L - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + t + "</text>";
    });
    s += "</g>";
    s += '<line class="base-line" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + y(opt.min) + '" y2="' + y(opt.min) + '"/>';

    // 가로축: 주간은 요일(+날씨), 월간은 날짜 몇 개 + '오늘'
    if (M) {
      var narrow = W < 420, marks = narrow ? [1, 8, 15, 22, 29] : [1, 5, 10, 15, 20, 25, 30];
      marks.forEach(function (d) {
        if (d > n) return;
        if (opt.todayIdx != null && Math.abs(d - 1 - opt.todayIdx) <= (narrow ? 2 : 1)) return;
        s += '<text class="ax-date" x="' + x(d - 1) + '" y="' + (H - 6) + '" text-anchor="middle">' + d + "</text>";
      });
      if (opt.todayIdx != null) s += '<text class="ax-date is-today" x="' + x(opt.todayIdx) + '" y="' + (H - 6) + '" text-anchor="middle">오늘</text>';
    } else {
      for (var i = 0; i < n; i++) {
        if (opt.icons && opt.icons[i]) {
          s += '<g transform="translate(' + (x(i) - 15) + " " + (T + ph + 3) + ')"><svg width="30" height="30" viewBox="0 0 64 64">' +
            opt.icons[i].replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "") + "</svg></g>";
        }
        s += '<text class="ax-day' + (i === opt.todayIdx ? " is-today" : "") + '" x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + DOW[i] + "</text>";
      }
    }
    s += '<line class="cross" x1="0" x2="0" y1="' + (T - (M ? 10 : 4)) + '" y2="' + (T + ph) + '" visibility="hidden"/>';

    // 선: 주간은 기록 그대로, 월간은 최근 7일 평균 (빈 곳에서 끊어요)
    opt.series.forEach(function (se) {
      var line = M ? roll(se.values, opt.futureFrom != null && !se.dash ? opt.futureFrom : n) : se.values;
      var d = "", pen = false;
      line.forEach(function (v, i) {
        if (v == null) { pen = false; return; }
        d += (pen ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1);
        pen = true;
      });
      if (d) s += '<path class="s-line" d="' + d + '" stroke="' + se.color + '"' + (se.dash ? ' stroke-dasharray="' + (M ? "5 5" : "6 6") + '"' : "") + (M && se.dash ? ' style="stroke-width:2"' : "") + "/>";
    });
    opt.series.forEach(function (se, si) {
      se.values.forEach(function (v, i) {
        if (v == null) return;
        if (M) { if (!se.dash) s += '<circle class="day-dot" cx="' + x(i) + '" cy="' + y(v) + '" r="3" fill="' + se.color + '"/>'; return; }
        s += '<circle class="s-dot" cx="' + x(i) + '" cy="' + y(v) + '" r="' + (se.dash ? 4 : si ? 3.6 : 6) + '" fill="' + se.color + '"/>';
      });
    });
    for (i = 0; i < n; i++) s += '<rect class="hit" data-i="' + i + '" x="' + (L + col * i) + '" y="0" width="' + col + '" height="' + H + '"/>';
    s += "</svg>";

    var has = opt.series.some(function (se) { return count(se.values); });
    host.innerHTML = s + (has ? "" : '<div class="chart-empty"><span>' + esc(opt.empty || "아직 기록이 없어요") + "</span></div>") + '<div class="tip"></div>';

    // 말풍선
    var tip = host.querySelector(".tip"), cross = host.querySelector(".cross");
    var rolled = M ? opt.series.map(function (se) { return roll(se.values, opt.futureFrom != null ? opt.futureFrom : n); }) : null;
    function show(i) {
      var rows = opt.series.map(function (se, k) {
        var v = se.values[i], f = se.fmt || function (z) { return z; };
        var r = rolled && !se.dash && rolled[k][i] != null ? ' <small style="opacity:.7">(7일 평균 ' + f(round1(rolled[k][i])) + ")</small>" : "";
        return '<div><i style="background:' + se.color + '"></i>' + esc(se.name) + " " + (v == null ? "기록 없음" : f(v)) + r + "</div>";
      }).join("");
      tip.innerHTML = "<b>" + opt.tipTitle(i) + "</b>" + (opt.tipExtra ? opt.tipExtra(i) : "") + rows;
      cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("visibility", "visible");
      tip.classList.add("show");
      var tw = tip.offsetWidth, left = x(i) + 14;
      if (left + tw > W) left = x(i) - 14 - tw;
      tip.style.left = Math.max(0, left) + "px";
    }
    function hide() { tip.classList.remove("show"); cross.setAttribute("visibility", "hidden"); }
    host.querySelectorAll(".hit").forEach(function (r) {
      r.addEventListener("pointerenter", function () { show(+r.getAttribute("data-i")); });
      r.addEventListener("click", function () { show(+r.getAttribute("data-i")); });
    });
    host.onpointerleave = hide;
  }
  var rT;
  window.addEventListener("resize", function () {
    clearTimeout(rT);
    rT = setTimeout(function () { charts.forEach(function (c) { draw(c.host, c.opt); }); }, 120);
  });

  function legend(el, series) {
    el.innerHTML = series.map(function (se) {
      return '<span><i class="' + (se.dash ? "dash" : "") + '" style="border-color:' + se.color + '"></i>' + esc(se.name) + "</span>";
    }).join("");
  }
  /* 숫자로 보기: 주간은 요일이 가로, 월간은 날짜가 세로 */
  function table(el, heads, rows, vertical) {
    function cell(r, v) { return v == null ? "–" : (r.fmt ? r.fmt(v) : v); }
    if (!vertical) {
      el.innerHTML = "<table><thead><tr><th></th>" + heads.map(function (h) { return "<th>" + h + "</th>"; }).join("") + "</tr></thead><tbody>" +
        rows.map(function (r) { return "<tr><td>" + esc(r.name) + "</td>" + r.values.map(function (v) { return "<td>" + cell(r, v) + "</td>"; }).join("") + "</tr>"; }).join("") +
        "</tbody></table>";
      return;
    }
    el.innerHTML = '<div class="tb-scroll"><table><thead><tr><th>날짜</th>' + rows.map(function (r) { return "<th>" + esc(r.name) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      heads.map(function (h, i) { return "<tr><td>" + h + "</td>" + rows.map(function (r) { return "<td>" + cell(r, r.values[i]) + "</td>"; }).join("") + "</tr>"; }).join("") +
      "</tbody></table></div>";
  }
  function bestDay(v) { var b = -1; v.forEach(function (x, i) { if (x != null && (b < 0 || x > v[b])) b = i; }); return b; }
  function delta(cur, prev, unit, fmt, digits) {        // 지난달과 비교
    if (cur == null || prev == null) return "";
    var d = cur - prev, r = digits === 0 ? Math.round(d) : round1(d);
    if (!r) return ' <span class="delta down">(지난달과 같아요)</span>';
    return ' <span class="delta' + (r < 0 ? " down" : "") + '">(' + (r > 0 ? "+" : "−") + (fmt ? fmt(Math.abs(r)) : Math.abs(r) + unit) + ")</span>";
  }
  /* 한 달을 월~일 주로 나눠요. 앞쪽 3일 이하 조각은 다음 주에 붙여요 */
  function monthWeeks(start, n) {
    var w = [], s = 0;
    for (var i = 1; i <= n; i++) {
      if (i === n || dow(add(start, i)) === 0) { w.push([s, i - 1]); s = i; }
    }
    if (w.length > 1 && w[0][1] - w[0][0] < 3) { w[1][0] = 0; w.shift(); }
    return w;
  }

  /* ---------- 그리기 ---------- */
  function render() {
    charts = [];
    var M = mode === "month", start, n;
    if (M) { start = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - offset, 1); n = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate(); }
    else { start = add(thisWeek, -7 * offset); n = 7; }
    var R = collect(start, n);
    var P = M ? collect(new Date(start.getFullYear(), start.getMonth() - 1, 1), new Date(start.getFullYear(), start.getMonth(), 0).getDate()) : null;
    var todayIdx = offset === 0 ? (M ? nowDay.getDate() - 1 : dow(nowDay)) : null;
    var weeks = M ? monthWeeks(start, n) : null;
    var heads = R.days.map(function (d) { return M ? (d.getMonth() + 1) + "/" + d.getDate() + " (" + DOW[dow(d)] + ")" : DOW[dow(d)] + "<br><small>" + (d.getMonth() + 1) + "/" + d.getDate() + "</small>"; });
    function tipTitle(i) { var d = R.days[i]; return (M ? (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + DOW[dow(d)] + ")" : DOW_LONG[i] + " " + (d.getMonth() + 1) + "/" + d.getDate()); }
    function dayName(i) { var d = R.days[i]; return M ? (d.getMonth() + 1) + "월 " + d.getDate() + "일" : DOW_LONG[i]; }
    var base = { month: M, weeks: weeks, todayIdx: todayIdx, futureFrom: R.futureFrom, tipTitle: tipTitle };
    function opts(o) { for (var k in base) if (!(k in o)) o[k] = base[k]; return o; }

    // 머리말
    $$(".seg button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-mode") === mode)); });
    $$(".month-only").forEach(function (el) { el.hidden = !M; });
    var end = add(start, n - 1);
    $("#wk-range").textContent = M
      ? (offset === 0 ? "이번 달 · " : offset === 1 ? "지난달 · " : "") + start.getFullYear() + "년 " + (start.getMonth() + 1) + "월"
      : (offset === 0 ? "이번 주 · " : offset === 1 ? "지난주 · " : "") + (start.getMonth() + 1) + "월 " + start.getDate() + "일 ~ " + (end.getMonth() + 1) + "월 " + end.getDate() + "일";
    $("#wk-prev").disabled = offset >= MAX_BACK[mode];
    $("#wk-next").disabled = offset === 0;
    $("#wk-prev").setAttribute("aria-label", M ? "지난달 보기" : "지난주 보기");
    $("#wk-next").setAttribute("aria-label", M ? "다음 달 보기" : "다음 주 보기");
    $("#sub-tasks").textContent = (M ? "날짜별" : "하루에") + " 해야 했던 일과 끝낸 일 (일정은 빼고 과제·일상만)";
    $("#sub-today").textContent = (M ? "날짜별" : "하루") + " 에너지와 집중력 (5단계, 하루 평균)";

    var active = 0;
    for (var i = 0; i < n; i++) {
      if ([R.energy, R.meals, R.water, R.sleep, R.med].some(function (a) { return a[i] != null; }) || (R.done[i] || 0) > 0) active++;
    }
    var doneAll = sum(R.done), planAll = sum(R.planned.slice(0, R.futureFrom));
    var sleepAvg = avg(R.sleep);
    $("#sum").innerHTML =
      "<span>기록한 날 <b>" + active + "일</b></span>" +
      "<span>챙겨 먹은 끼니 <b>" + sum(R.meals) + "끼</b></span>" +
      "<span>평균 수면 <b>" + (sleepAvg == null ? "–" : hoursLabel(sleepAvg)) + "</b></span>" +
      "<span>끝낸 할 일 <b>" + doneAll + "개</b></span>";
    var unit = M ? "달" : "주", eun = M ? "은" : "는";
    var when = offset === 0 ? "이번 " + unit : offset === 1 ? (M ? "지난달" : "지난주") : "이 " + unit;   // 이번 주 / 지난주 / 이 주
    $("#wk-lead").textContent = !active
      ? (offset === 0 ? "이번 " + unit + eun + " 이제 시작이에요. 하루 한 번만 기록해도 여기에 선이 그려져요." : "이 " + unit + "에는 남긴 기록이 없어요. 쉬어 간 " + unit + "도 괜찮아요.")
      : M ? "한 달 동안 남긴 기록이에요. 하루하루의 오르내림보다 전체 흐름을 봐 주세요."
        : "한 주 동안 남긴 기록을 선으로 이어 봤어요. 빈 날이 있어도 괜찮아요.";

    /* 1. 오늘의 나 */
    var sToday = [
      { name: "에너지", color: C.blue, values: R.energy },
      { name: "집중력", color: C.pink, values: R.focus }
    ];
    legend($("#lg-today"), sToday);
    lineChart($("#ch-today"), opts({
      label: "날짜별 에너지와 집중력", series: sToday, min: 0, max: 5, ticks: [1, 2, 3, 4, 5], height: M ? 240 : 250,
      empty: "오늘의 나에서 기록하면 여기에 그려져요",
      icons: M ? null : R.weather.map(function (w) { return w ? TodakWeather.icon(w, "todak") : null; }),
      tipExtra: function (i) { var w = R.weather[i]; return w ? "<div>기분 날씨 " + TodakWeather.MOODS[w - 1].name + "</div>" : ""; }
    }));
    var nT = count(R.energy), bE = bestDay(R.energy);
    if (M) {
      var wc = [0, 0, 0, 0, 0]; R.weather.forEach(function (w) { if (w) wc[w - 1]++; });
      var topW = nT ? wc.indexOf(Math.max.apply(null, wc)) : -1;
      $("#moods").innerHTML = TodakWeather.MOODS.map(function (m, k) {
        return '<div class="' + (k === topW ? "top" : "") + '">' + TodakWeather.icon(m.v, "todak") + "<b>" + wc[k] + "일</b>" + m.name + "</div>";
      }).join("");
      var ev = vals(R.energy), half = Math.floor(ev.length / 2), trend = "";
      if (ev.length >= 4) {
        var dif = round1(avg(ev.slice(half)) - avg(ev.slice(0, half)));
        trend = dif >= .3 ? " 월초보다 요즘 에너지가 평균 " + dif + "단계 올라왔어요. 천천히 회복하고 있어요."
          : dif <= -.3 ? " 요즘 에너지가 월초보다 조금 내려왔어요. 지친 시기일 수 있어요. 오늘은 아주 작은 것 하나만 해도 충분해요."
            : " 에너지가 한 달 내내 비슷하게 유지됐어요. 꾸준히 버텨 낸 것도 대단한 일이에요.";
      }
      $("#in-today").textContent = !nT ? "아직 " + when + " 기록이 없어요. 생각날 때 한 번만 눌러 줘도 충분해요."
        : when + "은 ‘" + TodakWeather.MOODS[topW].name + "’인 날이 가장 많았어요." + (trend || " 기록이 조금 더 쌓이면 한 달의 흐름도 보여 드릴게요.");
    } else {
      $("#in-today").textContent = !nT ? "아직 기록이 없어요. 아침이든 밤이든, 생각날 때 한 번만 눌러 줘도 충분해요."
        : nT === 1 ? dayName(bE) + "에 첫 기록을 남겼어요. 내 상태를 들여다본 것만으로도 큰 한 걸음이에요."
          : "에너지가 가장 높았던 날은 " + dayName(bE) + "(5단계 중 " + R.energy[bE] + ")이에요. 그날 무엇을 했는지 떠올려 보면 나에게 맞는 힘의 원천을 찾을 수 있어요.";
    }
    table($("#tb-today"), heads, [
      { name: "에너지", values: R.energy }, { name: "집중력", values: R.focus },
      { name: "기분 날씨", values: R.weather, fmt: function (w) { return TodakWeather.MOODS[w - 1].name; } }
    ], M);

    /* 2. 챙기기: 단위가 달라서 작은 그래프 여러 개로 */
    var medOn = !!(user.medication && user.medication.enabled);
    $("#care-med-label").hidden = !medOn;
    function cmp(key, unit, fmt, digits) { return M ? delta(avg(R[key]), P && avg(P[key]), unit, fmt, digits) : ""; }
    var minis = [
      { k: "meals", name: "식사", values: R.meals, min: 0, max: 3, ticks: [1, 2, 3], fmt: function (v) { return v + "끼"; },
        sub: M ? (count(R.meals) ? "하루 평균 " + round1(avg(R.meals)) + "끼" + cmp("meals", "끼") : "") : (count(R.meals) ? "총 " + sum(R.meals) + "끼" : "") },
      { k: "water", name: "물", values: R.water, min: 0, max: 8, ticks: [2, 4, 6, 8], fmt: function (v) { return v + "잔"; },
        sub: count(R.water) ? "하루 평균 " + round1(avg(R.water)) + "잔" + cmp("water", "잔") : "" },
      { k: "sleep", name: "수면", values: R.sleep, min: 0, max: 12, ticks: [4, 8, 12], fmt: hoursLabel,
        sub: sleepAvg == null ? "" : "평균 " + hoursLabel(sleepAvg) + cmp("sleep", "", function (h) { return Math.round(h * 60) + "분"; }) }
    ];
    if (medOn) minis.push({ k: "med", name: "복약", values: R.med, min: 0, max: 100, ticks: [50, 100], fmt: function (v) { return v + "%"; },
      sub: count(R.med) ? "평균 " + Math.round(avg(R.med)) + "% 챙김" + cmp("med", "%", null, 0) : "" });
    $("#ch-care").innerHTML = minis.map(function (m) {
      return '<div class="mini"><div class="mini-top"><b>' + m.name + "</b><small>" + m.sub + '</small></div><div class="mini-chart" id="mc-' + m.k + '"></div></div>';
    }).join("");
    minis.forEach(function (m) {
      lineChart($("#mc-" + m.k), opts({
        label: "날짜별 " + m.name, mini: true, series: [{ name: m.name, color: C.blue, values: m.values, fmt: m.fmt }],
        min: m.min, max: m.max, ticks: m.ticks, height: 150, empty: "아직 기록이 없어요"
      }));
    });
    var parts = [];
    if (count(R.meals)) parts.push([(M ? "하루 평균 " + round1(avg(R.meals)) + "끼를" : sum(R.meals) + "끼를") + " 챙겨 먹었", "고", "어요"]);
    if (count(R.water)) parts.push(["물은 하루 평균 " + round1(avg(R.water)) + "잔 마셨", "고", "어요"]);
    if (sleepAvg != null) parts.push(["평균 " + hoursLabel(sleepAvg) + " 잤", "고", "어요"]);
    var careTxt = parts.map(function (p, i) { return p[0] + (i === parts.length - 1 ? p[2] + "." : p[1]); }).join(", ");
    var tail = sleepAvg != null && sleepAvg < 6 ? " 잠이 조금 부족했던 것 같아요. 오늘은 평소보다 30분 일찍 누워 볼까요?" : " 나를 챙긴 시간이 쌓이고 있어요.";
    if (M && P && avg(R.water) != null && avg(P.water) != null && avg(R.water) - avg(P.water) >= .5) tail = " 지난달보다 물을 더 자주 챙겼어요. 정말 잘하고 있어요!" + (sleepAvg != null && sleepAvg < 6 ? " 잠은 조금 부족했으니 일찍 누워 봐요." : "");
    $("#in-care").textContent = !parts.length ? "아직 기록이 없어요. 물 한 잔 마신 것부터 체크해 봐요."
      : when + " " + careTxt + tail;
    table($("#tb-care"), heads, minis.map(function (m) { return { name: m.name, values: m.values, fmt: m.fmt }; }), M);

    /* 3. 할 일 쪼개기 */
    var sTasks = [
      { name: "해야 했던 일", color: C.gray, values: R.planned, dash: true, fmt: function (v) { return v + "개"; } },
      { name: "끝낸 일", color: C.blue, values: R.done, fmt: function (v) { return v + "개"; } }
    ];
    legend($("#lg-tasks"), sTasks);
    var tMax = Math.max(4, Math.max.apply(null, R.planned.concat(R.done).map(function (v) { return v || 0; })));
    tMax = Math.ceil(tMax / 2) * 2;
    var step = tMax <= 6 ? 1 : tMax <= 12 ? 2 : Math.ceil(tMax / 6);
    var tTicks = []; for (var t = step; t <= tMax; t += step) tTicks.push(t);
    lineChart($("#ch-tasks"), opts({
      label: "날짜별 해야 했던 일과 끝낸 일", series: sTasks, min: 0, max: tMax, ticks: tTicks, height: M ? 220 : 230,
      empty: "할 일 쪼개기에 과제나 일상을 넣으면 여기에 그려져요"
    }));
    var rates = [];
    if (M) {
      $("#wk-rates").style.gridTemplateColumns = "repeat(" + weeks.length + ", minmax(0, 1fr))";
      $("#wk-rates").innerHTML = weeks.map(function (w, k) {
        var p = 0, dn = 0, fut = w[0] >= R.futureFrom;
        for (var d = w[0]; d <= Math.min(w[1], R.futureFrom - 1); d++) { p += R.planned[d] || 0; dn += R.done[d] || 0; }
        var pct = p ? Math.round(dn / p * 100) : null;
        if (pct != null) rates.push(pct);
        return "<div>" + (k + 1) + "주<b>" + (fut || pct == null ? "–" : pct + "%") + '</b><span class="rate-bar"><i style="width:' + (pct || 0) + '%"></i></span></div>';
      }).join("");
    }
    var trendT = "";
    if (M && rates.length >= 2) {
      trendT = rates[rates.length - 1] > rates[0] ? " 주가 지날수록 끝내는 비율이 조금씩 올라가고 있어요."
        : rates[rates.length - 1] < rates[0] ? " 요즘은 할 일이 버거웠을 수 있어요. 할 일을 더 작게 쪼개 보면 시작이 쉬워져요." : "";
    }
    $("#in-tasks").textContent = !planAll ? when + " 등록한 과제·일상이 없어요. 아주 작은 일 하나부터 넣어 봐요."
      : !doneAll ? "해야 할 일 " + planAll + "개가 있었어요. 아직 끝낸 건 없어도 괜찮아요. 가장 작은 한 단계만 골라 시작해 봐요."
        : "해야 했던 " + planAll + "개 중 " + doneAll + "개를 끝냈어요" + (R.moved ? " (다음 날로 미룬 일 " + R.moved + "개)" : "") + "." +
          (trendT || (doneAll / planAll >= .7 ? " 정말 꾸준했어요!" : " 다 못 한 날이 있어도 괜찮아요. 미루는 것도 계획이에요."));
    table($("#tb-tasks"), heads, sTasks, M);
  }

  $$(".seg button").forEach(function (b) {
    b.addEventListener("click", function () {
      var m = b.getAttribute("data-mode");
      if (m === mode) return;
      mode = m; offset = 0;
      try { history.replaceState(null, "", m === "month" ? "#month" : location.pathname + location.search); } catch (e) {}
      render();
    });
  });
  $("#wk-prev").addEventListener("click", function () { if (offset < MAX_BACK[mode]) { offset++; render(); } });
  $("#wk-next").addEventListener("click", function () { if (offset > 0) { offset--; render(); } });
  render();
})();
