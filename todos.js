const express = require("express");
const morgan = require("morgan");

const app = express(); // create the Express application object, app
const host = "localhost";
const port = 3000;

// Static data for initial testing
let todoLists = require("./lib/seed-data");

app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));
app.use(express.static("public")); // tells Express to find static assets in public directory

app.get("/", (req, res) => { // primary route for application
  res.render("lists", { todoLists });
});

// Listener
app.listen(port, host, () => {
  console.log(`Todos is listening on port ${port} of ${host}!`);
});