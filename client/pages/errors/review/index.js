const api = require('../../../utils/request');

Page({
  data: {
    reviewItem: null,
    reviewInput: '',
    reviewFeedback: '',
    reviewCorrect: false,
  },

  _autoBackTimer: null,

  onLoad(options) {
    try {
      const item = JSON.parse(decodeURIComponent(options.data || ''));
      if (!item || !item.id) throw new Error('invalid review item');
      this.setData({ reviewItem: item });
    } catch (err) {
      console.error('Parse review item error:', err);
      wx.showToast({ title: '错题数据异常', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 500);
    }
  },

  onUnload() {
    if (this._autoBackTimer) {
      clearTimeout(this._autoBackTimer);
      this._autoBackTimer = null;
    }
  },

  exitReview() {
    if (this._autoBackTimer) {
      clearTimeout(this._autoBackTimer);
      this._autoBackTimer = null;
    }
    wx.navigateBack();
  },

  onReviewKey(e) {
    if (this.data.reviewFeedback) return;
    const key = e.currentTarget.dataset.key;
    if (key === 'del') {
      this.setData({ reviewInput: this.data.reviewInput.slice(0, -1) });
      return;
    }
    if (this.data.reviewInput.length >= 4) return;
    this.setData({ reviewInput: this.data.reviewInput + key });
  },

  async confirmReview() {
    if (!this.data.reviewItem) return;
    if (!this.data.reviewInput || this.data.reviewFeedback) {
      if (this.data.reviewFeedback) this.exitReview();
      return;
    }

    const userAnswer = parseInt(this.data.reviewInput, 10);
    const correct = userAnswer === this.data.reviewItem.correct_answer;

    if (correct) {
      try {
        await api.post('/oral-calc/review', { errorId: this.data.reviewItem.id });
      } catch (err) {
        console.error('Review error:', err);
        wx.showToast({ title: '提交失败，请重试', icon: 'none' });
        return;
      }
    }

    this.setData({
      reviewFeedback: correct ? 'correct' : 'wrong',
      reviewCorrect: correct,
    });

    if (correct) {
      this._autoBackTimer = setTimeout(() => {
        this.exitReview();
      }, 1000);
    }
  },
});
