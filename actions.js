/* =========================================================
   토닥토닥 작은 행동 목록 + 추천 (공용)
   오늘의 나, 할 일 쪼개기 등 여러 페이지에서 함께 써요.

   추천 방식
   1) 지금 에너지(1~5)에 맞는 행동만 골라요
   2) 한 번에 3개만 보여 줘요 (많으면 고르기 힘들어요)
   3) 걸리는 시간을 꼭 같이 보여 줘요 → 타이머와 연결
   4) 조금만 해도 성공으로 기록해요
   5) 행동마다 다른 완료 문구로 인정해 줘요
   6) "해야 해요" 대신 "해 볼까요?"로 제안해요
   7) 자주 해낸 행동을 조금 더 먼저 보여 줘요
   ========================================================= */
(function () {
  // sec: 걸리는 시간(초), lv: 추천할 에너지 단계
  var LIB = [
    // 에너지 1 · 거의 방전 (침대에서도)
    { id: "stretch-bed", e: "🙆", t: "누운 채로 기지개 크게 한 번 켜기", sec: 10, lv: [1, 2], cat: "몸", msg: "몸이 쭉 펴졌어요. 그것만으로도 시작이에요." },
    { id: "wiggle", e: "🖐️", t: "손가락·발가락 꼼지락거리기 10번", sec: 30, lv: [1], cat: "몸", msg: "몸에 작은 신호를 보냈어요. 잘했어요." },
    { id: "breath3", e: "🌬️", t: "숨 크게 들이쉬고 천천히 내쉬기 3번", sec: 60, lv: [1, 2, 3], cat: "마음", msg: "숨이 조금 깊어졌어요. 천천히 해도 괜찮아요." },
    { id: "sit-up", e: "🛏️", t: "침대에서 일어나 앉기만 하기", sec: 10, lv: [1], cat: "몸", msg: "일어나 앉았어요! 오늘의 첫 걸음이에요." },
    { id: "curtain", e: "🌤️", t: "커튼 열어서 햇빛 들이기", sec: 30, lv: [1, 2], cat: "환기·빛", msg: "방이 조금 밝아졌죠? 빛이 들어오면 몸도 깨어나요." },
    { id: "sip", e: "💧", t: "머리맡에 둔 물 한 모금 마시기", sec: 10, lv: [1, 2], cat: "물·씻기", msg: "물 한 모금, 몸이 고마워하고 있어요." },
    // 에너지 2 · 방 안에서 조금
    { id: "window", e: "🪟", t: "창문 열고 환기하기", sec: 60, lv: [2, 3], cat: "환기·빛", msg: "바람이 들어오니 방 공기가 달라졌죠?" },
    { id: "window-air", e: "🍃", t: "창가에 서서 바깥 바람 쐬기", sec: 180, lv: [2, 3], cat: "환기·빛", msg: "바깥 공기를 마셨어요. 머리가 조금 맑아졌길 바라요." },
    { id: "neck", e: "🧘", t: "앉은 채로 목·어깨 천천히 돌리기", sec: 120, lv: [2, 3], cat: "몸", msg: "굳었던 어깨가 조금 풀렸어요." },
    { id: "room-walk", e: "👣", t: "일어나서 방 안 한 바퀴 걷기", sec: 60, lv: [2], cat: "몸", msg: "한 바퀴 걸었어요. 몸이 움직이기 시작했어요." },
    { id: "wash-face", e: "🫧", t: "세수하거나 양치하기", sec: 180, lv: [2, 3], cat: "물·씻기", msg: "개운해졌죠? 나를 챙긴 멋진 시간이었어요." },
    { id: "water-cup", e: "🥤", t: "컵에 물 따라서 한 잔 마시기", sec: 60, lv: [2, 3], cat: "물·씻기", msg: "물 한 잔 완료! 몸에 힘이 조금 돌아와요." },
    // 에너지 3 · 몸을 조금 더
    { id: "song-stretch", e: "🎵", t: "좋아하는 노래 한 곡 들으며 스트레칭", sec: 180, lv: [3, 4], cat: "몸", msg: "노래 한 곡만큼 몸을 움직였어요. 기분도 조금 움직였나요?" },
    { id: "shower", e: "🚿", t: "샤워하기 (머리는 안 감아도 괜찮아요)", sec: 600, lv: [3, 4], cat: "물·씻기", msg: "샤워까지 해냈어요! 정말 큰 일을 한 거예요." },
    { id: "bed", e: "🛌", t: "침대 이불 펴기", sec: 120, lv: [3], cat: "정리", msg: "이불이 반듯해졌어요. 방이 나를 반겨 줄 거예요." },
    { id: "desk3", e: "🗂️", t: "책상 위 물건 3개만 제자리에 두기", sec: 180, lv: [3, 4], cat: "정리", msg: "딱 3개, 충분해요. 책상이 숨 쉴 공간이 생겼어요." },
    { id: "trash", e: "🗑️", t: "쓰레기 한 봉지 들고 나가서 버리기", sec: 300, lv: [3, 4], cat: "정리", msg: "방도 가벼워지고 잠깐 바깥도 다녀왔어요." },
    { id: "clothes", e: "👕", t: "편한 옷으로 갈아입기", sec: 180, lv: [2, 3], cat: "몸", msg: "옷을 갈아입으면 하루가 새로 시작돼요." },
    // 에너지 4~5 · 밖으로
    { id: "door", e: "🚪", t: "건물 앞까지만 나갔다 오기", sec: 300, lv: [3, 4], cat: "바깥", msg: "문 밖으로 나갔어요! 오늘의 큰 성공이에요." },
    { id: "store", e: "🏪", t: "편의점까지 걸어가서 음료 하나 사 오기", sec: 600, lv: [4, 5], cat: "바깥", msg: "다녀왔어요! 맛있는 음료로 나에게 작은 선물도 했네요." },
    { id: "block-walk", e: "🚶", t: "자취방·기숙사 근처 한 블록 산책", sec: 600, lv: [4, 5], cat: "바깥", msg: "밖에 나간 것만으로도 오늘의 큰 성공이에요." },
    { id: "sun-bench", e: "☀️", t: "햇빛 드는 벤치에 앉아 있다 오기", sec: 600, lv: [4, 5], cat: "바깥", msg: "햇빛을 충전했어요. 몸이 따뜻해졌길 바라요." },
    { id: "stairs", e: "🪜", t: "계단 한 층 오르내리기", sec: 180, lv: [4, 5], cat: "몸", msg: "계단 한 층! 다리에 힘이 들어갔어요." },
    { id: "laundry", e: "🧺", t: "빨래 돌리기", sec: 300, lv: [4, 5], cat: "정리", msg: "빨래가 돌아가는 동안 잠깐 쉬어도 돼요." }
  ];
  var CHEERS = ["해냈어요! 정말 잘했어요.", "작은 행동이 오늘을 바꿨어요.", "멋져요. 나를 위한 시간을 썼어요."];
  var PARTIAL = ["조금 한 것도 충분해요. 시작했다는 게 중요해요.", "시도한 것만으로도 성공이에요.", "오늘은 여기까지도 괜찮아요."];

  // 카드에 쓰는 손 아이콘 (노란 원 위에서도 잘 보이는 색만)
  var CAT_ICON = {
    "환기·빛": "hand-palm.svg", "물·씻기": "hand-heart-pink.svg", "몸": "hand-high-five-pink.svg",
    "마음": "hand-clasp-pink.svg", "정리": "hand-index-one.svg", "바깥": "hand-point-right.svg", "내가 만든": "hand-thumbs-up.svg"
  };
  function iconOf(a) { return CAT_ICON[a.cat] || "hand-ok.svg"; }

  function timeLabel(sec) {
    return sec < 60 ? sec + "초" : Math.round(sec / 60) + "분";
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function dayKey(iso) {
    var d = new Date(iso);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function customList() {
    var u = TodakStore.currentUser();
    return (u && u.customActions) || [];
  }
  function all() {
    return LIB.concat(customList().map(function (c) {
      return { id: c.id, e: "✏️", t: c.t, sec: c.sec, lv: [c.lv - 1, c.lv, c.lv + 1], cat: "내가 만든", msg: "내가 정한 행동을 해냈어요. 정말 멋져요!", custom: true };
    }));
  }
  function find(id) {
    return all().filter(function (a) { return a.id === id; })[0] || null;
  }

  /** 에너지(1~5)에 맞는 행동 n개 추천. exclude: 이미 보여 준 id 목록 */
  function recommend(energy, n, exclude) {
    energy = Math.min(5, Math.max(1, Math.round(energy || 2)));
    n = n || 3;
    exclude = exclude || [];
    var history = TodakStore.events("action");
    var doneToday = {}, count = {};
    history.forEach(function (ev) {
      count[ev.id] = (count[ev.id] || 0) + 1;
      if (dayKey(ev.at) === today()) doneToday[ev.id] = 1;   // 오늘 해 본 행동은 빼고 새로운 걸 보여 줘요
    });
    var pool = all().filter(function (a) {
      return a.lv.indexOf(energy) >= 0 && !doneToday[a.id] && exclude.indexOf(a.id) < 0;
    });
    // 다 보여 줬으면 처음부터 다시 (오늘 완료한 것만 빼고)
    if (pool.length < n) {
      pool = all().filter(function (a) { return a.lv.indexOf(energy) >= 0 && !doneToday[a.id]; });
    }
    // 자주 해낸 행동은 조금 더 먼저 (+ 약간의 무작위)
    return pool.map(function (a) {
      return { a: a, score: Math.random() + Math.min(count[a.id] || 0, 5) * 0.25 + (a.custom ? 0.3 : 0) };
    }).sort(function (x, y) { return y.score - x.score; }).slice(0, n).map(function (x) { return x.a; });
  }

  function complete(action, how) {
    var done = how !== "partial";
    TodakStore.log("action", { id: action.id, title: action.t, sec: action.sec, done: done, partial: !done });
    var msgs = done ? [action.msg].concat(CHEERS) : PARTIAL;
    return done ? action.msg : msgs[Math.floor(Math.random() * msgs.length)];
  }

  function doneToday() {
    return TodakStore.events("action").filter(function (ev) { return dayKey(ev.at) === today(); });
  }

  function addCustom(title, sec, lv) {
    var u = TodakStore.currentUser();
    if (!u) return null;
    var list = (u.customActions || []).slice();
    var item = { id: "c-" + Date.now().toString(36), t: title, sec: sec, lv: lv };
    list.push(item);
    TodakStore.updateUser(u.email, { customActions: list });
    return find(item.id);
  }

  window.TodakActions = {
    LIB: LIB, all: all, find: find, recommend: recommend, complete: complete,
    doneToday: doneToday, addCustom: addCustom, timeLabel: timeLabel, iconOf: iconOf
  };
})();
