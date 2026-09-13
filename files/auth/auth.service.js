const { AlphaNumeric, hashPassword, verifyToken } = require("../../utils");
const { sendMailNotification } = require("../../utils/email");
const { RedisClient } = require("../../utils/redis");
const { sendSms } = require("../../utils/sms");
const { AuthFailure, AuthSuccess } = require("./auth.messages");
const { AdminRepository } = require("../admin/admin.repository");

const OTP_SUBJECTS = {
  VERIFICATION: "Your Corpland verification code",
  RESET_PASSWORD: "Reset your Corpland password",
};

class AuthService {
  static async createOTP(userDetail) {
    const otp = AlphaNumeric(4, "numeric");

    if (!otp) return { success: false, message: AuthFailure.SEND_OTP };

    let cacheOtp;

    try {
      cacheOtp = await RedisClient.setCache({
        key: `OTP:${userDetail}`,
        value: { otp },
      });
    } catch (error) {
      console.error(`OTP cache failed for ${userDetail}:`, error.message);
      return { success: false, message: AuthFailure.SEND_OTP };
    }

    if (!cacheOtp) return { success: false, message: AuthFailure.SEND_OTP };

    return {
      success: true,
      message: AuthSuccess.CREATE_OTP,
      data: otp,
    };
  }

  static async deliverOtp({ type, userDetail, template, name, otp }) {
    const messageDetails = `Please use this otp ${otp} on the Corpland Technologies Application. It expires in 30 minutes`;

    switch (type) {
      case "phoneNumber":
        return sendSms(userDetail, messageDetails);
      case "email":
        return sendMailNotification(
          userDetail,
          OTP_SUBJECTS[template] || OTP_SUBJECTS.VERIFICATION,
          { otp, name },
          template,
        );
      default:
        return false;
    }
  }

  static async issueOtp(payload) {
    const { type, userDetail, template = "VERIFICATION", name } = payload;

    if (!type || !userDetail)
      return { success: false, otpSent: false, message: AuthFailure.SEND_OTP };

    const otp = await this.createOTP(userDetail);

    if (!otp.success) return { success: false, otpSent: false, message: otp.message };

    this.deliverOtp({ type, userDetail, template, name, otp: otp.data }).catch(
      (error) => {
        console.error(`OTP delivery failed for ${userDetail}:`, error.message);
      },
    );

    return { success: true, otpSent: true, message: AuthSuccess.SEND_OTP };
  }

  static async sendOtp(payload) {
    const { type, userDetail, template = "VERIFICATION", name } = payload;

    if (!type || !userDetail)
      return { success: false, message: "email or userDetail is required" };

    const otp = await this.createOTP(userDetail);

    if (!otp.success) return { success: false, message: otp.message };

    let sendOtp;

    try {
      sendOtp = await this.deliverOtp({
        type,
        userDetail,
        template,
        name,
        otp: otp.data,
      });
    } catch (error) {
      console.error(`OTP delivery failed for ${userDetail}:`, error.message);
      return { success: false, message: AuthFailure.SEND_OTP };
    }

    if (!sendOtp) return { success: false, message: AuthFailure.SEND_OTP };

    return {
      success: true,
      message: AuthSuccess.SEND_OTP,
    };
  }

  static async verifyOtp(payload) {
    const { otp, userDetail } = payload;

    //fetch cached otp
    const verifyOtp = await RedisClient.getCache(`OTP:${userDetail}`);

    if (!verifyOtp) return { success: false, message: AuthFailure.VERIFY_OTP };

    const { otp: cachedOtp } = JSON.parse(verifyOtp);

    if (cachedOtp !== otp)
      return { success: false, message: AuthFailure.VERIFY_OTP };

    return { success: true, message: AuthSuccess.VERIFY_OTP };
  }

  static async resetAdminPassword(userDetail) {
    const { email, newPassword } = userDetail;

    const updatePassword = await AdminRepository.updateAdminDetails(
      { email },
      { password: await hashPassword(newPassword) },
    );

    if (!updatePassword)
      return { success: false, message: AuthFailure.PASSWORD_RESET };

    return { success: true, message: AuthSuccess.PASSWORD_RESET };
  }

  // Logout endpoint
  static async userLogOut(token) {
    if (token) {
      // Verify and decode the token
      const authToken = token.split(" ")[1];
      const decodedToken = await verifyToken(authToken);

      const now = new Date();
      const expire = new Date(decodedToken.exp * 1000);
      const milliseconds = expire.getTime() - now.getTime();

      /* ----------------------------- BlackList Token ---------------------------- */
      const cacheToken = await RedisClient.setCache({
        key: authToken,
        value: authToken,
        expiry: milliseconds,
      });

      return { success: true, message: AuthSuccess.LOGOUT };
    } else {
      return { success: false, message: AuthFailure.ERROR };
    }
  }
}

module.exports = { AuthService };
