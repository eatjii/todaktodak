/* 토닥토닥 공통 스크립트 — 모든 페이지에서 사용 */
(function () {
  // 상단 시계: 7:57 AM 형식
  function tick() {
    var el = document.getElementById("clock");
    if (!el) return;
    var now = new Date();
    var h = now.getHours();
    var m = String(now.getMinutes()).padStart(2, "0");
    var ampm = h < 12 ? "AM" : "PM";
    var h12 = h % 12 || 12;
    el.textContent = h12 + ":" + m + " " + ampm;
    el.setAttribute("datetime", now.toISOString());
  }
  tick();
  setInterval(tick, 10000);
})();
