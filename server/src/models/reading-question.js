const db = require('../config/database');

const ReadingQuestion = {
  async getRandomByGrade(grade, count = 3) {
    const [rows] = await db.query(
      'SELECT * FROM reading_question WHERE grade = ? AND status = 1 ORDER BY RAND() LIMIT ?',
      [grade, count]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM reading_question WHERE id = ?', [id]);
    return rows[0] || null;
  },
};

module.exports = ReadingQuestion;
