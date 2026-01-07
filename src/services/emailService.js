// const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 587,
//   secure: false,
//   auth: {
//     user: process.env.ALERT_EMAIL_USER,
//     pass: process.env.ALERT_EMAIL_PASS
//   }
// });

// async function sendEmail(subject, text) {
//   return transporter.sendMail({
//     from: `"Inventory Alerts" <${process.env.ALERT_EMAIL_USER}>`,
//     to: process.env.ALERT_RECEIVER,
//     subject,
//     text
//   });
// }

// module.exports = {
//   sendEmail
// };
const nodemailer = require("nodemailer");
const mjml2html = require("mjml");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.ALERT_EMAIL_USER,
    pass: process.env.ALERT_EMAIL_PASS,
  },
});

/**
 * render MJML template with variables
 */
function renderTemplate(mjmlTemplate, vars = {}) {
  let rendered = mjmlTemplate;

  // simple {{var}} replace
  for (const [key, value] of Object.entries(vars)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value ?? "");
  }

  const { html, errors } = mjml2html(rendered, { keepComments: false });

  if (errors && errors.length) {
    console.error("MJML errors:", errors);
  }

  return html;
}

/**
 * send email with MJML -> HTML
 */
async function sendEmail({ subject, mjmlTemplate, variables }) {
  const html = renderTemplate(mjmlTemplate, variables);

  return transporter.sendMail({
    from: `"Inventory Alerts" <${process.env.ALERT_EMAIL_USER}>`,
    to: process.env.ALERT_RECEIVER,
    subject,
    html, // <-- send HTML
    text: variables?.textFallback || subject, // optional fallback
  });
}

module.exports = {
  sendEmail,
};
