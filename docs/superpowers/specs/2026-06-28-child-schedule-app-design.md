# 우리 아이 시간표 — 설계문서

작성일: 2026-06-28

## 한 줄 정의
아이의 하루 일과를 24시간 원형 시계에 색으로 그리고, 끝낸 일을 체크하면 별과 달성률이 차오르는 웹앱. 서버 없이 HTML 파일을 더블클릭(`file://`)으로 열어도 동작한다.

## 핵심 데이터 모델
- **일과(activity)** = 시계에 그려지는 색 띠 + 체크 가능한 할 일. 하나로 통합된 단위.
  - `id`: 고유값
  - `start`: 시작(분 단위, 0~1440)
  - `end`: 끝(분 단위, 0~1440). start보다 커야 함. 자정 넘김은 허용하지 않음(하루 단위).
  - `label`: 이름 (예: "공부")
  - `categoryId`: 분류 id (색 결정)
  - `done`: 완료 여부 (true/false)
- **분류(category)**
  - `id`, `name`, `color`(HEX), `emoji`
- **날짜별 저장**: 일과는 날짜(`YYYY-MM-DD`)별로 따로 보관. 분류는 전 날짜 공통.

## 완료/보상 규칙
- 일과를 체크(`done=true`)하면 별 +1.
- 달성률(%) = 완료 일과 수 ÷ 전체 일과 수 × 100. 일과가 0개면 0%.
- 별 SVG는 달성률만큼 아래에서 위로 채워진다(클립 사각형 y/height 조절).
- 별 개수 = 완료 일과 수.

## 화면 구성 (HTML에 이미 고정됨)
- **상단 헤더**: 제목 / 날짜 이동(◀ ▶ 오늘) / 다크모드 토글
- **왼쪽 패널**: 24시간 원형 시계(SVG) + 색상 범례(legend)
- **오른쪽 패널**:
  - 보상: 무지개 별 + 달성률(%) + 별 개수
  - 일과 목록(`#schedule`): 추가 폼 + 일과 카드들(체크/수정/삭제)
  - 분류 관리(`#category-manager`): 추가/삭제

## 저장
- 브라우저 `localStorage`. 키 예시:
  - `kidschedule:categories` → 분류 배열
  - `kidschedule:day:YYYY-MM-DD` → 그 날 일과 배열
  - `kidschedule:theme` → "light" | "dark"
- 기기 안에만 저장. 기기 간 공유 안 함(설계상 단순화).

## 파일 구성 (의존성 순서 = HTML script 순서)
각 파일은 전역 객체 하나를 노출(모듈 아님, `file://` 동작 위해).

| 파일 | 역할 | 노출 전역 |
|---|---|---|
| css/style.css | 디자인·다크모드·시계/카드 스타일 | — |
| js/time.js | 분↔시각 변환, 시각→시계 각도/좌표, 포맷 | `Time` |
| js/categories.js | 기본 분류 목록·색 팔레트 | `DefaultCategories` |
| js/store.js | localStorage 읽기/쓰기, 날짜 키 관리 | `Store` |
| js/rewards.js | 달성률·별 계산, 별 SVG 채움 갱신 | `Rewards` |
| js/clock.js | 24시간 시계(눈금+일과 호) 그리기, 범례 | `Clock` |
| js/categoryManager.js | 분류 추가/삭제 UI 렌더 | `CategoryManager` |
| js/schedule.js | 일과 목록·추가폼·체크/수정/삭제 렌더 | `Schedule` |
| js/main.js | 상태 보유, 날짜/테마 제어, 위 모듈 연결·재렌더 | — |

### 모듈 간 계약(인터페이스)
- `Time.minutesToAngle(min)`, `Time.polar(cx,cy,r,angle)`, `Time.fmt(min)` 등 순수 함수.
- `Store.getCategories()/setCategories(arr)`, `Store.getDay(dateStr)/setDay(dateStr,arr)`, `Store.getTheme()/setTheme(t)`.
- `Rewards.render(activities)` → 별·달성률 DOM 갱신.
- `Clock.render(activities, categories)` → 시계 SVG·범례 갱신.
- `Schedule.render(activities, categories, handlers)` → 목록·폼 갱신. handlers: add/toggle/edit/delete.
- `CategoryManager.render(categories, handlers)` → 분류 UI. handlers: add/delete.
- `main.js`가 단일 상태(`state.date`, `state.activities`, `state.categories`)를 들고, 변경 시 Store 저장 후 Clock/Rewards/Schedule/CategoryManager를 다시 그린다.

## 기본 분류(첫 실행 시)
😴 수면 / 🍚 식사 / 📚 공부 / 🎮 놀이 / 🚗 외출 — 알록달록한 색.

## 비목표(YAGNI)
- 기기 간 동기화(클라우드) — 이번 범위 아님.
- 로그인/계정 — 없음.
- 자정 넘기는 일과 — 허용 안 함.
- 반복 일정 자동 생성 — 없음(날짜마다 직접 입력).

## 동작 확인 기준
1. HTML 더블클릭으로 열면 시계·기본 분류·빈 목록이 보인다.
2. 일과를 추가하면 시계에 색 호가 그려지고 목록 카드가 생긴다.
3. 체크하면 별 개수·달성률·별 채움이 즉시 갱신된다.
4. 날짜를 바꾸면 그 날의 일과로 바뀌고, 새로고침해도 유지된다.
5. 분류를 추가/삭제하면 색 선택지와 범례가 갱신된다.
6. 다크모드 토글이 동작하고 새로고침해도 유지된다.
