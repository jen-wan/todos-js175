/* eslint-disable max-lines-per-function */
const express = require("express");
const morgan = require("morgan");
const flash = require("express-flash");
const session = require("express-session");
const TodoList = require("./lib/todolist");

const app = express(); // create the Express application object, app
const host = "localhost";
const port = 3000;

// Static data for initial testing
let todoLists = require("./lib/seed-data");

app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));
app.use(express.static("public")); // tells Express to find static assets in public directory
app.use(express.urlencoded({ extended: false })); // tell Express what format to use for form data: URL-encoded.

// Adds session management middleware to our Express.js app.
app.use(session({
  name: "launch-school-todos-session-id", // specifies name of session cookie.
  resave: false, // Controls whether seession data should be saved to session store even if it hasn't changed.
  saveUninitialized: true, // Determines whether a seession sould be saved if it's uninitialized(new but not modified).
  secret: "this is not very secure", // Secret key used to sign session cookie to enhhance security.
}));

// Adds flash messages middlware to our Express.js app.
app.use(flash());

// Extract session info
app.use((req, res, next) => {
  res.locals.flash = req.session.flash; // extract flash messages and place in res.locals.
  delete req.session.flash;
  next();
});

// Compare todo list titles alphabetically (case-insensitive)
const compareByTitle = (todoListA, todoListB) => {
  let titleA = todoListA.title.toLowerCase();
  let titleB = todoListB.title.toLowerCase();

  if (titleA < titleB) {
    return -1;
  } else if (titleA > titleB) {
    return 1;
  } else {
    return 0;
  }
};

// return the list of todo lists sorted by completion status and title.
const sortTodoLists = lists => {
  let undone = lists.filter(todoList => !todoList.isDone());
  let done = lists.filter(todoList => todoList.isDone());
  undone.sort(compareByTitle);
  done.sort(compareByTitle);
  return [].concat(undone, done);
};

// Primary route for app, redirect the start page.
app.get("/", (req, res) => {
  res.redirect("/lists");
});

// Render the list of todo lists
app.get("/lists", (req, res) => {
  res.render("lists", { todoLists: sortTodoLists(todoLists) });
});

// Render new todo list page
app.get("/lists/new", (req, res) => {
  res.render("new-list");
});

// Create a new todo List
app.post("/lists", (req, res) => {
  let title = req.body.todoListTitle.trim(); // Get and trim the title from the request body
  // If title is empty
  if (title.length === 0) {
    req.flash("error", "A title was not provided.");
    res.render("new-list", { flash: req.flash() });
  } else if (title.length > 100) {
    req.flash("error", "List title must be between 1 and 100 characters.");
    req.flash("error", "This is another error."); // to demonstrate that our app manages multiple error messages correctly.
    req.flash("error", "Here is still another error.");
    res.render("new-list", {
      flash: req.flash(),
      todoListTitle: req.body.todoListTitle,
    });
  } else if (todoLists.some(list => list.title === title)) {
    req.flash("error", "List title must be unique.");
    res.render("new-list", {
      flash: req.flash(),
      todoListTitle: req.body.todoListTitle,
    });
  } else {
    todoLists.push(new TodoList(title)); // Create new todo list with the title & add new todo list to list of todo lists
    req.flash("success", "The todo list has been created.");
    res.redirect("/lists"); // redirects back to get version of /lists route
  }
});

// Listener
app.listen(port, host, () => {
  console.log(`Todos is listening on port ${port} of ${host}!`);
});