const api = require('../../utils/request');
// TODO: 添加教育类目后启用 TTS 插件
// const plugin = requirePlugin('WechatSI');

Page({
  data: {
    questions: [],
    currentIndex: 0,
    totalCount: 3,
    currentQuestion: {},
    step: 1,
    selectedInfos: {},
    hasSelection: false,
    selectedQuestion: '',
    infoFeedback: [],
    questionFeedback: {},
    questionOptions: [],
  },

  _results: [],
  _startTime: 0,

  onLoad() {
    this._startTime = Date.now();
    this._results = [];
    this.loadQuestions();
  },

  async loadQuestions() {
    try {
      const res = await api.get('/reading/questions', { count: 3 });
      if (res.code === 0 && res.data.questions.length > 0) {
        this.setData({
          questions: res.data.questions,
          totalCount: res.data.questions.length,
        });
        this.showQuestion(0);
      } else {
        wx.showToast({ title: '暂无题目', icon: 'none' });
      }
    } catch (err) {
      console.error('Load questions error:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  showQuestion(index) {
    const q = this.data.questions[index];
    this.setData({
      currentIndex: index,
      currentQuestion: q,
      step: 1,
      selectedInfos: {},
      hasSelection: false,
      selectedQuestion: '',
      infoFeedback: [],
      questionFeedback: {},
      questionOptions: [],
    });
  },

  toggleInfo(e) {
    if (this.data.step !== 1) return;
    const id = e.currentTarget.dataset.id;
    const selected = { ...this.data.selectedInfos };
    selected[id] = !selected[id];
    if (!selected[id]) delete selected[id];
    this.setData({
      selectedInfos: selected,
      hasSelection: Object.keys(selected).length > 0,
    });
  },

  async submitInfos() {
    if (!this.data.hasSelection) return;

    const selectedIds = Object.keys(this.data.selectedInfos);
    try {
      const res = await api.post('/reading/submit', {
        questionId: this.data.currentQuestion.id,
        selectedInfoIds: selectedIds,
        selectedQuestionId: '__placeholder__',
      });

      if (res.code === 0) {
        const fb = res.data.feedback;
        const options = this.data.currentQuestion.options;
        const optionMap = {};
        options.forEach(o => { optionMap[o.id] = o.text; });

        const infoFeedback = [];
        fb.infos.correct.forEach(id => {
          infoFeedback.push({ id, text: optionMap[id], status: 'status-correct', icon: '✅' });
        });
        fb.infos.missed.forEach(id => {
          infoFeedback.push({ id, text: optionMap[id], status: 'status-missed', icon: '⚠️', hint: '你漏选了' });
        });
        fb.infos.extra.forEach(id => {
          const isDist = fb.distractors.includes(id);
          infoFeedback.push({
            id, text: optionMap[id],
            status: 'status-wrong', icon: '❌',
            hint: isDist ? '这不是数学信息哦' : '这是数学问题，不是信息',
          });
        });

        this.setData({
          step: 2,
          infoFeedback,
          questionOptions: this.data.currentQuestion.questionOptions,
          _feedback: fb,
        });
      }
    } catch (err) {
      console.error('Submit infos error:', err);
    }
  },

  selectQuestion(e) {
    if (this.data.step !== 2) return;
    this.setData({ selectedQuestion: e.currentTarget.dataset.id });
  },

  async submitQuestion() {
    if (!this.data.selectedQuestion) return;

    const selectedInfoIds = Object.keys(this.data.selectedInfos);
    try {
      const res = await api.post('/reading/submit', {
        questionId: this.data.currentQuestion.id,
        selectedInfoIds,
        selectedQuestionId: this.data.selectedQuestion,
      });

      if (res.code === 0) {
        const fb = res.data.feedback;
        const qOptionMap = {};
        this.data.questionOptions.forEach(o => { qOptionMap[o.id] = o.text; });

        const qCorrect = fb.question.isCorrect;
        this._results.push({
          questionId: this.data.currentQuestion.id,
          correct: res.data.correct,
          infoCorrect: fb.infos.missed.length === 0 && fb.infos.extra.length === 0,
          questionCorrect: qCorrect,
        });

        this.setData({
          step: 3,
          questionFeedback: {
            text: qOptionMap[fb.question.correct] || qOptionMap[this.data.selectedQuestion],
            status: qCorrect ? 'status-correct' : 'status-wrong',
            icon: qCorrect ? '✅' : '❌',
          },
        });
      }
    } catch (err) {
      console.error('Submit question error:', err);
    }
  },

  async nextQuestion() {
    const nextIndex = this.data.currentIndex + 1;
    if (nextIndex >= this.data.totalCount) {
      const durationSeconds = Math.floor((Date.now() - this._startTime) / 1000);
      const correctCount = this._results.filter(r => r.correct).length;

      await api.post('/reading/complete', {
        totalCount: this.data.totalCount,
        correctCount,
        durationSeconds,
      });

      wx.redirectTo({
        url: `/pages/reading/result?data=${encodeURIComponent(JSON.stringify({
          totalCount: this.data.totalCount,
          correctCount,
          results: this._results,
          durationSeconds,
        }))}`,
      });
    } else {
      this.showQuestion(nextIndex);
    }
  },

  playAudio() {
    wx.showToast({ title: '朗读功能即将上线', icon: 'none' });
  },
});
