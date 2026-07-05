/* 우리 아이 시간표 — 서비스 워커
   버전 문자열을 바꾸면 캐시가 갱신됩니다. (배포 시 코드가 바뀌면 아래 CACHE 값 숫자를 올리세요) */
const CACHE = "yubin-schedule-v4";

const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./css/decorations.css",
  "./assets/characters/tvman.svg",
  "./assets/characters/speakerman.svg",
  "./assets/characters/cameraman.svg",
  "./js/time.js",
  "./js/categories.js",
  "./js/store.js",
  "./js/rewards.js",
  "./js/clock.js",
  "./js/categoryManager.js",
  "./js/schedule.js",
  "./js/now.js",
  "./js/main.js",
  "./js/buddies.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 네트워크 우선, 실패 시 캐시 (오프라인 대응). HTML은 항상 최신 시도.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
  );
});
