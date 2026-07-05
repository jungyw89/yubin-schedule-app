/* 연합 캐릭터 상호작용
   - 클릭(제자리 탭): 랜덤 재주넘기(backflip/frontflip/jump/spin/wiggle) → 끝나면 원래대로
   - 드래그: 위치 이동, localStorage에 저장되어 다음에도 유지
   - 클릭 vs 드래그는 이동 거리로 구분 */
(function () {
  "use strict";

  var TRICKS = ["backflip", "frontflip", "jump", "spin", "wiggle"];
  var DRAG_THRESHOLD = 10; // px 이상 움직이면 드래그로 판단(가벼운 클릭은 탭으로)
  var STORE_PREFIX = "buddyPos:";

  // ---- 디버그 모드 (?debug=1 로 열면 화면에 이벤트 로그 표시) ----
  var DEBUG = /[?&]debug=1/.test(location.search);
  var dbgBox = null;
  function dbg(msg) {
    if (!DEBUG) return;
    if (!dbgBox) {
      dbgBox = document.createElement("div");
      dbgBox.style.cssText =
        "position:fixed;top:0;left:0;right:0;z-index:99999;max-height:40vh;overflow:auto;" +
        "background:rgba(0,0,0,0.82);color:#0f0;font:12px/1.4 monospace;padding:8px;" +
        "white-space:pre-wrap;pointer-events:none;";
      document.body.appendChild(dbgBox);
    }
    var t = new Date().toISOString().substr(14, 9);
    dbgBox.textContent = t + "  " + msg + "\n" + dbgBox.textContent;
    if (dbgBox.textContent.length > 2000)
      dbgBox.textContent = dbgBox.textContent.slice(0, 2000);
  }

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

  // 각 재주의 재생 시간(ms)
  var TRICK_MS = {
    backflip: 900,
    frontflip: 900,
    jump: 700,
    spin: 800,
    wiggle: 700,
    walkLeft: 1600,
    walkRight: 1600,
    hop: 850,
    dance: 1300,
  };

  // Web Animations API용 키프레임 (CSS에 의존하지 않음 → 사파리/동작줄이기 우회)
  var TRICK_KF = {
    backflip: [
      { transform: "translateY(0) rotate(0deg)", offset: 0 },
      { transform: "translateY(-8%) scale(1.05,0.95) rotate(-40deg)", offset: 0.2 },
      { transform: "translateY(-48%) rotate(-200deg)", offset: 0.55 },
      { transform: "translateY(0) rotate(-360deg)", offset: 1 },
    ],
    frontflip: [
      { transform: "translateY(0) rotate(0deg)", offset: 0 },
      { transform: "translateY(-8%) scale(1.05,0.95) rotate(40deg)", offset: 0.2 },
      { transform: "translateY(-48%) rotate(200deg)", offset: 0.55 },
      { transform: "translateY(0) rotate(360deg)", offset: 1 },
    ],
    jump: [
      { transform: "translateY(0) scale(1,1)", offset: 0 },
      { transform: "translateY(0) scale(1.12,0.86)", offset: 0.2 },
      { transform: "translateY(-48%) scale(0.94,1.1)", offset: 0.5 },
      { transform: "translateY(0) scale(1.14,0.84)", offset: 0.78 },
      { transform: "translateY(0) scale(1,1)", offset: 1 },
    ],
    spin: [
      { transform: "translateY(0) rotate(0deg)", offset: 0 },
      { transform: "translateY(-18%) rotate(-180deg) scale(0.9)", offset: 0.5 },
      { transform: "translateY(0) rotate(-360deg)", offset: 1 },
    ],
    wiggle: [
      { transform: "rotate(0deg)", offset: 0 },
      { transform: "rotate(-16deg)", offset: 0.15 },
      { transform: "rotate(13deg)", offset: 0.35 },
      { transform: "rotate(-11deg)", offset: 0.55 },
      { transform: "rotate(8deg)", offset: 0.75 },
      { transform: "rotate(0deg)", offset: 1 },
    ],
    // 왼쪽으로 뒤뚱뒤뚱 걸어갔다 돌아오기
    walkLeft: [
      { transform: "translateX(0) translateY(0) rotate(0deg)", offset: 0 },
      { transform: "translateX(-20px) translateY(-7%) rotate(-6deg)", offset: 0.12 },
      { transform: "translateX(-40px) translateY(0) rotate(5deg)", offset: 0.24 },
      { transform: "translateX(-62px) translateY(-7%) rotate(-6deg)", offset: 0.36 },
      { transform: "translateX(-82px) translateY(0) rotate(0deg)", offset: 0.48 },
      { transform: "translateX(-82px) translateY(-4%) rotate(0deg)", offset: 0.55 },
      { transform: "translateX(-62px) translateY(0) rotate(6deg)", offset: 0.66 },
      { transform: "translateX(-40px) translateY(-7%) rotate(-5deg)", offset: 0.78 },
      { transform: "translateX(-20px) translateY(0) rotate(6deg)", offset: 0.9 },
      { transform: "translateX(0) translateY(0) rotate(0deg)", offset: 1 },
    ],
    // 오른쪽으로 뒤뚱뒤뚱 걸어갔다 돌아오기
    walkRight: [
      { transform: "translateX(0) translateY(0) rotate(0deg)", offset: 0 },
      { transform: "translateX(20px) translateY(-7%) rotate(6deg)", offset: 0.12 },
      { transform: "translateX(40px) translateY(0) rotate(-5deg)", offset: 0.24 },
      { transform: "translateX(62px) translateY(-7%) rotate(6deg)", offset: 0.36 },
      { transform: "translateX(82px) translateY(0) rotate(0deg)", offset: 0.48 },
      { transform: "translateX(82px) translateY(-4%) rotate(0deg)", offset: 0.55 },
      { transform: "translateX(62px) translateY(0) rotate(-6deg)", offset: 0.66 },
      { transform: "translateX(40px) translateY(-7%) rotate(5deg)", offset: 0.78 },
      { transform: "translateX(20px) translateY(0) rotate(-6deg)", offset: 0.9 },
      { transform: "translateX(0) translateY(0) rotate(0deg)", offset: 1 },
    ],
    // 통통 두 번 점프
    hop: [
      { transform: "translateY(0) scale(1,1)", offset: 0 },
      { transform: "translateY(0) scale(1.08,0.9)", offset: 0.1 },
      { transform: "translateY(-32%) scale(0.96,1.06)", offset: 0.28 },
      { transform: "translateY(0) scale(1.08,0.9)", offset: 0.46 },
      { transform: "translateY(-40%) scale(0.94,1.08)", offset: 0.64 },
      { transform: "translateY(0) scale(1.1,0.88)", offset: 0.82 },
      { transform: "translateY(0) scale(1,1)", offset: 1 },
    ],
    // 좌우로 흔들며 춤추기
    dance: [
      { transform: "translateX(0) translateY(0) rotate(0deg)", offset: 0 },
      { transform: "translateX(-18px) translateY(-6%) rotate(-10deg)", offset: 0.14 },
      { transform: "translateX(18px) translateY(0) rotate(10deg)", offset: 0.28 },
      { transform: "translateX(-18px) translateY(-6%) rotate(-10deg)", offset: 0.42 },
      { transform: "translateX(18px) translateY(0) rotate(10deg)", offset: 0.56 },
      { transform: "translateX(-12px) translateY(-6%) rotate(-8deg)", offset: 0.72 },
      { transform: "translateX(12px) translateY(0) rotate(8deg)", offset: 0.86 },
      { transform: "translateX(0) translateY(0) rotate(0deg)", offset: 1 },
    ],
  };

  function playTrick(buddy) {
    var sprite = buddy.querySelector(".buddy-sprite");
    if (!sprite) {
      dbg("playTrick: sprite 없음!");
      return;
    }
    if (sprite.__tricking) {
      dbg("playTrick: 이미 재생 중 → 무시");
      return;
    }
    var names = Object.keys(TRICK_KF);
    var name = names[Math.floor(Math.random() * names.length)];

    // Web Animations API (사파리 13.1+ 지원). CSS 우선순위/동작줄이기 영향 안 받음.
    if (typeof sprite.animate === "function") {
      dbg("▶ TRICK(WAAPI): " + name);
      sprite.__tricking = true;
      var done = function () {
        sprite.__tricking = false;
      };
      try {
        var anim = sprite.animate(TRICK_KF[name], {
          duration: TRICK_MS[name],
          easing: "ease-in-out",
          fill: "none",
        });
        anim.onfinish = done;
        anim.oncancel = done;
        dbg("  playState=" + anim.playState);
      } catch (err) {
        dbg("  animate 실패: " + err.message);
        done();
      }
      setTimeout(done, TRICK_MS[name] + 500);
      return;
    }

    // 폴백: 인라인 CSS 애니메이션
    dbg("▶ TRICK(CSS): " + name);
    sprite.__tricking = true;
    sprite.style.animation = "none";
    void sprite.offsetWidth;
    sprite.style.animation = "trick-" + name + " " + TRICK_MS[name] + "ms ease-in-out 1";
    setTimeout(function () {
      sprite.style.animation = "";
      sprite.__tricking = false;
    }, TRICK_MS[name] + 300);
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
      dbg("pointerup " + name + " (moved=" + moved + ")");
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
      dbg("pointerdown " + name + " (type=" + e.pointerType + ", btn=" + e.button + ")");
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
      dbg("click " + name + " (suppress=" + suppressClick + ")");
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
    dbg("init: buddy " + buddies.length + "개 발견");
    for (var i = 0; i < buddies.length; i++) setupBuddy(buddies[i]);

    // 진단: 화면 어디를 클릭하든 실제로 어떤 요소가 눌리는지 로깅
    if (DEBUG) {
      document.addEventListener(
        "pointerdown",
        function (e) {
          var el = e.target;
          var desc = el
            ? el.tagName + "." + (el.className || "").toString().replace(/\s+/g, ".")
            : "null";
          var closestBuddy = el && el.closest ? el.closest(".buddy") : null;
          dbg(
            "DOC pointerdown → " +
              desc +
              (closestBuddy ? "  [buddy 안!]" : "  [buddy 밖]")
          );
        },
        true
      );
    }

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
