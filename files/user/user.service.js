const mongoose = require("mongoose");
const { UserRepository } = require("./user.repository");
const {
  hashPassword,
  verifyPassword,
  tokenHandler,
  queryConstructor,
} = require("../../utils/index");
const { userMessages } = require("./user.messages");
const { sendMailNotification } = require("../../utils/email");
const { AuthMessages } = require("../auth/auth.messages");
const { AuthService } = require("../auth/auth.service");
const { RedisClient } = require("../../utils/redis");
const { SessionService } = require("../session/session.service");

class UserService {
  static async userSignUpService(body, res) {
    const user = await UserRepository.fetchUser({
      email: body.email,
    });

    if (user) {
      if (user.isDelete) {
        return { SUCCESS: false, message: userMessages.SOFTDELETE };
      }
      return { SUCCESS: false, message: userMessages.USER_EXISTS };
    }

    const password = await hashPassword(body.password);
    const signUp = await UserRepository.create({ ...body, password });

    // Send verification OTP
    const sendOtp = await AuthService.sendOtp({
      type: "email",
      userDetail: body.email,
      template: "VERIFICATION",
      name: body.name,
    });

    if (!sendOtp.success) {
      return { SUCCESS: false, message: userMessages.USER_NOT_CREATED };
    }

    const accessToken = await tokenHandler.access({
      name: signUp.name,
      email: signUp.email,
      _id: signUp._id,
    });

    const refreshToken = await tokenHandler.refreshToken({
      name: signUp.name,
      email: signUp.email,
      _id: signUp._id,
    });

    await SessionService.createSession({
      body: {
        token: refreshToken,
        userId: signUp._id,
      },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    });

    signUp.password = undefined;

    return {
      SUCCESS: true,
      message: userMessages.USER_CREATED,
      data: { user: signUp, token: accessToken },
    };
  }

  static async userLoginService(body, res) {
    const user = await UserRepository.fetchUser({
      email: body.email,
    });

    if (!user) {
      return {
        SUCCESS: false,
        message: userMessages.LOGIN_ERROR,
      };
    }

    // Confirm if user has been deleted
    if (user.isDelete) {
      return { SUCCESS: false, message: userMessages.SOFTDELETE };
    }

    const passwordCheck = await verifyPassword(body.password, user.password);

    if (!passwordCheck) {
      return { SUCCESS: false, message: userMessages.LOGIN_ERROR };
    }

    // Generate tokens after successful login
    const accessToken = await tokenHandler.access({
      name: user.name,
      email: user.email,
      _id: user._id,
    });

    const refreshToken = await tokenHandler.refreshToken({
      name: user.name,
      email: user.email,
      _id: user._id,
    });

    await SessionService.createSession({
      body: {
        token: refreshToken,
        userId: user._id,
      },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    });

    user.password = undefined;
    return {
      SUCCESS: true,
      message: userMessages.USER_FOUND,
      data: { user, token: accessToken },
    };
  }

  static async getUserService(userPayload, select) {
    const { error, params, limit, skip, sort } = queryConstructor(
      userPayload,
      "createdAt",
      "User"
    );
    if (error) return { SUCCESS: false, message: error };

    const getUser = await UserRepository.findUserParams({
      ...params,
      select,
      limit,
      skip,
      sort,
    });

    const count = getUser.length;

    if (getUser.length < 1)
      return { SUCCESS: false, message: userMessages.USER_NOT_FOUND };

    return {
      SUCCESS: true,
      message: userMessages.USER_FOUND,
      data: getUser,
      count,
    };
  }

  static async updateUserService(data) {
    const { body, params } = data;

    // if (data.payload.isDelete) return { SUCCESS: false, message: userMessages.SOFTDELETE }

    const user = await UserRepository.updateUserById(
      { _id: new mongoose.Types.ObjectId(params.id) },
      { $set: { ...body } }
    );

    if (!user) {
      return {
        SUCCESS: false,
        message: userMessages.UPDATE_PROFILE_FAILURE,
      };
    } else {
      return {
        SUCCESS: true,
        message: userMessages.UPDATE_PROFILE_SUCCESS,
        user,
      };
    }
  }

