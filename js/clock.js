/* clock.js — 24시간 원형 시계 + 범례 + 드래그(이동/늘리기) (전역 Clock) */
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
  var R_MID = (R_RING_IN + R_RING_OUT) / 2;

  var STEP = 5; // 분 단위 스냅
  var MIN_DUR = 5; // 최소 길이(분)

  var drag = null; // 드래그 상태
  var createListener = null; // 빈 영역 드래그 리스너 (렌더마다 교체)

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

  // handlers: { toggle(id), setTimes(id, start, end), create(start, end) }
  function render(activities, categories, handlers) {
    var svg = document.getElementById("clock");
    if (!svg) return;
    svg.setAttribute("viewBox", "0 0 " + SIZE + " " + SIZE);
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    drawFace(svg);

    var cm = catMap(categories);
    var sorted = activities.slice().sort(function (a, b) {
      return a.start - b.start;
    });

    var nodes = {}; // id -> { act, path, label, hStart, hEnd, color }

    // 1) 일과 호 + 라벨
    for (var i = 0; i < sorted.length; i++) {
      var act = sorted[i];
      if (act.end <= act.start) continue;
      var cat = cm[act.categoryId];
      var color = cat ? cat.color : "#9aa2b1";

      var path = el("path", {
        class: "clock-arc" + (act.done ? " done" : ""),
        fill: color,
        "data-id": act.id,
      });
      var title = el("title");
      path.appendChild(title);
      svg.appendChild(path);

      var label = null;
      if (act.end - act.start >= 55) {
        label = el("text", { class: "clock-arc-label" });
        label.textContent = (cat ? cat.emoji : "") + act.label;
        svg.appendChild(label);
      }

      nodes[act.id] = { act: act, path: path, label: label, color: color, cat: cat };
      updateArcVisual(nodes[act.id]);
    }

    // 2) 손잡이(양 끝) — 호 위에 얹기
    for (var j = 0; j < sorted.length; j++) {
      var a2 = sorted[j];
      if (a2.end <= a2.start) continue;
      var n = nodes[a2.id];
      n.hStart = el("circle", { r: 8, class: "clock-handle", "data-id": a2.id });
      n.hEnd = el("circle", { r: 8, class: "clock-handle", "data-id": a2.id });
      n.hStart.style.stroke = n.color;
      n.hEnd.style.stroke = n.color;
      svg.appendChild(n.hStart);
      svg.appendChild(n.hEnd);
      positionHandles(n);

      bindDrag(svg, n.path, n, "move", handlers);
      bindDrag(svg, n.hStart, n, "resize-start", handlers);
      bindDrag(svg, n.hEnd, n, "resize-end", handlers);
    }

    // 3) 빈 영역 드래그 → 새 일정 만들기 (svg는 렌더 간 재사용되므로 리스너 교체)
    if (createListener) svg.removeEventListener("pointerdown", createListener);
    createListener = makeCreateListener(svg, activities, categories, handlers);
    svg.addEventListener("pointerdown", createListener);

    renderLegend(categories);
  }

  function drawFace(svg) {
    svg.appendChild(el("circle", { cx: CX, cy: CY, r: R_FACE, class: "clock-face" }));
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
    var c1 = el("text", { x: CX, y: CY - 8, class: "clock-center" });
    c1.textContent = "24시간";
    var c2 = el("text", { x: CX, y: CY + 12, class: "clock-center" });
    c2.textContent = "0시 = 맨 위";
    svg.appendChild(c1);
    svg.appendChild(c2);
  }

  // 호의 path/라벨/제목을 act 값에 맞춰 갱신
  function updateArcVisual(n) {
    var act = n.act;
    var a0 = Time.minutesToAngle(act.start);
    var a1 = Time.minutesToAngle(act.end);
    n.path.setAttribute("d", Time.annularSector(CX, CY, R_RING_IN, R_RING_OUT, a0, a1));
    n.path.setAttribute("class", "clock-arc" + (act.done ? " done" : ""));
    var title = n.path.querySelector("title");
    if (title) {
      title.textContent =
        (n.cat ? n.cat.emoji + " " : "") + act.label + " (" + Time.fmt(act.start) + "~" + Time.fmt(act.end) + ")";
    }
    if (n.label) {
      var mid = (a0 + a1) / 2;
      var pm = Time.polar(CX, CY, R_MID, mid);
      n.label.setAttribute("x", pm.x.toFixed(1));
      n.label.setAttribute("y", pm.y.toFixed(1));
    }
  }

  function positionHandles(n) {
    if (!n.hStart) return;
    var ps = Time.polar(CX, CY, R_MID, Time.minutesToAngle(n.act.start));
    var pe = Time.polar(CX, CY, R_MID, Time.minutesToAngle(n.act.end));
    n.hStart.setAttribute("cx", ps.x.toFixed(1));
    n.hStart.setAttribute("cy", ps.y.toFixed(1));
    n.hEnd.setAttribute("cx", pe.x.toFixed(1));
    n.hEnd.setAttribute("cy", pe.y.toFixed(1));
  }

  // 화면 좌표 → SVG viewBox 좌표
  function toSvgPoint(svg, clientX, clientY) {
    var pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    var m = svg.getScreenCTM();
    if (!m) return { x: clientX, y: clientY };
    var loc = pt.matrixTransform(m.inverse());
    return { x: loc.x, y: loc.y };
  }

  function pointerMinutes(svg, e) {
    var p = toSvgPoint(svg, e.clientX, e.clientY);
    return Time.minutesFromPoint(CX, CY, p.x, p.y);
  }

  function bindDrag(svg, target, n, mode, handlers) {
    target.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var downMin = pointerMinutes(svg, e);
      drag = {
        n: n,
        mode: mode,
        handlers: handlers,
        origStart: n.act.start,
        origEnd: n.act.end,
        duration: n.act.end - n.act.start,
        offset: downMin - n.act.start,
        downMin: downMin,
        lastMin: downMin,
        moved: false,
        svg: svg,
        pointerId: e.pointerId,
      };
      try {
        svg.setPointerCapture(e.pointerId);
      } catch (err) {}
      svg.addEventListener("pointermove", onMove);
      svg.addEventListener("pointerup", onUp);
      svg.addEventListener("pointercancel", onUp);
    });
  }

  // 시계의 빈 영역에서 pointerdown → 드래그한 범위로 새 일정 생성
  function makeCreateListener(svg, activities, categories, handlers) {
    return function (e) {
      if (drag || !handlers.create) return;
      var p = toSvgPoint(svg, e.clientX, e.clientY);
      var dx = p.x - CX;
      var dy = p.y - CY;
      var r = Math.sqrt(dx * dx + dy * dy);
      if (r < R_RING_IN - 6 || r > R_TICK_OUT) return; // 중앙/바깥은 무시

      var downMin = Time.minutesFromPoint(CX, CY, p.x, p.y);
      var gap = freeGap(activities, downMin);
      if (!gap) return; // 이미 일정이 있는 시간대

      e.preventDefault();
      var color = categories.length ? categories[0].color : "#9aa2b1";
      var preview = el("path", { class: "clock-arc creating", fill: color });
      svg.appendChild(preview);

      var snapped = Time.clamp(Time.snap(downMin, STEP), gap.start, gap.end);
      drag = {
        mode: "create",
        svg: svg,
        handlers: handlers,
        preview: preview,
        downMin: downMin,
        lastMin: downMin,
        gapStart: gap.start,
        gapEnd: gap.end,
        ns: snapped,
        ne: snapped,
        moved: false,
        pointerId: e.pointerId,
      };
      try {
        svg.setPointerCapture(e.pointerId);
      } catch (err) {}
      svg.addEventListener("pointermove", onMove);
      svg.addEventListener("pointerup", onUp);
      svg.addEventListener("pointercancel", onUp);
    };
  }

  // min을 포함하는 빈 시간대(앞뒤 일정 사이) 계산. 일정 위면 null
  function freeGap(activities, min) {
    var start = 0;
    var end = 1440;
    for (var i = 0; i < activities.length; i++) {
      var a = activities[i];
      if (a.end <= a.start) continue;
      if (a.start < min && min < a.end) return null;
      if (a.end <= min && a.end > start) start = a.end;
      if (a.start >= min && a.start < end) end = a.start;
    }
    if (end - start < MIN_DUR) return null;
    return { start: start, end: end };
  }

  function onMove(e) {
    if (!drag) return;
    e.preventDefault();
    var cur = pointerMinutes(drag.svg, e);
    // 자정(맨 위) 넘나들 때 점프 방지: 직전 값과 가깝게 보정
    while (cur - drag.lastMin > 720) cur -= 1440;
    while (cur - drag.lastMin < -720) cur += 1440;
    drag.lastMin = cur;

    if (drag.mode === "create") {
      var a0 = Time.snap(drag.downMin, STEP);
      var b0 = Time.snap(cur, STEP);
      var cs = Time.clamp(Math.min(a0, b0), drag.gapStart, drag.gapEnd);
      var ce = Time.clamp(Math.max(a0, b0), drag.gapStart, drag.gapEnd);
      if (Math.abs(cur - drag.downMin) >= STEP) drag.moved = true;
      drag.ns = cs;
      drag.ne = ce;
      if (ce > cs) {
        drag.preview.setAttribute(
          "d",
          Time.annularSector(CX, CY, R_RING_IN, R_RING_OUT, Time.minutesToAngle(cs), Time.minutesToAngle(ce))
        );
      }
      return;
    }

    var act = drag.n.act;
    var ns, ne;
    if (drag.mode === "move") {
      ns = Time.snap(cur - drag.offset, STEP);
      ns = Time.clamp(ns, 0, 1440 - drag.duration);
      ne = ns + drag.duration;
    } else if (drag.mode === "resize-start") {
      ns = Time.snap(cur, STEP);
      ns = Time.clamp(ns, 0, drag.origEnd - MIN_DUR);
      ne = drag.origEnd;
    } else {
      ne = Time.snap(cur, STEP);
      ne = Time.clamp(ne, drag.origStart + MIN_DUR, 1440);
      ns = drag.origStart;
    }

    if (Math.abs(cur - drag.downMin) >= STEP) drag.moved = true;
    if (ns === act.start && ne === act.end) return;

    act.start = ns;
    act.end = ne;
    updateArcVisual(drag.n);
    positionHandles(drag.n);
  }

  function onUp(e) {
    if (!drag) return;
    var d = drag;
    drag = null;
    try {
      d.svg.releasePointerCapture(d.pointerId);
    } catch (err) {}
    d.svg.removeEventListener("pointermove", onMove);
    d.svg.removeEventListener("pointerup", onUp);
    d.svg.removeEventListener("pointercancel", onUp);

    if (d.mode === "create") {
      if (d.preview.parentNode) d.preview.parentNode.removeChild(d.preview);
      if (d.moved && d.ne - d.ns >= MIN_DUR) d.handlers.create(d.ns, d.ne);
      return;
    }

    var act = d.n.act;
    if (!d.moved && act.start === d.origStart && act.end === d.origEnd) {
      // 그냥 탭 → 완료 토글
      d.handlers.toggle(act.id);
    } else {
      d.handlers.setTimes(act.id, act.start, act.end);
    }
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
