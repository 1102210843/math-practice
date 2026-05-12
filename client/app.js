App({
  globalData: {
    userInfo: null,
    token: null,
    grade: '1-up',
  },

  onLaunch() {
    const token = wx.getStorageSync('token');
    const grade = wx.getStorageSync('grade');
    if (token) this.globalData.token = token;
    if (grade) this.globalData.grade = grade;
  },

  setToken(token) {
    this.globalData.token = token;
    wx.setStorageSync('token', token);
  },

  setGrade(grade) {
    this.globalData.grade = grade;
    wx.setStorageSync('grade', grade);
  },
});
