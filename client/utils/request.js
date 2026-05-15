const BASE_URL = 'http://8.162.2.58:13000/api';

function request(url, options = {}) {
  const app = getApp();
  const fullUrl = `${BASE_URL}${url}`;
  console.log(`[API] ${options.method || 'GET'} ${fullUrl}`);

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method: options.method || 'GET',
      data: options.data,
      timeout: 10000,
      header: {
        'Content-Type': 'application/json',
        'Authorization': app.globalData.token ? `Bearer ${app.globalData.token}` : '',
      },
      success(res) {
        console.log(`[API] Response ${url}:`, res.statusCode);
        if (res.data.code === 401) {
          wx.removeStorageSync('token');
          app.globalData.token = null;
          wx.redirectTo({ url: '/pages/login/index' });
          reject(new Error('未登录'));
          return;
        }
        resolve(res.data);
      },
      fail(err) {
        console.error(`[API] Failed ${url}:`, err);
        reject(err);
      },
    });
  });
}

module.exports = {
  get: (url, data) => request(url, { method: 'GET', data }),
  post: (url, data) => request(url, { method: 'POST', data }),
  put: (url, data) => request(url, { method: 'PUT', data }),
};
