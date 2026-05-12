const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const oralCalcRoutes = require('./routes/oral-calc');
const readingRoutes = require('./routes/reading');
const checkinRoutes = require('./routes/checkin');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, '../public')));

app.get('/health', (req, res) => res.json({
  status: 'ok',
  version: process.env.APP_VERSION || 'dev',
  sha: process.env.BUILD_SHA || 'unknown',
}));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/oral-calc', oralCalcRoutes);
app.use('/api/reading', readingRoutes);
app.use('/api/checkin', checkinRoutes);

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ code: 5000, data: null, message: '服务器内部错误' });
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
