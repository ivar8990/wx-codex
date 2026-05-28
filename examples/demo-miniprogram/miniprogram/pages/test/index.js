Page({
  data: {
    title: "Test",
    loading: false,
    status: "idle",
    resultText: "Tap the button to call the testCloud cloud function.",
  },

  async callTestCloud() {
    this.setData({
      loading: true,
      status: "calling",
      resultText: "Calling testCloud...",
    });

    try {
      const response = await wx.cloud.callFunction({
        name: "testCloud",
        data: {
          source: "pages/test/index",
        },
      });

      this.setData({
        loading: false,
        status: "success",
        resultText: response.result?.message ?? "Cloud function returned successfully.",
      });
    } catch (error) {
      this.setData({
        loading: false,
        status: "error",
        resultText: error?.errMsg ?? "Cloud function call failed. Deploy testCloud in WeChat DevTools first.",
      });
    }
  },
});
