const api = require('../../../utils/request');

const TYPE_LABEL = {
  oral_calc: '口算',
  reading: '阅读',
};

Page({
  data: {
    loading: true,
    record: null,
    questions: [],
    hasDetail: false,
  },

  onLoad(options) {
    const id = parseInt(options.id, 10);
    if (!id) {
      wx.showToast({ title: '记录参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 500);
      return;
    }
    this.loadDetail(id);
  },

  async loadDetail(id) {
    this.setData({ loading: true });
    try {
      const res = await api.get('/oral-calc/history/detail', { id });
      if (res.code !== 0 || !res.data) {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' });
        this.setData({ loading: false });
        return;
      }

      const record = res.data;
      let detail = record.detail;
      if (typeof detail === 'string') {
        try {
          detail = JSON.parse(detail);
        } catch (err) {
          detail = [];
        }
      }
      if (!Array.isArray(detail)) detail = [];

      const questions = detail.map((item, idx) => {
        const expression = item.expression || '';
        const correctAnswer = Number(item.correctAnswer ?? item.correct_answer ?? 0);
        const userAnswer = Number(item.userAnswer ?? item.user_answer ?? 0);
        return {
          id: `${idx}`,
          expression,
          correctAnswer,
          userAnswer,
          correct: userAnswer === correctAnswer,
        };
      });

      this.setData({
        record: {
          typeLabel: TYPE_LABEL[record.type] || record.type,
          date: this.formatDateTime(record.create_time || record.practice_date),
          accuracy: record.total_count > 0 ? Math.round((record.correct_count / record.total_count) * 100) : 0,
          correctCount: record.correct_count,
          totalCount: record.total_count,
          duration: this.formatDuration(record.duration_seconds),
        },
        questions,
        hasDetail: questions.length > 0,
        loading: false,
      });
    } catch (err) {
      console.error('Load record detail error:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  formatDateTime(raw) {
    if (!raw) return '';
    const d = new Date(String(raw).replace('T', ' ').replace(/-/g, '/'));
    if (Number.isNaN(d.getTime())) return String(raw);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  },

  formatDuration(sec) {
    const total = Number(sec) || 0;
    if (total <= 0) return '0秒';
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m > 0 ? `${m}分${s}秒` : `${s}秒`;
  },
});
