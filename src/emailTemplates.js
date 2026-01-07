const fs = require("fs");
const path = require("path");

const expiryTemplateMJML = fs.readFileSync(
  path.join(__dirname, "email-template", "email-expiry.mjml"),
  "utf8"
);

const stockTemplateMJML = fs.readFileSync(
  path.join(__dirname, "email-template", "email-stock.mjml"),
  "utf8"
);

module.exports = {
  expiryTemplateMJML,
  stockTemplateMJML,
};
