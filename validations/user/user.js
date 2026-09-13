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

const sendAnnouncement = {
  subject: { notEmpty: true, errorMessage: "Subject cannot be empty" },
  headline: { notEmpty: true, errorMessage: "Headline cannot be empty" },
  paragraphs: {
    isArray: { options: { min: 1 }, errorMessage: "Provide at least one paragraph" },
  },
  "paragraphs.*": { isString: true, notEmpty: true, errorMessage: "Paragraphs must be text" },
  preheader: { optional: true, isString: true },
  signoff: { optional: true, isString: true },
  "cta.label": { optional: true, isString: true, notEmpty: true },
  "cta.url": { optional: true, isURL: { errorMessage: "CTA url must be a valid URL" } },
  to: { optional: true, isEmail: { errorMessage: "Test recipient must be an email" } },
  audience: {
    optional: true,
    isIn: { options: [["verified", "all"]], errorMessage: "Audience must be verified or all" },
  },
  userIds: { optional: true, isArray: true, errorMessage: "userIds must be an array" },
  "userIds.*": { isMongoId: { errorMessage: "userIds must be Mongo ids" } },
};

const sendVentureInvite = {
  to: { notEmpty: true, isEmail: { errorMessage: "Recipient must be an email" } },
  ventureName: { notEmpty: true, errorMessage: "Venture name cannot be empty" },
  inviterName: { optional: true, isString: true },
  roleLabel: { notEmpty: true, errorMessage: "Role cannot be empty" },
  // require_tld is off so a local FRONTEND_URL such as http://localhost:3000
  // passes. The url is built server side by the marketplace backend from
  // config.FRONTEND_URL and this route is behind requireInternalKey, so it is
  // never attacker supplied.
  acceptUrl: {
    isURL: {
      options: { require_tld: false },
      errorMessage: "Accept url must be a valid URL",
    },
  },
  expiresInDays: { optional: true, isInt: { options: { min: 1, max: 60 } } },
};

module.exports = { createUser, googleSignIn, sendAnnouncement, sendVentureInvite };
