# 麵包團購系統 (bread-group-buy)

> **此檔案給 Claude 讀的專案記憶。在這個資料夾工作時，請先讀完本檔再動手。**
> 最後更新：2026-04-20

---

## ⚠️ 身份識別（不要再跟好糰團購派單系統搞混）

**這個專案叫「麵包團購系統」，不是「好糰團購派單系統」。兩者完全不同：**

|  | 麵包團購系統（本專案）| 好糰團購派單系統（另一個）|
|---|---|---|
| 資料夾 | `~/Desktop/bread-group-buy/` | `~/Desktop/好糰團購派單系統/` |
| GitHub | `karlkuo68/bread-group-buy` | `karlkuo68/goood` |
| 網址 | https://karlkuo68.github.io/bread-group-buy | https://karlkuo68.github.io/goood |
| 性質 | **麵包訂購/團購管理**（訂單、品項、貼紙、對帳）| **外送派單**（一鍵派單四階段、外送員端）|
| 後端 | Firebase Realtime DB | Firebase（共用 invoice-scanner-33a68）|
| 主檔 | 只有 `index.html` | `index.html` + `driver.html` |

---

## 🏗️ 架構：兩層儲存（GitHub + Firebase）

**這個系統分兩層，搞清楚才不會找錯地方：**

| 層級 | 儲存位置 | 存什麼 | 更新時機 |
|---|---|---|---|
| **程式碼**（介面、功能、邏輯） | **GitHub** | `index.html` 本身（HTML + JS + CSS） | Claude 修改後 `git push` |
| **使用者資料**（訂單、對帳、已接受狀態） | **Firebase Realtime DB** | 批次、對帳、接受狀態、使用者等 | 使用者在網頁操作時自動寫入 |

### GitHub 那邊（程式）
- Repo：`https://github.com/karlkuo68/bread-group-buy`
- 部署：GitHub Pages → `https://karlkuo68.github.io/bread-group-buy/`
- 修改流程：改 `index.html` → `git add` → `git commit` → `git push origin main`（1-2 分鐘生效）

### Firebase 那邊（資料）
- Project ID：`bread-group-buy`
- Database URL：`https://bread-group-buy-default-rtdb.asia-southeast1.firebasedatabase.app`（亞洲東南伺服器）
- 根節點：`bread/`
  - `bread/batches/` — 訂單批次（每次匯入產生一筆 `b_時間戳`）
  - `bread/recons/` — 對帳紀錄（`recon_YYYY_M_商家` 為 key）
  - `bread/acceptance/` — 商家接受狀態（以 oid 為 key，2026-04-20 新增）
  - `bread/users/` — 使用者帳號
  - `bread/merchants/` — 商家清單
  - `bread/settings/` — 系統設定（QR code、袋量、規則等）
  - `bread/backups/` — 每日自動備份（保留最近 30 份）

### 資料流（使用者按「接受」時）
```
使用者瀏覽器
    ↓ 載入
GitHub Pages 的 index.html（程式碼）
    ↓ 執行
DB.set('acceptance', {...})
    ↓ 寫雲端
Firebase Realtime DB
    ↓ 即時推播
其他裝置的 fbRef.on('value') 收到更新
```

### 重點規則
- **改程式 → GitHub**（需要 commit + push 才會生效）
- **使用者資料 → Firebase**（自動同步，不需手動管理）
- **「永久儲存」指的是 Firebase**（DB.set 就是寫 Firebase）
- **「程式版本控管」指的是 GitHub**（可回溯任何歷史 commit）
- **不要把資料放進 index.html**（應永遠透過 DB.get / DB.set 操作 Firebase）

---

## 專案基本資料

- **部署位址**：https://karlkuo68.github.io/bread-group-buy/
- **GitHub Repo**：https://github.com/karlkuo68/bread-group-buy.git
- **主檔案**：`~/Desktop/bread-group-buy/index.html`（單檔 116 KB / 1,572 行）
- **版本標記（meta）**：`20260330v3`
- **技術棧**：單檔 HTML + Firebase Realtime Database (compat SDK 10.12.0) + XLSX (SheetJS 0.18.5) + jsPDF 2.5.1
- **字型**：Noto Serif TC / Noto Sans TC / DM Mono
- **主題色**：cream / bread / crust 麵包色系（CSS variables）
- **最後修改**：2026-04-09 16:25（本地檔案）

