const api = require('../../utils/request');

Page({
  data: {
    tab: 'pending',
    list: [],
    hasMore: false,
    page: 1,
    reviewMode: false,
    reviewItem: null,
    reviewInput: '',
    reviewFeedback: '',
    reviewCorrect: false,
  },

  _reviewIndex: 0,

  onLoad() {
    this.loadErrors();
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab, page: 1, list: [], reviewMode: false });
    this.loadErrors();
  },

  async loadErrors() {
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
    }
  },

  loadMore() {
    this.setData({ page: this.data.page + 1 });
    this.loadErrors();
  },

  startReview(e) {
    const index = e.currentTarget.dataset.index;
    this._reviewIndex = index;
    this.setData({
      reviewMode: true,
      reviewItem: this.data.list[index],
      reviewInput: '',
      reviewFeedback: '',
    });
  },

  onReviewKey(e) {
    if (this.data.reviewFeedback) return;
    const key = e.currentTarget.dataset.key;
    if (key === 'del') {
      this.setData({ reviewInput: this.data.reviewInput.slice(0, -1) });
    } else {
      if (this.data.reviewInput.length >= 4) return;
      this.setData({ reviewInput: this.data.reviewInput + key });
    }
  },

  async confirmReview() {
    if (!this.data.reviewInput || this.data.reviewFeedback) {
      if (this.data.reviewFeedback) {
        this.setData({ reviewMode: false });
        if (this.data.reviewCorrect) {
          this.setData({ page: 1 });
          this.loadErrors();
        }
      }
      return;
    }

    const userAnswer = parseInt(this.data.reviewInput, 10);
    const correct = userAnswer === this.data.reviewItem.correct_answer;

    if (correct) {
      try {
        await api.post('/oral-calc/review', { errorId: this.data.reviewItem.id });
      } catch (err) {
        console.error('Review error:', err);
      }
    }

    this.setData({
      reviewFeedback: correct ? 'correct' : 'wrong',
      reviewCorrect: correct,
    });
  },
});
