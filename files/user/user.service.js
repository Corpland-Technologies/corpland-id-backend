const mongoose = require("mongoose");
const { UserRepository } = require("./user.repository");
const {
  hashPassword,
  verifyPassword,
  tokenHandler,
  queryConstructor,
  AlphaNumeric,
} = require("../../utils/index");
const { userMessages } = require("./user.messages");
const { FORBIDDEN } = require("../../constants/statusCode");
const { sendMailNotification } = require("../../utils/email");
const { AuthMessages } = require("../auth/auth.messages");
const { User } = require("./user.model");
const { AuthService } = require("../auth/auth.service");
const { RedisClient } = require("../../utils/redis");

class UserService {
  static async userSignUpService(body) {
    const user = await UserRepository.fetchUser({
      $or: [{ email: body.email }, { phoneNumber: body.phoneNumber }],
    });

    if (user) {
      return { SUCCESS: false, msg: userMessages.USER_EXISTS };
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
      return { SUCCESS: false, msg: userMessages.USER_NOT_CREATED };
    }

    const token = await tokenHandler({
      name: signUp.name,
      email: signUp.email,
      _id: signUp._id,
    });
    signUp.password = undefined;

    return {
      SUCCESS: true,
      msg: userMessages.USER_CREATED,
      data: { signUp, ...token },
    };
  }

  static async userLoginService(body) {
    const user = await UserRepository.fetchUser({
      email: body.email,
    });

    if (!user) {
      return {
        SUCCESS: false,
        msg: AuthMessages.LOGIN_ERROR,
      };
    }

    //confirm if user has been deleted
    if (user.isDelete) return { success: false, msg: userMessages.SOFTDELETE };

    const passwordCheck = await verifyPassword(body.password, user.password);

    if (!passwordCheck) {
      return { SUCCESS: false, msg: userMessages.LOGIN_ERROR };
    }

    const token = await tokenHandler({
      name: user.name,
      email: user.email,
      _id: user._id,
    });
    user.password = undefined;
    return {
      SUCCESS: true,
      msg: userMessages.USER_FOUND,
      data: { user, ...token },
    };
  }

  static async getUserService(userPayload, select) {
    const { error, params, limit, skip, sort } = queryConstructor(
      userPayload,
      "createdAt",
      "User"
    );
    if (error) return { success: false, msg: error };

    const getUser = await UserRepository.findUserParams({
      ...params,
      select,
      limit,
      skip,
      sort,
    });

    const count = getUser.length;

    if (getUser.length < 1)
      return { SUCCESS: false, msg: userMessages.USER_NOT_FOUND };

    return {
      SUCCESS: true,
      msg: userMessages.USER_FOUND,
      data: getUser,
      count,
    };
  }

  static async updateUserService(data) {
    const { body, params } = data;

    // if (data.payload.isDelete) return { SUCCESS: false, msg: userMessages.SOFTDELETE }

    const user = await UserRepository.updateUserById(
      { _id: new mongoose.Types.ObjectId(params.id) },
      { $set: { ...body } }
    );

    if (!user) {
      return {
        SUCCESS: false,
        msg: userMessages.UPDATE_PROFILE_FAILURE,
      };
    } else {
      return {
        SUCCESS: true,
        msg: userMessages.UPDATE_PROFILE_SUCCESS,
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

    if (!user) return { success: false, msg: AuthMessages.USER_NOT_FOUND };

    const prevPasswordCheck = await verifyPassword(prevPassword, user.password);
    console.log("prev", prevPassword);
    if (!prevPasswordCheck)
      return { success: false, msg: AuthMessages.INCORRECT_PASSWORD };

    if (body.password !== body.confirmPassword) {
      return {
        SUCCESS: false,
        msg: "Passwords mismatch",
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
        msg: AuthMessages.PASSWORD_RESET_SUCCESS,
      };
    } else {
      return {
        SUCCESS: false,
        msg: AuthMessages.PASSWORD_RESET_FAILURE,
      };
    }
  }

  static async uploadImageService(data, payload) {
    const { image } = data;

    const user = await UserRepository.updateUserById(payload._id, { image });
    if (!user) return { success: false, msg: userMessages.UPDATE_ERROR };
    return { success: true, msg: userMessages.UPDATE_SUCCESS };
  }

  static async getLoggedInUser(userPayload) {
    const { _id } = userPayload;

    const getUser = await UserRepository.fetchUser({
      _id: new mongoose.Types.ObjectId(_id),
    });
    getUser.password = undefined;
    if (!getUser) return { SUCCESS: false, msg: userMessages.USER_NOT_FOUND };

    return { SUCCESS: true, msg: userMessages.USER_FOUND, data: getUser };
  }

  static async deleteUserService(data) {
    const { params } = data;

    const deleteUser = await UserRepository.updateUserById(params.id, {
      isDelete: true,
    });

    if (!deleteUser)
      return { SUCCESS: false, msg: userMessages.UPDATE_PROFILE_FAILURE };

    return {
      SUCCESS: true,
      msg: userMessages.UPDATE_PROFILE_SUCCESS,
      deleteUser,
    };
  }

  static async searchUser(query) {
    const { error, params, limit, skip, sort } = queryConstructor(
      query,
      "createdAt",
      "User"
    );

    if (error) return { success: false, msg: error };

    const userData = await UserRepository.search({
      ...params,
      limit,
      skip,
      sort,
    });

    if (userData.length < 1)
      return { SUCCESS: false, msg: userMessages.USER_NOT_FOUND, data: [] };

    return { SUCCESS: true, msg: userMessages.USER_FOUND, data: userData };
  }

  static async verifyEmail(payload) {
    const { email, otp } = payload;

    // Verify OTP
    const verifyOtp = await AuthService.verifyOtp({ otp, userDetail: email });

    if (!verifyOtp.success) {
      return { SUCCESS: false, msg: userMessages.VERIFIED_EMAIL_FAILURE };
    }

    // Update user verification status
    const user = await UserRepository.updateUserDetails(
      { email },
      { emailVerified: true }
    );

    if (!user) {
      return { SUCCESS: false, msg: userMessages.USER_NOT_FOUND };
    }

    // Clear the OTP from Redis after successful verification
    await RedisClient.deleteCache(`OTP:${email}`);

    return { SUCCESS: true, msg: userMessages.VERIFIED_EMAIL };
  }
}

module.exports = { UserService };
