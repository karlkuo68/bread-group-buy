# 麵包團購系統 (bread-group-buy)

> **此檔案給 Claude 讀的專案記憶。在這個資料夾工作時，請先讀完本檔再動手。**
> 最後更新：2026-04-23

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
- **最後修改**：2026-04-21 14:51（本地檔案）

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
- **刪除無用的貼紙店名/每張最多品項數設定（2026-04-21）**
  - 調查發現 `G.storeName` 程式完全沒引用（貼紙寫死「好糰 x 商家名稱」）
  - `G.ipp`（每張貼紙最多品項數）也完全沒引用；實際決定貼紙品項數的是 `G.bagCap`（每袋 = 每張貼紙）
  - 刪除：HTML set-row、G 物件屬性、loadSettings/saveSettings 裡的對應處理、DB.set('settings',{}) 的鍵
  - bagCap=8 維持不變，等於「每張貼紙最多 8 項」
- **對帳搜尋 UX 修正（2026-04-21）**
  - Ken 回報：設上半月 4/1-4/15，但查詢結果列出 4/22 訂單
  - 診斷：searchReconRange 邏輯無誤（node 單元測試驗證過濾精準），問題是 Ken 按「查詢」而非「搜尋區間訂單」，或查看明細時顯示整月 cache
  - 修正：`searchRecon` 最後若有日期區間 + 商家，自動連帶呼叫 `searchReconRange`（按「查詢」就會同時列出對帳紀錄 + 區間訂單）
  - 修正：`viewReconDetail` / `viewMerchantReconDetail` 的 rec.year/month/merchant 欄位若缺，改用 `parseReconKey(key)` 推回（避免顯示 undefined）
  - 修正：`regenerateReconFromBatches` 寫入 recon 時補上 `year/month/merchant` 欄位，日後新資料就完整
- **對帳作業改為「生成」流程 + 資料庫查詢封存頁（2026-04-21）**
  - 舊：「🔍 搜尋區間訂單」只顯示訂單卡，不寫入
  - 新：「🧾 生成對帳單」按下去把區間內訂單融合寫入 recons[key]，直接加到歷史紀錄
  - 已存在同區間對帳單 → confirm 覆蓋；已封存的不能覆蓋，要先取消封存
  - 歷史紀錄區每筆操作按鈕（admin）：查看明細 / ⬇️ 下載 / 📦 封存 / 標記發票已開立 / ✕ 刪除
  - 商家角色：只有查看明細 + ⬇️ 下載
  - 客服 cs：查看明細 + ⬇️ 下載（不能改不能刪）
  - 新增 tab「📚 資料庫查詢」= page-archive
  - searchArchive 只顯示 `rec.archivedAt` 有值的 recons
  - 篩選：商家 / 年份 / 狀態 / 訂單關鍵字（搜 oid 或 buyer）
  - 封存欄位：`rec.archivedAt`, `rec.archivedBy`
  - 取消封存（僅 admin）：拿回對帳作業工作區
  - 刪除（僅 admin）：永久刪除，對封存中的會多一層 confirm
  - searchRecon 自動過濾 `archivedAt` 有值的紀錄（只顯示工作區）
  - 關鍵函式：`generateRecon`, `archiveRecon`, `unarchiveRecon`, `delRecon`, `downloadReconExcel`, `initArchivePage`, `searchArchive`
- **貼紙 PDF 末頁空白修正（2026-04-21）**
  - 症狀：列印貼紙 PDF 有時最末頁是完全空白（有些訂單有、有些沒有）
  - 根因：`.stk{page-break-after:always}` 在最後一張貼紙也觸發，瀏覽器依語義多印一張空白
  - 修復：三處 CSS 都加 `.stk:last-child{page-break-after:auto;break-after:auto}`
  - 同時加現代 `break-after` 屬性增加跨瀏覽器相容
  - 其餘貼紙生成邏輯完全不動
