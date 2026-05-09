/**
 * 麵包團購系統 — 快麥雲列印 Cloud Functions
 *
 * 後台類型：快麥雲打印開放平台（open.iot.kuaimai.com）
 * 認證方式：appid + secret（不需要 accessToken / session）
 * 設備識別：印表機 SN（序列號）
 *
 * 部署方式：
 *   firebase deploy --only functions
 *
 * 設定 secrets（首次或更新 key 時）：
 *   firebase functions:secrets:set KUAIMAI_APP_KEY      # = 後台 appid
 *   firebase functions:secrets:set KUAIMAI_APP_SECRET   # = 後台 secret
 *
 * 印表機 SN 對應商家：存在 RTDB
 *   /bread/merchantsInfo/<商家名>/printerSN = "印表機序號"
 *
 * 文件參考：
 *   雲打印開放平台：https://open.iot.kuaimai.com/#/home
 *   雲打印 API 文件：https://cloudprint.kuaimai.com/#/openDev
 *   GitHub Demo：https://github.com/xuli2016/kuaimai-cloud-demo
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const crypto = require('crypto');

// ===== 全域設定 =====
setGlobalOptions({
  region: 'asia-east1',          // 亞洲區域，跟 RTDB asia-southeast1 接近
  maxInstances: 10,              // 限制最大實例數，避免被刷
  memory: '256MiB',
  timeoutSeconds: 30,
});

admin.initializeApp();

// ===== 環境參數（Secret Manager）=====
// 雲打印只需 appid + secret（不像 ERP 還要 accessToken）
const KUAIMAI_APP_KEY = defineSecret('KUAIMAI_APP_KEY');       // 雲打印後台的 appid
const KUAIMAI_APP_SECRET = defineSecret('KUAIMAI_APP_SECRET'); // 雲打印後台的 secret

// ===== 常數 =====
const KUAIMAI_ENDPOINT = 'https://gw.superboss.cc/router';
const KUAIMAI_VERSION = '1.0';
const KUAIMAI_SIGN_METHOD = 'hmac';   // hmac (HMAC-MD5) / md5 / hmac-sha256
const KUAIMAI_FORMAT = 'json';

// 列印 method（依快麥雲打印 SDK 推測，第一次測試後可調整）
// 從 kuaimai-cloud-demo 的 TsplImageRequest / TsplPdfPrintRequest 推
const PRINT_METHOD_TSPL_IMAGE = 'kuaimai.cloud.tspl.image.print';
const PRINT_METHOD_TSPL_PDF = 'kuaimai.cloud.tspl.pdf.print';

// CORS 允許的來源
const ALLOWED_ORIGINS = [
  'https://karlkuo68.github.io',
  'http://localhost:8080',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

// ===== Helper：CORS =====
function applyCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  } else {
    res.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '3600');
}

// ===== Helper：時間格式 GMT+8 =====
function getTaipeiTimestamp() {
  // 快麥要求 yyyy-MM-dd HH:mm:ss，GMT+8
  const now = new Date();
  const tw = new Date(now.getTime() + 8 * 3600 * 1000);
  return tw.toISOString().slice(0, 19).replace('T', ' ');
}

// ===== Helper：HMAC-MD5 簽名 =====
function signParams(params, secret, signMethod = 'hmac') {
  // 第一步：移除 sign、null/undefined 值
  const clean = {};
  for (const [k, v] of Object.entries(params)) {
    if (k !== 'sign' && v !== null && v !== undefined && v !== '') {
      clean[k] = String(v);
    }
  }
  // 第二步：按 ASCII 排序
  const keys = Object.keys(clean).sort();
  // 第三步：拼接 key+value（無分隔符）
  const concatStr = keys.map(k => `${k}${clean[k]}`).join('');

  // 第四步：簽名
  let bytes;
  if (signMethod === 'md5') {
    const md5 = crypto.createHash('md5');
    md5.update(secret + concatStr + secret, 'utf8');
    bytes = md5.digest();
  } else if (signMethod === 'hmac-sha256') {
    bytes = crypto.createHmac('sha256', secret).update(concatStr, 'utf8').digest();
  } else {
    // 預設 hmac = HMAC-MD5
    bytes = crypto.createHmac('md5', secret).update(concatStr, 'utf8').digest();
  }
  // 第五步：hex 大寫
  return bytes.toString('hex').toUpperCase();
}

// ===== Helper：呼叫快麥 API =====
// 雲打印模式：不用 session/accessToken
// ERP 模式：需要 session（傳 accessToken 進來）
async function callKuaimai({ method, businessParams, appKey, appSecret, accessToken }) {
  const commonParams = {
    method,
    appKey,
    timestamp: getTaipeiTimestamp(),
    format: KUAIMAI_FORMAT,
    version: KUAIMAI_VERSION,
    sign_method: KUAIMAI_SIGN_METHOD,
  };
  // 只有 ERP API 才帶 session；雲打印 API 不需要
  if (accessToken) {
    commonParams.session = accessToken;
  }

  const allParams = { ...commonParams, ...businessParams };
  const sign = signParams(allParams, appSecret, KUAIMAI_SIGN_METHOD);
  allParams.sign = sign;

  // 用 form-urlencoded POST
  const body = new URLSearchParams(allParams).toString();

  const resp = await fetch(KUAIMAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body,
  });

  const text = await resp.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* keep raw */ }

  return {
    ok: resp.ok && json && json.success !== false,
    status: resp.status,
    raw: text,
    json,
  };
}

