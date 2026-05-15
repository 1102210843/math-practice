const api = require('../../utils/request');

const OP_NAMES = {
  add: '加法',
  sub: '减法',
  mul: '乘法',
  div: '除法',
};

Page({
  data: {
    imgNodata: '/images/illust-nodata.png',
    imgReading: '/images/illust-reading.png',
    imgCheckin: '/images/illust-checkin.png',
    range: 'week',
    oralTrend: [],
    oralStats: {
      totalPractices: 0,
      avgAccuracy: 0,
      avgTimeText: '0分0秒',
    },
    weakOps: [],
    totalErrors: 0,
    readingStats: {
      totalPractices: 0,
      avgAccuracy: 0,
    },
    streak: {
      current: 0,
      max: 0,
    },
  },

  onShow() {
    this.loadReport();
    this.loadProfile();
  },

  switchRange(e) {
    this.setData({ range: e.currentTarget.dataset.range });
    this.loadReport();
  },

  async loadProfile() {
    try {
      const res = await api.get('/user/profile');
      if (res.code === 0) {
        this.setData({
          streak: {
            current: res.data.streakDays,
            max: res.data.maxStreakDays,
          },
        });
      }
    } catch (err) {
      console.error('Load profile error:', err);
    }
  },

  async loadReport() {
    try {
      const res = await api.get('/checkin/report', { range: this.data.range });
      if (res.code !== 0) return;

      const d = res.data;
      const dayLabels = this.data.range === 'week'
        ? ['一', '二', '三', '四', '五', '六', '日']
        : Array.from({ length: d.oralCalc.accuracyTrend.length }, (_, i) => `${i + 1}`);

      const oralTrend = d.oralCalc.accuracyTrend.map((v, i) => ({
        value: v,
        label: dayLabels[i] || '',
      }));

      const avgMin = Math.floor(d.oralCalc.avgDurationSeconds / 60);
      const avgSec = d.oralCalc.avgDurationSeconds % 60;

      const weakOps = (d.oralCalc.weakOps || []).map(op => ({
        ...op,
        name: OP_NAMES[op.type] || op.type,
        level: op.percent >= 40 ? 'high' : op.percent >= 20 ? 'mid' : 'low',
      }));

      this.setData({
        oralTrend,
        oralStats: {
          totalPractices: d.oralCalc.totalPractices,
          avgAccuracy: d.oralCalc.avgAccuracy,
          avgTimeText: `${avgMin}分${avgSec}秒`,
        },
        weakOps,
        totalErrors: d.oralCalc.totalErrors || 0,
        readingStats: {
          totalPractices: d.reading.totalPractices,
          avgAccuracy: d.reading.avgAccuracy,
        },
      });
    } catch (err) {
      console.error('Load report error:', err);
    }
  },
});
