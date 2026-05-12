const db = require('../config/database');
const User = require('./user');

const Checkin = {
  async findByDate(openid, date) {
    const [rows] = await db.query(
      'SELECT * FROM checkin WHERE openid = ? AND checkin_date = ?',
      [openid, date]
    );
    return rows[0] || null;
  },

  /**
   * 更新打卡状态。当 all_done 变为 true 时自动计算连续打卡天数。
   */
  async upsert(openid, date, field) {
    const existing = await this.findByDate(openid, date);
    let justCompletedAll = false;

    if (existing) {
      if (existing.all_done) return;

      const updates = { [field]: 1 };
      const otherDone = field === 'oral_calc_done' ? existing.reading_done : existing.oral_calc_done;
      if (otherDone) {
        updates.all_done = 1;
        justCompletedAll = true;
      }
      const sets = Object.entries(updates).map(([k]) => `${k} = ?`).join(', ');
      const vals = Object.values(updates);
      await db.query(
        `UPDATE checkin SET ${sets} WHERE openid = ? AND checkin_date = ?`,
        [...vals, openid, date]
      );
    } else {
      await db.query(
        `INSERT INTO checkin (openid, checkin_date, ${field}) VALUES (?, ?, 1)`,
        [openid, date]
      );
    }

    if (justCompletedAll) {
      await this.updateStreakDays(openid, date);
    }
  },

  /**
   * 计算并更新连续打卡天数。
   * 逻辑：从今天往前逐天检查 all_done，遇到缺失即停止。
   */
  async updateStreakDays(openid, todayStr) {
    let streak = 1;
    const d = new Date(todayStr + 'T00:00:00');

    while (true) {
      d.setDate(d.getDate() - 1);
      const prevDate = d.toISOString().slice(0, 10);
      const prev = await this.findByDate(openid, prevDate);
      if (prev && prev.all_done) {
        streak++;
      } else {
        break;
      }
    }

    await User.updateStreak(openid, streak);
  },

  /**
   * 每日首次访问时检查是否断签。
   * 如果昨天没有 all_done 且当前 streak_days > 0，重置为 0。
   */
  async checkStreakOnLogin(openid) {
    const user = await User.findByOpenid(openid);
    if (!user || user.streak_days === 0) return;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const todayCheckin = await this.findByDate(openid, todayStr);
    if (todayCheckin && todayCheckin.all_done) return;

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const yCheckin = await this.findByDate(openid, yesterdayStr);

    if (!yCheckin || !yCheckin.all_done) {
      await User.updateStreak(openid, 0);
    }
  },

  async getMonthly(openid, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    const [rows] = await db.query(
      'SELECT checkin_date, oral_calc_done, reading_done, all_done FROM checkin WHERE openid = ? AND checkin_date BETWEEN ? AND ?',
      [openid, startDate, endDate]
    );
    return rows;
  },
};

module.exports = Checkin;
