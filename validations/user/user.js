const createUser = {
  name: {
    notEmpty: true,
    errorMessage: "Full name cannot be empty",
  },
  email: {
    notEmpty: true,
    errorMessage: "Email cannot be empty",
    isEmail: {
      errorMessage: "Invalid email address",
    },
  },
  password: {
    notEmpty: true,
    errorMessage: "Password cannot be empty",
  },
};

const googleSignIn = {
  code: {
    optional: true,
    isString: true,
    errorMessage: "Authorization code must be a string",
  },
  idToken: {
    optional: true,
    isString: true,
    errorMessage: "ID token must be a string",
  },
  credential: {
    custom: {
      options: (_, { req }) => {
        const provided = [req.body?.code, req.body?.idToken].filter(Boolean);
        if (provided.length !== 1) {
          throw new Error("Provide exactly one of code or idToken");
        }
        return true;
      },
    },
  },
};

module.exports = { createUser, googleSignIn };
