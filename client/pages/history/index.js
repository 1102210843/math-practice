const api = require('../../utils/request');

const DRAFT_KEY = 'oralCalcDraft';

const TYPE_LABEL = {
  'oral_calc': '口算',
  'reading': '阅读',
};

Page({
  data: {
    draft: null,
    list: [],
    hasMore: false,
    page: 1,
    loading: false,
  },

  onShow() {
    this.loadDraft();
    this.setData({ page: 1, list: [] });
    this.loadHistory();
  },

  loadDraft() {
    const draft = wx.getStorageSync(DRAFT_KEY);
    if (draft && draft.questions && draft.questions.length) {
      const total = draft.questions.length;
      const done = draft.currentIndex || 0;
      const savedAt = draft.savedAt || 0;
      const timeAgo = this.formatTimeAgo(savedAt);
      this.setData({
        draft: { done, total, type: draft.type || '', timeAgo },
      });
    } else {
      this.setData({ draft: null });
    }
  },

  formatTimeAgo(ts) {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
    return Math.floor(diff / 86400) + '天前';
  },

  async loadHistory() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const res = await api.get('/oral-calc/history', { page: this.data.page });
      if (res.code === 0) {
        const incoming = (res.data.list || []).map(r => ({
          id: r.id,
          typeLabel: TYPE_LABEL[r.type] || r.type,
          date: r.practice_date,
          totalCount: r.total_count,
          correctCount: r.correct_count,
          accuracy: r.total_count ? Math.round((r.correct_count / r.total_count) * 100) : 0,
          stars: r.stars_earned,
          starsArr: new Array(r.stars_earned || 0).fill(1),
          duration: this.formatDuration(r.duration_seconds),
        }));
        const newList = this.data.page === 1 ? incoming : [...this.data.list, ...incoming];
        this.setData({
          list: newList,
          hasMore: newList.length < (res.data.total || 0),
        });
      }
    } catch (err) {
      console.error('Load history error:', err);
    }
    this.setData({ loading: false });
  },

  formatDuration(sec) {
    if (!sec) return '0秒';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}分${s}秒` : `${s}秒`;
  },

  loadMore() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 });
    this.loadHistory();
  },

  resumeDraft() {
    wx.navigateTo({ url: '/pages/oral-calc/index?resume=1' });
  },

  deleteDraft() {
    wx.showModal({
      title: '提示',
      content: '确定放弃未完成的练习吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync(DRAFT_KEY);
          this.setData({ draft: null });
        }
      },
    });
  },
});
