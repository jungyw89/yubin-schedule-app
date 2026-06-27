/* store.js — localStorage 저장/불러오기 (전역 Store) */
(function (global) {
  "use strict";

  var PREFIX = "kidschedule:";
  var K_CATEGORIES = PREFIX + "categories";
  var K_THEME = PREFIX + "theme";
  var K_DAY = PREFIX + "day:"; // + YYYY-MM-DD

  function read(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function getCategories() {
    var c = read(K_CATEGORIES, null);
    if (!c || !c.length) {
      c = global.DefaultCategories.list();
      write(K_CATEGORIES, c);
    }
    return c;
  }

  function setCategories(arr) {
    write(K_CATEGORIES, arr);
  }

  function getDay(dateStr) {
    var arr = read(K_DAY + dateStr, []);
    return Array.isArray(arr) ? arr : [];
  }

  function setDay(dateStr, activities) {
    write(K_DAY + dateStr, activities);
  }

  function getTheme() {
    var t = read(K_THEME, "light");
    return t === "dark" ? "dark" : "light";
  }

  function setTheme(t) {
    write(K_THEME, t === "dark" ? "dark" : "light");
  }

  global.Store = {
    getCategories: getCategories,
    setCategories: setCategories,
    getDay: getDay,
    setDay: setDay,
    getTheme: getTheme,
    setTheme: setTheme,
  };
})(window);
