const $ = new Env("吉利银河签到");

class User {
  constructor(envStr) {
    this.ckStatus = true;
    this.token = '';
    this.refreshToken = envStr.split('&')[0];
    this.deviceSN = envStr.split('&')[1];
  }

  async run() {
    $.DoubleLog(`开始执行签到任务...`);
    await this.refresh_token();
    if (!this.ckStatus) {
      $.DoubleLog(`❌Token刷新失败，终止签到`);
      return;
    }

    const hasSigned = await this.signstate();
    if (hasSigned) {
      $.DoubleLog(`✅今日已签到，无需重复`);
    } else {
      await this.sign();
    }
  }

  getHeader() {
    return {
      "token": this.token,
      "deviceSN": this.deviceSN,
      "user-agent": "ALIYUN-ANDROID-UA",
      "Content-Type": "application/json; charset=utf-8"
    };
  }

  async refresh_token() {
    try {
      const url = `https://galaxy-user-api.geely.com/api/v1/login/refresh?refreshToken=${this.refreshToken}`;
      const options = { url, headers: { "deviceSN": this.deviceSN, "user-agent": "ALIYUN-ANDROID-UA" } };
      const result = await httpRequest(options);
      if (result?.code === 'success') {
        this.token = result.data.centerTokenDto.token;
        this.ckStatus = true;
        $.DoubleLog(`✅Token刷新成功`);
      } else {
        this.ckStatus = false;
        $.DoubleLog(`❌Token刷新失败: ${result?.message}`);
      }
    } catch (e) {
      this.ckStatus = false;
      console.log(e);
    }
  }

  async signstate() {
    try {
      const url = `https://galaxy-app.geely.com/app/v1/sign/state`;
      const result = await httpRequest({ url, headers: this.getHeader() });
      return result?.data === true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  async sign() {
    try {
      const url = `https://galaxy-app.geely.com/app/v1/sign/add`;
      const body = JSON.stringify({ signType: 0 });
      const result = await httpRequest({ url, method: "POST", headers: this.getHeader(), body });
      if (result?.code === 0) {
        $.DoubleLog(`🎉签到成功`);
      } else {
        $.DoubleLog(`❌签到失败: ${JSON.stringify(result)}`);
      }
    } catch (e) {
      console.log(e);
    }
  }
}

function httpRequest(options) {
  return new Promise((resolve) => {
    const method = options.method?.toLowerCase() || (options.body ? "post" : "get");
    $[method](options, (err, resp, data) => {
      if (err) {
        console.log(`❌请求失败: ${err}`);
        return resolve({});
      }
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        console.log(`❌解析响应失败:`, data);
        resolve({});
      }
    });
  });
}

// 通用Env函数
function Env(name) {
  return new (class {
    constructor() {
      this.name = name;
      this.logs = [];
      this.get = this._request.bind(this, "GET");
      this.post = this._request.bind(this, "POST");
    }

    _request(method, opts, cb) {
      const http = require("http");
      const https = require("https");
      const url = require("url");
      let u = typeof opts === "string" ? url.parse(opts) : url.parse(opts.url);
      const mod = u.protocol === "https:" ? https : http;
      const options = {
        ...u,
        method,
        headers: opts.headers || {}
      };

      const req = mod.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => cb(null, res, data));
      });

      req.on("error", (err) => cb(err));
      if (method === "POST" && opts.body) req.write(opts.body);
      req.end();
    }

    DoubleLog(...args) {
      console.log(`[${this.name}]`, ...args);
    }
  })();
}

(async () => {
  const ck = process.env.jlyh;
  if (!ck) {
    console.log("❌未设置环境变量 jlyh");
    process.exit(1);
  }
  const user = new User(ck);
  await user.run();
})();
