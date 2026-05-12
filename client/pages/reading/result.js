Page({
  data: {
    stars: 0,
    starsArr: [],
    accuracy: 0,
    results: [],
  },

  onLoad(options) {
    try {
      const data = JSON.parse(decodeURIComponent(options.data));
      const accuracy = data.totalCount > 0
        ? Math.round((data.correctCount / data.totalCount) * 100)
        : 0;
      const stars = accuracy >= 100 ? 3 : accuracy >= 60 ? 2 : 1;

      this.setData({
        stars,
        starsArr: new Array(stars).fill(1),
        accuracy,
        results: data.results || [],
      });
    } catch (err) {
      console.error('Parse result error:', err);
    }
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
