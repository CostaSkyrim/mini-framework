// view.js — render the todoMVC UI from state as vnodes.
//
// This is the meat of "framework usage": everything below is built exclusively
// with h() and the framework's event/attribute conventions.

import { h } from "../../src/core/h.js";
import { actions } from "./store.js";

const ENTER = "Enter";
const ESC = "Escape";

// `app` is a context object: { state (store), dispatch, newId, navigate }.
export function view(app, filter) {
  const state = app.state;
  const todos = state.todos;
  const visible = todos.filter(filter);
  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.length - activeCount;
  const allDone = todos.length > 0 && todos.every((t) => t.completed);

  return h("div", { class: "todoapp" },
    header(app),
    main(app, visible, allDone),
    footer(app, activeCount, completedCount),
  );
}

function header(app) {
  return h("header", { class: "header" },
    h("h1", {}, "todos"),
    h("form", {
      events: {
        submit: (e) => {
          e.preventDefault();
          const input = e.target.querySelector(".new-todo");
          const value = input.value;
          if (value.trim()) {
            app.dispatch({ type: actions.ADD_TODO, title: value, id: app.newId() });
            input.value = "";
          }
        },
      },
    },
      h("input", {
        class: "new-todo",
        placeholder: "What needs to be done?",
        autofocus: true,
      }),
    ),
  );
}

function main(app, visible, allDone) {
  const hasTodos = app.state.todos.length > 0;
  return h("section", { class: "main", style: hasTodos ? "" : "display:none" },
    h("input", {
      id: "toggle-all",
      class: "toggle-all",
      type: "checkbox",
      checked: allDone,
      events: { change: () => app.dispatch({ type: actions.TOGGLE_ALL }) },
    }),
    h("label", { for: "toggle-all" }, "Mark all as complete"),
    todoList(app, visible),
  );
}

function todoList(app, visible) {
  return h("ul", { class: "todo-list" },
    visible.map((todo) => todoItem(app, todo)),
  );
}

function todoItem(app, todo) {
  if (todo.editing) {
    return h("li", {
      key: todo.id,
      class: (todo.completed ? "completed" : "") + " editing",
    },
      h("input", {
        class: "edit",
        value: todo.title,
        events: {
          blur: (e) => {
            const val = e.target.value.trim();
            if (!val) {
              app.dispatch({ type: actions.REMOVE_TODO, id: todo.id });
            } else {
              app.dispatch({ type: actions.EDIT_TODO, id: todo.id, title: val });
            }
            app.dispatch({ type: actions.SET_EDITING, id: todo.id, editing: false });
          },
          keydown: (e) => {
            if (e.key === ENTER) {
              e.target.blur();
            } else if (e.key === ESC) {
              e.target.value = todo.title;
              e.target.blur();
            }
          },
        },
      }),
    );
  }

  return h("li", {
    key: todo.id,
    class: todo.completed ? "completed" : "",
  },
    h("div", { class: "view" },
      h("input", {
        class: "toggle",
        type: "checkbox",
        checked: todo.completed,
        events: { change: () => app.dispatch({ type: actions.TOGGLE_TODO, id: todo.id }) },
      }),
      h("label", {
        events: {
          dblclick: () => app.dispatch({ type: actions.SET_EDITING, id: todo.id, editing: true }),
        },
      }, todo.title),
      h("button", {
        class: "destroy",
        events: { click: () => app.dispatch({ type: actions.REMOVE_TODO, id: todo.id }) },
      }),
    ),
  );
}

function footer(app, activeCount, completedCount) {
  const hasTodos = app.state.todos.length > 0;
  const filter = app.currentFilter;
  const link = (label, path) =>
    h("li", {},
      h("a", {
        href: path === "all" ? "#/" : "#/" + path,
        class: filter === path ? "selected" : "",
        events: { click: () => app.navigate(path === "all" ? "/" : "/" + path) },
      }, label),
    );

  return h("footer", { class: "footer", style: hasTodos ? "" : "display:none" },
    h("span", { class: "todo-count" },
      h("strong", {}, String(activeCount)),
      activeCount === 1 ? " item left" : " items left",
    ),
    h("ul", { class: "filters" },
      link("all", "all"),
      link("active", "active"),
      link("completed", "completed"),
    ),
    completedCount > 0
      ? h("button", {
          class: "clear-completed",
          events: { click: () => app.dispatch({ type: actions.CLEAR_COMPLETED }) },
        }, "Clear completed")
      : null,
  );
}
