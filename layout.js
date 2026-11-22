/* 토닥토닥 위치 적용기
   js/layout/layout-<페이지>.js 에 저장된 위치·크기 값을 화면에 적용해요.
   <head> 안에서 layout-<페이지>.js 바로 다음에 불러와야 해요. */
(function () {
  var MOBILE = "(max-width: 640px)";

  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  function esc(k) { return String(k).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }

  function rule(name, v) {
    v = v || {};
    return '[data-edit="' + esc(name) + '"]{--x:' + num(v.x, 0) + "px;--y:" +
      num(v.y, 0) + "px;--s:" + num(v.s, 1) + "}";
  }

  function toCss(L) {
    var pc = L.pc || {}, mo = L.mobile || {};
    var names = {};
    Object.keys(pc).concat(Object.keys(mo)).forEach(function (k) { names[k] = 1; });
    var out = "[data-edit]{translate:var(--x,0px) var(--y,0px);scale:var(--s,1)}\n";
    Object.keys(pc).forEach(function (k) { out += rule(k, pc[k]) + "\n"; });
    out += "@media " + MOBILE + "{\n";
    // 모바일 값이 없는 요소는 PC 값을 따라가지 않고 원래 자리(0)로 둬요
    Object.keys(names).forEach(function (k) { out += rule(k, mo[k]) + "\n"; });
    return out + "}\n";
  }

  var style = document.createElement("style");
  style.id = "todak-layout";
  style.textContent = toCss(window.TODAK_LAYOUT || {});
  document.head.appendChild(style);

  window.TodakLayout = {
    MOBILE: MOBILE,
    toCss: toCss,
    render: function (L) { style.textContent = toCss(L); }
  };
})();
