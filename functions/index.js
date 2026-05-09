/**
 * 麵包團購系統 — 快麥雲列印簽名服務（v007）
 *
 * 架構說明：
 * 雲打印 cloud.kuaimai.com 對 Google Cloud asia-east1 的 IP 做風控擋下（回 40004）。
 * 改用「Cloud Function 只算簽名，appSecret 不暴露」+「前端拿 sign 後直接打 cloud.kuaimai.com」
 * 這樣用 Ken 瀏覽器的 IP（台灣）打快麥 API 不會被擋。
 *
 * 端點：
 *   POST /signRequest  — 接 { params }，回 { sign, body, url }
 *   POST /printLabel   — DEPRECATED，保留向後相容（仍會嘗試從 server 打）
 *
 * 部署：firebase deploy --only functions
 *
 * Secrets:
 *   firebase functions:secrets:set KUAIMAI_APP_KEY
 *   firebase functions:secrets:set KUAIMAI_APP_SECRET
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const crypto = require('crypto');

setGlobalOptions({
  region: 'asia-east1',
  maxInstances: 10,
  memory: '256MiB',
  timeoutSeconds: 30,
});

admin.initializeApp();

const KUAIMAI_APP_KEY = defineSecret('KUAIMAI_APP_KEY');
const KUAIMAI_APP_SECRET = defineSecret('KUAIMAI_APP_SECRET');

const KUAIMAI_BASE = 'https://cloud.kuaimai.com';
const ENDPOINTS = {
  bindDevice:        `${KUAIMAI_BASE}/api/cloud/device/bindDevice`,
  unbindDevice:      `${KUAIMAI_BASE}/api/cloud/device/unbindDevice`,
  batchStatus:       `${KUAIMAI_BASE}/api/cloud/device/batchStatus`,
  tsplXmlWrite:      `${KUAIMAI_BASE}/api/cloud/print/tsplXmlWrite`,
  tsplTemplatePrint: `${KUAIMAI_BASE}/api/cloud/print/tsplTemplatePrint`,
  result:            `${KUAIMAI_BASE}/api/cloud/print/result`,
  cancelJob:         `${KUAIMAI_BASE}/api/cloud/print/cancelJob`,
};

const ALLOWED_ORIGINS = [
  'https://karlkuo68.github.io',
  'http://localhost:8080',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

function applyCors(req, res) {
  const origin = req.headers.origin || '';
  res.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '3600');
}

function getTaipeiTimestamp() {
  const now = new Date();
  const tw = new Date(now.getTime() + 8 * 3600 * 1000);
  return tw.toISOString().slice(0, 19).replace('T', ' ');
}

// 純 MD5 簽名（appSecret + sortedKeyValueConcat + appSecret -> 32 位小寫）
function signParams(params, appSecret) {
  const filtered = {};
  for (const [k, v] of Object.entries(params)) {
    if (k === 'sign' || v === null || v === undefined || v === '') continue;
    filtered[k] = v;
  }
  const sortedKeys = Object.keys(filtered).sort();
  const concat = sortedKeys.map(k => {
    const v = filtered[k];
    if (typeof v === 'boolean') return k + (v ? 'true' : 'false');
    if (typeof v === 'object') return k + JSON.stringify(v);
    return k + String(v);
  }).join('');
  const md5 = crypto.createHash('md5');
  md5.update(appSecret + concat + appSecret, 'utf8');
  return md5.digest('hex');
}

async function getPrinterSN(merchantName) {
  if (!merchantName) return null;
  const db = admin.database();
  const snap = await db.ref(`bread/merchantsInfo/${merchantName}/printerSN`).once('value');
  const v = snap.val();
  return (v && typeof v === 'string') ? v.trim() : null;
}

// =============================================================
// API: signRequest — 主要入口
// =============================================================
// 接前端 POST：{ method, params, merchantName? }
//   method: 'bindDevice' | 'tsplXmlWrite' | 'batchStatus' | 'result' | 'cancelJob' | 'tsplTemplatePrint'
//   params: 業務參數（不含 appId/timestamp/sign，這 3 個由 Cloud Function 補上）
//   merchantName: （可選）若有 sn 但沒填，從 RTDB 查商家 SN 補上
//
// 回應：{ ok, url, body }
//   url: 完整快麥 endpoint
//   body: 已含 appId/timestamp/sign 的完整 JSON body 字串，可直接 fetch
//
// 前端拿到後直接：fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body })
exports.signRequest = onRequest(
  {
    secrets: [KUAIMAI_APP_KEY, KUAIMAI_APP_SECRET],
    cors: false,
  },
  async (req, res) => {
    applyCors(req, res);
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: '只接受 POST' });

    try {
      const { method, params = {}, merchantName } = req.body || {};
      if (!method) return res.status(400).json({ ok: false, error: '缺 method' });
      const url = ENDPOINTS[method];
      if (!url) return res.status(400).json({ ok: false, error: `不支援的 method: ${method}（支援：${Object.keys(ENDPOINTS).join('/')}）` });

      // 補商家 SN（如果有 merchantName 但 params 沒 sn）
      const finalParams = { ...params };
      if (merchantName && !finalParams.sn) {
        const sn = await getPrinterSN(merchantName);
        if (sn) finalParams.sn = sn;
      }

      const appKey = KUAIMAI_APP_KEY.value();
      const appSecret = KUAIMAI_APP_SECRET.value();
      const timestamp = getTaipeiTimestamp();

      const allParams = {
        ...finalParams,
        appId: appKey,
        timestamp,
      };
      const sign = signParams(allParams, appSecret);
      allParams.sign = sign;

      return res.status(200).json({
        ok: true,
        url,
        body: JSON.stringify(allParams),
        // debug 用（不含 secret）
        appId: appKey,
        timestamp,
      });
    } catch (err) {
      console.error('[signRequest] error:', err);
      return res.status(500).json({ ok: false, error: String(err.message || err) });
    }
  }
);

// =============================================================
// LEGACY: printLabel / bindPrinter / queryPrinterStatus / refreshKuaimaiToken
// 保留 (向後相容)，但都會 Failed because Google IP is blocked
// =============================================================
const legacyHandler = (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  return res.status(410).json({
    ok: false,
    error: '此 endpoint 已 deprecated。雲打印 API 從 Cloud Function 直接打會被快麥 IP 風控擋下，請改用 signRequest 取得簽名後從前端打。',
  });
};

exports.printLabel = onRequest(
  { secrets: [KUAIMAI_APP_KEY, KUAIMAI_APP_SECRET], cors: false },
  legacyHandler
);
exports.bindPrinter = onRequest(
  { secrets: [KUAIMAI_APP_KEY, KUAIMAI_APP_SECRET], cors: false },
  legacyHandler
);
exports.queryPrinterStatus = onRequest(
  { secrets: [KUAIMAI_APP_KEY, KUAIMAI_APP_SECRET], cors: false },
  legacyHandler
);
exports.refreshKuaimaiToken = onRequest(
  { secrets: [KUAIMAI_APP_KEY, KUAIMAI_APP_SECRET], cors: false },
  legacyHandler
);
