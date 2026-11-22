/* =========================================================
   기분 날씨 5단계 + 아이콘 두 가지 스타일
   - emoji : 참고 사이트와 같은 이모지
   - todak : 토닥토닥 손 아이콘 스타일로 새로 그린 SVG
   ========================================================= */
(function () {
  var INK = "#231f20", BLUE = "#0791fe", YEL = "#f5c714", GREEN = "#70bf44";

  function cloud(fill, dx, dy, s) {
    dx = dx || 0; dy = dy || 0; s = s || 1;
    return '<g transform="translate(' + dx + " " + dy + ") scale(" + s + ')" fill="' + fill + '">' +
      '<circle cx="21" cy="35" r="10"/><circle cx="33" cy="27" r="13.5"/><circle cx="45" cy="35" r="10"/>' +
      '<rect x="21" y="32" width="24" height="13" rx="2"/></g>';
  }
  function svg(inner) {
    return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + inner + "</svg>";
  }
  var line = 'fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"';

  var TODAK = {
    // 방전·지침: 비구름
    1: svg(cloud("#8fa9bd", 0, -4) +
      '<path d="M27 21.5a9 9 0 0 1 8-5" ' + line + "/>" +
      '<g stroke="' + BLUE + '" stroke-width="4.2" stroke-linecap="round"><path d="M22 47l-2.5 7"/><path d="M33 47l-2.5 7"/><path d="M44 47l-2.5 7"/></g>'),
    // 가라앉음: 구름 두 개
    2: svg(cloud("#c9d9e5", 9, -7, .7) + cloud("#a9c1d3", -2, 2) +
      '<path d="M25 29.5a9 9 0 0 1 8-5" ' + line + "/>"),
    // 무난함: 해 + 구름
    3: svg('<circle cx="40" cy="22" r="12" fill="' + YEL + '"/>' +
      '<g stroke="' + YEL + '" stroke-width="3.4" stroke-linecap="round"><path d="M40 4v3.5"/><path d="M55 9l-2.5 2.5"/><path d="M60 23h-3.5"/></g>' +
      cloud("#d6e6f2", -4, 6) + '<path d="M23 34a9 9 0 0 1 8-5" ' + line + "/>"),
    // 잔잔·평온: 새싹
    4: svg('<ellipse cx="32" cy="54" rx="17" ry="5" fill="#e3d2bd"/>' +
      '<path d="M32 53V30" stroke="#4f9a30" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M32 34C32 22 22 16 11 17c0 11 9 18 21 17z" fill="' + GREEN + '"/>' +
      '<path d="M32 31c0-11 9-17 21-16 0 11-9 17-21 16z" fill="#8fd16a"/>' +
      '<path d="M16 21c5 1 10 5 13 10" ' + line + "/>"),
    // 상쾌·활력: 웃는 해
    5: svg('<g stroke="' + YEL + '" stroke-width="4" stroke-linecap="round">' +
      '<path d="M32 3v6"/><path d="M32 55v6"/><path d="M3 32h6"/><path d="M55 32h6"/>' +
      '<path d="M11.5 11.5l4.2 4.2"/><path d="M48.3 48.3l4.2 4.2"/><path d="M52.5 11.5l-4.2 4.2"/><path d="M15.7 48.3l-4.2 4.2"/></g>' +
      '<circle cx="32" cy="32" r="16" fill="' + YEL + '"/>' +
      '<path d="M25 30.5c1-2 3.5-2 4.5 0" ' + line + '/><path d="M34.5 30.5c1-2 3.5-2 4.5 0" ' + line + "/>" +
      '<path d="M26.5 36.5c2.5 3.5 8.5 3.5 11 0" ' + line + "/>")
  };

  var MOODS = [
    { v: 1, emoji: "🌧️", name: "방전·지침", desc: "몸과 마음이 무겁고 아무것도 손에 잡히지 않아요" },
    { v: 2, emoji: "☁️", name: "가라앉음", desc: "한숨이 나오고 무기력해요" },
    { v: 3, emoji: "⛅", name: "무난함", desc: "나쁘지도 좋지도 않게 흘러가요" },
    { v: 4, emoji: "🌱", name: "잔잔·평온", desc: "조금씩 여유가 생기고 시작할 힘이 있어요" },
    { v: 5, emoji: "☀️", name: "상쾌·활력", desc: "몸이 가볍고 무언가 해 보고 싶어요" }
  ];

  function icon(v, style) {
    var m = MOODS[v - 1];
    if (!m) return "";
    return style === "emoji" ? '<span class="wx-emoji" aria-hidden="true">' + m.emoji + "</span>" : TODAK[v];
  }

  window.TodakWeather = { MOODS: MOODS, icon: icon };
})();
