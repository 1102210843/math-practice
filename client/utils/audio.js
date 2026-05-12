const correctAudio = wx.createInnerAudioContext();
const wrongAudio = wx.createInnerAudioContext();

let soundEnabled = true;

function init() {
  soundEnabled = wx.getStorageSync('soundEnabled') !== false;
}

function playCorrect() {
  if (!soundEnabled) return;
  correctAudio.src = '/audio/correct.mp3';
  correctAudio.play();
}

function playWrong() {
  if (!soundEnabled) return;
  wrongAudio.src = '/audio/wrong.mp3';
  wrongAudio.play();
}

function toggleSound(enabled) {
  soundEnabled = enabled;
  wx.setStorageSync('soundEnabled', enabled);
}

module.exports = { init, playCorrect, playWrong, toggleSound };
