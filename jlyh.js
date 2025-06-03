class Env {
    constructor(name) {
      this.name = name;
    }
    log(...args) {
      console.log(`[${this.name}]`, ...args);
    }
}

const $ = new Env("吉利银河签到");
const https = require("https");

class SignTask {
  constructor(envStr) {
    this.refreshToken = envStr.split('&')[0];
    this.deviceSN = envStr.split('&')[1];
    this.token = '';
  }

  async run() {
    await this.refreshTokenFunc();
    if (!this.token) {
      $.log("刷新token失败");
      return;
    }
    const signed = await this.checkSignState();
    if (signed) {
      $.log("今日已签到");
      return;
    }
    await this.sign();
  }

  async refreshTokenFunc() {
    const url = `https://galaxy-user-api.geely.com/api/v1/login/refresh?refreshToken=${this.refreshToken}`;
    const headers = {
      "user-agent": "ALIYUN-ANDROID-UA",
      "deviceSN": this.deviceSN
    };

    const res = await httpRequest({ url, headers });
    if (res.code === "success") {
      this.token = res.data.centerTokenDto.token;
      $.log("token刷新成功");
    }
  }

  async checkSignState() {
    const url = `https://galaxy-app.geely.com/app/v1/sign/state`;
    const headers = {
      "token": this.token,
      "deviceSN": this.deviceSN,
      "user-agent": "ALIYUN-ANDROID-UA"
    };
    const res = await httpRequest({ url, headers });
    return res.data === true;
  }

  async sign() {
    const url = `https://galaxy-app.geely.com/app/v1/sign/add`;
    const body = JSON.stringify({ signType: 0 });
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "token": this.token,
      "deviceSN": this.deviceSN,
      "user-agent": "ALIYUN-ANDROID-UA"
    };

    const res = await httpRequest({ url, method: "POST", headers, body });
    if (res.code === 0) {
      $.log("签到成功！");
    } else {
      $.log("签到失败：" + JSON.stringify(res));
    }
  }
}

function httpRequest({ url, method = "GET", headers = {}, body = "" }) {
  return new Promise((resolve, reject) => {
    const options = new URL(url);
    options.method = method;
    options.headers = headers;

    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    if (method === "POST" && body) req.write(body);
    req.end();
  });
}

(async () => {
  const envStr = process.env.jlyh;
  if (!envStr) return console.error("缺少环境变量 jlyh");
  const task = new SignTask(envStr);
  await task.run();
})();
