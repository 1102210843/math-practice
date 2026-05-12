# 小学数学每日练习小程序 — 技术设计方案

## 一、项目目录结构

```
math-practice/
├── client/                          # 微信小程序前端
│   ├── pages/
│   │   ├── login/                   # 登录引导页
│   │   ├── index/                   # 首页（今日练习入口 + 打卡日历）
│   │   ├── oral-calc/               # 口算练习页 + 结果页
│   │   ├── reading/                 # 读题训练页 + 结果页
│   │   ├── report/                  # 成长报告页（趋势图 + 薄弱项 + 插图）
│   │   ├── errors/                  # 口算错题本（查看 + 订正）
│   │   ├── mine/                    # 我的（头像/昵称 + 设置 + 徽章）
│   │   ├── privacy/                 # 隐私政策页
│   │   └── agreement/               # 用户协议页
│   ├── images/                      # 图片资源
│   │   ├── mascot.png               # 吉祥物
│   │   ├── illust-reading.png       # 报告页读题插图
│   │   ├── illust-checkin.png       # 报告页打卡插图
│   │   ├── illust-nodata.png        # 暂无数据占位插图
│   │   ├── icon-oral-calc.png       # 首页口算任务图标
│   │   ├── icon-reading.png         # 首页读题任务图标
│   │   └── tab-*.png                # 底部导航栏图标（6个）
│   ├── utils/
│   │   ├── request.js               # 封装 wx.request（含 BASE_URL / STATIC_URL）
│   │   ├── oral-calc-generator.js   # 口算题本地生成算法
│   │   └── audio.js                 # 音效播放工具
│   ├── app.js
│   ├── app.json
│   ├── app.wxss
│   ├── project.config.json
│   └── sitemap.json
│
├── server/                          # Node.js + Express 后端
│   ├── src/
│   │   ├── app.js                   # Express 入口（含 /health 版本接口）
│   │   ├── config/
│   │   │   ├── database.js          # MySQL 连接池
│   │   │   └── index.js             # 环境变量（PORT / DB_* / JWT / WX_*）
│   │   ├── middleware/
│   │   │   └── auth.js              # JWT 校验中间件
│   │   ├── routes/
│   │   │   ├── auth.js              # /api/auth（微信登录）
│   │   │   ├── user.js              # /api/user（个人信息 + 徽章）
│   │   │   ├── oral-calc.js         # /api/oral-calc（口算练习 + 错题）
│   │   │   ├── reading.js           # /api/reading（读题训练）
│   │   │   └── checkin.js           # /api/checkin（打卡 + 报告）
│   │   ├── services/
│   │   │   └── wechat.js            # 微信 code2session
│   │   ├── models/
│   │   │   ├── user.js              # 用户 CRUD + 星星/等级计算
│   │   │   ├── practice-record.js   # 练习记录
│   │   │   ├── oral-calc-error.js   # 口算错题 + 薄弱项统计
│   │   │   ├── reading-question.js  # 读题题库
│   │   │   └── checkin.js           # 打卡记录 + 连续天数
│   │   └── scripts/
│   │       └── init-db.js           # 建表 + 种子数据
│   ├── public/                      # 静态文件（/static 路由）
│   ├── Dockerfile                   # 生产镜像（node:20-alpine, 多阶段构建）
│   ├── .dockerignore
│   ├── .env.example
│   └── package.json
│
├── .github/
│   └── workflows/
│       └── docker-build.yml         # GitHub Actions：构建 Docker 镜像 → GHCR
│
├── docs/
│   ├── PRD.md
│   ├── TECH-DESIGN.md
│   └── UI-WIREFRAME.md
│
├── .gitignore
├── .editorconfig
├── .gitattributes
└── README.md
```

---

## 二、数据库建表 SQL

> 注：不使用外键，表间通过 openid / question_id 关联查询。

