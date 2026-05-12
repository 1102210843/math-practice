const mysql = require('mysql2/promise');
const config = require('../config');

const TABLES_SQL = `
CREATE TABLE IF NOT EXISTS user (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  openid VARCHAR(64) NOT NULL,
  session_key VARCHAR(64) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  nickname VARCHAR(64) DEFAULT '口算小达人',
  avatar_url VARCHAR(500) DEFAULT NULL,
  grade VARCHAR(10) NOT NULL DEFAULT '1-up',
  total_stars INT UNSIGNED NOT NULL DEFAULT 0,
  level TINYINT UNSIGNED NOT NULL DEFAULT 1,
  streak_days INT UNSIGNED NOT NULL DEFAULT 0,
  max_streak_days INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_openid (openid),
  KEY idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS practice_record (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  openid VARCHAR(64) NOT NULL,
  type VARCHAR(20) NOT NULL,
  practice_date DATE NOT NULL,
  total_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  correct_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  stars_earned SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  detail JSON DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_openid_date (openid, practice_date),
  KEY idx_openid_type (openid, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS oral_calc_error (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  openid VARCHAR(64) NOT NULL,
  expression VARCHAR(30) NOT NULL,
  correct_answer INT NOT NULL,
  user_answer INT NOT NULL,
  op_type VARCHAR(10) NOT NULL,
  reviewed TINYINT(1) NOT NULL DEFAULT 0,
  error_count SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_openid_reviewed (openid, reviewed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reading_question (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  grade VARCHAR(10) NOT NULL,
  difficulty TINYINT UNSIGNED NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  math_infos JSON NOT NULL,
  math_question VARCHAR(200) NOT NULL,
  distractors JSON NOT NULL,
  answer INT DEFAULT NULL,
  audio_url VARCHAR(500) DEFAULT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_grade_status (grade, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reading_error (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  openid VARCHAR(64) NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  error_type VARCHAR(20) NOT NULL,
  user_infos JSON DEFAULT NULL,
  user_question VARCHAR(200) DEFAULT NULL,
  reviewed TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_openid (openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS checkin (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  openid VARCHAR(64) NOT NULL,
  checkin_date DATE NOT NULL,
  oral_calc_done TINYINT(1) NOT NULL DEFAULT 0,
  reading_done TINYINT(1) NOT NULL DEFAULT 0,
  all_done TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_openid_date (openid, checkin_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const SEED_QUESTIONS = [
  {
    grade: '1-up', difficulty: 1,
    content: '小明有8个苹果，吃了3个。小明还剩多少个苹果？',
    math_infos: ['小明有8个苹果', '吃了3个'],
    math_question: '小明还剩多少个苹果',
    distractors: ['苹果很好吃'],
    answer: 5,
  },
  {
    grade: '1-up', difficulty: 1,
    content: '树上有5只小鸟，又飞来了4只。树上现在有多少只小鸟？',
    math_infos: ['树上有5只小鸟', '又飞来了4只'],
    math_question: '树上现在有多少只小鸟',
    distractors: ['小鸟在唱歌'],
    answer: 9,
  },
  {
    grade: '1-up', difficulty: 1,
    content: '妈妈买了6个橘子和3个梨。妈妈一共买了多少个水果？',
    math_infos: ['买了6个橘子', '买了3个梨'],
    math_question: '妈妈一共买了多少个水果',
    distractors: ['今天是星期六'],
    answer: 9,
  },
  {
    grade: '1-up', difficulty: 1,
    content: '教室里有12个小朋友，走了4个。教室里还有多少个小朋友？',
    math_infos: ['教室里有12个小朋友', '走了4个'],
    math_question: '教室里还有多少个小朋友',
    distractors: ['教室很大'],
    answer: 8,
  },
  {
    grade: '1-up', difficulty: 1,
    content: '小红有7颗糖，小明给了她5颗。小红现在有多少颗糖？',
    math_infos: ['小红有7颗糖', '小明给了她5颗'],
    math_question: '小红现在有多少颗糖',
    distractors: ['糖果是甜的'],
    answer: 12,
  },
  {
    grade: '1-down', difficulty: 1,
    content: '停车场有15辆车，开走了8辆。停车场还剩多少辆车？',
    math_infos: ['停车场有15辆车', '开走了8辆'],
    math_question: '停车场还剩多少辆车',
    distractors: ['停车场在学校旁边'],
    answer: 7,
  },
  {
    grade: '1-down', difficulty: 1,
    content: '小明看一本故事书，第一天看了9页，第二天看了7页。两天一共看了多少页？',
    math_infos: ['第一天看了9页', '第二天看了7页'],
    math_question: '两天一共看了多少页',
    distractors: ['故事书很好看'],
    answer: 16,
  },
  {
    grade: '1-down', difficulty: 2,
    content: '花园里有18朵红花，9朵黄花，摘了5朵红花。花园里还有多少朵红花？',
    math_infos: ['花园里有18朵红花', '摘了5朵红花'],
    math_question: '花园里还有多少朵红花',
    distractors: ['花园里有9朵黄花', '花很漂亮'],
    answer: 13,
  },
  {
    grade: '2-up', difficulty: 1,
    content: '书架上有35本书，小明又放了28本。书架上现在有多少本书？',
    math_infos: ['书架上有35本书', '又放了28本'],
    math_question: '书架上现在有多少本书',
    distractors: ['书架是木头做的'],
    answer: 63,
  },
  {
    grade: '2-up', difficulty: 2,
    content: '学校买了6盒铅笔，每盒有8支。学校一共买了多少支铅笔？',
    math_infos: ['买了6盒铅笔', '每盒有8支'],
    math_question: '学校一共买了多少支铅笔',
    distractors: ['铅笔是绿色的'],
    answer: 48,
  },
  {
    grade: '2-up', difficulty: 2,
    content: '操场上有45个同学在做操，走了18个，又来了7个。操场上现在有多少个同学？',
    math_infos: ['操场上有45个同学', '走了18个', '又来了7个'],
    math_question: '操场上现在有多少个同学',
    distractors: ['天气很好'],
    answer: 34,
  },
  {
    grade: '2-down', difficulty: 1,
    content: '有56个苹果，平均分给7个小朋友。每个小朋友分到多少个苹果？',
    math_infos: ['有56个苹果', '平均分给7个小朋友'],
    math_question: '每个小朋友分到多少个苹果',
    distractors: ['小朋友们很开心'],
    answer: 8,
  },
  {
    grade: '2-down', difficulty: 2,
    content: '一本书有86页，小华第一天看了34页，第二天看了28页。还剩多少页没有看？',
    math_infos: ['一本书有86页', '第一天看了34页', '第二天看了28页'],
    math_question: '还剩多少页没有看',
    distractors: ['这本书是科学书'],
    answer: 24,
  },

  // ========== 一年级上册 补充 ==========
  {
    grade: '1-up', difficulty: 1,
    content: '鱼缸里有6条金鱼，妈妈又买了3条。鱼缸里现在有多少条金鱼？',
    math_infos: ['鱼缸里有6条金鱼', '又买了3条'],
    math_question: '鱼缸里现在有多少条金鱼',
    distractors: ['金鱼是红色的'],
    answer: 9,
  },
  {
    grade: '1-up', difficulty: 1,
    content: '盘子里有10个饺子，弟弟吃了4个。盘子里还剩多少个饺子？',
    math_infos: ['盘子里有10个饺子', '弟弟吃了4个'],
    math_question: '盘子里还剩多少个饺子',
    distractors: ['饺子是妈妈包的'],
    answer: 6,
  },
  {
    grade: '1-up', difficulty: 1,
    content: '小明有9块积木，小红有4块积木。他们一共有多少块积木？',
    math_infos: ['小明有9块积木', '小红有4块积木'],
    math_question: '他们一共有多少块积木',
    distractors: ['积木是彩色的'],
    answer: 13,
  },
  {
    grade: '1-up', difficulty: 1,
    content: '公交车上有11个人，到站下去了5个。车上还有多少个人？',
    math_infos: ['公交车上有11个人', '下去了5个'],
    math_question: '车上还有多少个人',
    distractors: ['公交车很大'],
    answer: 6,
  },
  {
    grade: '1-up', difficulty: 1,
    content: '笔筒里有3支铅笔和4支彩笔。笔筒里一共有多少支笔？',
    math_infos: ['有3支铅笔', '有4支彩笔'],
    math_question: '笔筒里一共有多少支笔',
    distractors: ['笔筒是蓝色的'],
    answer: 7,
  },
  {
    grade: '1-up', difficulty: 1,
    content: '草地上有8只蝴蝶，飞走了2只。草地上还有多少只蝴蝶？',
    math_infos: ['草地上有8只蝴蝶', '飞走了2只'],
    math_question: '草地上还有多少只蝴蝶',
    distractors: ['蝴蝶很美丽'],
    answer: 6,
  },
  {
    grade: '1-up', difficulty: 1,
    content: '小兔子拔了7个萝卜，又拔了6个。小兔子一共拔了多少个萝卜？',
    math_infos: ['拔了7个萝卜', '又拔了6个'],
    math_question: '小兔子一共拔了多少个萝卜',
    distractors: ['萝卜是橙色的'],
    answer: 13,
  },

  // ========== 一年级下册 补充 ==========
  {
    grade: '1-down', difficulty: 1,
    content: '小明有16张贴纸，送给同学9张。小明还剩多少张贴纸？',
    math_infos: ['小明有16张贴纸', '送给同学9张'],
    math_question: '小明还剩多少张贴纸',
    distractors: ['贴纸很漂亮'],
    answer: 7,
  },
  {
    grade: '1-down', difficulty: 1,
    content: '池塘里有8只青蛙，又跳来了6只。池塘里现在有多少只青蛙？',
    math_infos: ['池塘里有8只青蛙', '又跳来了6只'],
    math_question: '池塘里现在有多少只青蛙',
    distractors: ['池塘里有荷花'],
    answer: 14,
  },
  {
    grade: '1-down', difficulty: 1,
    content: '商店里有17个玩具，卖出了8个。商店里还剩多少个玩具？',
    math_infos: ['商店里有17个玩具', '卖出了8个'],
    math_question: '商店里还剩多少个玩具',
    distractors: ['商店在街上'],
    answer: 9,
  },
  {
    grade: '1-down', difficulty: 2,
    content: '小明摘了12个桃子，小红摘了8个桃子，他们一共吃了5个。还剩多少个桃子？',
    math_infos: ['小明摘了12个桃子', '小红摘了8个桃子', '吃了5个'],
    math_question: '还剩多少个桃子',
    distractors: ['桃子很甜'],
    answer: 15,
  },
  {
    grade: '1-down', difficulty: 1,
    content: '妈妈买了14个鸡蛋，做饭用了6个。还剩多少个鸡蛋？',
    math_infos: ['买了14个鸡蛋', '用了6个'],
    math_question: '还剩多少个鸡蛋',
    distractors: ['鸡蛋是白色的'],
    answer: 8,
  },
  {
    grade: '1-down', difficulty: 1,
    content: '小丽有5朵红花和9朵黄花。小丽一共有多少朵花？',
    math_infos: ['有5朵红花', '有9朵黄花'],
    math_question: '小丽一共有多少朵花',
    distractors: ['花很香'],
    answer: 14,
  },
  {
    grade: '1-down', difficulty: 2,
    content: '图书角有20本书，借走了7本，又还回来3本。图书角现在有多少本书？',
    math_infos: ['图书角有20本书', '借走了7本', '还回来3本'],
    math_question: '图书角现在有多少本书',
    distractors: ['图书角在教室里'],
    answer: 16,
  },
  {
    grade: '1-down', difficulty: 1,
    content: '爷爷养了11只鸡，又买了5只。爷爷现在有多少只鸡？',
    math_infos: ['爷爷养了11只鸡', '又买了5只'],
    math_question: '爷爷现在有多少只鸡',
    distractors: ['鸡在院子里'],
    answer: 16,
  },

  // ========== 二年级上册 补充 ==========
  {
    grade: '2-up', difficulty: 1,
    content: '果园里有47棵苹果树和36棵梨树。果园里一共有多少棵果树？',
    math_infos: ['有47棵苹果树', '有36棵梨树'],
    math_question: '果园里一共有多少棵果树',
    distractors: ['果园在山上'],
    answer: 83,
  },
  {
    grade: '2-up', difficulty: 1,
    content: '小明有75元，买书花了38元。小明还剩多少元？',
    math_infos: ['小明有75元', '买书花了38元'],
    math_question: '小明还剩多少元',
    distractors: ['书很好看'],
    answer: 37,
  },
  {
    grade: '2-up', difficulty: 2,
    content: '教室里有4排桌子，每排有7张。教室里一共有多少张桌子？',
    math_infos: ['有4排桌子', '每排有7张'],
    math_question: '教室里一共有多少张桌子',
    distractors: ['桌子是棕色的'],
    answer: 28,
  },
  {
    grade: '2-up', difficulty: 2,
    content: '小红买了3包饼干，每包有9块。小红一共买了多少块饼干？',
    math_infos: ['买了3包饼干', '每包有9块'],
    math_question: '小红一共买了多少块饼干',
    distractors: ['饼干很好吃'],
    answer: 27,
  },
  {
    grade: '2-up', difficulty: 1,
    content: '学校有82个足球，借出去了45个。学校还剩多少个足球？',
    math_infos: ['学校有82个足球', '借出去了45个'],
    math_question: '学校还剩多少个足球',
    distractors: ['足球是黑白的'],
    answer: 37,
  },
  {
    grade: '2-up', difficulty: 2,
    content: '妈妈买了5袋牛奶，每袋有6瓶。家里已经有3瓶。家里现在一共有多少瓶牛奶？',
    math_infos: ['买了5袋牛奶', '每袋有6瓶', '家里已经有3瓶'],
    math_question: '家里现在一共有多少瓶牛奶',
    distractors: ['牛奶很好喝'],
    answer: 33,
  },
  {
    grade: '2-up', difficulty: 1,
    content: '小华看了一本书，上午看了24页，下午看了38页。一天看了多少页？',
    math_infos: ['上午看了24页', '下午看了38页'],
    math_question: '一天看了多少页',
    distractors: ['今天天气很热'],
    answer: 62,
  },
  {
    grade: '2-up', difficulty: 2,
    content: '同学们去植树，一年级种了28棵，二年级种了35棵，三年级种了42棵。一年级和二年级一共种了多少棵？',
    math_infos: ['一年级种了28棵', '二年级种了35棵'],
    math_question: '一年级和二年级一共种了多少棵',
    distractors: ['三年级种了42棵', '植树在公园里'],
    answer: 63,
  },

  // ========== 二年级下册 补充 ==========
  {
    grade: '2-down', difficulty: 1,
    content: '有36块糖，平均分给4个小朋友。每个小朋友分到多少块糖？',
    math_infos: ['有36块糖', '平均分给4个小朋友'],
    math_question: '每个小朋友分到多少块糖',
    distractors: ['糖是水果味的'],
    answer: 9,
  },
  {
    grade: '2-down', difficulty: 1,
    content: '一条绳子长72厘米，剪去了35厘米。还剩多少厘米？',
    math_infos: ['绳子长72厘米', '剪去了35厘米'],
    math_question: '还剩多少厘米',
    distractors: ['绳子是红色的'],
    answer: 37,
  },
  {
    grade: '2-down', difficulty: 2,
    content: '学校买了8盒粉笔，每盒有9支，用了15支。还剩多少支粉笔？',
    math_infos: ['买了8盒粉笔', '每盒有9支', '用了15支'],
    math_question: '还剩多少支粉笔',
    distractors: ['粉笔是白色的'],
    answer: 57,
  },
  {
    grade: '2-down', difficulty: 1,
    content: '有45个气球，平均分给5组小朋友。每组分到多少个气球？',
    math_infos: ['有45个气球', '平均分给5组'],
    math_question: '每组分到多少个气球',
    distractors: ['气球有很多颜色'],
    answer: 9,
  },
  {
    grade: '2-down', difficulty: 2,
    content: '小明看一本90页的故事书，第一天看了32页，第二天看了29页。还剩多少页没看？',
    math_infos: ['故事书有90页', '第一天看了32页', '第二天看了29页'],
    math_question: '还剩多少页没看',
    distractors: ['故事书是关于动物的'],
    answer: 29,
  },
  {
    grade: '2-down', difficulty: 1,
    content: '花店有63朵玫瑰，卖出了28朵。花店还剩多少朵玫瑰？',
    math_infos: ['花店有63朵玫瑰', '卖出了28朵'],
    math_question: '花店还剩多少朵玫瑰',
    distractors: ['玫瑰是红色的'],
    answer: 35,
  },
  {
    grade: '2-down', difficulty: 2,
    content: '超市运来7箱牛奶，每箱有8瓶。超市一共运来多少瓶牛奶？',
    math_infos: ['运来7箱牛奶', '每箱有8瓶'],
    math_question: '超市一共运来多少瓶牛奶',
    distractors: ['超市在小区旁边'],
    answer: 56,
  },
  {
    grade: '2-down', difficulty: 2,
    content: '有54个座位，已经坐了36人，又来了9人。还有多少个空座位？',
    math_infos: ['有54个座位', '已经坐了36人', '又来了9人'],
    math_question: '还有多少个空座位',
    distractors: ['座位是蓝色的'],
    answer: 9,
  },
  {
    grade: '2-down', difficulty: 1,
    content: '一筐鸡蛋有42个，拿出来6个做蛋糕。筐里还有多少个鸡蛋？',
    math_infos: ['一筐鸡蛋有42个', '拿出来6个'],
    math_question: '筐里还有多少个鸡蛋',
    distractors: ['蛋糕很香'],
    answer: 36,
  },
  {
    grade: '2-down', difficulty: 2,
    content: '爸爸有100元，买了一本35元的书和一支8元的笔。爸爸还剩多少元？',
    math_infos: ['爸爸有100元', '书35元', '笔8元'],
    math_question: '爸爸还剩多少元',
    distractors: ['爸爸去的书店很大'],
    answer: 57,
  },

  // ========== 额外补充各年级 ==========
  {
    grade: '1-up', difficulty: 1,
    content: '桌上有5个红杯子和7个蓝杯子。桌上一共有多少个杯子？',
    math_infos: ['有5个红杯子', '有7个蓝杯子'],
    math_question: '桌上一共有多少个杯子',
    distractors: ['杯子里有水'],
    answer: 12,
  },
  {
    grade: '1-up', difficulty: 1,
    content: '姐姐有14颗珠子，给了妹妹6颗。姐姐还有多少颗珠子？',
    math_infos: ['姐姐有14颗珠子', '给了妹妹6颗'],
    math_question: '姐姐还有多少颗珠子',
    distractors: ['珠子闪闪发光'],
    answer: 8,
  },
  {
    grade: '1-down', difficulty: 1,
    content: '小强跳绳跳了13下，小丽跳了8下。小强比小丽多跳了多少下？',
    math_infos: ['小强跳了13下', '小丽跳了8下'],
    math_question: '小强比小丽多跳了多少下',
    distractors: ['他们在操场上跳绳'],
    answer: 5,
  },
  {
    grade: '1-down', difficulty: 2,
    content: '篮子里有19个苹果，5个梨，拿走了7个苹果。篮子里还有多少个苹果？',
    math_infos: ['篮子里有19个苹果', '拿走了7个苹果'],
    math_question: '篮子里还有多少个苹果',
    distractors: ['篮子里有5个梨', '篮子是竹子做的'],
    answer: 12,
  },
  {
    grade: '2-up', difficulty: 1,
    content: '小明做了26道数学题，小红做了37道。他们一共做了多少道？',
    math_infos: ['小明做了26道', '小红做了37道'],
    math_question: '他们一共做了多少道',
    distractors: ['数学题很简单'],
    answer: 63,
  },
  {
    grade: '2-up', difficulty: 2,
    content: '动物园有9只猴子，每只猴子吃了3个香蕉。猴子们一共吃了多少个香蕉？',
    math_infos: ['有9只猴子', '每只吃了3个香蕉'],
    math_question: '一共吃了多少个香蕉',
    distractors: ['猴子很可爱'],
    answer: 27,
  },
  {
    grade: '2-down', difficulty: 2,
    content: '一列火车有6节车厢，每节可以坐8人。这列火车一共可以坐多少人？',
    math_infos: ['有6节车厢', '每节可以坐8人'],
    math_question: '一共可以坐多少人',
    distractors: ['火车跑得很快'],
    answer: 48,
  },
  {
    grade: '2-down', difficulty: 1,
    content: '小花有81颗弹珠，分给3个好朋友，每人分到多少颗？',
    math_infos: ['有81颗弹珠', '分给3个好朋友'],
    math_question: '每人分到多少颗',
    distractors: ['弹珠是玻璃做的'],
    answer: 27,
  },
];

async function initDB() {
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
  });

  console.log('Creating database...');
  await conn.query(`CREATE DATABASE IF NOT EXISTS ${config.db.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE ${config.db.database}`);

  console.log('Creating tables...');
  await conn.query(TABLES_SQL);

  console.log('Seeding reading questions...');
  for (const q of SEED_QUESTIONS) {
    const [existing] = await conn.query('SELECT id FROM reading_question WHERE content = ?', [q.content]);
    if (existing.length === 0) {
      await conn.query(
        'INSERT INTO reading_question (grade, difficulty, content, math_infos, math_question, distractors, answer) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [q.grade, q.difficulty, q.content, JSON.stringify(q.math_infos), q.math_question, JSON.stringify(q.distractors), q.answer]
      );
    }
  }

  console.log('Database initialized successfully!');
  await conn.end();
  process.exit(0);
}

initDB().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
