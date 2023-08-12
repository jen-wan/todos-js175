const nextId = require("./next-id");

// We export the class Todo. Each Todo is a class with properties id, title, and done.
// It contains method properties as well such as markDone() to mark the todo as done.
class Todo {
  static makeTodo(rawTodo) {
    return Object.assign(new Todo(), rawTodo);
  }

  constructor(title) {
    this.id = nextId();
    this.title = title;
    this.done = false;
  }

  toString() {
    let marker = this.isDone() ? Todo.DONE_MARKER : Todo.UNDONE_MARKER;
    return `[${marker}] ${this.title}`;
  }

  markDone() {
    this.done = true;
  }

  markUndone() {
    this.done = false;
  }

  isDone() {
    return this.done;
  }

  setTitle(title) {
    this.title = title;
  }
}

Todo.DONE_MARKER = "X";
Todo.UNDONE_MARKER = " ";

module.exports = Todo;