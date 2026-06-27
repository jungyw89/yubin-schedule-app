/* main.js — 상태 보유 + 날짜/테마 제어 + 모든 모듈 연결 */
(function (global) {
  "use strict";

  var WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

  var state = {
    date: new Date(),
    categories: [],
    activities: [],
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

    Clock.render(state.activities, state.categories, scheduleHandlers.toggle);
    Rewards.render(state.activities);
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

  // ---------- 시작 ----------
  function init() {
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
