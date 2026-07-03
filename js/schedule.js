/* schedule.js — 일과 추가폼 + 목록 + 체크/수정/삭제 (전역 Schedule) */
(function (global) {
  "use strict";

  var editingId = null; // 수정 중인 일과 id
  var focusedFor = null; // 자동 포커스를 이미 준 일과 id (재렌더마다 포커스 뺏지 않게)

  // handlers: { add(fields), update(id, fields), remove(id), toggle(id) }
  function render(activities, categories, handlers) {
    var root = document.getElementById("schedule");
    if (!root) return;
    root.innerHTML = "";

    var editing = null;
    if (editingId) {
      editing = find(activities, editingId);
      if (!editing) editingId = null;
    }

    root.appendChild(buildForm(categories, handlers, editing));
    root.appendChild(buildList(activities, categories, handlers));
  }

  function find(arr, id) {
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }

  function buildForm(categories, handlers, editing) {
    var form = document.createElement("form");
    form.className = "add-form";

    var start = timeInput(editing ? Time.fmt(editing.start) : "09:00");
    var sep = document.createElement("span");
    sep.className = "sep";
    sep.textContent = "~";
    var end = timeInput(editing ? Time.fmt(editing.end) : "10:00");

    var label = document.createElement("input");
    label.type = "text";
    label.className = "label-input";
    label.placeholder = "무엇을 하나요? (예: 공부)";
    label.required = true;
    if (editing) label.value = editing.label;

    var select = document.createElement("select");
    for (var i = 0; i < categories.length; i++) {
      var opt = document.createElement("option");
      opt.value = categories[i].id;
      opt.textContent = (categories[i].emoji ? categories[i].emoji + " " : "") + categories[i].name;
      if (editing && editing.categoryId === categories[i].id) opt.selected = true;
      select.appendChild(opt);
    }

    var submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "add-btn";
    submit.textContent = editing ? "수정 완료" : "추가";

    form.appendChild(start);
    form.appendChild(sep);
    form.appendChild(end);
    form.appendChild(label);
    form.appendChild(select);
    form.appendChild(submit);

    if (editing && focusedFor !== editing.id) {
      focusedFor = editing.id;
      global.requestAnimationFrame(function () {
        label.focus();
        label.select();
      });
    }

    if (editing) {
      var cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "icon-btn cancel-btn";
      cancel.textContent = "취소";
      cancel.addEventListener("click", function () {
        editingId = null;
        focusedFor = null;
        handlers.refresh();
      });
      form.appendChild(cancel);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var s = Time.parse(start.value);
      var en = Time.parse(end.value);
      var lab = label.value.trim();
      if (s === null || en === null) {
        global.alert("시간을 확인해주세요.");
        return;
      }
      if (en <= s) {
        global.alert("끝나는 시간이 시작 시간보다 늦어야 해요.");
        return;
      }
      if (!lab) {
        label.focus();
        return;
      }
      var fields = { start: s, end: en, label: lab, categoryId: select.value };
      if (editing) {
        editingId = null;
        focusedFor = null;
        handlers.update(editing.id, fields);
      } else {
        handlers.add(fields);
      }
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
      ul.appendChild(row(sorted[j], cm[sorted[j].categoryId], handlers));
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
      handlers.refresh();
    }

    var time = document.createElement("span");
    time.className = "activity-time";
    time.textContent = Time.fmt(act.start) + " ~ " + Time.fmt(act.end);
    time.addEventListener("click", startEdit);

    var label = document.createElement("span");
    label.className = "activity-label";
    label.textContent = (cat ? cat.emoji + " " : "") + act.label;
    label.addEventListener("click", startEdit);

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

    li.appendChild(check);
    li.appendChild(time);
    li.appendChild(label);
    li.appendChild(actions);
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
