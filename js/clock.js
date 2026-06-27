/* clock.js — 24시간 원형 시계 + 범례 그리기 (전역 Clock) */
(function (global) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var SIZE = 480;
  var CX = 240;
  var CY = 240;
  var R_FACE = 228;
  var R_NUM = 218;
  var R_TICK_OUT = 210;
  var R_RING_OUT = 200;
  var R_RING_IN = 112;

  function el(tag, attrs) {
    var node = document.createElementNS(NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (attrs.hasOwnProperty(k)) node.setAttribute(k, attrs[k]);
      }
    }
    return node;
  }

  function catMap(categories) {
    var m = {};
    for (var i = 0; i < categories.length; i++) m[categories[i].id] = categories[i];
    return m;
  }

  function render(activities, categories, onToggle) {
    var svg = document.getElementById("clock");
    if (!svg) return;
    svg.setAttribute("viewBox", "0 0 " + SIZE + " " + SIZE);
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // 시계판
    svg.appendChild(el("circle", { cx: CX, cy: CY, r: R_FACE, class: "clock-face" }));

    // 눈금 + 숫자 (3시간 간격 라벨, 1시간 간격 눈금)
    for (var h = 0; h < 24; h++) {
      var ang = (h / 24) * 360;
      var major = h % 3 === 0;
      var pOut = Time.polar(CX, CY, R_TICK_OUT, ang);
      var pIn = Time.polar(CX, CY, major ? R_RING_OUT : R_TICK_OUT - 8, ang);
      svg.appendChild(
        el("line", {
          x1: pIn.x.toFixed(1), y1: pIn.y.toFixed(1),
          x2: pOut.x.toFixed(1), y2: pOut.y.toFixed(1),
          class: "clock-tick" + (major ? " major" : ""),
          "stroke-width": major ? 2 : 1,
        })
      );
      if (major) {
        var pn = Time.polar(CX, CY, R_NUM, ang);
        var t = el("text", { x: pn.x.toFixed(1), y: pn.y.toFixed(1), class: "clock-num" });
        t.textContent = h;
        svg.appendChild(t);
      }
    }

    // 가운데 안내
    var c1 = el("text", { x: CX, y: CY - 8, class: "clock-center" });
    c1.textContent = "24시간";
    var c2 = el("text", { x: CX, y: CY + 12, class: "clock-center" });
    c2.textContent = "0시 = 맨 위";
    svg.appendChild(c1);
    svg.appendChild(c2);

    // 일과 호
    var cm = catMap(categories);
    var sorted = activities.slice().sort(function (a, b) {
      return a.start - b.start;
    });
    for (var i = 0; i < sorted.length; i++) {
      var act = sorted[i];
      if (act.end <= act.start) continue;
      var cat = cm[act.categoryId];
      var color = cat ? cat.color : "#9aa2b1";
      var a0 = Time.minutesToAngle(act.start);
      var a1 = Time.minutesToAngle(act.end);

      var path = el("path", {
        d: Time.annularSector(CX, CY, R_RING_IN, R_RING_OUT, a0, a1),
        fill: color,
        class: "clock-arc" + (act.done ? " done" : ""),
        "data-id": act.id,
      });
      var title = el("title");
      title.textContent =
        (cat ? cat.emoji + " " : "") + act.label + " (" + Time.fmt(act.start) + "~" + Time.fmt(act.end) + ")";
      path.appendChild(title);
      if (onToggle) {
        (function (id, node) {
          node.addEventListener("click", function () {
            onToggle(id);
          });
        })(act.id, path);
      }
      svg.appendChild(path);

      // 충분히 큰 구간엔 라벨
      if (act.end - act.start >= 55) {
        var mid = (a0 + a1) / 2;
        var pm = Time.polar(CX, CY, (R_RING_IN + R_RING_OUT) / 2, mid);
        var lab = el("text", {
          x: pm.x.toFixed(1), y: pm.y.toFixed(1), class: "clock-arc-label",
        });
        lab.textContent = (cat ? cat.emoji : "") + act.label;
        svg.appendChild(lab);
      }
    }

    renderLegend(categories);
  }

  function renderLegend(categories) {
    var ul = document.getElementById("legend");
    if (!ul) return;
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    for (var i = 0; i < categories.length; i++) {
      var c = categories[i];
      var li = document.createElement("li");
      var sw = document.createElement("span");
      sw.className = "swatch";
      sw.style.background = c.color;
      var txt = document.createElement("span");
      txt.textContent = (c.emoji ? c.emoji + " " : "") + c.name;
      li.appendChild(sw);
      li.appendChild(txt);
      ul.appendChild(li);
    }
  }

  global.Clock = {
    render: render,
  };
})(window);
