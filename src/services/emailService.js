const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.ALERT_EMAIL_USER,
    pass: process.env.ALERT_EMAIL_PASS
  }
});

async function sendEmail(subject, text) {
  return transporter.sendMail({
    from: `"Inventory Alerts" <${process.env.ALERT_EMAIL_USER}>`,
    to: process.env.ALERT_RECEIVER,
    subject,
    text
  });
}

module.exports = {
  sendEmail
};
