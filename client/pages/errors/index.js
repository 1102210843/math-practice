const api = require('../../utils/request');

Page({
  data: {
    tab: 'pending',
    list: [],
    hasMore: false,
    page: 1,
    loading: false,
  },

  _skipFirstOnShow: true,

  onLoad() {
    this.refreshList();
  },

  onShow() {
    if (this._skipFirstOnShow) {
      this._skipFirstOnShow = false;
      return;
    }
    this.refreshList();
  },

  refreshList() {
    this.setData({ page: 1, list: [] });
    this.loadErrors();
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab });
    this.refreshList();
  },

  async loadErrors() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const reviewed = this.data.tab === 'reviewed' ? 1 : 0;
      const res = await api.get('/oral-calc/errors', { reviewed, page: this.data.page });
      if (res.code === 0) {
        const newList = this.data.page === 1 ? res.data.list : [...this.data.list, ...res.data.list];
        this.setData({
          list: newList,
          hasMore: newList.length < res.data.total,
        });
      }
    } catch (err) {
      console.error('Load errors:', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  loadMore() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 });
    this.loadErrors();
  },

  startReview(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.list[index];
    if (!item) return;
    const payload = encodeURIComponent(JSON.stringify({
      id: item.id,
      expression: item.expression,
      correct_answer: item.correct_answer,
      user_answer: item.user_answer,
    }));
    wx.navigateTo({ url: `/pages/errors/review/index?data=${payload}` });
  },
});