---

## 已實作功能（依最近 commit 推斷）

- 登入系統（loginScreen）、角色選擇
- 品項管理、訂單管理、店家查詢明細
- 對帳作業（欄位補全、匯入更新、調帳公式改加、中文不斷字）
- **貼紙列印**（PDF 輸出）
  - 表頭：`好糰 x 商家名稱`
  - 雙欄排版（最新 2026-04-09 commit `23f735b`）
  - 品項永不截斷；footer 統編/備註 fallback 順序 items > 統編 > 備註
  - 中文不斷字、字體自動縮放
- Excel 匯入/匯出、帳號管理、匯款日期格式
- **匯入重複訂單防呆（2026-04-20）**
  - `saveBatchAndGo` 會先呼叫 `findDuplicateOids` 比對既有批次
  - 有重複 → `showDuplicateDialog` 彈窗，每筆訂單獨立 checkbox 勾選
  - 勾選 = 用新資料取代（舊批次對應品項移除，空批次自動刪除）
  - 不勾 = 略過此筆（保留舊資料，新匯入捨棄）
  - 解決「同筆訂單重複計入預覽分裝表」的 bug
- **對帳頁移除年/月下拉選單，改用日期區間推算（2026-04-21）**
  - UI 拿掉 `reconYear` / `reconMonth` 兩個下拉選單
  - 現有查詢欄位：商家選擇、狀態選擇、日期區間
  - 新 helper `getReconCurYM()`：從 reconDateFrom → reconDateTo → 今日 依序推算 {year,month}
  - 新 helper `parseReconKey(key)`：把 `recon_YYYY_M_商家` 解析回 {year,month,merchant}
  - `searchRecon` 改為列出該商家（或全部商家）**所有**對帳紀錄，按年月降冪；每筆卡片標示年/月、狀態、重算時間、調帳金額 tag
  - 上半月/下半月快捷、exportReconExcel、rebuildReconFromBatches、sendRecon、markInvoiced、importReconExcel 全部改用 `getReconCurYM()`
  - 若 Ken 要處理特定歷史月份，先在日期區間輸入那個月的某一天即可（helper 會推算年月）
- **匯出對帳單支援日期區間 + 調帳歸零（2026-04-20，再修正）**
  - Issue 1: 有設日期區間時，「匯出對帳單 Excel」會依區間過濾 batches，檔名 `對帳單_商家_YYYY-MM-DD_至_YYYY-MM-DD.xlsx`（或單日 `對帳單_商家_YYYY-MM-DD.xlsx`）
  - 區間模式會略過 cache，直接從 batches 讀最新資料
  - Issue 2: `regenerateReconFromBatches` 重算時 `discountReason`/`discountAmt` 歸零（Ken 要求：訂單變動後調帳需重新評估）
  - 區間匯出也會自動把調帳/匯款欄位歸零（對帳 Excel 裡的「調帳原因/金額」留空）
- **匯出對帳單過期 cache 防呆（2026-04-20）**
  - 症狀：刪除訂單後重新匯入，匯出對帳單 Excel 仍是舊資料
  - 根因：`recons[key]` 被 importReconExcel / sendRecon / markInvoiced 儲存成快照後，exportReconExcel 就一直用舊資料不重讀 batches
  - 修復：`exportReconExcel` 開頭呼叫 `detectReconStale` 比對 batches vs cache 的 oid 與金額，不一致時 confirm 提示「偵測到訂單資料已變動，要用最新訂單重算嗎？」
  - 新增手動按鈕：對帳頁多一顆 `🔄 重算對帳單`（在匯出旁），管理者可主動重算
  - 重算邏輯：`regenerateReconFromBatches(year,month,merchant,preserveMeta=true)` — 用 batches 重產 orders，保留頂層 metadata（status/discountReason/discountAmt/payDate/payAmt）與 per-oid 手動調整（當金額沒變時）
  - 關鍵函式：`detectReconStale`, `regenerateReconFromBatches`, `rebuildReconFromBatches`
