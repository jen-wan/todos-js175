/* eslint-disable max-lines-per-function */
const express = require("express");
const morgan = require("morgan");
const flash = require("express-flash");
const session = require("express-session");
const { body, validationResult } = require("express-validator");
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

// Extract session info so that flash messages before redirect are available
// for use in views rendered by res.render.
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
  (req, res) => { // Defines the error handler function that is executed when "/lists" route is accessed with Post request.
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

// Listener
app.listen(port, host, () => {
  console.log(`Todos is listening on port ${port} of ${host}!`);
});