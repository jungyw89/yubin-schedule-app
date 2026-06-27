/* rewards.js — 별/달성률 계산 및 표시 (전역 Rewards) */
(function (global) {
  "use strict";

  // 별 path의 위/아래 y 좌표(HTML viewBox 0 0 100 92 기준)
  var STAR_TOP = 4;
  var STAR_BOTTOM = 87.2;

  function compute(activities) {
    var total = activities.length;
    var done = 0;
    for (var i = 0; i < activities.length; i++) {
      if (activities[i].done) done++;
    }
    var pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total: total, done: done, pct: pct };
  }

  function render(activities) {
    var r = compute(activities);

    var label = document.getElementById("progress-label");
    if (label) label.textContent = r.pct + "%";

    var bar = document.querySelector(".reward-star");
    if (bar) bar.setAttribute("aria-valuenow", String(r.pct));

    // 별 채움: 아래(STAR_BOTTOM)에서 위로 pct만큼
    var rect = document.getElementById("star-clip-rect");
    if (rect) {
      var fillH = ((STAR_BOTTOM - STAR_TOP) * r.pct) / 100;
      rect.setAttribute("y", (STAR_BOTTOM - fillH).toFixed(2));
      rect.setAttribute("height", fillH.toFixed(2));
    }

    var count = document.getElementById("star-count");
    if (count) count.textContent = "별 " + r.done + "개";

    var stars = document.getElementById("stars");
    if (stars) {
      var s = "";
      for (var i = 0; i < r.done; i++) s += "⭐";
      stars.textContent = s;
    }

    return r;
  }

  global.Rewards = {
    compute: compute,
    render: render,
  };
})(window);