- **商家資料 6 大規則（2026-04-24）**
  - 必填欄位：備註以外全必填，`MERCHANT_REQUIRED_FIELDS` 常數定義
  - `hasMerchantProfile` / `getMerchantProfileStatus` 判斷完整度
  - 狀態顯示：✓資料已完成 / ⚠️資料未完成（訂單頁商家卡片 + 設定頁商家列表 + Modal 頂部狀態條）
  - 商家本人唯讀欄位：發票抬頭、統一編號、取貨地點（`MERCHANT_LOCKED_FIELDS_FOR_SELF`）
    - input readonly + 灰底 + cursor:not-allowed + 🔒 圖示
    - onclick/onfocus 觸發 `notifyLockedField` 彈警示：「此欄位涉及合約、發票資料，如需修改請聯繫好糰管理者協助」
    - 提交時二次保險強制用舊值
  - 區塊小字：
    - 基本資料區底下：「📅 每月最後一日前修改，次月生效。」
    - 撥款資料區底下：「📅 撥款日前 5 個工作天修改，適用本次撥款。」
  - 通知系統（系統內訊息區）：
    - DB.notifications (最多 300 筆)
    - header 🔔 鈴鐺 + 未讀數 badge（admin/cs）
    - 登入時自動 toast 提示未讀數
    - 通知面板：每條顯示誰改了什麼商家 + 欄位 diff（舊→新）
    - 已讀/未讀狀態、逐筆或全部標已讀
    - 預留 EmailJS 掛鉤：`NOTIFY_EMAIL = believe.in.1061213@gmail.com`
  - 修改歷程（後台可調閱）：
    - DB.merchantHistory [商家]: [{at, by, byRole, byPhone, byBusiness, diff}] (最多 200 筆/商家)
    - Modal 底部「📜 修改歷程」按鈕（admin 可見）
    - 歷程 Modal 每筆顯示時間 / 操作人 / 角色 / 欄位 diff（刪除線樣式）
  - 儲存訊息差異化：
    - 商家：「✅ 資料已送出更新，系統管理者將同步收到通知」
    - 管理者：「✅ 已儲存『X』的商家資料（已寫入修改歷程 + 通知）」
  - JSON 備份 v5：新增 merchantsInfo / merchantHistory / notifications
- **商家詳細資料 + 自我編輯（2026-04-21）**
  - 新資料結構：`DB.merchantsInfo` = `{[商家名]: {title, taxId, pickupAddr, contactName, contactPhone, contactEmail, bankName, bankBranch, bankAccount, accountHolder, passbookImage, passbookFileName, notes, updatedAt, updatedBy}}`
  - 原本的 `merchants` 仍是名稱清單，不動
  - 欄位：發票抬頭、統一編號（8 碼驗證）、取貨地點、聯絡人/電話/Email、銀行/分行/帳號/戶名、帳簿影像（圖片或 PDF，base64）、備註
  - Helper：`getMerchantInfo` / `saveMerchantInfo` / `canEditMerchant` / `hasMerchantProfile`
  - 編輯 Modal：`editMerchantInfo(name)` 打開大表單，含帳簿上傳（5MB 限制）
  - 權限：admin/owner 可編任何商家；merchant 只能編自己（CUR.businessName）
  - UI 入口：
    - 設定頁商家管理列表每列加 ✏️ 編輯 + ✓已填／⚠️未填 tag
    - 訂單頁頂部給 merchant 專屬「🏪 我的商家資料」卡片，顯示已填欄位與編輯按鈕；未填會跳黃底警示
  - 帳簿預覽：圖片直接顯示縮圖；PDF 顯示 📄 圖示與檔名
  - Firebase 同步：DB.set('merchantsInfo', ...) 即時寫雲端
- **對帳 key 改為區間制（2026-04-21，Ken 要 B 方案）**
  - 舊設計：同商家同月份只有一筆對帳單，重算會覆蓋
  - 新設計：每個日期區間獨立一筆，同月可有「上半月」「下半月」「整月」「任意區間」多筆並存
  - 新 key 格式：`recon_YYYY-MM-DD_YYYY-MM-DD_商家`
  - 舊 key 格式：`recon_YYYY_M_商家`（parseReconKey 兼容解析為整月區間）
  - 新 helper：
    - `getReconRangeKey(df, dt, merchant)` 產生新 key
    - `getCurrentReconKey()` 從 UI 推出當前操作的 key（有區間用區間；沒有用今月整月）
    - `parseReconKey(key)` 支援新舊兩種格式，回傳 `{df, dt, merchant, year, month, isFullMonth, label}`
  - 操作區別：
    - 沒設日期區間 → 操作的是「今月整月」對帳單
    - 有設日期區間 → 操作的是該區間專屬對帳單
  - 所有 recon 函式都改用 getCurrentReconKey：exportReconExcel / importReconExcel / rebuildReconFromBatches / sendRecon / markInvoiced / regenerateReconFromBatches / detectReconStale
  - searchRecon 按起始日期降冪排序，每筆顯示 label（「2026/4 整月」「2026-04-01 ~ 2026-04-15」等）
  - viewReconDetail / viewMerchantReconDetail 改用 label 顯示
