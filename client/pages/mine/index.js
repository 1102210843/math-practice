const api = require('../../utils/request');
const { STATIC_URL } = require('../../utils/request');

const LEVEL_NAMES = ['口算新手', '口算学徒', '口算能手', '口算高手', '口算小达人'];
const GRADE_MAP = {
  '1-up': '一年级上册',
  '1-down': '一年级下册',
  '2-up': '二年级上册',
  '2-down': '二年级下册',
};

Page({
  data: {
    nickname: '口算小达人',
    avatarUrl: STATIC_URL + '/images/logo.png',
    totalStars: 0,
    level: 1,
    levelName: '口算新手',
    streakDays: 0,
    maxStreakDays: 0,
    grade: '1-up',
    gradeText: '一年级上册',
    soundEnabled: true,
    questionCount: 10,
    badges: [],
    showGrade: false,
    grades: [
      { value: '1-up', label: '一年级上册', icon: '📗' },
      { value: '1-down', label: '一年级下册', icon: '📗' },
      { value: '2-up', label: '二年级上册', icon: '📘' },
      { value: '2-down', label: '二年级下册', icon: '📘' },
    ],
  },

  onShow() {
    this.loadProfile();
    this.loadBadges();
    const app = getApp();
    this.setData({
      grade: app.globalData.grade,
      gradeText: GRADE_MAP[app.globalData.grade] || '一年级上册',
      soundEnabled: wx.getStorageSync('soundEnabled') !== false,
      questionCount: wx.getStorageSync('questionCount') || 10,
    });
  },

  async loadProfile() {
    try {
      const res = await api.get('/user/profile');
      if (res.code === 0) {
        const d = res.data;
        this.setData({
          nickname: d.nickname || '口算小达人',
          avatarUrl: d.avatarUrl || STATIC_URL + '/images/logo.png',
          totalStars: d.totalStars,
          level: d.level,
          levelName: LEVEL_NAMES[d.level - 1] || '口算新手',
          streakDays: d.streakDays,
          maxStreakDays: d.maxStreakDays,
        });
      }
    } catch (err) {
      console.error('Load profile error:', err);
    }
  },

  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    this.setData({ avatarUrl });
    this.updateProfile(this.data.nickname, avatarUrl);
  },

  onNicknameBlur(e) {
    const nickname = e.detail.value;
    if (nickname && nickname !== this.data.nickname) {
      this.setData({ nickname });
      this.updateProfile(nickname, this.data.avatarUrl);
    }
  },

  async updateProfile(nickname, avatarUrl) {
    try {
      const res = await api.put('/user/profile', { nickname, avatarUrl });
      if (res.code === 0) {
        wx.showToast({ title: '已更新', icon: 'success' });
      }
    } catch (err) {
      console.error('Update profile error:', err);
    }
  },

  showGradePicker() {
    this.setData({ showGrade: true });
  },

  hideGradePicker() {
    this.setData({ showGrade: false });
  },

  async pickGrade(e) {
    const grade = e.currentTarget.dataset.grade;
    try {
      await api.put('/user/grade', { grade });
      const app = getApp();
      app.setGrade(grade);
      this.setData({
        grade,
        gradeText: GRADE_MAP[grade],
        showGrade: false,
      });
      wx.showToast({ title: '已切换', icon: 'success' });
    } catch (err) {
      console.error('Update grade error:', err);
    }
  },

  toggleSound(e) {
    const enabled = e.detail.value;
    wx.setStorageSync('soundEnabled', enabled);
    this.setData({ soundEnabled: enabled });
  },

  showCountPicker() {
    wx.showActionSheet({
      itemList: ['10题', '15题', '20题'],
      success: (res) => {
        const counts = [10, 15, 20];
        const count = counts[res.tapIndex];
        wx.setStorageSync('questionCount', count);
        this.setData({ questionCount: count });
      },
    });
  },

  async loadBadges() {
    try {
      const res = await api.get('/user/badges');
      if (res.code === 0) {
        this.setData({ badges: res.data.badges });
      }
    } catch (err) {
      console.error('Load badges error:', err);
    }
  },

  goErrors() {
    wx.navigateTo({ url: '/pages/errors/index' });
  },
});
