/* time.js — 시간 ↔ 각도/좌표 변환 유틸 (전역 Time) */
(function (global) {
  "use strict";

  var MIN_PER_DAY = 1440;

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  // 분(0~1440) → "HH:MM"
  function fmt(min) {
    min = clampMin(min);
    var h = Math.floor(min / 60);
    var m = min % 60;
    return pad(h) + ":" + pad(m);
  }

  // "HH:MM" → 분. 실패 시 null
  function parse(str) {
    if (!str || str.indexOf(":") === -1) return null;
    var parts = str.split(":");
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return clampMin(h * 60 + m);
  }

  function clampMin(min) {
    if (min < 0) return 0;
    if (min > MIN_PER_DAY) return MIN_PER_DAY;
    return min;
  }

  // 분 → 각도(도). 0분=0도(위쪽), 시계방향, 하루=360도
  function minutesToAngle(min) {
    return (clampMin(min) / MIN_PER_DAY) * 360;
  }

  // 극좌표 → 직교좌표. angle: 위쪽 0도 기준 시계방향(도)
  function polar(cx, cy, r, angleDeg) {
    var rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  // 직교좌표(시계 안 한 점) → 분(0~1440). 위쪽=0분, 시계방향
  function minutesFromPoint(cx, cy, x, y) {
    var deg = (Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90;
    while (deg < 0) deg += 360;
    while (deg >= 360) deg -= 360;
    return (deg / 360) * MIN_PER_DAY;
  }

  // 가장 가까운 step(분)으로 맞춤
  function snap(min, step) {
    return Math.round(min / step) * step;
  }

  function clamp(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  // 도넛 모양 호(annular sector) SVG path. 시계방향 a0→a1
  function annularSector(cx, cy, rInner, rOuter, a0, a1) {
    // 거의 한 바퀴면 살짝 줄여 점이 겹치지 않게
    if (a1 - a0 >= 359.99) a1 = a0 + 359.99;
    var p1 = polar(cx, cy, rOuter, a0);
    var p2 = polar(cx, cy, rOuter, a1);
    var p3 = polar(cx, cy, rInner, a1);
    var p4 = polar(cx, cy, rInner, a0);
    var largeArc = a1 - a0 > 180 ? 1 : 0;
    return [
      "M", p1.x.toFixed(2), p1.y.toFixed(2),
      "A", rOuter, rOuter, 0, largeArc, 1, p2.x.toFixed(2), p2.y.toFixed(2),
      "L", p3.x.toFixed(2), p3.y.toFixed(2),
      "A", rInner, rInner, 0, largeArc, 0, p4.x.toFixed(2), p4.y.toFixed(2),
      "Z",
    ].join(" ");
  }

  global.Time = {
    MIN_PER_DAY: MIN_PER_DAY,
    pad: pad,
    fmt: fmt,
    parse: parse,
    clampMin: clampMin,
    minutesToAngle: minutesToAngle,
    polar: polar,
    minutesFromPoint: minutesFromPoint,
    snap: snap,
    clamp: clamp,
    annularSector: annularSector,
  };
})(window);
