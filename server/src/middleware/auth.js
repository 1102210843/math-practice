const jwt = require('jsonwebtoken');
const config = require('../config');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.json({ code: 401, data: null, message: '未登录' });
  }
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.openid = decoded.openid;
    next();
  } catch {
    return res.json({ code: 401, data: null, message: '登录已过期' });
  }
}

module.exports = authMiddleware;