- **對帳頁日期區間查詢（2026-04-20）**
  - 既有月份查詢上方新增日期區間輸入（from ~ to）
  - 快捷鈕：「上半月(1-15)」「下半月(16-月底)」「清除」（只填日期不自動搜尋）
  - 「搜尋區間訂單」按鈕顯示該商家該區間的訂單明細 + 小計 + 匯出 Excel
  - 支援單日查詢（只填一個日期即可）
  - 對帳頁上方顯示 Firebase 同步狀態：「☁️ 已永久儲存（上次同步：時間）」
  - 離線時切紅色警示；監聽 online/offline 事件即時更新
  - 關鍵函式：`reconSetHalfMonth`, `searchReconRange`, `renderReconRange`, `exportReconRangeExcel`, `updateSyncStatus`, `_markSynced`
- **商家已接受按鈕（2026-04-20）**
  - 資料存 `DB.acceptance[oid] = {accepted, at, by, byPhone, byRole, byBusiness}`
  - 透過 Firebase + localStorage 同步
  - 訂單卡片列表：⏳/✅ badge + 一鍵接受按鈕
  - 訂單詳情頁：大按鈕 + 接受後綠色狀態條顯示接受人/時間/角色
  - 權限：所有登入者可按「接受」（有紀錄誰按的）；僅管理者可「取消接受」
  - 貼紙/分裝表/對帳單刻意不動（不影響列印版面）

---

## 最近 10 筆 commit

```
（下個 commit）refactor(recon): 移除年/月下拉，改從日期區間推算；對帳清單列出全部（2026-04-21）
b3931b4 fix(recon): 匯出對帳單支援日期區間 + 重算時調帳歸零（2026-04-20）
1a1aad6 fix(recon): 匯出對帳單時自動偵測 cache 過期 + 手動重算按鈕（2026-04-20）
97fb772 feat(recon): 對帳頁日期區間查詢 + 上半月/下半月快捷 + Firebase 同步狀態（2026-04-20）
4d13497 feat: 匯入重複訂單防呆 + 商家已接受按鈕（2026-04-20）
81e756b docs: 新增 CLAUDE.md 專案記憶
23f735b feat(sticker): 品項改雙欄排版，解決空間不足截斷問題
2b68274 fix: PDF 無法列印 — popup onload timing 問題
992cece fix: 貼紙 footer（統編/備註）被誤隱藏 — 重設 fallback 順序
38a1f23 fix: 貼紙品項被截斷 — 移除 .stk-item 硬寫 font-size:12px
859d652 fix: 店家查詢明細 + 調帳公式改加 + 中文不斷字
19e75a5 fix: 貼紙品項永不截斷 — 重構 layout 優先順序
e2fda1a fix: 對帳作業欄位補全 + 匯入更新 bug + 貼紙備註截斷 + 匯款日期格式
6b7291e fix: 帳號管理列表缺少 closing div 導致格式錯亂
47da210 fix: 貼紙表頭格式改為 好糰 x 商家名稱
1896679 fix: 貼紙表頭從 item 帶入商家名稱
```

目前 branch：`main`，與 `origin/main` 同步。

---

## 檔案列表

```
bread-group-buy/
├── index.html                              ← 主檔（單一正式版）
├── index.html.bak.20260409-雙欄             ← 雙欄改版前的本地備份（未 commit）
├── CLAUDE.md                               ← 本檔（專案記憶）
├── .git/                                   ← remote = karlkuo68/bread-group-buy
└── .claude/                                ← Claude Code worktrees（未 commit）
```

---

## 部署流程

```bash
cd ~/Desktop/bread-group-buy
git add index.html
git commit -m "fix/feat: <說明>"
git push origin main
# GitHub Pages 自動部署到 https://karlkuo68.github.io/bread-group-buy/
```

---

## 修改慣例（Ken 的偏好）

1. **動工前必備份**：`cp index.html index.html.bak.$(date +%Y%m%d)-<說明>`
2. **commit 訊息格式**：`fix:`、`feat:`、`feat(sticker):` 等 conventional commit 前綴
3. 修完記得 `git push origin main` 才會上線
4. 備份檔（`*.bak.*`）不要 commit，保持版控只有 `index.html`

---

## Claude 自我提醒（避免搞混）

- 被問「麵包團購」→ **只看這個資料夾**，不要去碰 `好糰團購派單系統/`
- 被問「好糰」「派單」「外送員」→ 去 `~/Desktop/好糰團購派單系統/`
- 被問「檔案在哪」→ 先讀 `~/Documents/Claude/快速查找.md` 和 `~/Documents/Claude/CLAUDE.md`
- 不確定時先問 Ken，不要自己猜
