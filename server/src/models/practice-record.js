const db = require('../config/database');

const PracticeRecord = {
  async create({ openid, type, practiceDate, totalCount, correctCount, durationSeconds, starsEarned, detail }) {
    const [result] = await db.query(
      `INSERT INTO practice_record (openid, type, practice_date, total_count, correct_count, duration_seconds, stars_earned, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [openid, type, practiceDate, totalCount, correctCount, durationSeconds, starsEarned, JSON.stringify(detail)]
    );
    return result.insertId;
  },

  async findTodayByType(openid, type, date) {
    const [rows] = await db.query(
      'SELECT * FROM practice_record WHERE openid = ? AND type = ? AND practice_date = ? ORDER BY create_time DESC LIMIT 1',
      [openid, type, date]
    );
    return rows[0] || null;
  },

  async getStatsByDateRange(openid, type, startDate, endDate) {
    const [rows] = await db.query(
      `SELECT practice_date, total_count, correct_count, duration_seconds
       FROM practice_record
       WHERE openid = ? AND type = ? AND practice_date BETWEEN ? AND ?
       ORDER BY practice_date`,
      [openid, type, startDate, endDate]
    );
    return rows;
  },
};

module.exports = PracticeRecord;