- **清除舊訂單改 per-item + 同步清對帳紀錄（2026-04-21）**
  - 舊 bug：原邏輯看「整批的最晚取件日」，若批次含混合日期（如 4/8、4/15、4/22），永遠不符合清除條件 → 顯示沒資料
  - 修：`_scanCleanup(dateStr)` 逐筆檢查 pickTime < dateStr，該批次部分刪除（保留新訂單）
  - 整批都舊 → 刪整批；部分舊 → 更新 items 與 oids
  - 同時清除對帳紀錄：年月 < 清除年月的所有 recons
  - 預覽顯示：X 筆訂單品項、Y 整批刪、Z 部分刪、N 筆對帳紀錄（列出商家+年月）
  - 備份 Excel 含：訂單品項 sheet + 對帳紀錄 sheet
- **備份改為行政可讀 Excel（2026-04-21）**
  - 原本只有 JSON 備份（使用者看不懂），改為主要產出 Excel
  - 新增 `exportAllExcel()`：產出 8 個 sheet
    - 訂單明細（每筆品項一列）
    - 訂單批次總覽（每批統計）
    - 對帳紀錄（每月每商家一列）
    - 對帳訂單明細（對帳裡每筆訂單）
    - 商家清單（含 n/3 使用量）
    - 帳號清單（不含密碼，含鎖定/核可狀態）
    - 已接受訂單
    - 系統設定與摘要
  - 按鈕排列：`⬇️ 備份資料（Excel）` | `⬇️ 進階備份（JSON）` | `⬆️ 還原備份（JSON）`
  - 還原仍用 JSON（因為 Excel 還原需要解析結構，風險大）
  - JSON 備份同步擴充 v3→v4，多存 recons/merchants/acceptance
