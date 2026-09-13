const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
const mailer = require("nodemailer");
const { config } = require("../core/config");

const TEMPLATES_DIR = path.join(__dirname, "../templates");
const PARTIALS_DIR = path.join(TEMPLATES_DIR, "partials");

handlebars.registerHelper("eq", (a, b) => a == b);
handlebars.registerHelper(
  "firstName",
  (name) => String(name || "").trim().split(/\s+/)[0] || "there"
);

// Transactional mail sends as the dedicated no-reply mailbox. Falling back to
// the shared company mailbox keeps mail flowing on an instance that has not had
// NO_REPLY_EMAIL_PASSWORD added to its environment yet.
const usesNoReplyMailbox = Boolean(config.NO_REPLY_EMAIL_PASSWORD);

const SENDER = usesNoReplyMailbox ? config.NO_REPLY_EMAIL : config.COMPANY_EMAIL;

const SENDER_PASSWORD = usesNoReplyMailbox
  ? config.NO_REPLY_EMAIL_PASSWORD
  : config.COMPANY_EMAIL_PASSWORD;

// 465 is implicit TLS, 587 upgrades through STARTTLS.
const SMTP_PORT = usesNoReplyMailbox ? config.SMTP_PORT : 465;

const SMTP_OPTIONS = {
  host: config.SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  requireTLS: SMTP_PORT !== 465,
  auth: {
    user: SENDER,
    pass: SENDER_PASSWORD,
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

let partialsRegistered = false;

const registerPartials = () => {
  if (partialsRegistered) return;

  for (const file of fs.readdirSync(PARTIALS_DIR)) {
    if (!file.endsWith(".hbs")) continue;
    handlebars.registerPartial(
      path.basename(file, ".hbs"),
      fs.readFileSync(path.join(PARTIALS_DIR, file), "utf8")
    );
  }

  partialsRegistered = true;
};

const templateCache = new Map();

const getTemplate = (name) => {
  registerPartials();

  if (!templateCache.has(name)) {
    const source = fs.readFileSync(
      path.join(TEMPLATES_DIR, `${name}.hbs`),
      "utf8"
    );
    templateCache.set(name, handlebars.compile(source));
  }

  return templateCache.get(name);
};

const decodeEntities = (text) =>
  text
    .replace(/&nbsp;|&zwnj;|&#847;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");

const toPlainText = (html) =>
  decodeEntities(
    html
      .replace(/<head[\s\S]*?<\/head>/i, "")
      .replace(/<div id="preheader"[\s\S]*?<\/div>/i, "")
      .replace(/<img[^>]*>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|td|tr|h[1-6]|li|table)>/gi, "\n")
      .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
      .replace(/<[^>]+>/g, "")
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line, index, lines) => line || (index > 0 && lines[index - 1]))
    .join("\n")
    .trim();

const renderTemplate = (name, params) => {
  const html = getTemplate(name)(params);
  return { html, text: toPlainText(html) };
};

const sendMailNotification = async (
  to_email,
  subject,
  substitutional_parameters,
  Template_Name
) => {
  const { html, text } = renderTemplate(Template_Name, substitutional_parameters);

  await getTransport().sendMail({
    from: { name: config.MAIL_FROM_NAME, address: config.NO_REPLY_EMAIL },
    replyTo: config.SUPPORT_EMAIL,
    envelope: { from: SENDER, to: to_email },
    to: to_email,
    subject,
    html,
    text,
  });

  return true;
};

module.exports = { sendMailNotification, renderTemplate };
