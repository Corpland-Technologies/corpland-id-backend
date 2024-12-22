const { default: mongoose } = require("mongoose");
const { SessionRepository } = require("./session.repository");
const { queryConstructor, verifyToken, tokenHandler } = require("../../utils");
const { SessionMessages } = require("./session.messages");
const { config } = require("../../core/config");
const jwt = require("jsonwebtoken");

class SessionService {
  static async createSession(payload) {
    try {
      const session = await SessionRepository.create({
        ...payload.body,
      });

      if (!session) {
        return { success: false, message: SessionMessages.DEVICE_FAILURE };
      }

      return {
        success: true,
        message: SessionMessages.DEVICE_SUCCESS,
        session,
      };
    } catch (error) {
      console.log("error", error);
      return {
        success: false,
        message: "An error occurred while creating the session.",
      };
    }
  }

  static async getAllSessions() {
    const sessions = await SessionRepository.fetchAllSessions();
    return {
      success: true,
      message: SessionMessages.FETCH_SUCCESS,
      data: sessions,
      count: sessions.length,
    };
  }

  static async getSession(payload) {
    let { error, params, limit, skip, sort } = queryConstructor(
      payload,
      "createdAt",
      "Session"
    );
    if (error) return { success: false, message: error };

    const sessions = await SessionRepository.fetchSessionByParams({
      ...params,
      isDelete: false,
      limit,
      skip,
      sort,
    });

    if (!sessions.length)
      return {
        success: true,
        message: SessionMessages.DEVICE_NOT_FOUND,
        data: [],
      };

    return {
      success: true,
      message: SessionMessages.FETCH_SUCCESS,
      data: sessions,
      count: sessions.length,
    };
  }

  static async updateSession(params, payload) {
    let session = await SessionRepository.updateSession(
      {
        _id: new mongoose.Types.ObjectId(params),
      },
      { ...payload }
    );

    if (!session)
      return { success: false, message: SessionMessages.UPDATE_ERROR };

    return {
      success: true,
      message: SessionMessages.UPDATE,
    };
  }

  static async revokeSession(payload) {
    const session = await SessionRepository.deleteSession({
      refreshToken: payload.token,
    });

    if (!session)
      return { success: false, message: SessionMessages.DELETE_ERROR };

    return {
      success: true,
      message: SessionMessages.DELETE,
    };
  }

  static async revokeAllSessions(id) {
    const session = await SessionRepository.deleteAllSession({
      userId: new mongoose.Types.ObjectId(id),
    });

    if (!session)
      return { success: false, message: SessionMessages.DELETE_ERROR };

    return {
      success: true,
      message: SessionMessages.DELETE,
    };
  }
  static async refreshToken(payload) {
    const { refreshToken } = payload.cookies;

    if (!refreshToken)
      return { success: false, message: SessionMessages.REQUIRED };

    const storedToken = await SessionRepository.fetchOne({
      token: refreshToken,
    });

    if (!storedToken || storedToken.isDelete)
      return { success: false, message: SessionMessages.INVALID };

    return new Promise((resolve) => {
      jwt.verify(refreshToken, config.JWT_REFRESH_SECRET, async (err, user) => {
        if (err)
          return resolve({ success: false, message: SessionMessages.INVALID });

        const newAccessToken = await tokenHandler.access({
          name: user.name,
          email: user.email,
          _id: user._id,
        });

        return resolve({
          success: true,
          message: SessionMessages.FETCH_SUCCESS,
          token: newAccessToken,
        });
      });
    });
  }
}

module.exports = { SessionService };
