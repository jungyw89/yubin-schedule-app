/* categories.js — 기본 분류와 색 팔레트 (전역 DefaultCategories) */
(function (global) {
  "use strict";

  // 처음 켰을 때 보이는 기본 분류
  var DEFAULTS = [
    { id: "sleep", name: "수면", color: "#7a5cff", emoji: "😴" },
    { id: "meal", name: "식사", color: "#ff9f43", emoji: "🍚" },
    { id: "study", name: "공부", color: "#4cc9f0", emoji: "📚" },
    { id: "play", name: "놀이", color: "#4cd964", emoji: "🎮" },
    { id: "out", name: "외출", color: "#ff5a5a", emoji: "🚗" },
  ];

  // 새 분류 추가 시 돌아가며 제안할 색
  var PALETTE = [
    "#ff5a5a", "#ff9f43", "#ffd93d", "#4cd964", "#4cc9f0",
    "#5c7cfa", "#7a5cff", "#c45cff", "#ff6fb5", "#26c6a4",
  ];

  function clone() {
    return DEFAULTS.map(function (c) {
      return { id: c.id, name: c.name, color: c.color, emoji: c.emoji };
    });
  }

  function nextColor(used) {
    used = used || [];
    for (var i = 0; i < PALETTE.length; i++) {
      if (used.indexOf(PALETTE[i]) === -1) return PALETTE[i];
    }
    return PALETTE[used.length % PALETTE.length];
  }

  global.DefaultCategories = {
    list: clone,
    palette: PALETTE,
    nextColor: nextColor,
  };
})(window);
