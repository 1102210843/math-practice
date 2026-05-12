const axios = require('axios');
const config = require('../config');

async function code2session(code) {
  if (!config.wx.appId || !config.wx.appSecret) {
    return { openid: `dev_${code}`, session_key: 'dev_session' };
  }
  const url = 'https://api.weixin.qq.com/sns/jscode2session';
  const { data } = await axios.get(url, {
    params: {
      appid: config.wx.appId,
      secret: config.wx.appSecret,
      js_code: code,
      grant_type: 'authorization_code',
    },
  });
  if (data.errcode) {
    throw new Error(`WeChat login failed: ${data.errmsg}`);
  }
  return data;
}

async function getPhoneNumber(phoneCode, accessToken) {
  if (!config.wx.appId || !config.wx.appSecret) {
    return { phone_info: { phoneNumber: '13800138000' } };
  }
  const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`;
  const { data } = await axios.post(url, { code: phoneCode });
  if (data.errcode) {
    throw new Error(`Get phone failed: ${data.errmsg}`);
  }
  return data;
}

async function getAccessToken() {
  if (!config.wx.appId || !config.wx.appSecret) {
    return 'dev_access_token';
  }
  const url = 'https://api.weixin.qq.com/cgi-bin/token';
  const { data } = await axios.get(url, {
    params: {
      grant_type: 'client_credential',
      appid: config.wx.appId,
      secret: config.wx.appSecret,
    },
  });
  if (data.errcode) {
    throw new Error(`Get access_token failed: ${data.errmsg}`);
  }
  return data.access_token;
}

module.exports = { code2session, getPhoneNumber, getAccessToken };
