# GitHub Actions 設定與操作指南

本指南將詳細說明如何在 GitHub 上設定與管理自動化爬蟲任務。

## 1. 設定環境變數 (Secrets) 🔑

為了讓爬蟲在 GitHub 伺服器上也能存取您的資料庫與 OpenAI，您必須設定「Secrets」。這些是加密的環境變數，不會公開顯示。

### 操作步驟：

1.  **進入 Repository 設定**：
    進入您的 GitHub 專案頁面，點擊上方選單最右側的 **"Settings"** (設定) 齒輪圖示。

2.  **尋找 Secrets 選單**：
    在左側側邊欄中，找到 **"Secrets and variables"** (秘密與變數) 選單，點擊展開，然後選擇 **"Actions"**。

3.  **新增 Secret**：
    點擊頁面右上角的綠色按鈕 **"New repository secret"**。

4.  **依序加入以下變數**：
    請重複點擊 "New repository secret" 來新增以下三個變數：

    | Name (變數名稱) | Secret (內容值) | 說明 |
    | :--- | :--- | :--- |
    | `OPENAI_API_KEY` | `sk-proj-...` | 您的 OpenAI API Key (以 sk- 開頭) |
    | `SUPABASE_URL` | `https://your-project.supabase.co` | Supabase 專案網址 |
    | `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | **Service Role Key** (請注意：不是 Anon Key，因為後端寫入需要較高權限) |
    | `SUPABASE_ANON_KEY` | `eyJ...` | Supabase Anon Key (選填，目前主要使用 Service Role) |

    > **如何取得 Supabase Key?**
    > 1. 進入 Supabase 專案 -> **Project Settings** (左下角齒輪)。
    > 2. 點擊 **API**。
    > 3. 在 Project API keys 區塊可以找到 `URL`, `anon`, `service_role`。

---

## 2. 查看自動執行排程 📅

設定完成後，爬蟲會依照 `.github/workflows/daily_sync.yml` 的設定，在**每天日本時間 12:00 (台灣時間 11:00)** 自動執行。

### 如何檢查：
1.  點擊專案上方選單的 **"Actions"**。
2.  左側選擇 **"每日新品同步"** (或 Daily Sync)。
3.  您會看到執行記錄列表。
    -   🟡 黃色旋轉圈：正在執行
    -   ✅ 綠色打勾：執行成功
    -   ❌ 紅色叉叉：執行失敗

---

## 3. 手動觸發爬蟲 (測試用) 🚀

如果您不想等中午，可以隨時手動觸發爬蟲。

### 操作步驟：
1.  點擊專案上方選單的 **"Actions"**。
2.  左側選擇 **"每日新品同步"**。
3.  在列表右上方，會看到一個 **"Run workflow"** 灰色按鈕。
4.  點擊後會出現選單：
    -   **Branch**: 保持預設 (通常是 main 或 master)。
    -   **指定要處理的品牌**:
        -   留空：爬取所有品牌。
        -   輸入名稱：例如 `7-Eleven` (只爬 7-11)、`Starbucks` (只爬星巴克)。
    -   **執行環境**: 選擇 production。
5.  點擊綠色的 **"Run workflow"** 按鈕。
6.  約 30 秒後，頁面會刷新並顯示一個新的執行任務。

---

## 4. 查看執行日誌 (Debug) 🐞

如果爬蟲失敗 (❌)，您可以查看詳細日誌來找原因。

### 操作步驟：
1.  在 Actions 列表中，點擊該次失敗的任務名稱 (例如 "每日新品同步 #123")。
2.  點擊左側的 **"scrape-products"** (或是中間流程圖的方塊)。
3.  您會看到詳細的終端機輸出 (就像您電腦上的 Terminal)。
4.  展開 **"執行爬蟲"** (Execute Scraper) 步驟，查看紅色的錯誤訊息。
    -   常見錯誤：Database connection failed (Secrets 沒設對)、Time out (網站回應太慢)、Element not found (網站改版)。

---

## 5. 常見問題排除

**Q: 為什麼顯示 `Error: Missing SUPABASE_URL`?**
A: 請確認您是否有依照第 1 步正確設定 Secrets，且名稱完全一致 (全大寫)。

**Q: 為什麼每次都失敗，但我在本機跑是好的?**
A:
1.  可能是 GitHub IP 被該網站擋擋了 (403 Forbidden)。
2.  可能是 GitHub 環境沒有頭像 (Headless) 模式被偵測到。
3.  請檢查日誌中的截圖 (如果有上傳 Artifacts) 或錯誤訊息。
