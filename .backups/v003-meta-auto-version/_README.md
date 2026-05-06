# bread-group-buy v003-meta-auto-version

## 此版本是什麼狀態
做了兩件事：
1. **`index.html` 的 `<meta name="version">` 已從卡死的 `20260330v3` 改成當下時間 `20260506-2146`**（台北時區）
2. **`push.command` 改寫**：以後每次 `./push.command` 跑下去，會**自動**把 `index.html` 的 meta version 更新為當下台北時間（`YYYYMMDD-HHMM`），再 commit + push

## 為什麼改
`<meta name="version">` 原本卡在 `20260330v3` 已 1 個多月沒更新，等於失效。改成跟 push 時間連動後：
- 線上開 DevTools 看 `<head>` meta 就知道目前部署的是幾點 push 的版本
- 不用記 git commit hash，時間最直覺
- Ken push 流程不用做任何額外動作，自動完成

## 範例流程
```
跑 ./push.command 之前：meta = 20260506-2146
跑完之後：meta = 20260506-2210（自動更新成當下時間）
```

## 怎麼還原
```bash
cd /Users/jd/Desktop/bread-group-buy
cp .backups/v003-meta-auto-version/index.html.before index.html
cp .backups/v003-meta-auto-version/push.command.before push.command
chmod +x push.command
```

## 檔案
| 檔案 | 大小 | 說明 |
|---|---|---|
| `index.html.before` | 269,516 B | 改 meta 之前（meta = `20260330v3`） |
| `index.html.after` | 269,519 B | 改 meta 之後（meta = `20260506-2146`） |
| `push.command.before` | 563 B | 原版 push 腳本 |
| `push.command.after` | 695 B | 新版 push 腳本（含 meta 自動更新） |

## 注意
- 此次只改檔，**未** push 到 GitHub。下次 Ken 自己跑 `./push.command` 時才會推上去。
- 推上去後 GitHub `main` 的 commit hash 會變新，HEAD `8ec93b5` 會變成下一個 commit。
