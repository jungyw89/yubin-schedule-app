/* main.js — 상태 보유 + 날짜/테마 제어 + 모든 모듈 연결 */
(function (global) {
  "use strict";

  var WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

  var state = {
    date: new Date(),
    categories: [],
    activities: [],
  };

  // 처음 실행 시 자동으로 깔리는 예시 일정 (기능과 무관한 시작 데이터)
  var SAMPLE = {
    restCategory: { id: "rest", name: "휴식", color: "#26c6a4", emoji: "😊" },
    activities: [
      { start: 570, end: 630, label: "브런치 만들기", categoryId: "meal" },
      { start: 630, end: 690, label: "가족 보드게임 대회", categoryId: "play" },
      { start: 690, end: 750, label: "휴식 (부모님 커피타임)", categoryId: "rest" },
      { start: 750, end: 810, label: "점심 식사", categoryId: "meal" },
      { start: 810, end: 930, label: "거실 캠핑 & 방탈출", categoryId: "play" },
      { start: 930, end: 1050, label: "우리 집 시네마", categoryId: "play" },
      { start: 1050, end: 1140, label: "저녁 만찬 (배달)", categoryId: "meal" },
      { start: 1140, end: 1230, label: "샤워 & 하루 마무리", categoryId: "rest" },
      { start: 1230, end: 1320, label: "취침 준비", categoryId: "sleep" },
    ],
  };

  function uid() {
    return (
      Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)
    );
  }

  function dateStr(d) {
    return (
      d.getFullYear() +
      "-" +
      Time.pad(d.getMonth() + 1) +
      "-" +
      Time.pad(d.getDate())
    );
  }

  function isToday(d) {
    return dateStr(d) === dateStr(new Date());
  }

  function displayStr(d) {
    return (
      d.getFullYear() +
      "년 " +
      (d.getMonth() + 1) +
      "월 " +
      d.getDate() +
      "일 (" +
      WEEKDAYS[d.getDay()] +
      ")"
    );
  }

  function persistDay() {
    Store.setDay(dateStr(state.date), state.activities);
  }

  function loadDay() {
    state.activities = Store.getDay(dateStr(state.date));
  }

  // ---------- 렌더 ----------
  function renderAll() {
    var disp = document.getElementById("date-display");
    if (disp) disp.textContent = displayStr(state.date);

    Clock.render(state.activities, state.categories, clockHandlers);
    Rewards.render(state.activities);
    Now.setActivities(state.activities, isToday(state.date));
    Schedule.render(state.activities, state.categories, scheduleHandlers);
    CategoryManager.render(state.categories, categoryHandlers);
  }

  // ---------- 일과 핸들러 ----------
  var scheduleHandlers = {
    add: function (fields) {
      state.activities.push({
        id: uid(),
        start: fields.start,
        end: fields.end,
        label: fields.label,
        categoryId: fields.categoryId,
        done: false,
      });
      persistDay();
      renderAll();
    },
    update: function (id, fields) {
      for (var i = 0; i < state.activities.length; i++) {
        if (state.activities[i].id === id) {
          state.activities[i].start = fields.start;
          state.activities[i].end = fields.end;
          state.activities[i].label = fields.label;
          state.activities[i].categoryId = fields.categoryId;
          break;
        }
      }
      persistDay();
      renderAll();
    },
    remove: function (id) {
      state.activities = state.activities.filter(function (a) {
        return a.id !== id;
      });
      persistDay();
      renderAll();
    },
    toggle: function (id) {
      for (var i = 0; i < state.activities.length; i++) {
        if (state.activities[i].id === id) {
          state.activities[i].done = !state.activities[i].done;
          break;
        }
      }
      persistDay();
      renderAll();
    },
    refresh: renderAll,
  };

  // ---------- 시계 드래그 핸들러 ----------
  var clockHandlers = {
    toggle: scheduleHandlers.toggle,
    setTimes: function (id, start, end) {
      for (var i = 0; i < state.activities.length; i++) {
        if (state.activities[i].id === id) {
          state.activities[i].start = start;
          state.activities[i].end = end;
          break;
        }
      }
      persistDay();
      renderAll();
    },
  };

  // ---------- 분류 핸들러 ----------
  var categoryHandlers = {
    add: function (fields) {
      state.categories.push({
        id: "c" + uid(),
        name: fields.name,
        color: fields.color,
        emoji: fields.emoji || "",
      });
      Store.setCategories(state.categories);
      renderAll();
    },
    remove: function (id) {
      if (state.categories.length <= 1) {
        global.alert("분류는 최소 1개는 있어야 해요.");
        return;
      }
      state.categories = state.categories.filter(function (c) {
        return c.id !== id;
      });
      Store.setCategories(state.categories);
      renderAll();
    },
  };

  // ---------- 날짜 이동 ----------
  function moveDay(delta) {
    var d = new Date(state.date);
    d.setDate(d.getDate() + delta);
    state.date = d;
    loadDay();
    renderAll();
  }

  function goToday() {
    state.date = new Date();
    loadDay();
    renderAll();
  }

  // ---------- 테마 ----------
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      var dark = theme === "dark";
      btn.textContent = dark ? "☀️ 라이트" : "🌙 다크";
      btn.setAttribute("aria-pressed", dark ? "true" : "false");
    }
  }

  function toggleTheme() {
    var next =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    Store.setTheme(next);
    applyTheme(next);
  }

  // 처음 한 번만: 오늘 날짜에 예시 일정 주입 (기존 데이터는 건드리지 않음)
  function seedIfFirstRun() {
    if (Store.getSeeded()) return;
    Store.setSeeded(true);

    var todayStr = dateStr(new Date());
    if (Store.getDay(todayStr).length > 0) return; // 이미 일정 있으면 그대로 둠

    // 휴식 분류 보장
    var cats = Store.getCategories();
    var hasRest = cats.some(function (c) {
      return c.id === SAMPLE.restCategory.id;
    });
    if (!hasRest) {
      cats.push(SAMPLE.restCategory);
      Store.setCategories(cats);
    }

    var seeded = SAMPLE.activities.map(function (a) {
      return {
        id: uid(),
        start: a.start,
        end: a.end,
        label: a.label,
        categoryId: a.categoryId,
        done: false,
      };
    });
    Store.setDay(todayStr, seeded);
  }

  // ---------- 시작 ----------
  function init() {
    seedIfFirstRun();
    state.categories = Store.getCategories();
    loadDay();
    applyTheme(Store.getTheme());

    bind("prev-day", "click", function () {
      moveDay(-1);
    });
    bind("next-day", "click", function () {
      moveDay(1);
    });
    bind("today-btn", "click", goToday);
    bind("theme-toggle", "click", toggleTheme);

    Now.init();
    renderAll();
  }

  function bind(id, evt, fn) {
    var node = document.getElementById(id);
    if (node) node.addEventListener(evt, fn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
