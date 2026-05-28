const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async (event) => ({
  event,
  message: `testCloud received ${event.source ?? "unknown source"} at ${new Date().toISOString()}.`,
  ok: true,
});
