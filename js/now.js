/* now.js — 현재 진행 중인 일정의 남은 시간 + 타임타이머 원 (전역 Now) */
(function (global) {
  "use strict";

  var CX = 50;
  var CY = 50;
  var R = 46;

  var activities = [];
  var isToday = false;
  var ticker = null;

  // main이 매 렌더마다 호출: 오늘 일과 목록과 "오늘인지" 여부 전달
  function setActivities(arr, today) {
    activities = arr || [];
    isToday = !!today;
    update();
  }

  function nowSeconds() {
    var d = new Date();
    return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  }

  // 지금 시각에 걸치는 일과 중 가장 먼저 끝나는 것
  function currentActivity(secs) {
    var nowMin = secs / 60;
    var best = null;
    for (var i = 0; i < activities.length; i++) {
      var a = activities[i];
      if (a.end <= a.start) continue;
      if (a.start <= nowMin && nowMin < a.end) {
        if (!best || a.end < best.end) best = a;
      }
    }
    return best;
  }

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function fmt(sec) {
    if (sec < 0) sec = 0;
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    return h > 0 ? h + ":" + pad(m) + ":" + pad(s) : pad(m) + ":" + pad(s);
  }

  // 남은 비율(0~1)만큼 위에서 시계방향으로 빨간 부채꼴
  function wedgePath(frac) {
    var a1 = frac * 360;
    if (a1 <= 0) return "";
    if (a1 >= 359.999) a1 = 359.999;
    var p0 = Time.polar(CX, CY, R, 0);
    var p1 = Time.polar(CX, CY, R, a1);
    var large = a1 > 180 ? 1 : 0;
    return [
      "M", CX, CY,
      "L", p0.x.toFixed(2), p0.y.toFixed(2),
      "A", R, R, 0, large, 1, p1.x.toFixed(2), p1.y.toFixed(2),
      "Z",
    ].join(" ");
  }

  function update() {
    var labelEl = document.getElementById("timer-label");
    var remEl = document.getElementById("timer-remaining");
    var wedge = document.getElementById("timer-wedge");
    var panel = document.getElementById("now-panel");
    if (!labelEl || !remEl || !wedge) return;

    function idle(msg) {
      labelEl.textContent = msg;
      remEl.textContent = "--:--";
      wedge.setAttribute("d", "");
      if (panel) panel.classList.remove("active");
    }

    if (!isToday) {
      idle("오늘 날짜에서만 표시돼요");
      return;
    }

    var secs = nowSeconds();
    var act = currentActivity(secs);
    if (!act) {
      idle("진행 중인 일정 없음");
      return;
    }

    var remainingSec = Math.max(0, act.end * 60 - secs);
    var durationSec = (act.end - act.start) * 60;
    var frac = durationSec > 0 ? remainingSec / durationSec : 0;

    labelEl.textContent = act.label;
    remEl.textContent = fmt(remainingSec);
    wedge.setAttribute("d", wedgePath(frac));
    if (panel) panel.classList.add("active");
  }

  function init() {
    if (ticker) return;
    update();
    ticker = global.setInterval(update, 500);
  }

  global.Now = {
    init: init,
    setActivities: setActivities,
    update: update,
  };
})(window);
