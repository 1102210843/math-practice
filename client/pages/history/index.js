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
    const saved = new Date(ts);
    if (Number.isNaN(saved.getTime())) return '';
    const diffSec = Math.floor((Date.now() - saved.getTime()) / 1000);
    if (diffSec < 60) return '刚刚';
    if (diffSec < 3600) return Math.floor(diffSec / 60) + '分钟前';
    if (diffSec < 86400) return Math.floor(diffSec / 3600) + '小时前';
    if (diffSec < 86400 * 3) return Math.floor(diffSec / 86400) + '天前';
    return this.formatDateTime(saved, false);
  },

  parseDate(raw) {
    if (!raw) return null;
    if (raw instanceof Date) return raw;
    const normalized = String(raw)
      .replace('T', ' ')
      .replace(/\.\d+Z?$/, '')
      .replace(/-/g, '/');
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
  },

  pad2(num) {
    return String(num).padStart(2, '0');
  },

  formatDateTime(date, includeYear = true) {
    if (!date) return '';
    const y = date.getFullYear();
    const m = this.pad2(date.getMonth() + 1);
    const d = this.pad2(date.getDate());
    const hh = this.pad2(date.getHours());
    const mm = this.pad2(date.getMinutes());
    return includeYear ? `${y}-${m}-${d} ${hh}:${mm}` : `${m}-${d} ${hh}:${mm}`;
  },

  formatRecordTime(raw) {
    if (!raw) return '';
    const dateOnly = typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim());
    if (dateOnly) return raw;

    const d = this.parseDate(raw);
    if (!d) return String(raw);

    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayDiff = Math.floor((startToday - startTarget) / 86400000);
    const hh = this.pad2(d.getHours());
    const mm = this.pad2(d.getMinutes());

    if (dayDiff === 0) return `今天 ${hh}:${mm}`;
    if (dayDiff === 1) return `昨天 ${hh}:${mm}`;
    return d.getFullYear() === now.getFullYear()
      ? this.formatDateTime(d, false)
      : this.formatDateTime(d);
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
          date: this.formatRecordTime(r.create_time || r.practice_date),
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
    const total = Number(sec) || 0;
    if (total <= 0) return '0秒';

    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    if (h > 0) {
      if (m === 0 && s === 0) return `${h}小时`;
      if (s === 0) return `${h}小时${m}分`;
      return `${h}小时${m}分${s}秒`;
    }
    if (m > 0) return s === 0 ? `${m}分` : `${m}分${s}秒`;
    return `${s}秒`;
  },

  loadMore() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 });
    this.loadHistory();
  },

  openRecordDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/history/detail/index?id=${id}` });
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
