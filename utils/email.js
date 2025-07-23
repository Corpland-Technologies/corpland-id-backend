const sgMail = require("@sendgrid/mail");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
const mailer = require("nodemailer");
const { config } = require("../core/config");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

handlebars.registerHelper("eq", (a, b) => a == b);

const sendMailNotification = (
  to_email,
  subject,
  substitutional_parameters,
  Template_Name,
  is_save
) => {
  const source = fs.readFileSync(
    path.join(__dirname, `../templates/${Template_Name}.hbs`),
    "utf8"
  );

  const compiledTemplate = handlebars.compile(source);
  // const email = new Promise((resolve, reject) => {
  // const message = {
  //   from: {
  //     name: "WhoUEpp",
  //     email: process.env.COMPANY_EMAIL,
  //   },
  //   to: to_email,
  //   subject: subject,
  //   html: compiledTemplate(substitutional_parameters),
  // }

  // return sgMail
  //   .send(message)
  //   .then(() => {
  //     return resolve(true)
  //   })
  //   .catch((error) => {
  //     if (error) {
  //       return reject(error)
  //     }
  //   })

  // return email
  //   .then((data) => {
  //     return {
  //       success: true,
  //       message: AuthSuccess.EMAIL,
  //       data,
  //     }
  //   })
  //   .catch((error) => {
  //     return {
  //       success: false,
  //       message: AuthFailure.EMAIL,
  //       data: error,
  //     }
  //   })

  //smtp
  return new Promise((resolve, reject) => {
    let smtpProtocol = mailer.createTransport({
      host: "smtp.corplandtechnologies.com", // Replace with your SMTP host
      port: 465, // Or 587, depending on your provider
      secure: true, // true for 465, false for 587
      auth: {
        user: config.COMPANY_EMAIL,
        pass: config.COMPANY_EMAIL_PASSWORD, // Store your password in env
      },
    });

    var mailoption = {
      from: config.COMPANY_EMAIL,
      to: to_email,
      subject: subject,
      html: compiledTemplate(substitutional_parameters),
    };

    return smtpProtocol.sendMail(mailoption, function (err, response) {
      if (err) {
        return reject(err);
      }
      console.log("Message Sent" + response);
      smtpProtocol.close();
      return resolve(true);
    });
  });
};

const sendMultiEmailNotification = (
  to_emails,
  subject,
  substitutional_parameters,
  Template_Names,
  is_save,
  whoIAm = "User"
) => {
  for (let index = 0; index < to_emails.length; index++) {
    const to_email = to_emails[index];
    const template_name = Template_Names[index];
    sendMailNotification(
      to_email,
      subject,
      substitutional_parameters,
      template_name,
      is_save ? index : 0,
      whoIAm
    );
  }
};

module.exports = { sendMailNotification, sendMultiEmailNotification };