  static async changePassword(body) {
    //change password within the app when user knows his previous password
    const { prevPassword } = body;

    const user = await UserRepository.fetchUser({
      _id: new mongoose.Types.ObjectId(body.id),
    });

    if (!user) return { SUCCESS: false, message: AuthMessages.USER_NOT_FOUND };

    const prevPasswordCheck = await verifyPassword(prevPassword, user.password);
    console.log("prev", prevPassword);
    if (!prevPasswordCheck)
      return { SUCCESS: false, message: AuthMessages.INCORRECT_PASSWORD };

    if (body.password !== body.confirmPassword) {
      return {
        SUCCESS: false,
        message: "Passwords mismatch",
      };
    }

    let password = await hashPassword(body.password);

    const changePassword = await UserRepository.updateUserDetails(
      { _id: new mongoose.Types.ObjectId(body.id) },
      {
        password,
      }
    );
    console.log("pass", password);

    if (changePassword) {
      return {
        SUCCESS: true,
        message: AuthMessages.PASSWORD_RESET_SUCCESS,
      };
    } else {
      return {
        SUCCESS: false,
        message: AuthMessages.PASSWORD_RESET_FAILURE,
      };
    }
  }

  static async uploadImageService(data, payload) {
    const { image } = data;

    const user = await UserRepository.updateUserById(payload._id, { image });
    if (!user) return { SUCCESS: false, message: userMessages.UPDATE_ERROR };
    return { SUCCESS: true, message: userMessages.UPDATE_SUCCESS };
  }

  static async getLoggedInUser(userPayload) {
    const { _id } = userPayload;

    const getUser = await UserRepository.fetchUser({
      _id: new mongoose.Types.ObjectId(_id),
    });
    getUser.password = undefined;
    if (!getUser)
      return { SUCCESS: false, message: userMessages.USER_NOT_FOUND };

    return { SUCCESS: true, message: userMessages.USER_FOUND, data: getUser };
  }

  static async deleteUserService(data) {
    const { params } = data;

    const deleteUser = await UserRepository.updateUserById(params.id, {
      isDelete: true,
    });

    if (!deleteUser)
      return { SUCCESS: false, message: userMessages.UPDATE_PROFILE_FAILURE };

    return {
      SUCCESS: true,
      message: userMessages.UPDATE_PROFILE_SUCCESS,
      deleteUser,
    };
  }

  static async searchUser(query) {
    const { error, params, limit, skip, sort } = queryConstructor(
      query,
      "createdAt",
      "User"
    );

    if (error) return { SUCCESS: false, message: error };

    const userData = await UserRepository.search({
      ...params,
      limit,
      skip,
      sort,
    });

    if (userData.length < 1)
      return { SUCCESS: false, message: userMessages.USER_NOT_FOUND, data: [] };

    return { SUCCESS: true, message: userMessages.USER_FOUND, data: userData };
  }

  static async verifyEmail(payload) {
    const { email, otp } = payload;

    // Verify OTP
    const verifyOtp = await AuthService.verifyOtp({ otp, userDetail: email });

    if (!verifyOtp.success) {
      return { SUCCESS: false, message: userMessages.VERIFIED_EMAIL_FAILURE };
    }

    // Update user verification status
    const user = await UserRepository.updateUserDetails(
      { email },
      { emailVerified: true }
    );

    if (!user) {
      return { SUCCESS: false, message: userMessages.USER_NOT_FOUND };
    }

    // Clear the OTP from Redis after successful verification
    await RedisClient.deleteCache(`OTP:${email}`);

    return { SUCCESS: true, message: userMessages.VERIFIED_EMAIL };
  }

  static async forgotPasswordService(body) {
    const { email } = body;

    const user = await UserRepository.fetchUser({ email });

    if (!user) {
      return { SUCCESS: false, message: userMessages.USER_NOT_FOUND };
    }

    // Send verification OTP
    const sendOtp = await AuthService.sendOtp({
      type: "email",
      userDetail: email,
      template: "RESET_PASSWORD",
      name: user.name,
    });

    if (!sendOtp.success) {
      return { SUCCESS: false, message: userMessages.OTP_SEND_FAILED };
    }

    return { SUCCESS: true, message: userMessages.OTP_SENT };
  }

