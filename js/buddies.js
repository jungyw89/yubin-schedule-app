/* 연합 캐릭터 상호작용
   - 클릭(제자리 탭): 랜덤 재주넘기(backflip/frontflip/jump/spin/wiggle) → 끝나면 원래대로
   - 드래그: 위치 이동, localStorage에 저장되어 다음에도 유지
   - 클릭 vs 드래그는 이동 거리로 구분 */
(function () {
  "use strict";

  var TRICKS = ["backflip", "frontflip", "jump", "spin", "wiggle"];
  var DRAG_THRESHOLD = 10; // px 이상 움직이면 드래그로 판단(가벼운 클릭은 탭으로)
  var STORE_PREFIX = "buddyPos:";

  function loadPos(name) {
    try {
      var raw = localStorage.getItem(STORE_PREFIX + name);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function savePos(name, pos) {
    try {
      localStorage.setItem(STORE_PREFIX + name, JSON.stringify(pos));
    } catch (e) {
      /* 무시 */
    }
  }

  // 화면 안에 머물도록 위치 보정
  function clampPos(el, left, top) {
    var w = el.offsetWidth;
    var h = el.offsetHeight;
    var maxL = Math.max(0, window.innerWidth - w);
    var maxT = Math.max(0, window.innerHeight - h);
    return {
      left: Math.min(Math.max(0, left), maxL),
      top: Math.min(Math.max(0, top), maxT),
    };
  }

  // 저장된 좌표(top/left)로 배치
  function applyPos(el, pos) {
    var c = clampPos(el, pos.left, pos.top);
    el.classList.add("moved");
    el.style.left = c.left + "px";
    el.style.top = c.top + "px";
    el.style.right = "auto";
    el.style.bottom = "auto";
  }

  function playTrick(buddy) {
    var sprite = buddy.querySelector(".buddy-sprite");
    if (!sprite || sprite.classList.contains("trick")) return; // 재생 중이면 무시
    var name = TRICKS[Math.floor(Math.random() * TRICKS.length)];
    sprite.classList.add("trick", "trick-" + name);
    var cleanup = function () {
      sprite.classList.remove("trick", "trick-" + name);
      sprite.removeEventListener("animationend", cleanup);
      sprite.removeEventListener("animationcancel", cleanup);
    };
    sprite.addEventListener("animationend", cleanup);
    sprite.addEventListener("animationcancel", cleanup);
  }

  function setupBuddy(buddy) {
    var name = buddy.dataset.buddy;
    var saved = loadPos(name);
    if (saved) applyPos(buddy, saved);

    var startX = 0,
      startY = 0,
      baseLeft = 0,
      baseTop = 0,
      moved = false,
      active = false,
      suppressClick = false;

    // ⚠️ setPointerCapture는 쓰지 않는다:
    //   WebKit(사파리)에서 setPointerCapture를 호출하면 뒤따르는 click이 발생하지 않는
    //   알려진 버그가 있어 탭 재주가 먹통이 된다. 드래그는 document 리스너로 처리한다.
    function onMove(e) {
      if (!active) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!moved && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
        moved = true;
        buddy.classList.add("dragging");
      }
      if (moved) {
        var c = clampPos(buddy, baseLeft + dx, baseTop + dy);
        buddy.classList.add("moved");
        buddy.style.left = c.left + "px";
        buddy.style.top = c.top + "px";
        buddy.style.right = "auto";
        buddy.style.bottom = "auto";
        if (e.cancelable) e.preventDefault();
      }
    }

    function onUp() {
      if (!active) return;
      active = false;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      buddy.classList.remove("dragging");
      if (moved) {
        var rect = buddy.getBoundingClientRect();
        savePos(name, { left: rect.left, top: rect.top });
        suppressClick = true; // 드래그였으니 뒤따르는 click은 무시
      } else {
        // 제자리 탭 → 재주넘기 (pointerup 경로. click 폴백과 중복은 가드로 방지)
        playTrick(buddy);
        suppressClick = true;
      }
    }

    buddy.addEventListener("pointerdown", function (e) {
      if (e.button != null && e.button !== 0) return; // 좌클릭만
      active = true;
      moved = false;
      suppressClick = false;
      startX = e.clientX;
      startY = e.clientY;
      var rect = buddy.getBoundingClientRect();
      baseLeft = rect.left;
      baseTop = rect.top;
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    });

    // 탭 → 재주넘기. click은 (setPointerCapture를 안 쓰므로) 사파리에서도 정상 발생.
    buddy.addEventListener("click", function () {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      playTrick(buddy);
    });

    // 키보드 접근성: Enter/Space → 재주넘기
    buddy.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        playTrick(buddy);
      }
    });
  }

  function init() {
    var buddies = document.querySelectorAll(".buddy");
    for (var i = 0; i < buddies.length; i++) setupBuddy(buddies[i]);

    // 화면 크기/회전 바뀌면 저장된 위치를 화면 안으로 재보정
    window.addEventListener("resize", function () {
      for (var i = 0; i < buddies.length; i++) {
        var b = buddies[i];
        if (!b.classList.contains("moved")) continue;
        var rect = b.getBoundingClientRect();
        var c = clampPos(b, rect.left, rect.top);
        b.style.left = c.left + "px";
        b.style.top = c.top + "px";
      }
    });

    // 헤더 마스코트(TV맨) 클릭 → 잠깐 빙글
    var mascot = document.querySelector(".title-mascot");
    if (mascot) {
      mascot.addEventListener("click", function () {
        if (mascot.dataset.playing) return;
        mascot.dataset.playing = "1";
        mascot.style.animation = "trick-spin 0.7s ease-in-out";
        var done = function () {
          mascot.style.animation = "";
          delete mascot.dataset.playing;
          mascot.removeEventListener("animationend", done);
        };
        mascot.addEventListener("animationend", done);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