```sql
-- --------------------------------------------------
-- 用户表
-- --------------------------------------------------
CREATE TABLE `user` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `openid` VARCHAR(64) NOT NULL,
  `session_key` VARCHAR(64) DEFAULT NULL,
  `nickname` VARCHAR(50) DEFAULT NULL COMMENT '用户昵称',
  `avatar_url` VARCHAR(500) DEFAULT NULL COMMENT '头像地址',
  `grade` VARCHAR(10) NOT NULL DEFAULT '1-up' COMMENT '年级: 1-up/1-down/2-up/2-down',
  `total_stars` INT UNSIGNED NOT NULL DEFAULT 0,
  `level` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '等级 1-5',
  `streak_days` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '当前连续打卡天数',
  `max_streak_days` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '历史最长连续打卡',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid` (`openid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- --------------------------------------------------
-- 练习记录表
-- --------------------------------------------------
CREATE TABLE `practice_record` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `openid` VARCHAR(64) NOT NULL,
  `type` VARCHAR(20) NOT NULL COMMENT 'oral_calc / reading',
  `practice_date` DATE NOT NULL COMMENT '练习日期',
  `total_count` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `correct_count` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `duration_seconds` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '总用时(秒)',
  `stars_earned` SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '本次获得星星',
  `detail` JSON DEFAULT NULL COMMENT '每题明细 [{expression, answer, userAnswer, correct, timeMs}]',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_openid_date` (`openid`, `practice_date`),
  KEY `idx_openid_type` (`openid`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='练习记录表';

-- --------------------------------------------------
-- 口算错题表
-- --------------------------------------------------
CREATE TABLE `oral_calc_error` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `openid` VARCHAR(64) NOT NULL,
  `expression` VARCHAR(30) NOT NULL COMMENT '算式 如 7+5',
  `correct_answer` INT NOT NULL,
  `user_answer` INT NOT NULL,
  `op_type` VARCHAR(10) NOT NULL COMMENT 'add/sub/mul/div',
  `reviewed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0未订正 1已订正',
  `error_count` SMALLINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '该题累计错误次数',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_openid_reviewed` (`openid`, `reviewed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='口算错题表';

-- --------------------------------------------------
-- 读题题库表
-- --------------------------------------------------
CREATE TABLE `reading_question` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `grade` VARCHAR(10) NOT NULL COMMENT '适用年级: 1-up/1-down/2-up/2-down',
  `difficulty` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '难度 1-3',
  `content` TEXT NOT NULL COMMENT '题目正文',
  `math_infos` JSON NOT NULL COMMENT '数学信息列表 ["小明有12个苹果","送给小红5个"]',
  `math_question` VARCHAR(200) NOT NULL COMMENT '数学问题',
  `distractors` JSON NOT NULL COMMENT '干扰项列表 ["今天天气很好"]',
  `answer` INT DEFAULT NULL COMMENT '参考答案(数值)',
  `audio_url` VARCHAR(500) DEFAULT NULL COMMENT 'TTS音频地址',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1上线 0下线',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_grade_status` (`grade`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='读题题库表';

-- --------------------------------------------------
-- 读题错题表
-- --------------------------------------------------
CREATE TABLE `reading_error` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `openid` VARCHAR(64) NOT NULL,
  `question_id` BIGINT UNSIGNED NOT NULL,
  `error_type` VARCHAR(20) NOT NULL COMMENT 'miss_info/extra_info/wrong_question',
  `user_infos` JSON DEFAULT NULL COMMENT '用户选的数学信息',
  `user_question` VARCHAR(200) DEFAULT NULL COMMENT '用户选的数学问题',
  `reviewed` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_openid` (`openid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='读题错题表';

-- --------------------------------------------------
-- 打卡记录表
-- --------------------------------------------------
CREATE TABLE `checkin` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `openid` VARCHAR(64) NOT NULL,
  `checkin_date` DATE NOT NULL,
  `oral_calc_done` TINYINT(1) NOT NULL DEFAULT 0,
  `reading_done` TINYINT(1) NOT NULL DEFAULT 0,
  `all_done` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '当日任务全部完成',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid_date` (`openid`, `checkin_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打卡记录表';
```

---

## 三、API 接口清单

### 3.1 认证模块

| 方法 | 路径 | 说明 | 请求 | 响应 |
|------|------|------|------|------|
| POST | `/api/auth/login` | 微信登录 | `{ code }` | `{ token, isNew, grade }` |

### 3.2 用户模块

| 方法 | 路径 | 说明 | 请求 | 响应 |
|------|------|------|------|------|
| GET | `/api/user/profile` | 获取用户信息 | — | `{ grade, totalStars, level, streakDays, maxStreakDays, nickname, avatarUrl }` |
| PUT | `/api/user/profile` | 更新昵称/头像 | `{ nickname?, avatarUrl? }` | `{ success }` |
| PUT | `/api/user/grade` | 切换年级 | `{ grade }` | `{ success }` |
| GET | `/api/user/badges` | 获取已解锁徽章 | — | `{ badges[] }` |

### 3.3 口算练习模块

| 方法 | 路径 | 说明 | 请求 | 响应 |
|------|------|------|------|------|
| GET | `/api/oral-calc/today` | 获取今日口算状态 | — | `{ done, record? }` |
| POST | `/api/oral-calc/submit` | 提交口算练习结果 | 见下方 | `{ stars, accuracy, errors[], levelUp, newLevel }` |
| GET | `/api/oral-calc/errors` | 获取错题列表 | `?reviewed=0&page=1` | `{ list[], total }` |
| POST | `/api/oral-calc/review` | 错题订正 | `{ errorId, answer }` | `{ correct, reviewed }` |

**口算提交请求体**：

```json
{
  "count": 10,
  "durationSeconds": 180,
  "items": [
    {
      "expression": "7+5",
      "correctAnswer": 12,
      "userAnswer": 12,
      "timeMs": 3200
    },
    {
      "expression": "13-6",
      "correctAnswer": 7,
      "userAnswer": 8,
      "timeMs": 5100
    }
  ]
}
```

> 口算题由前端本地算法生成，提交时将完整作答记录发送后端。后端校验答案、记录错题、计算星星。

### 3.4 读题训练模块

| 方法 | 路径 | 说明 | 请求 | 响应 |
|------|------|------|------|------|
| GET | `/api/reading/questions` | 获取今日读题题目 | `?count=3` | `{ questions[] }` |
| POST | `/api/reading/submit` | 提交单题读题结果 | 见下方 | `{ correct, feedback }` |
| POST | `/api/reading/complete` | 完成今日读题并结算 | `{ results[] }` | `{ stars }` |
| GET | `/api/reading/today` | 获取今日读题状态 | — | `{ done, record? }` |

**获取题目响应体**：

```json
{
  "questions": [
    {
      "id": 42,
      "content": "小明有12个苹果，送给小红5个，又买了3个。小明现在有多少个苹果？",
      "audioUrl": "https://cdn.xxx.com/audio/q42.mp3",
      "options": [
        { "id": "a", "text": "小明有12个苹果" },
        { "id": "b", "text": "送给小红5个" },
        { "id": "c", "text": "又买了3个" },
        { "id": "d", "text": "今天天气真好" },
        { "id": "e", "text": "小明现在有多少个苹果" }
      ]
    }
  ]
}
```

> 注意：`options` 的 `type` 字段（info/distractor/question）不下发给前端，由后端在提交时判对错。

**提交单题请求体**：

```json
{
  "questionId": 42,
  "selectedInfoIds": ["a", "b", "c"],
  "selectedQuestionId": "e"
}
```

**提交响应体**：

```json
{
  "correct": true,
  "feedback": {
    "infos": {
      "correct": ["a", "b", "c"],
      "missed": [],
      "extra": []
    },
    "question": {
      "correct": "e",
      "userSelected": "e",
      "isCorrect": true
    },
    "distractors": ["d"]
  }
}
```

### 3.5 打卡与报告模块

| 方法 | 路径 | 说明 | 请求 | 响应 |
|------|------|------|------|------|
| GET | `/api/checkin/calendar` | 获取月度打卡数据 | `?month=2026-05` | `{ days[] }` |
| GET | `/api/checkin/today` | 获取今日打卡状态 | — | `{ oralCalcDone, readingDone, allDone }` |
| GET | `/api/checkin/report` | 获取成长报告 | `?range=week\|month` | 见下方 |

**成长报告响应体**：

```json
{
  "oralCalc": {
    "totalPractices": 7,
    "avgAccuracy": 88,
    "avgDurationSeconds": 165,
    "accuracyTrend": [80, 85, 90, 85, 90, 92, 88],
    "weakOps": [
      { "type": "sub", "name": "减法", "count": 8, "percent": 53 },
      { "type": "add", "name": "加法", "count": 4, "percent": 27 },
      { "type": "mul", "name": "乘法", "count": 3, "percent": 20 }
    ],
    "totalErrors": 15
  },
  "reading": {
    "totalPractices": 7,
    "avgAccuracy": 82
  }
}
```

**徽章响应体**：

```json
{
  "badges": [
    { "id": "streak_7", "name": "坚持一周", "icon": "🏅", "desc": "连续打卡7天" },
    { "id": "stars_50", "name": "星星收集者", "icon": "⭐", "desc": "累计获得50颗星" },
    { "id": "level_3", "name": "口算能手", "icon": "🧮", "desc": "达到3级" }
  ]
}
```

**连续打卡逻辑说明**：

- 当日口算+读题都完成 → `all_done=1` → 从当天向前遍历计算连续天数 → 更新 `user.streak_days`
- 每次登录时检查：如果昨天未完成且当前 `streak_days > 0`，重置为 0
- `max_streak_days` 只增不减，永久保留历史最高记录

---

## 四、统一响应格式

```json
// 成功
{
  "code": 0,
  "data": { },
  "message": "ok"
}

// 业务错误
{
  "code": 1001,
  "data": null,
  "message": "年级参数无效"
}

// 认证失败
{
  "code": 401,
  "data": null,
  "message": "登录已过期"
}
```

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 401 | 未登录/token过期 |
| 1001 | 参数校验失败 |
| 1002 | 题目不存在 |
| 1003 | 今日已完成（重复提交） |
| 5000 | 服务器内部错误 |

---

## 五、口算题前端生成算法

口算题不需要后端和 AI，前端本地生成：

```javascript
// oral-calc-generator.js 核心逻辑

const GRADE_CONFIG = {
  '1-up':  { ops: ['+', '-'], range: [0, 20], noCarry: true },
  '1-down': { ops: ['+', '-'], range: [0, 20], noCarry: false },
  '2-up':  { ops: ['+', '-', '×'], range: [0, 100], mulRange: [1, 9] },
  '2-down': { ops: ['+', '-', '×', '÷'], range: [0, 100], mulRange: [1, 9] },
};

function generateQuestion(grade, difficulty) {
  const config = GRADE_CONFIG[grade];
  const op = randomPick(config.ops);

  switch (op) {
    case '+': return generateAdd(config, difficulty);
    case '-': return generateSub(config, difficulty);
    case '×': return generateMul(config);
    case '÷': return generateDiv(config);
  }
}

function generateAdd(config, difficulty) {
  const max = config.range[1];
  let a, b;
  if (config.noCarry) {
    do {
      a = randInt(1, max - 1);
      b = randInt(1, max - a);
    } while ((a % 10) + (b % 10) >= 10);
  } else {
    a = randInt(1, max - 1);
    b = randInt(1, max - a);
  }
  return { expression: `${a}+${b}`, answer: a + b };
}

function generateSub(config, difficulty) {
  const max = config.range[1];
  const a = randInt(2, max);
  const b = randInt(1, a);
  if (config.noCarry && (a % 10) < (b % 10)) {
    return generateSub(config, difficulty);
  }
  return { expression: `${a}-${b}`, answer: a - b };
}

function generateMul(config) {
  const [min, max] = config.mulRange;
  const a = randInt(min, max);
  const b = randInt(min, max);
  return { expression: `${a}×${b}`, answer: a * b };
}

function generateDiv(config) {
  const [min, max] = config.mulRange;
  const b = randInt(min, max);
  const answer = randInt(min, max);
  const a = b * answer;
  return { expression: `${a}÷${b}`, answer };
}
```

---

## 六、关键流程时序图

### 6.1 微信登录

```
小程序                    后端                      微信服务器
  │── wx.login() ──────►│                            │
  │◄── code ───────────│                            │
  │── POST /auth/login ►│── code2session ──────────►│
  │                      │◄── openid + session_key ──│
  │                      │── 生成 JWT token           │
  │◄── { token, grade } │                            │
```

### 6.2 口算练习

```
小程序                              后端
  │── 本地生成10道题                   │
  │── 用户逐题作答（本地即时反馈）      │
  │── 全部完成                        │
  │── POST /oral-calc/submit ───────►│
  │                                   │── 校验答案
  │                                   │── 写入 practice_record
  │                                   │── 写入 oral_calc_error（错题）
  │                                   │── 更新 checkin
  │                                   │── 计算星星、更新 user
  │◄── { stars, accuracy, errors } ──│
  │── 展示结果页                       │
```

---

## 七、AI 接口对接

### 7.1 应用场景

| 场景 | AI 能力 | 调用频率 | 建议方案 |
|------|--------|---------|---------|
| 读题题目生成 | LLM 生成应用题 + 结构化信息 | 低频（运营侧批量生成） | 调 LLM API → 人工审核 → 入库 |
| TTS 朗读 | 语音合成 | 中频（每次读题） | 预生成音频存 CDN，或实时调 TTS API |
| 口算题生成 | 不需要 AI | — | 纯算法随机生成 |
| 错题分析/学情报告 | LLM 分析薄弱点 | 低频（每日/每周汇总） | 定时任务调 LLM 生成分析文案 |

### 7.2 Node.js 调用示例

主流 AI 服务均提供 REST API，Node.js 调用简单直接：

```javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }]
  })
});
const data = await response.json();
```

### 7.3 官方 SDK 支持

| AI 服务 | Node.js SDK | 说明 |
|---------|-------------|------|
| OpenAI | `openai` (npm) | 官方维护，TypeScript 原生支持 |
| 通义千问 | `@alicloud/openai` / HTTP | 阿里云有 SDK |
| 智谱 GLM | `zhipuai` / HTTP | 有社区 SDK，HTTP 调用也很简单 |
| Deepseek | 兼容 OpenAI SDK | 直接用 `openai` SDK 换 baseURL |

### 7.4 成本预估

| 场景 | 模型 | 单次成本 | 月用量估算 |
|------|------|---------|-----------|
| 题目生成 | GPT-4o-mini / Deepseek | ~¥0.01/题 | 200题/月 ≈ ¥2 |
| TTS | 阿里云 / 腾讯云 TTS | ~¥0.02/次 | 1000次/月 ≈ ¥20 |
| 学情分析 | GPT-4o-mini | ~¥0.02/次 | 100次/月 ≈ ¥2 |

---

## 八、Docker 部署

### 8.1 Dockerfile（多阶段构建）

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ARG APP_VERSION=dev
ARG BUILD_SHA=unknown
ENV NODE_ENV=production APP_VERSION=${APP_VERSION} BUILD_SHA=${BUILD_SHA}
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "src/app.js"]
```

