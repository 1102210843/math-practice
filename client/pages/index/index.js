const api = require('../../utils/request');

const LEVEL_NAMES = ['口算新手', '口算学徒', '口算能手', '口算高手', '口算小达人'];

Page({
  data: {
    statusBarHeight: 20,
    mascotUrl: api.imgUrl('mascot.png'),
    iconOralCalc: api.imgUrl('icon-oral-calc.png'),
    iconReading: api.imgUrl('icon-reading.png'),
    totalStars: 0,
    level: 1,
    levelName: '口算新手',
    streakDays: 0,
    oralCalcDone: false,
    readingDone: false,
    questionCount: 10,
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: [],
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 });
  },

  onShow() {
    const app = getApp();
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/index' });
      return;
    }
    this.loadProfile();
    this.loadCheckin();
    this.loadCalendar();
  },

  async loadProfile() {
    try {
      const res = await api.get('/user/profile');
      if (res.code === 0) {
        const d = res.data;
        this.setData({
          totalStars: d.totalStars,
          level: d.level,
          levelName: LEVEL_NAMES[d.level - 1] || '口算新手',
          streakDays: d.streakDays,
        });
      }
    } catch (err) {
      console.error('Load profile error:', err);
    }
  },

  async loadCheckin() {
    try {
      const res = await api.get('/checkin/today');
      if (res.code === 0) {
        this.setData({
          oralCalcDone: res.data.oralCalcDone,
          readingDone: res.data.readingDone,
        });
      }
    } catch (err) {
      console.error('Load checkin error:', err);
    }
  },

  async loadCalendar() {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const res = await api.get('/checkin/calendar', { month: monthStr });

      const doneSet = new Set();
      if (res.code === 0) {
        res.data.days.forEach(d => {
          if (d.allDone) doneSet.add(d.date);
        });
      }

      const firstDay = new Date(year, month - 1, 1).getDay();
      const daysInMonth = new Date(year, month, 0).getDate();
      const today = now.getDate();
      const calendarDays = [];

      for (let i = 0; i < firstDay; i++) {
        calendarDays.push({ empty: true });
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        calendarDays.push({
          day: d,
          done: doneSet.has(dateStr),
          today: d === today,
        });
      }

      this.setData({ calendarDays });
    } catch (err) {
      console.error('Load calendar error:', err);
    }
  },

  goOralCalc() {
    wx.navigateTo({ url: '/pages/oral-calc/index' });
  },

  goReading() {
    wx.navigateTo({ url: '/pages/reading/index' });
  },
});
