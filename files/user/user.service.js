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
const { DuplicateError, CustomError } = require("../../utils/errors");
const { verifyGoogleCredential } = require("../../utils/google");
const {
  DUPLICATE_KEY_CODE,
  DEFAULT_USER_IMAGE,
  authCodes,
  authProviders,
  signUpCodes,
  signUpSteps,
  announcementAudiences,
} = require("../../constants/index");

class UserService {
  static async establishSession(user, res) {
    const payload = {
      name: user.name,
      email: user.email,
      _id: user._id,
    };

    const accessToken = await tokenHandler.access(payload);
    const refreshToken = await tokenHandler.refreshToken(payload);

    await SessionService.createSession({
      body: {
        token: refreshToken,
        userId: user._id,
      },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    return accessToken;
  }

  static requirePassword(user) {
    if (user.password) return;

    if (user.googleId) {
      throw new CustomError(
        userMessages.USE_GOOGLE_SIGN_IN,
        400,
        { authProvider: user.authProvider },
        authCodes.USE_GOOGLE_SIGN_IN
      );
    }

    throw new CustomError(
      userMessages.PASSWORD_NOT_SET,
      400,
      { authProvider: user.authProvider },
      authCodes.PASSWORD_NOT_SET
    );
  }

  static signInStamp(provider) {
    return {
      lastSignInProvider: provider,
      lastSignInAt: new Date(),
    };
  }

  static async recordSignIn(user, provider) {
    const updated = await UserRepository.updateUserById(
      { _id: user._id },
      {
        $addToSet: { providers: provider },
        $set: this.signInStamp(provider),
      }
    );

    return updated || user;
  }

  static duplicateKeyField(error) {
    return Object.keys(error?.keyPattern || {})[0];
  }

  static assertRaceableDuplicate(error, raceableFields) {
    if (error?.code !== DUPLICATE_KEY_CODE) throw error;

    const field = this.duplicateKeyField(error);

    if (field && !raceableFields.includes(field)) {
      throw new CustomError(
        userMessages.USER_NOT_CREATED,
        400,
        { field },
        authCodes.ACCOUNT_CREATE_FAILED
      );
    }
  }

  static async resumeSignUpService(user, body, res) {
    this.requirePassword(user);

    const passwordCheck = await verifyPassword(body.password, user.password);

    if (!passwordCheck) {
      throw new DuplicateError(
        user.emailVerified
          ? userMessages.EMAIL_IN_USE
          : userMessages.EMAIL_UNVERIFIED_EXISTS,
        409,
        { emailVerified: user.emailVerified },
        user.emailVerified
          ? signUpCodes.EMAIL_IN_USE
          : signUpCodes.EMAIL_UNVERIFIED_EXISTS,
      );
    }

    let otpSent = false;

    if (!user.emailVerified) {
      const issuedOtp = await AuthService.issueOtp({
        type: "email",
        userDetail: user.email,
        template: "VERIFICATION",
        name: user.name,
      });

      otpSent = issuedOtp.otpSent;
    }

    user = await this.recordSignIn(user, authProviders.LOCAL);

    const accessToken = await this.establishSession(user, res);

    user.password = undefined;

    return {
      SUCCESS: true,
      message: user.emailVerified
        ? userMessages.USER_FOUND
        : userMessages.USER_CREATED,
      data: {
        user,
        token: accessToken,
        nextStep: user.emailVerified
          ? signUpSteps.COMPLETE_PROFILE
          : signUpSteps.VERIFY_EMAIL,
        otpSent,
        resumed: true,
      },
    };
  }

  static async userSignUpService(body, res) {
    const existingUser = await UserRepository.fetchAnyUser({
      email: body.email,
    });

    if (existingUser) {
      if (existingUser.isDelete) {
        throw new DuplicateError(
          userMessages.SOFTDELETE,
          409,
          undefined,
          signUpCodes.ACCOUNT_DELETED,
        );
      }

      return this.resumeSignUpService(existingUser, body, res);
    }

    const password = await hashPassword(body.password);

    let signUp;

    try {
      signUp = await UserRepository.create({
        ...body,
        password,
        providers: [authProviders.LOCAL],
        ...this.signInStamp(authProviders.LOCAL),
      });
    } catch (error) {
      this.assertRaceableDuplicate(error, ["email"]);

      const raced = await UserRepository.fetchAnyUser({ email: body.email });

      if (!raced || raced.isDelete) {
        throw new DuplicateError(
          userMessages.EMAIL_IN_USE,
          409,
          undefined,
          signUpCodes.EMAIL_IN_USE,
        );
      }

      return this.resumeSignUpService(raced, body, res);
    }

    const issuedOtp = await AuthService.issueOtp({
      type: "email",
      userDetail: signUp.email,
      template: "VERIFICATION",
      name: signUp.name,
    });

    const accessToken = await this.establishSession(signUp, res);

    signUp.password = undefined;

    return {
      SUCCESS: true,
      message: userMessages.USER_CREATED,
      data: {
        user: signUp,
        token: accessToken,
        nextStep: signUpSteps.VERIFY_EMAIL,
        otpSent: issuedOtp.otpSent,
        resumed: false,
      },
    };
  }

  static async linkGoogleAccount(user, profile) {
    const set = {
      googleId: profile.googleId,
      emailVerified: true,
      ...this.signInStamp(authProviders.GOOGLE),
    };
    const update = { $set: set, $addToSet: { providers: authProviders.GOOGLE } };

    if (profile.picture && (!user.image || user.image === DEFAULT_USER_IMAGE)) {
      set.image = profile.picture;
    }

    if (!user.name && profile.name) set.name = profile.name;

    if (!user.emailVerified && user.password) {
      set.authProvider = authProviders.GOOGLE;
      update.$unset = { password: 1 };
    }

    return UserRepository.updateUserById({ _id: user._id }, update);
  }

  static async createGoogleAccount(profile) {
    const payload = {
      name: profile.name,
      email: profile.email,
      googleId: profile.googleId,
      authProvider: authProviders.GOOGLE,
      providers: [authProviders.GOOGLE],
      ...this.signInStamp(authProviders.GOOGLE),
      emailVerified: true,
      termsAndConditions: true,
    };

    if (profile.picture) payload.image = profile.picture;

    try {
      return await UserRepository.create(payload);
    } catch (error) {
      this.assertRaceableDuplicate(error, ["email", "googleId"]);

      const raced =
        (await UserRepository.fetchByGoogleId(profile.googleId)) ||
        (await UserRepository.fetchAnyUser({ email: profile.email }));

      if (!raced || raced.isDelete) {
        throw new DuplicateError(
          userMessages.EMAIL_IN_USE,
          409,
          undefined,
          signUpCodes.EMAIL_IN_USE
        );
      }

      return raced.googleId ? raced : this.linkGoogleAccount(raced, profile);
    }
  }

  static async googleSignInService(body, res) {
    const profile = await verifyGoogleCredential(body);

    if (!profile.emailVerified) {
      throw new CustomError(
        userMessages.GOOGLE_EMAIL_UNVERIFIED,
        400,
        undefined,
        authCodes.GOOGLE_EMAIL_UNVERIFIED
      );
    }

    const existingUser =
      (await UserRepository.fetchByGoogleId(profile.googleId)) ||
      (await UserRepository.fetchAnyUser({ email: profile.email }));

    if (existingUser?.isDelete) {
      throw new DuplicateError(
        userMessages.SOFTDELETE,
        409,
        undefined,
        signUpCodes.ACCOUNT_DELETED
      );
    }

    const isNewUser = !existingUser;

    let user;

    if (isNewUser) {
      user = await this.createGoogleAccount(profile);
    } else if (existingUser.googleId) {
      user = await this.recordSignIn(existingUser, authProviders.GOOGLE);
    } else {
      user = await this.linkGoogleAccount(existingUser, profile);
    }

    const accessToken = await this.establishSession(user, res);

    user.password = undefined;

    return {
      SUCCESS: true,
      message: isNewUser
        ? userMessages.GOOGLE_ACCOUNT_CREATED
        : userMessages.GOOGLE_SIGN_IN_SUCCESS,
      data: {
        user,
        token: accessToken,
        nextStep: signUpSteps.COMPLETE_PROFILE,
        otpSent: false,
        resumed: !isNewUser,
        isNewUser,
      },
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

    this.requirePassword(user);

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
      maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years in milliseconds haha
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    const signedInUser = await this.recordSignIn(user, authProviders.LOCAL);

    signedInUser.password = undefined;
    return {
      SUCCESS: true,
      message: userMessages.USER_FOUND,
      data: { user: signedInUser, token: accessToken },
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
        message: userMessages.DELETION_FAILURE,
      };
    } else {
      return {
        SUCCESS: true,
        message: userMessages.DELETION_SUCCESS,
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
      return { SUCCESS: false, message: userMessages.DELETION_FAILURE };

    return {
      SUCCESS: true,
      message: userMessages.DELETION_SUCCESS,
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

    const user = await UserRepository.fetchUser({ email });

    if (!user) {
      return { SUCCESS: false, message: userMessages.USER_NOT_FOUND };
    }

    const password = await hashPassword(newPassword);

    const updatePassword = await UserRepository.updateUserById(
      { email },
      { $set: { password }, $addToSet: { providers: authProviders.LOCAL } }
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
      return { SUCCESS: false, message: userMessages.DELETION_FAILURE };
    }

    await sendMailNotification(
      user.email,
      "Your Corpland ID has been deleted",
      { name: user.name },
      "ACCOUNT_DELETION"
    );
    return {
      SUCCESS: true,
      message: userMessages.DELETION_SUCCESS,
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
      this.notificationParams(body, user),
      "NOTIFICATION"
    );

    if (!emailNotification)
      return { SUCCESS: false, message: userMessages.EMAIL_FAILURE };

    return {
      SUCCESS: true,
      message: userMessages.EMAIL_SUCCESS,
    };
  }

  static firstName(name) {
    return String(name || "").trim().split(/\s+/)[0] || "there";
  }

  static notificationParams(body, user) {
    const paragraphs = String(body.body || "")
      .split(/\n\s*\n|\r?\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    return {
      name: user?.name,
      headline: body.headline || body.subject,
      preheader: body.preheader || paragraphs[0] || "",
      paragraphs,
      cta: body.cta,
    };
  }

  static announcementParams(body, user) {
    return {
      subject: body.subject,
      preheader: body.preheader || "",
      headline: body.headline,
      name: user?.name,
      paragraphs: body.paragraphs,
      cta: body.cta,
      signoff: body.signoff,
    };
  }

  static async deliverAnnouncement(users, body) {
    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await sendMailNotification(
          user.email,
          body.subject,
          this.announcementParams(body, user),
          "ANNOUNCEMENT"
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error(`announcement failed for ${user._id}:`, error.message);
      }
    }

    console.log(`announcement complete: sent ${sent}, failed ${failed}`);

    return { sent, failed };
  }

  static async sendVentureInvite(body) {
    const expiresInDays = Number(body.expiresInDays) || 7;
    const inviterName = body.inviterName || "A teammate";

    await sendMailNotification(
      body.to,
      `${inviterName} invited you to ${body.ventureName} on Corpland`,
      {
        ventureName: body.ventureName,
        inviterName,
        roleLabel: body.roleLabel,
        acceptUrl: body.acceptUrl,
        expiresInDays,
        rows: [
          { label: "Venture", value: body.ventureName },
          { label: "Your role", value: body.roleLabel },
          { label: "Invited address", value: body.to },
        ],
      },
      "INVITE"
    );

    return {
      SUCCESS: true,
      message: userMessages.INVITE_SENT,
      data: { sent: 1, to: body.to },
    };
  }

  static async sendAnnouncement(body) {
    if (body.to) {
      const user = await UserRepository.fetchAnyUser({ email: body.to });

      await sendMailNotification(
        body.to,
        body.subject,
        this.announcementParams(body, user),
        "ANNOUNCEMENT"
      );

      return {
        SUCCESS: true,
        message: userMessages.ANNOUNCEMENT_SENT,
        data: { sent: 1, to: body.to },
      };
    }

    const query = { isDelete: false, email: { $exists: true, $ne: "" } };

    if (Array.isArray(body.userIds) && body.userIds.length) {
      query._id = {
        $in: body.userIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    } else if (body.audience !== announcementAudiences.ALL) {
      query.emailVerified = true;
    }

    const users = await UserRepository.findUserParams(
      { ...query, limit: 0, skip: 0 },
      "email name"
    );

    if (!users.length) {
      return { SUCCESS: false, message: userMessages.ANNOUNCEMENT_NO_RECIPIENTS };
    }

    this.deliverAnnouncement(users, body);

    return {
      SUCCESS: true,
      message: userMessages.ANNOUNCEMENT_QUEUED,
      data: {
        queued: users.length,
        audience: body.userIds?.length ? "userIds" : body.audience || "verified",
      },
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
        this.notificationParams(body, user),
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
