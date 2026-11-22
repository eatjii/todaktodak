/* 로그인 전 메인: 캐릭터 눈동자가 마우스(또는 터치)를 따라와요 */
(function () {
  var eyes = Array.prototype.slice.call(document.querySelectorAll(".eye"));
  if (!eyes.length) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  var MAX_X = 18; // 눈동자가 움직이는 최대 범위(%)
  var MAX_Y = 22;

  function look(x, y) {
    eyes.forEach(function (eye) {
      var r = eye.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var dx = x - cx;
      var dy = y - cy;
      var dist = Math.max(Math.hypot(dx, dy), 1);
      var pull = Math.min(dist / 400, 1);
      var px = (dx / dist) * MAX_X * pull;
      var py = (dy / dist) * MAX_Y * pull;
      var pupil = eye.querySelector(".pupil");
      pupil.style.setProperty("--px", px.toFixed(1) + "%");
      pupil.style.setProperty("--py", py.toFixed(1) + "%");
    });
  }

  window.addEventListener("pointermove", function (e) { look(e.clientX, e.clientY); });

  // 마우스가 없을 때는 처음처럼 오른쪽 위(회원가입·로그인 쪽)를 바라봐요
  function lookAtAuth() {
    var auth = document.querySelector(".auth");
    if (!auth) return;
    var r = auth.getBoundingClientRect();
    look(r.left + r.width / 2, r.top + r.height / 2);
  }
  document.addEventListener("pointerleave", lookAtAuth);
  window.addEventListener("load", lookAtAuth);
})();
