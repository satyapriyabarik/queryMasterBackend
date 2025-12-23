const axios = require("axios");

const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;

async function sendTeamsNotification(title, message, severity = "info") {
  if (!TEAMS_WEBHOOK_URL) {
    throw new Error("Teams webhook URL not configured");
  }

  const colorMap = {
    info: "0076D7",
    warning: "FFA500",
    error: "D13438",
    success: "28A745"
  };

  const payload = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    summary: title,
    themeColor: colorMap[severity] || colorMap.info,
    title,
    text: message
  };

  await axios.post(TEAMS_WEBHOOK_URL, payload);
}

module.exports = {
  sendTeamsNotification
};
