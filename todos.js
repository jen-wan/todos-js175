/* eslint-disable max-lines-per-function */
const express = require("express");
const morgan = require("morgan");
const flash = require("express-flash");
const session = require("express-session");
const { body, validationResult } = require("express-validator");
const TodoList = require("./lib/todolist");
const { sortTodoLists, sortTodos } = require("./lib/sort");

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

// Extract session info so that flash messages before redirect are available
// for use in views rendered by res.render.
app.use((req, res, next) => {
  res.locals.flash = req.session.flash; // extract flash messages and place in res.locals.
  delete req.session.flash;
  next();
});

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

// Create a new todo List, using express-validator library for form validation
app.post("/lists", // sets up route for handling POST requests to "/lists" URL endpoint
  [
    body("todoListTitle") // targets the todoListTitle field in request body and applies validation checks to it.
      .trim()
      .isLength({ min: 1 })
      .withMessage("The list title is required.") // error message is attached if validation check fails.
      .isLength({ max: 100 })
      .withMessage("List title must be between 1 and 100 characters.")
      .custom(title => {
        let duplicate = todoLists.find(list => list.title === title);
        return duplicate === undefined;
      })
      .withMessage("List title must be unique."),
  ],
  (req, res) => { // Defines the route handler function that is executed when "/lists" route is accessed with Post request.
    let errors = validationResult(req); // Uses express-validator library to gather results of validation checks performed on the request.
    if (!errors.isEmpty()) { // Checks if there are any validation errors.
      errors.array().forEach(message => req.flash("error", message.msg)); // adds each validation error message to flash message with key "error".
      res.render("new-list", { // Renders "new-list" template with flash messages and previously submitted title.
        flash: req.flash(),
        todoListTitle: req.body.todoListTitle,
      });
    } else { // Primary callback for route: If no validation errors, add new instance of TodoList class to todoLists array.
      todoLists.push(new TodoList(req.body.todoListTitle));
      req.flash("success", "The todo list has been created."); // success flash message
      res.redirect("/lists"); // The response redirects user to "/lists" URL after successfully creating todo list.
    }
  }
);

// Render individual todo list and its todos
app.get("/lists/:todoListId", (req, res, next) => { // Route parameters use the : syntax
  let todoListId = req.params.todoListId;
  let todoList = loadTodoList(+todoListId); // + converts string to a number.
  if (todoList === undefined) {
    next(new Error("Not found."));
  } else {
    res.render("list", {
      todoList: todoList,
      todos: sortTodos(todoList),
    });
  }
});

// Error handler
app.use((err, req, res, _next) => {
  console.log(err); // Writes more extensive information to the console log
  res.status(404).send(err.message);
});

// Find a todo list with the indicated ID. Returns `undefined` if not found.
// Note that `todoListId` must be numeric.
const loadTodoList = todoListId => {
  return todoLists.find(todoList => todoList.id === todoListId);
};

// Find a todo with the indicated ID in the indicated todo list.
// Returns `undefined` if not found. Note that both `todoListId` and `todoId` must be numeric.
const loadTodo = (todoListId, todoId) => {
  let todoList = loadTodoList(todoListId);
  return todoList.find(todo => todo.id === todoId);
};

// Toggle completion status of a todo
app.post("/lists/:todoListId/todos/:todoId/toggle", (req, res, next) => {
  // access the route parameter values from req.params
  let {todoListId, todoId} = {...req.params}; // object destructuring syntax with spread syntax
  // search for the todo based on todoId and todoListId, to toggle it
  let todo = loadTodo(+todoListId, +todoId); // convert todoListId and todoId to numeric
  if (todo === undefined) {
    next(new Error("Not Found."));
  } else {
    let title = todo.title;
    if (todo.isDone()) {
      todo.markUndone();
      req.flash()
    } else {
      todo.markDone();
    }
  }
});

// Error handler
app.use((err, req, res, _next) => {
  console.log(err);
  res.status(404).send(err.message);
});

// Listener
app.listen(port, host, () => {
  console.log(`Todos is listening on port ${port} of ${host}!`);
});