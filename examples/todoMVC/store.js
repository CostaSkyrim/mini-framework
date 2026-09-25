// todoMVC store + reducer + routing filter helpers.
//
// This file only uses framework primitives (createStore) plus plain logic.
// The view (view.js) turns this state into vnodes via h().

import { createStore } from "../../src/state/store.js";

// Actions and reducer.
export const actions = {
  ADD_TODO: "ADD_TODO",
  TOGGLE_TODO: "TOGGLE_TODO",
  REMOVE_TODO: "REMOVE_TODO",
  EDIT_TODO: "EDIT_TODO",
  CLEAR_COMPLETED: "CLEAR_COMPLETED",
  TOGGLE_ALL: "TOGGLE_ALL",
  SET_EDITING: "SET_EDITING",
};

export function reducer(state, action) {
  switch (action.type) {
    case actions.ADD_TODO: {
      const title = action.title.trim();
      if (!title) return state;
      return {
        ...state,
        todos: [
          ...state.todos,
          {
            id: action.id,
            title,
            completed: false,
            editing: false,
          },
        ],
      };
    }
    case actions.TOGGLE_TODO:
      return {
        ...state,
        todos: state.todos.map((t) =>
          t.id === action.id ? { ...t, completed: !t.completed } : t,
        ),
      };
    case actions.REMOVE_TODO:
      return {
        ...state,
        todos: state.todos.filter((t) => t.id !== action.id),
      };
    case actions.EDIT_TODO:
      return {
        ...state,
        todos: state.todos.map((t) =>
          t.id === action.id ? { ...t, title: action.title } : t,
        ),
      };
    case actions.SET_EDITING:
      return {
        ...state,
        todos: state.todos.map((t) => ({
          ...t,
          editing: t.id === action.id ? action.editing : false,
        })),
      };
    case actions.CLEAR_COMPLETED:
      return {
        ...state,
        todos: state.todos.filter((t) => !t.completed),
      };
    case actions.TOGGLE_ALL: {
      const allDone = state.todos.every((t) => t.completed);
      return {
        ...state,
        todos: state.todos.map((t) => ({ ...t, completed: !allDone })),
      };
    }
    default:
      return state;
  }
}

export function createTodoStore() {
  return createStore(reducer, { todos: [] });
}

// Routing filter: match route params to a visibility filter.
export function filterFor(param) {
  if (param === "active") return (t) => !t.completed;
  if (param === "completed") return (t) => t.completed;
  return () => true; // "all" or anything else
}

let nextId = 0;
export function newId() {
  return "todo-" + ++nextId;
}
