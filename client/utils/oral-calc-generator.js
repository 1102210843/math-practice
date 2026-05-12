const GRADE_CONFIG = {
  '1-up':  { ops: ['+', '-'], range: [0, 20], noCarry: true },
  '1-down': { ops: ['+', '-'], range: [0, 20], noCarry: false },
  '2-up':  { ops: ['+', '-', '×'], range: [0, 100], mulRange: [1, 9] },
  '2-down': { ops: ['+', '-', '×', '÷'], range: [0, 100], mulRange: [1, 9] },
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateAdd(config) {
  const max = config.range[1];
  let a, b;
  if (config.noCarry) {
    let attempts = 0;
    do {
      a = randInt(1, max - 1);
      b = randInt(1, max - a);
      attempts++;
    } while ((a % 10) + (b % 10) >= 10 && attempts < 50);
  } else {
    a = randInt(1, max - 1);
    b = randInt(1, max - a);
  }
  return { expression: `${a}+${b}`, answer: a + b };
}

function generateSub(config) {
  const max = config.range[1];
  const a = randInt(2, max);
  const b = randInt(1, a);
  if (config.noCarry && (a % 10) < (b % 10)) {
    return generateSub(config);
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
  const b = randInt(2, max);
  const answer = randInt(min, max);
  const a = b * answer;
  return { expression: `${a}÷${b}`, answer };
}

function generateQuestions(grade, count) {
  const config = GRADE_CONFIG[grade];
  if (!config) return [];

  const questions = [];
  let lastOp = null;
  let sameOpCount = 0;

  for (let i = 0; i < count; i++) {
    let op;
    do {
      op = randomPick(config.ops);
    } while (op === lastOp && sameOpCount >= 2);

    sameOpCount = op === lastOp ? sameOpCount + 1 : 1;
    lastOp = op;

    let q;
    switch (op) {
      case '+': q = generateAdd(config); break;
      case '-': q = generateSub(config); break;
      case '×': q = generateMul(config); break;
      case '÷': q = generateDiv(config); break;
    }
    questions.push(q);
  }
  return questions;
}

module.exports = { generateQuestions };
