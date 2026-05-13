const express = require('express');
const auth = require('../middleware/auth');
const ReadingQuestion = require('../models/reading-question');
const PracticeRecord = require('../models/practice-record');
const User = require('../models/user');
const Checkin = require('../models/checkin');

const router = express.Router();

function today() {
  return new Date().toISOString().slice(0, 10);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

router.get('/questions', auth, async (req, res) => {
  try {
    const user = await User.findByOpenid(req.openid);
    const count = parseInt(req.query.count, 10) || 3;
    const rows = await ReadingQuestion.getRandomByGrade(user.grade, count);

    const questions = rows.map(q => {
      const infos = typeof q.math_infos === 'string' ? JSON.parse(q.math_infos) : q.math_infos;
      const distractors = typeof q.distractors === 'string' ? JSON.parse(q.distractors) : q.distractors;
      const qDistractors = typeof q.question_distractors === 'string' ? JSON.parse(q.question_distractors) : (q.question_distractors || []);

      let optionId = 0;
      const allOptions = [
        ...infos.map(text => ({ id: String.fromCharCode(97 + optionId++), text })),
        ...distractors.map(text => ({ id: String.fromCharCode(97 + optionId++), text })),
        { id: String.fromCharCode(97 + optionId++), text: q.math_question },
      ];

      let qOptId = 0;
      const questionOptions = shuffle([
        { id: 'q0', text: q.math_question },
        ...qDistractors.map(text => ({ id: `q${++qOptId}`, text })),
      ]);

      return {
        id: q.id,
        content: q.content,
        audioUrl: q.audio_url,
        options: shuffle(allOptions),
        questionOptions,
      };
    });

    res.json({ code: 0, data: { questions }, message: 'ok' });
  } catch (err) {
    console.error('Get reading questions error:', err);
    res.json({ code: 5000, data: null, message: '获取题目失败' });
  }
});

router.post('/submit', auth, async (req, res) => {
  try {
    const { questionId, selectedInfoIds, selectedQuestionId } = req.body;
    const question = await ReadingQuestion.findById(questionId);
    if (!question) {
      return res.json({ code: 1002, data: null, message: '题目不存在' });
    }

    const infos = typeof question.math_infos === 'string' ? JSON.parse(question.math_infos) : question.math_infos;
    const distractors = typeof question.distractors === 'string' ? JSON.parse(question.distractors) : question.distractors;

    const allOptions = [];
    let optionId = 0;
    const infoIds = [];
    for (const text of infos) {
      const id = String.fromCharCode(97 + optionId++);
      allOptions.push({ id, text, type: 'info' });
      infoIds.push(id);
    }
    for (const text of distractors) {
      allOptions.push({ id: String.fromCharCode(97 + optionId++), text, type: 'distractor' });
    }
    const questionOptId = String.fromCharCode(97 + optionId);
    allOptions.push({ id: questionOptId, text: question.math_question, type: 'question' });

    const correctInfos = infoIds;
    const missed = correctInfos.filter(id => !selectedInfoIds.includes(id));
    const extra = selectedInfoIds.filter(id => !correctInfos.includes(id));
    const infoCorrect = missed.length === 0 && extra.length === 0;
    const questionCorrect = selectedQuestionId === 'q0';

    res.json({
      code: 0,
      data: {
        correct: infoCorrect && questionCorrect,
        feedback: {
          infos: {
            correct: selectedInfoIds.filter(id => correctInfos.includes(id)),
            missed,
            extra,
          },
          question: {
            correct: 'q0',
            userSelected: selectedQuestionId,
            isCorrect: questionCorrect,
          },
          distractors: allOptions.filter(o => o.type === 'distractor').map(o => o.id),
        },
      },
      message: 'ok',
    });
  } catch (err) {
    console.error('Submit reading error:', err);
    res.json({ code: 5000, data: null, message: '提交失败' });
  }
});

router.post('/complete', auth, async (req, res) => {
  try {
    const { totalCount, correctCount, durationSeconds } = req.body;
    const accuracy = totalCount > 0 ? correctCount / totalCount : 0;
    const stars = accuracy >= 1 ? 3 : accuracy >= 0.6 ? 2 : 1;

    await PracticeRecord.create({
      openid: req.openid,
      type: 'reading',
      practiceDate: today(),
      totalCount,
      correctCount,
      durationSeconds: durationSeconds || 0,
      starsEarned: stars,
      detail: null,
    });

    const levelResult = await User.addStarsAndUpdateLevel(req.openid, stars);
    await Checkin.upsert(req.openid, today(), 'reading_done');

    res.json({
      code: 0,
      data: { stars, accuracy: Math.round(accuracy * 100), levelUp: levelResult.levelUp, newLevel: levelResult.newLevel },
      message: 'ok',
    });
  } catch (err) {
    console.error('Complete reading error:', err);
    res.json({ code: 5000, data: null, message: '提交失败' });
  }
});

router.get('/today', auth, async (req, res) => {
  try {
    const record = await PracticeRecord.findTodayByType(req.openid, 'reading', today());
    res.json({ code: 0, data: { done: !!record, record }, message: 'ok' });
  } catch (err) {
    console.error('Get today reading error:', err);
    res.json({ code: 5000, data: null, message: '获取失败' });
  }
});

module.exports = router;