// ===== Helper：從 RTDB 查商家對應的印表機 SN =====
// 主路徑：bread/merchantsInfo/<merchantName>/printerSN（跟商家資料整合）
// 備用路徑：bread/printerDevices/<merchantName>（獨立對應表）
async function getPrinterSN(merchantName) {
  if (!merchantName) return null;
  const db = admin.database();
  // 主路徑：商家資料內的 printerSN
  const snap1 = await db.ref(`bread/merchantsInfo/${merchantName}/printerSN`).once('value');
  const v1 = snap1.val();
  if (v1 && typeof v1 === 'string') return v1.trim();
  // 備用路徑：獨立印表機對應表
  const snap2 = await db.ref(`bread/printerDevices/${merchantName}`).once('value');
  const v2 = snap2.val();
  if (!v2) return null;
  if (typeof v2 === 'string') return v2;
  if (typeof v2 === 'object' && v2.sn) return v2.sn;
  return null;
}

// =============================================================
// API 1: printLabel — 接前端請求 → 推送到印表機
// =============================================================
exports.printLabel = onRequest(
  {
    secrets: [KUAIMAI_APP_KEY, KUAIMAI_APP_SECRET],
    cors: false, // 自己處理 CORS
  },
  async (req, res) => {
    applyCors(req, res);

    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: '只接受 POST' });
    }

    try {
      const {
        merchantName,        // 商家名稱（用來查 SN）
        sn: snOverride,      // 可選：直接指定 SN（測試用）
        images,              // base64 PNG 陣列（每張一頁貼紙）
        pdfBase64,           // 可選：直接送 PDF base64
        printMethod,         // 可選：覆蓋預設 method
        debug,               // true 時回傳完整 raw response
      } = req.body || {};

      // 1) 找 SN
      let sn = snOverride;
      if (!sn && merchantName) {
        sn = await getPrinterSN(merchantName);
      }
      if (!sn) {
        return res.status(400).json({
          ok: false,
          error: `找不到「${merchantName || '(未指定)'}」對應的印表機 SN，請到設定 → 商家管理填印表機序號。`,
        });
      }

      // 2) 檢查列印內容
      if ((!images || images.length === 0) && !pdfBase64) {
        return res.status(400).json({
          ok: false,
          error: '沒有列印內容（images 或 pdfBase64 至少要有一個）',
        });
      }

      // 3) 取 secrets（雲打印不需要 accessToken）
      const appKey = KUAIMAI_APP_KEY.value();
      const appSecret = KUAIMAI_APP_SECRET.value();

      // 4) 組裝請求
      const results = [];
      if (pdfBase64) {
        // 用 PDF 模式
        const r = await callKuaimai({
          method: printMethod || PRINT_METHOD_TSPL_PDF,
          businessParams: { sn, pdf: pdfBase64 },
          appKey, appSecret,
        });
        results.push(r);
      } else {
        // 用圖片模式（每張一張一張送）
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          // 移除 data:image/png;base64, 前綴
          const cleanBase64 = img.replace(/^data:image\/[a-z]+;base64,/, '');
          const r = await callKuaimai({
            method: printMethod || PRINT_METHOD_TSPL_IMAGE,
            businessParams: { sn, image: cleanBase64 },
            appKey, appSecret,
          });
          results.push(r);
          if (!r.ok) break; // 中斷後續送印
        }
      }

      // 5) 回應
      const allOk = results.every(r => r.ok);
      const summary = {
        ok: allOk,
        sn,
        total: results.length,
        success: results.filter(r => r.ok).length,
        failed: results.filter(r => !r.ok).length,
      };
      if (debug) {
        summary.results = results;
      } else if (!allOk) {
        // 失敗時回傳錯誤訊息
        const firstFail = results.find(r => !r.ok);
        summary.error = firstFail?.json?.msg || firstFail?.raw || '未知錯誤';
        summary.errorCode = firstFail?.json?.code;
      }
      return res.status(allOk ? 200 : 502).json(summary);
    } catch (err) {
      console.error('[printLabel] error:', err);
      return res.status(500).json({
        ok: false,
        error: String(err.message || err),
      });
    }
  }
);