- **帳號管理擴充（2026-04-21）**
  - 商家帳號上限：每個商家最多 3 個帳號（含待核可）；`MERCHANT_USER_LIMIT=3` 常數
  - `doRegister` / `addUser` / `approveUser` 三處都會檢查；超過會擋下並提示
  - 帳號篩選下拉：全部 / 好糰內部（owner/admin/cs）/ 各商家（顯示 n/3 使用量）
  - 動態填入：每次 `renderUsers` 會呼叫 `populateUserFilter` 同步商家選項
  - 每列操作按鈕（admin/owner 專用，不能對自己、不能對負責人）：
    - ✏️ 改暱稱（`editNickname`）
    - 🔑 改密碼（`editPassword`）：至少 4 碼
    - 🔒 鎖定 / 🔓 解鎖（`toggleLock`）：鎖定後 `doLogin` 拒絕登入，保留資料；解鎖隨時可恢復
    - ✕ 刪除（`delUser`）：加 confirm 警示；提示先用鎖定代替
  - 鎖定資料欄位：`locked`, `lockedAt`, `lockedBy`
  - 密碼變更紀錄：`pwdChangedAt`, `pwdChangedBy`
  - 刪除保護：不能刪除自己、不能刪除 owner
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
（下個 commit）cleanup: 刪貼紙店名/每張最多品項數死設定 + 對帳查詢自動連帶區間搜尋（2026-04-21）
1a14343 feat(recon): 對帳單明細頁加儲存功能（調帳/匯款可編輯）（2026-04-21）
2d286f6 fix(recon): 訂單編輯公式調整（應收 = 商品總金額 - 服務費）（2026-04-21）
e4455b7 feat(recon): 對帳單每筆訂單可編輯金額（折扣/服務費/應收/對帳結果）（2026-04-21）
56340e0 fix(recon): 下載 Excel 回復原格式，序號改放最下方一行（2026-04-21）
84c84d4 feat(recon): 對帳單序號機制 + 匯入時序號偵測覆蓋（2026-04-21）
e54d826 feat(recon): 對帳單明細頁顯示擴充至與下載 Excel 一致（2026-04-21）
666d4f2 cleanup: 刪除對帳作業頂部「匯出對帳單」按鈕與函式（2026-04-21）
81d25ec fix(recon): 對帳作業查詢加入日期區間篩選（2026-04-21）
a32b0e7 fix(recon): importReconExcel 改從 Excel 內訂單日期推 key，不再覆蓋（2026-04-21）
c670996 ui(recon): 送出按鈕送出後仍保留（改顯示「重新送出」）（2026-04-21）
1dab573 ui(recon): 送出對帳單按鈕移到每筆列表與明細頁（2026-04-21）
0cb62d5 ui(recon): 欄位重排成兩排 + 明細加回上一頁按鈕（2026-04-21）
5f92b03 refactor(recon): 對帳改為「生成」流程 + 新增資料庫查詢封存頁（2026-04-21）
7385642 fix(sticker): 貼紙 PDF 末頁空白 — 最後一張不強制分頁（2026-04-21）
5c617bd feat(merchant): 商家詳細資料 + 自我編輯（抬頭/統編/取貨/聯絡/撥款/帳簿）（2026-04-21）
494efe6 refactor(recon): 對帳 key 改為區間制，同商家可多筆（2026-04-21）
eba0d08 fix+feat: 清除舊訂單改 per-item（含對帳紀錄）+ 備份改 Excel 業務資料（2026-04-21）
72e785d feat(users): 帳號管理擴充（上限 3 / 篩選 / 改暱稱改密碼 / 鎖定解鎖 / 刪除 confirm）（2026-04-21）
36fd6de cleanup+fix: 刪除無用設定（storeName、ipp）+ 對帳搜尋連動日期區間（2026-04-21）
6b4f4c2 refactor(recon): 移除年/月下拉，改從日期區間推算；對帳清單列出全部（2026-04-21）
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
5. **.bak 檔案輪替**：只保留最近 2 份，修改前備份後順便清除更舊的（Ken 2026-04-21 要求）
   - 指令：`ls -t index.html.bak.* | tail -n +3 | xargs rm -v`
   - 歷史版本要回溯用 git，不靠 .bak 檔
6. **🚨 每次改動完要主動提醒 Ken 做資料備份（Ken 2026-04-24 要求）**
   - **不是**提醒 git 或 .bak（那些是 Claude 自己做的）
   - **是**提醒 Ken 去 `⚙️ 設定 → 💾 資料管理` 按：
     - `⬇️ 備份資料（Excel）` — 行政可讀的多 sheet Excel
     - `⬇️ 進階備份（JSON）` — 完整資料結構，可用於還原
   - 特別是：新增欄位/資料結構改變的 commit 後，一定要請 Ken 備份
   - 重大功能上線、bug 修復後，也要提醒
   - 文字範本：
     > 🚨 建議立刻備份：設定 → 💾 資料管理 → ⬇️ 備份資料（Excel）＋ ⬇️ 進階備份（JSON），存到 Google Drive/iCloud。

---

## ☁ 雲端列印（快麥雲整合）SOP（2026-05-09 新增）

### 系統架構

```
商家手機/平板（HTTPS, GitHub Pages）
    ↓ 點「☁ 雲端列印貼紙」
    ↓ html2canvas 截圖每張貼紙 → base64 PNG
    ↓ POST {merchantName, images}
Firebase Cloud Function: printLabel
    ↓ 從 RTDB bread/merchantsInfo/<name>/printerSN 查印表機 SN
    ↓ HMAC-MD5 簽名 + form-urlencoded POST
快麥雲 API: https://gw.superboss.cc/router
    ↓ 推送 (4G/WiFi)
店內快麥標籤印表機（E20W/E31G）→ 自動列印
```

### 重要檔案

