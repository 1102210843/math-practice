var api = require('../../utils/request');

Page({
  data: {
    statusBarHeight: 44,
    loading: false,
    logoUrl: '/images/logo.png',
  },

  onLoad: function () {
    var sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 44 });

    var app = getApp();
    if (app.globalData.token) {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  onLogin: function () {
    var that = this;
    that.setData({ loading: true });

    var app = getApp();

    var accountInfo = wx.getAccountInfoSync ? wx.getAccountInfoSync() : {};
    var appId = accountInfo.miniProgram && accountInfo.miniProgram.appId;
    var isRealApp = appId && appId !== 'touristappid' && !appId.startsWith('tourist');

    function doLogin(wxCode) {
      api.post('/auth/login', { code: wxCode }).then(function (res) {
        if (res.code === 0) {
          app.setToken(res.data.token);
          if (res.data.grade) app.setGrade(res.data.grade);
          wx.switchTab({ url: '/pages/index/index' });
        } else {
          wx.showToast({ title: res.message || '登录失败', icon: 'none' });
        }
      }).catch(function () {
        wx.showToast({ title: '网络错误', icon: 'none' });
      }).finally(function () {
        that.setData({ loading: false });
      });
    }

    if (isRealApp) {
      wx.login({
        success: function (loginRes) {
          doLogin(loginRes.code || 'dev_user');
        },
        fail: function () {
          doLogin('dev_user');
        }
      });
    } else {
      doLogin('dev_user');
    }
  },

  goAgreement: function () {
    wx.navigateTo({ url: '/pages/agreement/index' });
  },

  goPrivacy: function () {
    wx.navigateTo({ url: '/pages/privacy/index' });
  },
});
