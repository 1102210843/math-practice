Page({
  data: {
    stars: 0,
    starsArr: [],
    accuracy: 0,
    correctCount: 0,
    errorCount: 0,
    timeText: '',
    errors: [],
  },

  onLoad(options) {
    try {
      const data = JSON.parse(decodeURIComponent(options.data));
      const min = Math.floor(data.durationSeconds / 60);
      const sec = data.durationSeconds % 60;

      this.setData({
        stars: data.stars || 0,
        starsArr: new Array(data.stars || 0).fill(1),
        accuracy: data.accuracy || 0,
        correctCount: data.correctCount || 0,
        errorCount: (data.totalCount || 0) - (data.correctCount || 0),
        timeText: `${min}分${sec}秒`,
        errors: data.errors || [],
      });
    } catch (err) {
      console.error('Parse result error:', err);
    }
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
