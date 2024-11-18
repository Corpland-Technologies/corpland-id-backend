const jwt = require("jsonwebtoken");
const { PAGE_LENGTH } = require("../constants/index");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { RedisClient } = require("./redis");

const COUNTRY_CODE = "234";

const tokenHandler = async (payload) => {
  try {
    const token = jwt.sign({ ...payload }, process.env.JWT_SECRET);
    return { token };
  } catch (error) {
    throw new Error("Unable to generate token.");
  }
};

const adminVerifier = (req, res, next) => {
  if (res.locals.jwt.isAdmin) {
    //res.locals.jwt is got from the isAuthenticated middleware
    next();
  } else {
    return res
      .status(401)
      .json({ result: "Unauthorized, Access Denied", status: 401 });
  }
};

const AlphaNumeric = (length, type = "alpha") => {
  var result = "";
  var characters =
    type === "alpha"
      ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
      : "0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const queryConstructor = (query, sortBy, item) => {
  if (Object.values(query).includes("null")) {
    return {
      error: `Param value cannot be null`,
    };
  }

  let params = {};
  let array = Object.keys(query);
  for (let i = 0; i < array.length; i++) {
    if (Object.keys(query)[i] === "id") {
      params["_id"] = mongoose.Types.ObjectId(Object.values(query)[i]);
    } else if (Object.keys(query)[i] === "userId") {
      params[Object.keys(query)[i]] = new mongoose.Types.ObjectId(
        Object.values(query)[i]
      );
    } else {
      params[Object.keys(query)[i]] = Object.values(query)[i];
    }
  }

  let { limit, skip, sort } = params;
  limit = limit ? Number(limit) : PAGE_LENGTH;
  skip = skip ? Number(skip) : 0;

  if (sort === "asc" || sort === "desc") {
    if (typeof sortBy === "object") {
      let first = sortBy[Object.keys(sortBy)[0]];
      let second = sortBy[Object.keys(sortBy)[1]];

      sort =
        sort === "asc"
          ? { [first]: 1, [second]: 1 }
          : { [first]: -1, [second]: -1 };
    } else {
      sort = sort === "asc" ? { [sortBy]: 1 } : { [sortBy]: -1 };
    }
  } else if (sort == undefined) {
    sort = { [sortBy]: 1 };
  } else {
    return {
      error: `Unable to find ${item} might be because of invalid params`,
    };
  }

  const {
    limit: paramLimit,
    skip: paramSkip,
    sort: paramSort,
    ...restOfParams
  } = params;
  return { params: restOfParams, limit, skip, sort };
};

const fileModifier = (req) => {
  let { body, file, files, params } = req;

  let mediaUrl = [];
  let formBody = {};
  if (files) {
    for (let file of files) {
      const { path } = file;
      mediaUrl.push(path);
    }
    formBody = { image: mediaUrl, body, params };
  } else if (file) {
    //if only one image is uploaded
    const { path } = file;
    formBody = { image: path, body, params };
  } else {
    formBody = { body, params };
  }
  return formBody;
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const verifyPassword = async (password, dbpassword) => {
  return bcrypt.compare(password, dbpassword);
};

const verifyPhoneNumber = (phone) => {
  return /^([0]{1}|\+?234)([7-9]{1})([0|1]{1})([\d]{1})([\d]{7})$/g.test(phone);
};

const sanitizePhoneNumber = (phone) => {
  phone = phone.trim();
  if (!verifyPhoneNumber(phone)) {
    return { status: false, message: "Phone number is invalid", phone: "" };
  }
  if (phone.startsWith("0") || phone.startsWith("+")) {
    phone = phone.substring(1);
  }
  if (phone.startsWith(COUNTRY_CODE)) {
    return {
      status: true,
      message: "Phone number is valid",
      phone: "+" + phone,
    };
  }
  return {
    status: true,
    message: "Phone number is valid",
    phone: `+${COUNTRY_CODE}${phone}`,
  };
};

const verifyToken = async (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error("Unable to verify token.");
  }
};

const isAuthenticated = async (req, res, next) => {
  try {
    let authToken = req.headers.authorization;

    if (authToken) {
      authToken = authToken.split(" ")[1];
      const validateToken = await RedisClient.getCache(authToken);

      if (validateToken)
        return res.status(401).json({ message: "Unauthorized." });

      const payload = await verifyToken(authToken);
      if (payload) {
        req.payload = payload;
        res.locals.jwt = payload;
        return next();
      }
    }

    throw new Error("Not Authorized!");
  } catch (error) {
    if (error.message.includes("jwt expired")) {
      error.message = "Token expired, please sign in again";
    }
    return res.status(401).json({ message: error.message });
  }
};

const dateCheck = (initDate, endDate) => {
  const d = new Date();
  const date = new Date(d.setHours(d.getHours() - 2));

  if (initDate < date.toISOString()) {
    return { success: false, message: "Please select a future date" };
  }

  if (endDate && endDate < initDate) {
    return {
      success: false,
      message: "Start date cannot be greater than end date",
    };
  }

  return { success: true, message: "Date verified" };
};

const manageAsyncOps = async (fn) => {
  try {
    const response = await fn;
    return [null, response];
  } catch (error) {
    const err = error;
    return [err, null];
  }
};

const verifyWhoAmI = (user, query) => {
  const { isAdmin } = user;

  if (!isAdmin && Object.keys(query).indexOf("userId") > -1 == false)
    //this is to ensure that if it is not an admin signed in, the userId must be passed in as a query
    return false;
  return true;
};

module.exports = {
  tokenHandler,
  adminVerifier,
  AlphaNumeric,
  queryConstructor,
  fileModifier,
  hashPassword,
  verifyPassword,
  sanitizePhoneNumber,
  verifyToken,
  isAuthenticated,
  dateCheck,
  manageAsyncOps,
  verifyWhoAmI,
};
