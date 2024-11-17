const { AlphaNumeric, hashPassword, verifyToken } = require("../../utils");
const { sendMailNotification } = require("../../utils/email");
const { RedisClient } = require("../../utils/redis");
const { sendSms } = require("../../utils/sms");
const { AuthFailure, AuthSuccess } = require("./auth.messages");
const { AdminRepository } = require("../admin/admin.repository");

class AuthService {
  static async createOTP(userDetail) {
    const otp = AlphaNumeric(4, "numeric");

    // const otp = `1234`
    console.log("otp", otp);
    if (!otp) return { success: false, msg: "no otp genet" };

    //cache otp
    const cacheOtp = await RedisClient.setCache({
      key: `OTP:${userDetail}`,
      value: { otp },
    });
    console.log("data", cacheOtp);

    // console.log('cacheOtp', cacheOtp.value)
    // if (!cacheOtp) return { success: false, msg: AuthFailure.SEND_OTP }

    return {
      success: true,
      msg: AuthSuccess.CREATE_OTP,
      data: otp,
    };
  }

  static async sendOtp(payload) {
    /* 
      type: phoneNumber for sms and email for email delivery
      userDetail: the phone number or email of the recipient
      length: required length of otp
      msg: message to be delivered with the otp
    */
    const { type, userDetail, template = "VERIFICATION", name } = payload;

    if (!type && !userDetail)
      return { success: false, msg: "email or userDetail is required" };

    const otp = await this.createOTP(userDetail);
    console.log("otpppp", otp.data);
    console.log("otpppp", otp);

    // if (!otp.success) return { success: false, msg: AuthFailure.SEND_OTP }

    const msgDetails = `Please use this otp ${otp.data} on the Corpland Technologies Application. It expires in 30 minutes`;

    let sendOtp;

    //check type of delivery and send the otp
    switch (type) {
      case "phoneNumber":
        sendOtp = await sendSms(userDetail, msgDetails);
        break;
      case "email":
        sendOtp = await sendMailNotification(
          userDetail,
          `Corpland Accounts OTP`,
          { otp: otp.data, name: name },
          template
        );
        break;

      default:
        break;
    }

    //check delivery of msg
    console.log("sendOtp", sendOtp);

    if (!sendOtp) return { success: false, msg: AuthFailure.SEND_OTP };

    return {
      success: true,
      msg: AuthSuccess.SEND_OTP,
    };
  }

  static async verifyOtp(payload) {
    const { otp, userDetail } = payload;

    //fetch cached otp
    const verifyOtp = await RedisClient.getCache(`OTP:${userDetail}`);

    if (!verifyOtp) return { success: false, msg: AuthFailure.VERIFY_OTP };

    const { otp: cachedOtp } = JSON.parse(verifyOtp);

    if (cachedOtp !== otp)
      return { success: false, msg: AuthFailure.VERIFY_OTP };

    return { success: true, msg: AuthSuccess.VERIFY_OTP };
  }

  static async resetAdminPassword(userDetail) {
    const { email, newPassword } = userDetail;

    const updatePassword = await AdminRepository.updateAdminDetails(
      { email },
      { password: await hashPassword(newPassword) }
    );

    if (!updatePassword)
      return { success: false, msg: AuthFailure.PASSWORD_RESET };

    return { success: true, msg: AuthSuccess.PASSWORD_RESET };
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

      return { success: true, msg: AuthSuccess.LOGOUT };
    } else {
      return { success: false, msg: AuthFailure.ERROR };
    }
  }
}

module.exports = { AuthService };
