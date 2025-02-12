const { handleApplicationErrors, notFound } = require("./response");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const emailValidation = require("./emailCheck");
const routes = require("./routes");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const app = express();

const application = () => {
  app.use(bodyParser.json());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(helmet());
  app.use(compression());
  app.use(cors());
  app.use(emailValidation);
  app.use(cookieParser());

  app.get("/", (req, res) => {
    res.status(200).json({ message: "App working fine. Welcome" });
  });

  routes(app);

  app.use(handleApplicationErrors); //application errors handler
  app.use(notFound);
};

module.exports = { app, application };
