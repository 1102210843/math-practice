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
      const totalCount = Number(data.totalCount) || 0;
      const correctCount = Number(data.correctCount) || 0;
      const accuracy = totalCount > 0
        ? Math.round((correctCount / totalCount) * 100)
        : (Number(data.accuracy) || 0);
      const durationSeconds = Number(data.durationSeconds) || 0;
      const min = Math.floor(durationSeconds / 60);
      const sec = durationSeconds % 60;
      const stars = Number(data.stars) || 0;

      this.setData({
        stars,
        starsArr: new Array(stars).fill(1),
        accuracy,
        correctCount,
        errorCount: Math.max(totalCount - correctCount, 0),
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
