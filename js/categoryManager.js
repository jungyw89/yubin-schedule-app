/* categoryManager.js — 분류 추가/삭제 UI (전역 CategoryManager) */
(function (global) {
  "use strict";

  // handlers: { add({name,emoji,color}), remove(id) }
  function render(categories, handlers) {
    var root = document.getElementById("category-manager");
    if (!root) return;
    root.innerHTML = "";

    // 현재 분류 칩 목록
    var ul = document.createElement("ul");
    ul.className = "cat-list";
    for (var i = 0; i < categories.length; i++) {
      ul.appendChild(chip(categories[i], handlers));
    }
    root.appendChild(ul);

    // 추가 폼
    root.appendChild(buildAddForm(categories, handlers));
  }

  function chip(cat, handlers) {
    var li = document.createElement("li");
    li.className = "cat-chip";

    var dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = cat.color;

    var name = document.createElement("span");
    name.textContent = (cat.emoji ? cat.emoji + " " : "") + cat.name;

    var del = document.createElement("button");
    del.type = "button";
    del.className = "del";
    del.textContent = "×";
    del.title = "삭제";
    del.addEventListener("click", function () {
      if (global.confirm('"' + cat.name + '" 분류를 삭제할까요?')) {
        handlers.remove(cat.id);
      }
    });

    li.appendChild(dot);
    li.appendChild(name);
    li.appendChild(del);
    return li;
  }

  function buildAddForm(categories, handlers) {
    var form = document.createElement("form");
    form.className = "cat-add-form";

    var emoji = document.createElement("input");
    emoji.type = "text";
    emoji.className = "emoji";
    emoji.maxLength = 2;
    emoji.placeholder = "🙂";

    var name = document.createElement("input");
    name.type = "text";
    name.className = "name";
    name.placeholder = "분류 이름";
    name.required = true;

    var used = categories.map(function (c) {
      return c.color;
    });
    var color = document.createElement("input");
    color.type = "color";
    color.value = global.DefaultCategories.nextColor(used);

    var add = document.createElement("button");
    add.type = "submit";
    add.className = "add-btn";
    add.textContent = "분류 추가";

    form.appendChild(emoji);
    form.appendChild(name);
    form.appendChild(color);
    form.appendChild(add);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nm = name.value.trim();
      if (!nm) {
        name.focus();
        return;
      }
      handlers.add({
        name: nm,
        emoji: emoji.value.trim(),
        color: color.value,
      });
    });

    return form;
  }

  global.CategoryManager = {
    render: render,
  };
})(window);
