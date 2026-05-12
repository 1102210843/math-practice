const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { code2session, getPhoneNumber, getAccessToken } = require('../services/wechat');
const User = require('../models/user');
const Checkin = require('../models/checkin');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { code, phoneCode } = req.body;
    if (!code) {
      return res.json({ code: 1001, data: null, message: 'code不能为空' });
    }

    const wxData = await code2session(code);
    const { openid, session_key } = wxData;

    let phone = null;
    if (phoneCode) {
      try {
        const accessToken = await getAccessToken();
        const phoneData = await getPhoneNumber(phoneCode, accessToken);
        if (phoneData.phone_info) {
          phone = phoneData.phone_info.phoneNumber;
        }
      } catch (phoneErr) {
        console.error('Get phone error:', phoneErr);
      }
    }

    let user = await User.findByOpenid(openid);
    let isNew = false;

    if (!user) {
      await User.create(openid, session_key, phone);
      user = await User.findByOpenid(openid);
      isNew = true;
    } else {
      await User.updateSessionKey(openid, session_key);
      if (phone && !user.phone) {
        await User.updatePhone(openid, phone);
      }
      await Checkin.checkStreakOnLogin(openid);
    }

    const token = jwt.sign({ openid }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.json({
      code: 0,
      data: { token, isNew, grade: user.grade, phone },
      message: 'ok',
    });
  } catch (err) {
    console.error('Login error:', err);
    res.json({ code: 5000, data: null, message: '登录失败' });
  }
});

module.exports = router;