### 8.2 本地构建 & 运行

```bash
cd server
docker build -t math-practice-server .
docker run -p 3000:3000 --env-file .env math-practice-server
```

### 8.3 健康检查

```bash
curl http://localhost:3000/health
# => {"status":"ok","version":"1.0.0-42","sha":"a1b2c3d"}
```

---

## 九、GitHub Actions CI

### 9.1 工作流文件

`.github/workflows/docker-build.yml`

### 9.2 触发条件

| 事件 | 条件 |
|------|------|
| push | `main` / `master` 分支，仅 `server/` 路径变更 |
| tags | `v*` 语义版本标签 |
| pull_request | `server/` 路径变更时构建但不推送 |
| workflow_dispatch | 手动触发 |

### 9.3 版本号策略

每次构建自动生成 3 种标签：

| 标签格式 | 示例 | 说明 |
|----------|------|------|
| `<pkg_ver>-<run>` | `1.0.0-42` | package.json 版本 + 构建序号 |
| `YYYYMMDD.<run>` | `20260512.42` | 日期 + 构建序号 |
| `sha-<7char>` | `sha-a1b2c3d` | 短 commit SHA |

默认分支额外打 `latest` 标签；`v*` 标签触发时额外生成 semver 标签。

### 9.4 镜像发布

镜像推送至 GitHub Container Registry (GHCR)：

```
ghcr.io/<owner>/<repo>/math-practice-server:<tag>
```

构建时通过 `build-args` 注入 `APP_VERSION` 和 `BUILD_SHA`，运行时可通过 `/health` 接口查询。
