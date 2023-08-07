const express = require("express");
const morgan = require("morgan");

const app = express(); // create the Express application object, app
const host = "localhost";
const port = 3000;

app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));

app.get("/", (req, res) => { // primary route for application
  res.render("lists");
});

// Listener
app.listen(port, host, () => {
  console.log(`Todos is listening on port ${port} of ${host}!`);
});