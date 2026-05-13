const db = require('../config/database');

const OralCalcError = {
  async batchCreate(openid, errors) {
    if (!errors.length) return;
    const values = errors.map(e => [openid, e.expression, e.correctAnswer, e.userAnswer, e.opType]);
    await db.query(
      'INSERT INTO oral_calc_error (openid, expression, correct_answer, user_answer, op_type) VALUES ?',
      [values]
    );
  },

  async findByOpenid(openid, reviewed = 0, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const [rows] = await db.query(
      'SELECT * FROM oral_calc_error WHERE openid = ? AND reviewed = ? ORDER BY create_time DESC LIMIT ? OFFSET ?',
      [openid, reviewed, pageSize, offset]
    );
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) as total FROM oral_calc_error WHERE openid = ? AND reviewed = ?',
      [openid, reviewed]
    );
    return { list: rows, total };
  },

  async markReviewed(id, openid) {
    await db.query(
      'UPDATE oral_calc_error SET reviewed = 1, reviewed_at = NOW() WHERE id = ? AND openid = ?',
      [id, openid]
    );
  },

  /**
   * 按运算类型统计错题数量。
   * 返回 [{ op_type: 'add', count: 5 }, ...]
   */
  async getErrorCountByOpType(openid) {
    const [rows] = await db.query(
      'SELECT op_type, COUNT(*) as count FROM oral_calc_error WHERE openid = ? GROUP BY op_type ORDER BY count DESC',
      [openid]
    );
    return rows;
  },

  /**
   * 按时间段统计各运算类型的错题数量。
   */
  async getErrorCountByOpTypeInRange(openid, startDate, endDate) {
    const [rows] = await db.query(
      `SELECT op_type, COUNT(*) as count FROM oral_calc_error
       WHERE openid = ? AND create_time BETWEEN ? AND ?
       GROUP BY op_type ORDER BY count DESC`,
      [openid, `${startDate} 00:00:00`, `${endDate} 23:59:59`]
    );
    return rows;
  },
};

module.exports = OralCalcError;
