const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/user');

const router = express.Router();

const VALID_GRADES = ['1-up', '1-down', '2-up', '2-down'];

router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findByOpenid(req.openid);
    if (!user) return res.json({ code: 401, data: null, message: '用户不存在' });

    res.json({
      code: 0,
      data: {
        nickname: user.nickname || '口算小达人',
        avatarUrl: user.avatar_url,
        grade: user.grade,
        totalStars: user.total_stars,
        level: user.level,
        streakDays: user.streak_days,
        maxStreakDays: user.max_streak_days,
      },
      message: 'ok',
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.json({ code: 5000, data: null, message: '获取用户信息失败' });
  }
});

router.put('/grade', auth, async (req, res) => {
  try {
    const { grade } = req.body;
    if (!VALID_GRADES.includes(grade)) {
      return res.json({ code: 1001, data: null, message: '年级参数无效' });
    }
    await User.updateGrade(req.openid, grade);
    res.json({ code: 0, data: { success: true }, message: 'ok' });
  } catch (err) {
    console.error('Update grade error:', err);
    res.json({ code: 5000, data: null, message: '更新年级失败' });
  }
});

router.get('/badges', auth, async (req, res) => {
  try {
    const badges = await User.getBadges(req.openid);
    res.json({ code: 0, data: { badges }, message: 'ok' });
  } catch (err) {
    console.error('Get badges error:', err);
    res.json({ code: 5000, data: null, message: '获取徽章失败' });
  }
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { nickname, avatarUrl } = req.body;
    console.log('Update profile:', { openid: req.openid, nickname, avatarUrl });
    await User.updateUserInfo(req.openid, nickname, avatarUrl);
    res.json({ code: 0, data: { success: true }, message: 'ok' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.json({ code: 5000, data: null, message: '更新用户信息失败' });
  }
});

module.exports = router;
