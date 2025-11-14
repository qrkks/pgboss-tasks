// send-sms-simple.js

// Node 18+ 直接可以用 fetch；如果是 Node 16，自行安装 node-fetch 或 undici

import "dotenv/config";
import {isMainModule} from "../../utils/is-main-module.js";

const accessKeyId = process.env.UNISMS_ACCESS_KEY_ID; // 直接填你的 key
if (!accessKeyId) {
  throw new Error("UNISMS_ACCESS_KEY_ID is not set");
}

const baseUrl = "https://uni.apistd.com/";

// 要调用的 action（接口：发送短信）
const action = "sms.message.send";

// 拼接 URL（只有两个参数）
const url = `${baseUrl}?action=${action}&accessKeyId=${accessKeyId}`;

async function sendSms() {
  const body = {
    to: "15866766321", // 接收号码
    signature: "1234567890", // 你报备并审核通过的签名（注意不是 AccessKey）
    templateId: "signup", // 模板编码
    templateData: {
      code: "1234",
      ttl: "10",
    },

    // 不用模板也可以：content: '您的验证码是 1234'
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  console.log("状态码:", res.status);
  console.log("返回结果:", data);
}

if (isMainModule(import.meta.url)) {
  sendSms().catch(console.error);
}
