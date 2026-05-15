const { GRADE_CONFIG } = require('../../../utils/oral-calc-generator');

const GRADE_LABEL = {
  '1-up': '一年级上册',
  '1-down': '一年级下册',
  '2-up': '二年级上册',
  '2-down': '二年级下册',
};

const TYPE_META = {
  '+':  { type: 'add', symbol: '+', name: '加法', color: '#3478F6', bg: '#EBF2FF' },
  '-':  { type: 'sub', symbol: '−', name: '减法', color: '#FF6B35', bg: '#FFF0E6' },
  '×':  { type: 'mul', symbol: '×', name: '乘法', color: '#43A047', bg: '#E8F5E9' },
  '÷':  { type: 'div', symbol: '÷', name: '除法', color: '#8E24AA', bg: '#F3E5F5' },
};

function buildDesc(grade, op) {
  const cfg = GRADE_CONFIG[grade];
  const max = cfg.range[1];
  if (op === '+') {
    return cfg.noCarry ? `${max}以内不进位` : `${max}以内`;
  }
  if (op === '-') {
    return cfg.noCarry ? `${max}以内不退位` : `${max}以内`;
  }
  if (op === '×') return '表内乘法';
  if (op === '÷') return '表内除法';
  return '';
}

Page({
  data: {
    gradeText: '',
    types: [],
  },

  onLoad() {
    const app = getApp();
    const grade = app.globalData.grade || '1-up';
    const cfg = GRADE_CONFIG[grade];
    if (!cfg) return;

    const types = cfg.ops.map(op => ({
      ...TYPE_META[op],
      desc: buildDesc(grade, op),
    }));

    this.setData({
      gradeText: GRADE_LABEL[grade] || grade,
      types,
    });
  },

  pickType(e) {
    const type = e.currentTarget.dataset.type;
    wx.navigateTo({ url: `/pages/oral-calc/index?type=${type}` });
  },
});