// =============================================================
// API 2: refreshKuaimaiToken — 雲打印不需要 token，這支保留給 ERP API 用（暫不啟用）
// =============================================================
// 雲打印 API 只需 appid+secret，不會過期。本支 API 僅在改用 ERP API 時才需要。
// 暫時保留函式體，但實際用不到。
exports.refreshKuaimaiToken = onRequest(
  {
    secrets: [KUAIMAI_APP_KEY, KUAIMAI_APP_SECRET],
    cors: false,
  },
  async (req, res) => {
    applyCors(req, res);
    if (req.method === 'OPTIONS') return res.status(204).send('');
    return res.status(501).json({
      ok: false,
      error: '雲打印 API 不需要 accessToken，這支 endpoint 暫不啟用。',
    });
  }
);

// =============================================================
// API 3: queryPrinterStatus — 查印表機狀態（debug 用）
// =============================================================
exports.queryPrinterStatus = onRequest(
  {
    secrets: [KUAIMAI_APP_KEY, KUAIMAI_APP_SECRET],
    cors: false,
  },
  async (req, res) => {
    applyCors(req, res);
    if (req.method === 'OPTIONS') return res.status(204).send('');

    try {
      const { sn, merchantName } = req.body || {};
      let printerSN = sn;
      if (!printerSN && merchantName) {
        printerSN = await getPrinterSN(merchantName);
      }
      if (!printerSN) {
        return res.status(400).json({ ok: false, error: '需要 sn 或 merchantName' });
      }
      const r = await callKuaimai({
        method: 'kuaimai.cloud.device.status.query',
        businessParams: { sns: JSON.stringify([printerSN]) },
        appKey: KUAIMAI_APP_KEY.value(),
        appSecret: KUAIMAI_APP_SECRET.value(),
        // 雲打印 API 不需要 accessToken
      });
      return res.status(r.ok ? 200 : 502).json({
        ok: r.ok,
        sn: printerSN,
        result: r.json,
        raw: r.raw,
      });
    } catch (err) {
      console.error('[queryPrinterStatus] error:', err);
      return res.status(500).json({ ok: false, error: String(err.message || err) });
    }
  }
);
