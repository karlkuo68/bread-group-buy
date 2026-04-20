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
