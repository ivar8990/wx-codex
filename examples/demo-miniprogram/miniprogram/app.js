App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: wx.cloud.DYNAMIC_CURRENT_ENV,
      });
    }
  },

  globalData: {
    bridgeName: "WX-Codex"
  }
});
