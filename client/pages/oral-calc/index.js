const { generateQuestions } = require('../../utils/oral-calc-generator');
const api = require('../../utils/request');

Page({
  data: {
    questions: [],
    currentIndex: 0,
    totalCount: 10,
    currentExpression: '',
    userInput: '',
    correctAnswer: 0,
    showFeedback: false,
    feedbackCorrect: false,
    feedbackClass: '',
    progressPercent: 0,
    timerText: '00:00',
    startTime: 0,
  },

  _timer: null,
  _results: [],

  onLoad() {
    const app = getApp();
    const grade = app.globalData.grade || '1-up';
    const count = wx.getStorageSync('questionCount') || 10;
    const questions = generateQuestions(grade, count);

    this._results = [];
    this.setData({
      questions,
      totalCount: count,
      currentIndex: 0,
      startTime: Date.now(),
    });

    this.showQuestion(0);
    this.startTimer();
  },

  onUnload() {
    this.stopTimer();
  },

  showQuestion(index) {
    const q = this.data.questions[index];
    this.setData({
      currentExpression: q.expression,
      correctAnswer: q.answer,
      userInput: '',
      showFeedback: false,
      feedbackClass: '',
      progressPercent: Math.round((index / this.data.totalCount) * 100),
    });
  },

  startTimer() {
    this._timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.data.startTime) / 1000);
      const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const sec = String(elapsed % 60).padStart(2, '0');
      this.setData({ timerText: `${min}:${sec}` });
    }, 1000);
  },

  stopTimer() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  },

  onKeyTap(e) {
    if (this.data.showFeedback) return;
    const key = e.currentTarget.dataset.key;
    if (key === 'del') {
      this.setData({ userInput: this.data.userInput.slice(0, -1) });
    } else {
      if (this.data.userInput.length >= 4) return;
      this.setData({ userInput: this.data.userInput + key });
    }
  },

  onConfirm() {
    if (this.data.showFeedback || this.data.userInput === '') return;

    const userAnswer = parseInt(this.data.userInput, 10);
    const correct = userAnswer === this.data.correctAnswer;
    const q = this.data.questions[this.data.currentIndex];

    this._results.push({
      expression: q.expression,
      correctAnswer: q.answer,
      userAnswer,
      correct,
      timeMs: Date.now() - this.data.startTime,
    });

    this.setData({
      showFeedback: true,
      feedbackCorrect: correct,
      feedbackClass: correct ? 'feedback-correct' : 'feedback-wrong',
    });

    const delay = correct ? 800 : 1500;
    setTimeout(() => {
      const nextIndex = this.data.currentIndex + 1;
      if (nextIndex >= this.data.totalCount) {
        this.submitAndShowResult();
      } else {
        this.setData({ currentIndex: nextIndex });
        this.showQuestion(nextIndex);
      }
    }, delay);
  },

  async submitAndShowResult() {
    this.stopTimer();
    const durationSeconds = Math.floor((Date.now() - this.data.startTime) / 1000);

    try {
      const res = await api.post('/oral-calc/submit', {
        count: this.data.totalCount,
        durationSeconds,
        items: this._results.map(r => ({
          expression: r.expression,
          correctAnswer: r.correctAnswer,
          userAnswer: r.userAnswer,
          timeMs: r.timeMs,
        })),
      });

      const resultData = res.code === 0 ? res.data : {
        stars: 0,
        accuracy: 0,
        correctCount: this._results.filter(r => r.correct).length,
        totalCount: this.data.totalCount,
        errors: this._results.filter(r => !r.correct),
      };

      wx.redirectTo({
        url: `/pages/oral-calc/result?data=${encodeURIComponent(JSON.stringify({
          ...resultData,
          durationSeconds,
        }))}`,
      });
    } catch (err) {
      console.error('Submit error:', err);
      const correctCount = this._results.filter(r => r.correct).length;
      wx.redirectTo({
        url: `/pages/oral-calc/result?data=${encodeURIComponent(JSON.stringify({
          stars: 0,
          accuracy: Math.round((correctCount / this.data.totalCount) * 100),
          correctCount,
          totalCount: this.data.totalCount,
          errors: this._results.filter(r => !r.correct),
          durationSeconds,
        }))}`,
      });
    }
  },
});
