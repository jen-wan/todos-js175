/* eslint-disable max-lines-per-function */
const express = require("express");
const morgan = require("morgan");
const flash = require("express-flash");
const session = require("express-session");
const { body, validationResult } = require("express-validator");
const TodoList = require("./lib/todolist");
const Todo = require("./lib/todo.js");
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

// Create a new todo List, because new-list template links to here
app.post("/lists", // sets up route for handling POST requests to "/lists" URL endpoint
  [ // Use express-validator library for form validation
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

// Find a todo list with the indicated ID. Returns `undefined` if not found.
// Note that `todoListId` must be numeric.
const loadTodoList = todoListId => {
  return todoLists.find(todoList => todoList.id === todoListId);
};

// Find a todo with the indicated ID in the indicated todo list.
// Returns `undefined` if not found. Note that both `todoListId` and `todoId` must be numeric.
const loadTodo = (todoListId, todoId) => {
  let todoList = loadTodoList(todoListId);
  if (!todoList) return undefined; // first make sure todoList exists
  return todoList.todos.find(todo => todo.id === todoId);
};

// Render individual todo list and its todos
app.get("/lists/:todoListId", (req, res, next) => { // Route parameters use the : syntax
  let todoListId = req.params.todoListId;
  let todoList = loadTodoList(+todoListId); // + converts string to a number.
  if (!todoList) {
    next(new Error("Not found."));
  } else {
    res.render("list", {
      todoList: todoList,
      todos: sortTodos(todoList),
    });
  }
});

// Toggle completion status of a todo
app.post("/lists/:todoListId/todos/:todoId/toggle", (req, res, next) => { // Notice this is a parameterized route.
  let { todoListId, todoId } = { ...req.params };   // access the route parameter values from req.params
  // search for the todo based on todoId and todoListId, to toggle it
  let todo = loadTodo(+todoListId, +todoId);   // convert todoListId and todoId to numeric
  if (!todo) {
    next(new Error("Not found."));
  } else {
    let title = todo.title;
    if (todo.isDone()) {
      todo.markUndone();
      req.flash("success", `"${title}" marked as not done.`);
    } else {
      todo.markDone();
      req.flash("success", `"${title}" marked done.`);
    }

    res.redirect(`/lists/${todoListId}`); //Need to redirect back to this route to render the individual todo list.
  }
});

// Delete a todo
app.post("/lists/:todoListId/todos/:todoId/destroy", (req, res, next) => {
  let { todoListId, todoId } = {...req.params};
  let todoList = loadTodoList(+todoListId);
  if (!todoList) {
    next(new Error("Not Found."));
  } else {
    let todo = loadTodo(+todoListId, +todoId);
    if (!todo) {
      next(new Error("Not Found."));
    } else {
      todoList.removeAt(todoList.findIndexOf(todo));
      req.flash("Success", "The todo has been deleted.");
      res.redirect(`/lists/${todoListId}`);
    }
  }
});

// Complete all todos
app.post("/lists/:todoListId/complete_all", (req, res, next) => {
  let {todoListId} = {...req.params}; // object destructuring syntax with spread syntax to make copy of req.params object
  let todoList = loadTodoList(+todoListId);
  if (!todoList) {
    next(new Error("Not found."));
  } else {
    todoList.markAllDone();
    req.flash("Success", "All todos have been marked as done.");
    res.redirect(`/lists/${todoListId}`); // todoList.id would work but we created this variable so let's use it.
  }
});

// Create a new todo and add it to the specified list.
app.post("/lists/:todoListId/todos",
  [
    body("todoTitle")
      .trim()
      .isLength({ min: 1 })
      .withMessage("The title must be at least 1 character long.")
      .isLength({ max: 100 })
      .withMessage("The title must be between 1 and 100 characters")
  ],
  (req, res, next) => {
    // step 1: check if the todoList is valid
    let todoListId = req.params.todoListId;
    let todoList = loadTodoList(+todoListId);
    if (!todoList) {
      next(new Error("Not Found."));
    } else {
      // Check if there were errors
      let errors = validationResult(req);
      // If there are errors, render list view with the error flash messages
      if (!errors.isEmpty()) {
        errors.array().forEach(message => req.flash("error", message.msg));
        res.render("/list", {
          flash: req.flash(),
          todoList: todoList,
          todos: sortTodos(todoList), // sortTodos returns an array of sorted todos.
          todoTitle: req.body.todoTitle // get HTTP post input values from req.body
        });
      } else { // if there aren't errors, render a new list page with new todo
        let todo = new Todo(req.body.todoTitle); // we imported Todo, use the constructor to create new todo object.
        todoList.add(todo);
        req.flash("Success", "The todo has been created.");
        res.redirect(`/lists/${todoListId}`); // redirect to render the lists view.
      }
    }
  }
);

// Render the edit todo list form
app.get("/lists/:todoListId/edit", (req, res, next) => {
  let todoListId = req.params.todoListId;
  let todoList = loadTodoList(+todoListId);
  if (!todoList) {
    next(new Error("Not Found."));
  } else {
    res.render("edit-list", { todoList });
  }
});

// Delete todo list
app.post("/lists/:todoListId/destroy", (req, res, next) => {
  let todoListId = req.params.todoListId;
  let todoList = loadTodoList(+todoListId);
  if (!todoList) {   // verify todo list exists
    next(new Error("Not Found."));
  } else {
    let index = todoLists.findIndex(todoList => todoList.id === todoListId);
    todoLists.splice(index, 1);
    req.flash("success", "Todo list deleted."); // success flash message
    res.redirect("/lists"); // redirect back to the main page(list of todo lists)
  }
});

// Edit todo list title
// If title is present and between 1 and 100 characters in length
  // Update todo list and send browser back to list view for the todo list with succes message
// Else redisplay list-view with flash error message
app.post("/lists/:todoListId/edit",
  [
    body("todoListTitle")
      .trim()
      .isLength({ min: 1 })
      .withMessage("The title must be at least 1 character long.")
      .isLength({ max: 100 })
      .withMessage("The title must be between 1 and 100 characters")
      .custom(title => { // custom() method for express-validator
        let duplicate = todoLists.find(list => list.title === title);
        return duplicate === undefined; // return true if no duplicates
      })
      .withMessage("List title must be unique.")
  ],
  (req, res, next) => {
    let todoListId = req.params.todoListId; // First verify that todo list exists.
    let todoList = loadTodoList(+todoListId);
    if (!todoList) {
      next(new Error("Not Found."));
    } else {
      let errors = validationResult(req);
      if (!errors.isEmpty()) {
        errors.array().forEach(message => req.flash("error", message.msg));
        res.render("edit-list", {
          flash: req.flash(),
          todoListTitle: req.body.todoListTitle,
          todoList: todoList
        });
      } else {
        todoList.setTitle(req.body.todoListTitle);
        req.flash("success", "Todo list updated.");
        res.redirect(`/lists/${todoListId}`);
      }
    }
  }
);

// Error handler
app.use((err, req, res, _next) => {
  console.log(err);
  res.status(404).send(err.message);
});

// Listener
app.listen(port, host, () => {
  console.log(`Todos is listening on port ${port} of ${host}!`);
});