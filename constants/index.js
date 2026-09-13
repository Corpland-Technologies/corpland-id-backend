module.exports = {
  PAGE_LENGTH: 100,
  LIMIT: 50,
  SKIP: 0,
  SORT: "asc",
  DUPLICATE_KEY_CODE: 11000,
  DEFAULT_USER_IMAGE:
    "https://res.cloudinary.com/drwzb6vqn/image/upload/v1728840516/corpland/e5djtacomvpbubqwxhdy.png",
  announcementAudiences: {
    VERIFIED: "verified",
    ALL: "all",
  },
  authProviders: {
    LOCAL: "local",
    GOOGLE: "google",
  },
  authCodes: {
    USE_GOOGLE_SIGN_IN: "USE_GOOGLE_SIGN_IN",
    GOOGLE_AUTH_FAILED: "GOOGLE_AUTH_FAILED",
    GOOGLE_EMAIL_UNVERIFIED: "GOOGLE_EMAIL_UNVERIFIED",
    ACCOUNT_CREATE_FAILED: "ACCOUNT_CREATE_FAILED",
    PASSWORD_NOT_SET: "PASSWORD_NOT_SET",
  },
  signUpCodes: {
    EMAIL_IN_USE: "EMAIL_IN_USE",
    EMAIL_UNVERIFIED_EXISTS: "EMAIL_UNVERIFIED_EXISTS",
    ACCOUNT_DELETED: "ACCOUNT_DELETED",
  },
  signUpSteps: {
    VERIFY_EMAIL: "VERIFY_EMAIL",
    COMPLETE_PROFILE: "COMPLETE_PROFILE",
  },
}
