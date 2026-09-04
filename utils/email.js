const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
const mailer = require("nodemailer");
const { config } = require("../core/config");

handlebars.registerHelper("eq", (a, b) => a == b);

const SMTP_OPTIONS = {
  host: "mail.corplandtechnologies.com",
  port: 465,
  secure: true,
  auth: {
    user: config.COMPANY_EMAIL,
    pass: config.COMPANY_EMAIL_PASSWORD,
  },
  pool: true,
  maxConnections: 2,
  maxMessages: 50,
  rateDelta: 1000,
  rateLimit: 3,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
  dnsTimeout: 5000,
};

let transport;

const getTransport = () => {
  if (!transport) {
    transport = mailer.createTransport(SMTP_OPTIONS);
    transport.on("error", (error) => {
      console.error("SMTP pool error:", error.message);
    });
  }
  return transport;
};

const templateCache = new Map();

const getTemplate = (name) => {
  if (!templateCache.has(name)) {
    const source = fs.readFileSync(
      path.join(__dirname, `../templates/${name}.hbs`),
      "utf8"
    );
    templateCache.set(name, handlebars.compile(source));
  }
  return templateCache.get(name);
};

const sendMailNotification = async (
  to_email,
  subject,
  substitutional_parameters,
  Template_Name
) => {
  const compiledTemplate = getTemplate(Template_Name);

  await getTransport().sendMail({
    from: config.COMPANY_EMAIL,
    to: to_email,
    subject,
    html: compiledTemplate(substitutional_parameters),
  });

  return true;
};

const sendMultiEmailNotification = async (
  to_emails,
  subject,
  substitutional_parameters,
  Template_Names
) => {
  const results = await Promise.allSettled(
    to_emails.map((to_email, index) =>
      sendMailNotification(
        to_email,
        subject,
        substitutional_parameters,
        Template_Names[index]
      )
    )
  );

  return results.filter((result) => result.status === "fulfilled").length;
};

module.exports = { sendMailNotification, sendMultiEmailNotification };
