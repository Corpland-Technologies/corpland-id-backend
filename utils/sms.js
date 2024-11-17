const axios = require("axios");
const { config } = require("../core/config");
const { AuthSuccess, AuthFailure } = require("../files/auth/auth.messages");
// let accountSid = process.env.TWILIO_ACCOUNT_SID_MY
// let authToken = process.env.TWILIO_AUTH_TOKEN_MY
// const client = require("twilio")(accountSid, authToken)
const { TERMII_BASE_URL, TERMII_KEY } = config;

// const TwilioSMS = async (receiver, body) => {
//   return await client.messages
//     .create({ from: "+18179942874", to: receiver, body })
//     .then((message) => {
//       if (message.sid) {
//         return message.sid
//       } else {
//         return null
//       }
//     })
//     .catch((error) => {
//       return error
//       // return "Phone number is not a valid phone number";
//     })
// }

const sendSms = async (
  to,
  text,
  type = null,
  sender = "Corpland Technologies"
) => {
  //change sender once termii account is created
  const sms = new Promise((resolve, reject) => {
    let options = {
      method: "POST",
      url: `${TERMII_BASE_URL}/api/sms/send`,
      params: {
        api_key: TERMII_KEY,
        sms: text,
        from: "Corpland Technologies",
        to,
        type: "plain",
        channel: "dnd",
      },
    };

    axios(options)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
  return sms
    .then((data) => {
      return {
        success: true,
        message: AuthSuccess.SMS,
        data,
      };
    })
    .catch((error) => {
      return {
        success: false,
        message: AuthFailure.SMS,
        data: error,
      };
    });
};

module.exports = { sendSms };
