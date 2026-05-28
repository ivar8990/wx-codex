const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async () => ({
  message: "Hello from WX-Codex cloud function.",
});
