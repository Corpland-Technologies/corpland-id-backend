const { OAuth2Client } = require("google-auth-library");
const { config } = require("../core/config");
const { CustomError } = require("./errors");
const { authCodes } = require("../constants/index");
const { userMessages } = require("../files/user/user.messages");

const audiences = [
  config.GOOGLE_CLIENT_ID,
  config.GOOGLE_IOS_CLIENT_ID,
  config.GOOGLE_ANDROID_CLIENT_ID,
].filter(Boolean);

let client;

const getClient = () => {
  if (!client) {
    client = new OAuth2Client({
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      redirectUri: "postmessage",
    });
  }
  return client;
};

const googleAuthFailed = () =>
  new CustomError(
    userMessages.GOOGLE_AUTH_FAILED,
    400,
    undefined,
    authCodes.GOOGLE_AUTH_FAILED
  );

const verifyGoogleCredential = async ({ code, idToken }) => {
  if (!config.GOOGLE_CLIENT_ID) throw googleAuthFailed();

  let token = idToken;

  try {
    if (code) {
      const { tokens } = await getClient().getToken(code);
      token = tokens.id_token;
    }

    if (!token) throw googleAuthFailed();

    const ticket = await getClient().verifyIdToken({
      idToken: token,
      audience: audiences,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email) throw googleAuthFailed();

    return {
      googleId: payload.sub,
      email: payload.email.trim().toLowerCase(),
      emailVerified: payload.email_verified === true,
      name: payload.name || payload.given_name || "",
      picture: payload.picture || "",
    };
  } catch (error) {
    if (error instanceof CustomError) throw error;
    throw googleAuthFailed();
  }
};

module.exports = { verifyGoogleCredential };
