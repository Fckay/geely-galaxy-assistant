const https = require('https');

const [refreshToken, deviceSN] = process.env.jlyh?.split('&') || [];

if (!refreshToken || !deviceSN) {
  console.error("❌ 缺少 jlyh 环境变量，格式应为 refreshToken&deviceSN");
  process.exit(1);
}

console.log(`[吉利银河签到] 开始执行签到任务...`);

(async () => {
  const token = await refreshTokenFunc(refreshToken, deviceSN);
  if (!token) {
    console.error(`[吉利银河签到] ❌ Token刷新失败`);
    process.exit(1);
  }

  const signed = await checkSigned(token, deviceSN);
  if (signed === true) {
    console.log(`[吉利银河签到] ✅ 今日已签到`);
    return;
  }

  await doSign(token, deviceSN);
})();

function refreshTokenFunc(refreshToken, deviceSN) {
  const url = `https://galaxy-user-api.geely.com/api/v1/login/refresh?refreshToken=${refreshToken}`;
  const headers = {
    'deviceSN': deviceSN,
    'user-agent': 'ALIYUN-ANDROID-UA'
  };

  return httpRequest({ url, headers }).then(res => {
    if (res?.code === 'success') {
      console.log(`[吉利银河签到] ✅ Token刷新成功`);
      return res.data.centerTokenDto.token;
    }
    console.error(`[吉利银河签到] ❌ Token刷新失败: ${res?.message}`);
    return null;
  });
}

function checkSigned(token, deviceSN) {
  const url = `https://galaxy-app.geely.com/app/v1/sign/state`;
  const headers = {
    'token': token,
    'deviceSN': deviceSN,
    'user-agent': 'ALIYUN-ANDROID-UA'
  };

  return httpRequest({ url, headers }).then(res => {
    if (res?.code === 0) return res.data;
    console.error(`[吉利银河签到] ❌ 查询签到状态失败`);
    return false;
  });
}

function doSign(token, deviceSN) {
  const url = `https://galaxy-app.geely.com/app/v1/sign/add`;
  const body = JSON.stringify({ signType: 0 });
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'token': token,
    'deviceSN': deviceSN,
    'user-agent': 'ALIYUN-ANDROID-UA'
  };

  return httpRequest({ url, method: 'POST', headers, body }).then(res => {
    if (res?.code === 0) {
      console.log(`[吉利银河签到] 🎉 签到成功`);
    } else {
      console.error(`[吉利银河签到] ❌ 签到失败: ${JSON.stringify(res)}`);
    }
  });
}

function httpRequest({ url, method = 'GET', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const options = new URL(url);
    const reqOptions = {
      method,
      hostname: options.hostname,
      path: options.pathname + options.search,
      headers
    };

    const req = https.request(reqOptions, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          console.error(`❌ 响应不是合法 JSON:`, data);
          resolve({});
        }
      });
    });

    req.on('error', reject);
    if (method === 'POST' && body) req.write(body);
    req.end();
  });
}
