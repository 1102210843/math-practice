const db = require('../config/database');

const User = {
  async findByOpenid(openid) {
    const [rows] = await db.query('SELECT * FROM user WHERE openid = ?', [openid]);
    return rows[0] || null;
  },

  async findByPhone(phone) {
    const [rows] = await db.query('SELECT * FROM user WHERE phone = ?', [phone]);
    return rows[0] || null;
  },

  async create(openid, sessionKey, phone) {
    const [result] = await db.query(
      'INSERT INTO user (openid, session_key, phone) VALUES (?, ?, ?)',
      [openid, sessionKey || '', phone || '']
    );
    return result.insertId;
  },

  async updateSessionKey(openid, sessionKey) {
    await db.query('UPDATE user SET session_key = ? WHERE openid = ?', [sessionKey || '', openid]);
  },

  async updatePhone(openid, phone) {
    await db.query('UPDATE user SET phone = ? WHERE openid = ?', [phone || '', openid]);
  },

  async updateUserInfo(openid, nickname, avatarUrl) {
    await db.query(
      'UPDATE user SET nickname = ?, avatar_url = ? WHERE openid = ?',
      [nickname || '', avatarUrl || '', openid]
    );
  },

  async updateGrade(openid, grade) {
    await db.query('UPDATE user SET grade = ? WHERE openid = ?', [grade, openid]);
  },

  async addStarsAndUpdateLevel(openid, stars) {
    await db.query(
      'UPDATE user SET total_stars = total_stars + ? WHERE openid = ?',
      [stars, openid]
    );
    const user = await this.findByOpenid(openid);
    const newLevel = this.calcLevel(user.total_stars);
    if (newLevel !== user.level) {
      await db.query('UPDATE user SET level = ? WHERE openid = ?', [newLevel, openid]);
      return { levelUp: true, oldLevel: user.level, newLevel };
    }
    return { levelUp: false };
  },

  calcLevel(totalStars) {
    if (totalStars >= 200) return 5;
    if (totalStars >= 100) return 4;
    if (totalStars >= 50) return 3;
    if (totalStars >= 20) return 2;
    return 1;
  },

  async updateStreak(openid, streakDays) {
    await db.query(
      'UPDATE user SET streak_days = ?, max_streak_days = GREATEST(max_streak_days, ?) WHERE openid = ?',
      [streakDays, streakDays, openid]
    );
  },

  async getBadges(openid) {
    const user = await this.findByOpenid(openid);
    if (!user) return [];
    const badges = [];
    if (user.max_streak_days >= 7) badges.push({ id: 'streak_7', name: '坚持一周', icon: '🏅', desc: '连续打卡7天' });
    if (user.max_streak_days >= 14) badges.push({ id: 'streak_14', name: '半月之星', icon: '🌟', desc: '连续打卡14天' });
    if (user.max_streak_days >= 30) badges.push({ id: 'streak_30', name: '月度冠军', icon: '👑', desc: '连续打卡30天' });
    if (user.total_stars >= 50) badges.push({ id: 'stars_50', name: '星星收集者', icon: '⭐', desc: '累计获得50颗星' });
    if (user.total_stars >= 200) badges.push({ id: 'stars_200', name: '星光闪耀', icon: '✨', desc: '累计获得200颗星' });
    if (user.level >= 3) badges.push({ id: 'level_3', name: '口算能手', icon: '🧮', desc: '达到3级' });
    if (user.level >= 5) badges.push({ id: 'level_5', name: '口算小达人', icon: '🎓', desc: '达到最高等级' });
    return badges;
  },
};

module.exports = User;
