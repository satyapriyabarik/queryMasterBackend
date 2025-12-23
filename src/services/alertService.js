const { sendEmail } = require("./emailService");
const { sendTeamsNotification } = require("./teamsService");

async function sendAlert({ subject, message, severity }) {
  await Promise.all([
    sendEmail(subject, message),
    sendTeamsNotification(subject, message, severity)
  ]);
}

module.exports = {
  sendAlert
};
