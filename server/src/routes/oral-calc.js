const express = require('express');
const auth = require('../middleware/auth');
const PracticeRecord = require('../models/practice-record');
const OralCalcError = require('../models/oral-calc-error');
const User = require('../models/user');
const Checkin = require('../models/checkin');

const router = express.Router();

function today() {
  return new Date().toISOString().slice(0, 10);
}

function detectOpType(expression) {
  if (expression.includes('+')) return 'add';
  if (expression.includes('-')) return 'sub';
  if (expression.includes('×') || expression.includes('*')) return 'mul';
  if (expression.includes('÷') || expression.includes('/')) return 'div';
  return 'unknown';
}

router.get('/today', auth, async (req, res) => {
  try {
    const record = await PracticeRecord.findTodayByType(req.openid, 'oral_calc', today());
    res.json({
      code: 0,
      data: { done: !!record, record },
      message: 'ok',
    });
  } catch (err) {
    console.error('Get today oral-calc error:', err);
    res.json({ code: 5000, data: null, message: '获取失败' });
  }
});

router.post('/submit', auth, async (req, res) => {
  try {
    const { count, durationSeconds, items } = req.body;
    if (!items || !items.length) {
      return res.json({ code: 1001, data: null, message: '答题数据不能为空' });
    }

    const errors = [];
    let correctCount = 0;

    for (const item of items) {
      if (item.userAnswer === item.correctAnswer) {
        correctCount++;
      } else {
        errors.push({
          expression: item.expression,
          correctAnswer: item.correctAnswer,
          userAnswer: item.userAnswer,
          opType: detectOpType(item.expression),
        });
      }
    }

    const accuracy = correctCount / items.length;
    const stars = accuracy >= 1 ? 3 : accuracy >= 0.8 ? 2 : 1;

    await PracticeRecord.create({
      openid: req.openid,
      type: 'oral_calc',
      practiceDate: today(),
      totalCount: items.length,
      correctCount,
      durationSeconds: durationSeconds || 0,
      starsEarned: stars,
      detail: items,
    });

    if (errors.length) {
      await OralCalcError.batchCreate(req.openid, errors);
    }

    const levelResult = await User.addStarsAndUpdateLevel(req.openid, stars);
    await Checkin.upsert(req.openid, today(), 'oral_calc_done');

    res.json({
      code: 0,
      data: {
        stars,
        accuracy: Math.round(accuracy * 100),
        correctCount,
        totalCount: items.length,
        errors: errors.map(e => ({
          expression: e.expression,
          correctAnswer: e.correctAnswer,
          userAnswer: e.userAnswer,
        })),
        levelUp: levelResult.levelUp,
        newLevel: levelResult.newLevel,
      },
      message: 'ok',
    });
  } catch (err) {
    console.error('Submit oral-calc error:', err);
    res.json({ code: 5000, data: null, message: '提交失败' });
  }
});

router.get('/errors', auth, async (req, res) => {
  try {
    const reviewed = parseInt(req.query.reviewed, 10) || 0;
    const page = parseInt(req.query.page, 10) || 1;
    const result = await OralCalcError.findByOpenid(req.openid, reviewed, page);
    res.json({ code: 0, data: result, message: 'ok' });
  } catch (err) {
    console.error('Get errors:', err);
    res.json({ code: 5000, data: null, message: '获取错题失败' });
  }
});

router.post('/review', auth, async (req, res) => {
  try {
    const { errorId } = req.body;
    await OralCalcError.markReviewed(errorId, req.openid);
    res.json({ code: 0, data: { reviewed: true }, message: 'ok' });
  } catch (err) {
    console.error('Review error:', err);
    res.json({ code: 5000, data: null, message: '订正失败' });
  }
});

module.exports = router;
