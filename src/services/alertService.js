const { sendEmail } = require("./emailService");
const { sendTeamsNotification } = require("./teamsService");

// import your MJML templates
const { expiryTemplateMJML, stockTemplateMJML } = require("../emailTemplates");

async function sendAlert({ subject, message, severity, meta = {} }) {
  const isExpiryType =
    (severity === "critical" && meta.expiryDate) || subject.includes("EXPIRY");

  const mjmlTemplate = isExpiryType ? expiryTemplateMJML : stockTemplateMJML;

  await Promise.all([
    sendEmail({
      subject,
      mjmlTemplate,
      variables: {
        subject,
        message,
        notificationType: meta.type || "ALERT",
        itemName: meta.itemName || "Item",
        quantity: meta.quantity ?? "",
        minStockLevel: meta.minStockLevel ?? "",
        expiryDate: meta.expiryDate ?? "",
        dashboardUrl: meta.dashboardUrl || "https://yourapp/dashboard",
        year: new Date().getFullYear(),
        logoUrl: meta.logoUrl,
        qrUrl:
          meta.qrUrl ||
          `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
            meta.dashboardUrl || "https://yourapp/dashboard"
          )}`,
      },
    }),

    // Teams stays as-is (plaintext)
    sendTeamsNotification(subject, message, severity),
  ]);
}

module.exports = {
  sendAlert,
};