  static async verifyResetCodeService(body) {
    const { email, resetCode } = body;

    const verifyOtp = await AuthService.verifyOtp({
      otp: resetCode,
      userDetail: email,
    });

    if (!verifyOtp.success) {
      return { SUCCESS: false, message: userMessages.INVALID_OTP };
    }

    return { SUCCESS: true, message: userMessages.OTP_VERIFIED };
  }

  static async resetPasswordService(body) {
    const { email, newPassword } = body;
    console.log("body", body);
    console.log("email", email);
    console.log("newPassword", newPassword);

    const user = await UserRepository.fetchUser({ email });

    if (!user) {
      return { SUCCESS: false, message: userMessages.USER_NOT_FOUND };
    }

    const password = await hashPassword(newPassword);

    const updatePassword = await UserRepository.updateUserDetails(
      { email },
      { password }
    );

    if (!updatePassword) {
      return { SUCCESS: false, message: userMessages.PASSWORD_RESET_FAILED };
    }

    // Clear the OTP from Redis after successful password reset
    await RedisClient.deleteCache(`OTP:${email}`);

    return { SUCCESS: true, message: userMessages.PASSWORD_RESET_SUCCESS };
  }

  static async getAllUsersService(query = {}) {
    const { error, params, limit, skip, sort } = queryConstructor(
      query,
      "createdAt",
      "User"
    );
    if (error) return { SUCCESS: false, message: error };

    const users = await UserRepository.findUserParams({
      ...params,
      limit,
      skip,
      sort,
    });

    const count = users.length;

    if (users.length < 1)
      return { SUCCESS: false, message: userMessages.USER_NOT_FOUND };

    // Remove password from each user object
    const sanitizedUsers = users.map((user) => {
      const userObj = user.toObject();
      delete userObj.password;
      return userObj;
    });

    return {
      SUCCESS: true,
      message: userMessages.USERS_FETCHED,
      data: sanitizedUsers,
      count,
    };
  }

  static async requestAccountDeletion(body, userPayload) {
    const user = await UserRepository.fetchUser({
      _id: new mongoose.Types.ObjectId(userPayload._id),
    });

    if (!user) return { SUCCESS: false, message: userMessages.USER_NOT_FOUND };

    // Mark the user as deleted
    const deleteUser = await UserRepository.updateUserById(user._id, {
      isDelete: true,
    });

    if (!deleteUser) {
      return { SUCCESS: false, message: userMessages.UPDATE_PROFILE_FAILURE };
    }

    await sendMailNotification(
      user.email,
      `Account Deletion Status`,
      { name: user.name },
      "ACCOUNT_DELETION"
    );
    return {
      SUCCESS: true,
      message: userMessages.UPDATE_PROFILE_SUCCESS,
    };
  }

  static async sendSingleEmailNotification(params, body) {
    const user = await UserRepository.fetchUser({
      _id: new mongoose.Types.ObjectId(params.id),
    });

    if (!user) return { SUCCESS: false, message: userMessages.USER_NOT_FOUND };

    const emailNotification = await sendMailNotification(
      user.email,
      body.subject,
      { name: user.name, body: body.body },
      "NOTIFICATION"
    );

    if (!emailNotification)
      return { SUCCESS: false, message: userMessages.EMAIL_FAILURE };

    return {
      SUCCESS: true,
      message: userMessages.EMAIL_SUCCESS,
    };
  }

  static async sendBulkEmailNotification(body) {
    const users = await UserRepository.fetchAll();

    if (!users)
      return { SUCCESS: false, message: userMessages.USERS_FETCH_FAILURE };

    for (const user of users) {
      await sendMailNotification(
        user.email,
        body.subject,
        { name: user.name, body: body.body },
        "NOTIFICATION"
      );
    }

    return {
      SUCCESS: true,
      message: userMessages.EMAIL_SUCCESS,
    };
  }
}

module.exports = { UserService };
