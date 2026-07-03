/* schedule.js — 일과 추가폼 + 목록 + 체크/수정(목록 내 인라인)/삭제 (전역 Schedule) */
(function (global) {
  "use strict";

  var editingId = null; // 수정 중인 일과 id
  var focusedFor = null; // 자동 포커스를 이미 준 일과 id (재렌더마다 포커스 뺏지 않게)
  var addOpen = false; // 새 일과 추가 폼이 펼쳐져 있는지 (재렌더에도 유지)

  // handlers: { add(fields), update(id, fields), remove(id), toggle(id) }
  function render(activities, categories, handlers) {
    var root = document.getElementById("schedule");
    if (!root) return;
    root.innerHTML = "";

    if (editingId && !find(activities, editingId)) editingId = null;

    root.appendChild(buildAddDetails(categories, handlers));
    root.appendChild(buildList(activities, categories, handlers));
  }

  function find(arr, id) {
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }

  // 시작/종료 시간, 이름, 분류 입력 필드 묶음 (추가폼과 목록 인라인 수정폼이 공유)
  function buildFieldset(categories, editingAct) {
    var start = timeInput(editingAct ? Time.fmt(editingAct.start) : "09:00");
    var sep = document.createElement("span");
    sep.className = "sep";
    sep.textContent = "~";
    var end = timeInput(editingAct ? Time.fmt(editingAct.end) : "10:00");

    var label = document.createElement("input");
    label.type = "text";
    label.className = "label-input";
    label.placeholder = "무엇을 하나요? (예: 공부)";
    label.required = true;
    if (editingAct) label.value = editingAct.label;

    var select = document.createElement("select");
    for (var i = 0; i < categories.length; i++) {
      var opt = document.createElement("option");
      opt.value = categories[i].id;
      opt.textContent = (categories[i].emoji ? categories[i].emoji + " " : "") + categories[i].name;
      if (editingAct && editingAct.categoryId === categories[i].id) opt.selected = true;
      select.appendChild(opt);
    }

    return { start: start, sep: sep, end: end, label: label, select: select };
  }

  function readFieldset(fs) {
    var s = Time.parse(fs.start.value);
    var en = Time.parse(fs.end.value);
    var lab = fs.label.value.trim();
    if (s === null || en === null) {
      global.alert("시간을 확인해주세요.");
      return null;
    }
    if (en <= s) {
      global.alert("끝나는 시간이 시작 시간보다 늦어야 해요.");
      return null;
    }
    if (!lab) {
      fs.label.focus();
      return null;
    }
    return { start: s, end: en, label: lab, categoryId: fs.select.value };
  }

  // 접었다 펼 수 있는 "새 일과 추가" 섹션
  function buildAddDetails(categories, handlers) {
    var details = document.createElement("details");
    details.className = "add-details";
    details.open = addOpen;
    details.addEventListener("toggle", function () {
      addOpen = details.open;
    });

    var summary = document.createElement("summary");
    summary.textContent = "➕ 새 일과 추가";
    details.appendChild(summary);
    details.appendChild(buildForm(categories, handlers));
    return details;
  }

  // 새 일과 추가 전용 폼
  function buildForm(categories, handlers) {
    var form = document.createElement("form");
    form.className = "add-form";

    var fs = buildFieldset(categories, null);
    var submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "add-btn";
    submit.textContent = "추가";

    form.appendChild(fs.start);
    form.appendChild(fs.sep);
    form.appendChild(fs.end);
    form.appendChild(fs.label);
    form.appendChild(fs.select);
    form.appendChild(submit);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fields = readFieldset(fs);
      if (fields) handlers.add(fields);
    });

    return form;
  }

  function timeInput(val) {
    var inp = document.createElement("input");
    inp.type = "time";
    inp.className = "time-input";
    inp.value = val;
    inp.required = true;
    return inp;
  }

  function buildList(activities, categories, handlers) {
    if (!activities.length) {
      var empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "아직 일과가 없어요. 위에서 추가하거나, 시계의 빈 곳을 드래그해보세요! ✏️🕐";
      return empty;
    }

    var cm = {};
    for (var i = 0; i < categories.length; i++) cm[categories[i].id] = categories[i];

    var sorted = activities.slice().sort(function (a, b) {
      return a.start - b.start;
    });

    var ul = document.createElement("ul");
    ul.className = "activity-list";
    for (var j = 0; j < sorted.length; j++) {
      var act = sorted[j];
      if (act.id === editingId) {
        ul.appendChild(editRow(act, categories, handlers));
      } else {
        ul.appendChild(row(act, cm[act.categoryId], handlers));
      }
    }
    return ul;
  }

  function row(act, cat, handlers) {
    var li = document.createElement("li");
    li.className = "activity" + (act.done ? " done" : "");
    li.style.setProperty("--cat", cat ? cat.color : "#9aa2b1");

    var check = document.createElement("input");
    check.type = "checkbox";
    check.className = "activity-check";
    check.checked = !!act.done;
    check.setAttribute("aria-label", act.label + " 완료");
    check.addEventListener("change", function () {
      handlers.toggle(act.id);
    });

    function startEdit() {
      editingId = act.id;
      focusedFor = null;
      handlers.refresh();
    }

    var time = document.createElement("span");
    time.className = "activity-time";
    time.textContent = Time.fmt(act.start) + " ~ " + Time.fmt(act.end);

    var label = document.createElement("span");
    label.className = "activity-label";
    label.textContent = (cat ? cat.emoji + " " : "") + act.label;

    var actions = document.createElement("span");
    actions.className = "activity-actions";

    var edit = iconBtn("✏️", "수정", startEdit);
    var del = iconBtn("🗑️", "삭제", function () {
      if (global.confirm('"' + act.label + '" 일과를 삭제할까요?')) {
        handlers.remove(act.id);
      }
    });
    actions.appendChild(edit);
    actions.appendChild(del);

    // 체크박스/액션 버튼을 제외한 행 전체(시간·이름 포함)를 클릭하면 그 자리에서 수정 모드로 전환
    li.addEventListener("click", function (e) {
      if (check.contains(e.target) || actions.contains(e.target)) return;
      startEdit();
    });

    li.appendChild(check);
    li.appendChild(time);
    li.appendChild(label);
    li.appendChild(actions);
    return li;
  }

  // 목록 안에서 바로 펼쳐지는 인라인 수정 행 (별도 상단 폼 대신 해당 자리에서 수정)
  function editRow(act, categories, handlers) {
    var li = document.createElement("li");
    li.className = "activity editing";

    var fs = buildFieldset(categories, act);
    var form = document.createElement("form");
    form.className = "add-form";

    var submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "add-btn";
    submit.textContent = "수정 완료";

    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "icon-btn cancel-btn";
    cancel.textContent = "취소";
    cancel.addEventListener("click", function () {
      editingId = null;
      focusedFor = null;
      handlers.refresh();
    });

    form.appendChild(fs.start);
    form.appendChild(fs.sep);
    form.appendChild(fs.end);
    form.appendChild(fs.label);
    form.appendChild(fs.select);
    form.appendChild(submit);
    form.appendChild(cancel);

    if (focusedFor !== act.id) {
      focusedFor = act.id;
      global.requestAnimationFrame(function () {
        fs.label.focus();
        fs.label.select();
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fields = readFieldset(fs);
      if (!fields) return;
      editingId = null;
      focusedFor = null;
      handlers.update(act.id, fields);
    });

    li.appendChild(form);
    return li;
  }

  function iconBtn(text, title, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "icon-btn";
    b.textContent = text;
    b.title = title;
    b.addEventListener("click", onClick);
    return b;
  }

  // 시계 드래그로 새 일정을 만든 직후 등, 바깥에서 수정 모드로 진입
  function startEdit(id) {
    editingId = id;
    focusedFor = null;
  }

  global.Schedule = {
    render: render,
    startEdit: startEdit,
  };
})(window);