| 檔案 | 作用 |
|---|---|
| `firebase.json` | Functions 部署設定（Node 20、自管 CORS）|
| `.firebaserc` | 預設 project = `bread-group-buy` |
| `database.rules.json` | RTDB 規則（沿用現有：開放讀寫）|
| `functions/index.js` | 三支 API：`printLabel` / `refreshKuaimaiToken` / `queryPrinterStatus` |
| `functions/package.json` | 依賴：firebase-admin / firebase-functions |
| `setup-cloud-print.command` | 一次性設定（首次部署）|
| `deploy-functions.command` | 改 functions/ 後重 deploy |

### 第一次部署（Ken 雙擊跑）

1. 升級 Firebase 到 Blaze 方案：https://console.firebase.google.com/project/bread-group-buy/usage/details
   - Blaze = 按用量計費，每天 100 次列印約一個月 3000 次，**完全在免費額度內**
   - Cloud Functions 每月免費 200 萬次呼叫
2. 從快麥開放平台拿 3 組 key：appKey / appSecret / accessToken
3. **雙擊 `setup-cloud-print.command`** — 會自動：
   - 檢查/安裝 firebase-tools
   - firebase login（會開瀏覽器）
   - 互動式輸入 3 組 key → 寫進 Firebase Secret Manager
   - 安裝 functions 依賴
   - deploy

### 設定商家印表機 SN

商家管理者（admin）操作：
1. 設定 → 商家管理 → 編輯商家資料
2. 拉到「🖨️ 雲列印設定」區塊
3. 填入印表機 SN（貼在印表機背面，格式如 `E20W123456789`）
4. 儲存（會同步到 RTDB `bread/merchantsInfo/<name>/printerSN`）

商家本人（merchant 角色）只能看，不能改 — 灰底唯讀。

### 商家使用雲列印

1. 找到該商家的訂單 → 進詳細頁 / 搜尋頁
2. 點「☁ 雲端列印貼紙」（黃色按鈕）
3. 等待截圖（依張數，1 張約 1-2 秒）
4. POST 到 Cloud Function → 印表機 1-3 秒內自動列印
5. Toast 顯示「✅ 已送達印表機 (SN: XXX)，N 張貼紙列印中」

### 後續維護

| 情境 | 做法 |
|---|---|
| 改 `functions/index.js` | 雙擊 `deploy-functions.command` |
| accessToken 30 天到期前 | 用 `refreshKuaimaiToken` API 或重跑 setup |
| 新增商家對應的印表機 | 設定 → 商家管理 → 編輯 → 填 SN（Firestore 不用改）|
| Debug 印不出來 | 開發者工具看 console + Firebase Console → Functions → Logs |
| 印表機離線 | 用 `queryPrinterStatus` API 確認 |

### Cloud Function URL

正式：`https://asia-east1-bread-group-buy.cloudfunctions.net/printLabel`

如果 deploy 後 URL 不一樣，**回頭改 `index.html` 裡的 `CLOUD_PRINT_ENDPOINT` 常數**（搜尋「CLOUD_PRINT_ENDPOINT」），改完 push GitHub。

### 安全性

- 三組 key 存 Firebase Secret Manager，**永遠不進 git**
- CORS allow `https://karlkuo68.github.io`（GitHub Pages 來源）
- 印表機 SN 存 RTDB，跟著商家資料即時同步
- maxInstances=10，避免被刷爆

### 故障排除

| 症狀 | 可能原因 | 處理 |
|---|---|---|
| 找不到印表機 SN | 商家資料沒填 | 設定頁編輯商家 → 填 SN |
| 簽名錯誤（code:25）| accessToken 過期 / 簽名 method 不對 | 重新 setup 換 accessToken |
| 設備不存在 | SN 沒在快麥平台綁定 | 上 https://open.iot.kuaimai.com 確認 |
| 中文變方塊 | html2canvas 字型沒載完 | 等久一點再點，或檢查 web font CDN |
| Cloud Function 502 | Blaze 沒升 / 沒部署 | 跑 setup-cloud-print.command |

---

## Claude 自我提醒（避免搞混）

- 被問「麵包團購」→ **只看這個資料夾**，不要去碰 `好糰團購派單系統/`
- 被問「好糰」「派單」「外送員」→ 去 `~/Desktop/好糰團購派單系統/`
- 被問「檔案在哪」→ 先讀 `~/Documents/Claude/快速查找.md` 和 `~/Documents/Claude/CLAUDE.md`
- 不確定時先問 Ken，不要自己猜
