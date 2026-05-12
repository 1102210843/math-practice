const express = require('express');
const auth = require('../middleware/auth');
const Checkin = require('../models/checkin');
const PracticeRecord = require('../models/practice-record');
const OralCalcError = require('../models/oral-calc-error');

const router = express.Router();

function today() {
  return new Date().toISOString().slice(0, 10);
}

router.get('/today', auth, async (req, res) => {
  try {
    const record = await Checkin.findByDate(req.openid, today());
    res.json({
      code: 0,
      data: {
        oralCalcDone: record?.oral_calc_done === 1,
        readingDone: record?.reading_done === 1,
        allDone: record?.all_done === 1,
      },
      message: 'ok',
    });
  } catch (err) {
    console.error('Get today checkin error:', err);
    res.json({ code: 5000, data: null, message: '获取失败' });
  }
});

router.get('/calendar', auth, async (req, res) => {
  try {
    const monthStr = req.query.month || today().slice(0, 7);
    const [year, month] = monthStr.split('-').map(Number);
    const days = await Checkin.getMonthly(req.openid, year, month);
    res.json({
      code: 0,
      data: {
        days: days.map(d => ({
          date: d.checkin_date,
          oralCalcDone: d.oral_calc_done === 1,
          readingDone: d.reading_done === 1,
          allDone: d.all_done === 1,
        })),
      },
      message: 'ok',
    });
  } catch (err) {
    console.error('Get calendar error:', err);
    res.json({ code: 5000, data: null, message: '获取日历失败' });
  }
});

router.get('/report', auth, async (req, res) => {
  try {
    const range = req.query.range || 'week';
    const end = today();
    const start = new Date();
    start.setDate(start.getDate() - (range === 'month' ? 30 : 7));
    const startStr = start.toISOString().slice(0, 10);

    const oralStats = await PracticeRecord.getStatsByDateRange(req.openid, 'oral_calc', startStr, end);
    const readingStats = await PracticeRecord.getStatsByDateRange(req.openid, 'reading', startStr, end);

    const oralAccTrend = oralStats.map(r => r.total_count > 0 ? Math.round((r.correct_count / r.total_count) * 100) : 0);
    const avgOralAcc = oralStats.length > 0
      ? Math.round(oralStats.reduce((sum, r) => sum + r.correct_count, 0) / oralStats.reduce((sum, r) => sum + r.total_count, 0) * 100)
      : 0;
    const avgDuration = oralStats.length > 0
      ? Math.round(oralStats.reduce((sum, r) => sum + r.duration_seconds, 0) / oralStats.length)
      : 0;

    const errorsByOp = await OralCalcError.getErrorCountByOpTypeInRange(req.openid, startStr, end);
    const totalErrors = errorsByOp.reduce((sum, e) => sum + e.count, 0);

    const OP_NAMES = { add: '加法', sub: '减法', mul: '乘法', div: '除法' };
    const weakOps = errorsByOp.map(e => ({
      type: e.op_type,
      name: OP_NAMES[e.op_type] || e.op_type,
      count: e.count,
      percent: totalErrors > 0 ? Math.round((e.count / totalErrors) * 100) : 0,
    }));

    res.json({
      code: 0,
      data: {
        oralCalc: {
          totalPractices: oralStats.length,
          avgAccuracy: avgOralAcc,
          avgDurationSeconds: avgDuration,
          accuracyTrend: oralAccTrend,
          weakOps,
          totalErrors,
        },
        reading: {
          totalPractices: readingStats.length,
          avgAccuracy: readingStats.length > 0
            ? Math.round(readingStats.reduce((s, r) => s + r.correct_count, 0) / readingStats.reduce((s, r) => s + r.total_count, 0) * 100)
            : 0,
        },
      },
      message: 'ok',
    });
  } catch (err) {
    console.error('Get report error:', err);
    res.json({ code: 5000, data: null, message: '获取报告失败' });
  }
});

module.exports = router;
