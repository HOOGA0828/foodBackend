# 更新日誌

本專案的所有重要更新都會記錄在此文件中。

此格式基於 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)，
專案遵循 [語意化版本](https://semver.org/spec/v2.0.0.html)。

## [1.0.5] - 2026-01-21

### 新增功能 (Features)
- 🍗 **KFC 爬蟲升級**:
  - 修正活動頁面抓取邏輯 (`#campaign` 區塊)，支援多商品一次性爬取。
  - 優化選擇器策略，解決只能抓取單一商品的問題。
- 🍔 **Mos Burger 爬蟲實作**:
  - 新增 `MosBurgerStrategy`，精準鎖定推薦菜單 (`.menu-recommend`)。
  - 🖼️ **圖片處理優化**: 自動修正相對路徑圖片網址，並透過 AI 過濾非食物圖片。
  - 💰 **價格解析增強**: 針對多種價格選項，自動提取最低價格。

## [1.0.4] - 2026-01-15

### 新增功能 (Features)
- 🐮 **牛丼雙雄爬蟲實作 (Yoshinoya & Sukiya)**:
  - **吉野家 (Yoshinoya)**:
    - 實作 `YoshinoyaStrategy`，針對 React 動態網站進行優化。
    - 支援 Swiper 輪播圖抓取，自動識別活動與促銷商品。
    - 解決價格標籤解析問題，正確處理 "税込" 與格式化價格。
  - **Sukiya**:
    - 實作 `SukiyaStrategy`，完整支援首頁推薦選單與詳細頁面抓取。
    - 🛠️ **圖片網址自動修復**: 針對 Sukiya 網站的相對路徑圖片 (`assets/...`)，實作自動補全邏輯，確保圖片能正確顯示。
    - 🧹 **智慧圖片過濾**: 自動排除網頁中的裝飾性圖示（如「內用」、「外帶」icon），優先選取高品質產品照 (`photo_`)。

## [1.0.3] - 2026-01-14

### 新增功能 (Features)
- 🍔 **McDonald's 爬蟲實作**:
  - 新增 `McdonaldsStrategy`，支援從首頁 Banner 自動識別活動並抓取詳細頁面。
  - 🧠 **強化版活動頁解析**:
    - 針對麥當勞活動頁 (Campaign Page) 實作多產品抓取邏輯 (不再受限於單產品)。
    - 支援多種 DOM 結構偵測 (`.product-card-area`, `.cmp-container`, Grid Layout)，提升抓取強健度。
    - 透過 AI 視覺分析自動過濾非食物類廣告。

### 修復 (Fixes)
- 🔄 **資料庫去重邏輯修正**:
  - 修正同網址多產品 (Campaign Page URL Sharing) 造成的資料覆蓋問題。
  - 調整 `saveScraperResult` 策略：**優先使用產品名稱 (Original Name)** 作為唯一識別，不再單純依賴 URL 進行去重。
  - 確保同一活動頁面下的數十個不同產品都能正確且獨立地存入資料庫。

### 文件 (Docs)
- 📝 更新使用說明，新增指定品牌爬取的指令範例 (`npm run scraper:run -- mcdonalds`)。


### 新增功能 (Features)
- 🏪 **FamilyMart 智慧爬蟲升級**:
  - 🧠 **AI 視覺過濾**: 整合 OpenAI Vision API，精準識別首頁輪播圖中的食物廣告，自動排除非商品廣告。
  - 📏 **幾何鄰近抓取 (Geometric Scraping)**: 
    - 新增 `GeometricScraper` 服務，針對結構鬆散的活動頁面，透過計算圖片與價格的視覺距離來自動配對商品。
    - 解決了活動頁面缺乏固定 HTML 結構導致無法抓取的難題。
  - 🔓 **多商品資料提取**: 成功突破單一頁面僅能抓取一筆資料的限制，實現 Campaign Page 完整商品清單的自動爬取 (驗證: 單頁 23+ 商品)。

### 修復 (Fixes)
- 🐛 **資料庫唯一性限制繞過**:
  - 修正 `sourceUrl` 唯一性約束導致的資料覆蓋問題。
  - 實作網址指紋 (`url#filename`) 機制，確保同一活動頁面下的多個不同商品能被正確視為獨立項目存入 DB。
- 🧩 **模組化重構**:
  - 將幾何抓取邏輯獨立為共用服務 `src/services/GeometricScraper.ts`，提升程式碼複用性。

## [1.0.1] - 2026-01-14

### 重構 (Refactor)
- 🏗️ **架構升級**: 引入策略模式 (Strategy Pattern) 重構爬蟲核心
  - 將 `WebScraper` 拆解為 `strategies/base.ts`, `strategies/default.ts`, `strategies/sevenEleven.ts`
  - 實現模組化設計，不同品牌可擁有獨立的爬取邏輯
- ⚡ **優化 7-Eleven 爬取策略**:
  - 改為 **List-Only** 模式：直接從列表頁面獲取完整資訊，不再進入詳細頁面，大幅提升速度與穩定性
  - 實作 **混合解析 (Hybrid Parsing)**：結合 CSS 選擇器(名稱/圖片) 與 AI 解析(價格/日期)

### 新增功能 (Features)
- � **支援分頁爬取**:
  - 7-Eleven 策略現在支援自動翻頁 (`.pager_ctrl` 偵測)
  - 自動識別 "次へ" 連結，突破單頁 15 筆限制
- 🇯🇵 **新增日文原名欄位**:
  - 資料庫與爬蟲新增 `name_jp` (original_name) 支援
  - 強制抓取 `item_ttl` 確保日文名稱正確儲存

### 修復 (Fixes)
- 🖼️ **圖片抓取修復**:
  - 解決 Lazy Loading 問題，優先抓取 `data-original`
  - 增加防呆機制，自動過濾 `giphy.gif` 佔位圖
  - 修正相對路徑轉換邏輯
- 🔄 **資料去重優化**:
  - 改進 deduplication 邏輯，優先使用 `original_name` 進行比對
  - 解決重複儲存問題

### 移除 (Removed)
- 移除 7-Eleven 的深度爬取 (Deep Crawling) 配置，改用列表直抓模式以提升效率


## [1.0.0] - 2026-01-12

### 新增功能
- 日本餐飲追蹤後端系統初始版本
- Node.js/TypeScript 後端搭配 Express 伺服器
- Supabase 資料庫整合
- 基於 Crawlee 的網路爬蟲用於收集產品資料
- OpenAI 整合用於產品分析和解析
- Prisma ORM 資料庫管理
- 多品牌綜合配置系統
- RESTful API 端點用於產品管理
- Docker 支援和部署文檔
- 完整的測試套件和文檔

### 功能特色
- 日本便利商店產品自動化網路爬取
- AI 驅動的產品資訊提取
- 即時產品追蹤和更新
- 多品牌支援 (7-Eleven, FamilyMart, Lawson 等)
- 完善的資料庫關聯架構
- 錯誤處理和日誌系統
- 基於環境的配置管理

### 基礎設施
- TypeScript 提供類型安全
- ESLint 和 Prettier 確保程式碼品質
- Git hooks 用於預提交檢查
- 完整的專案文檔
- CI/CD 部署就緒設定

### 安全性
- 敏感資料保護 (.env 文件排除在 git 外)
- 安全的 API 金鑰管理
- CORS 配置
- 輸入驗證和清理

---

## 變更類型說明
- `新增功能` 用於新功能
- `功能修改` 用於現有功能的更改
- `功能棄用` 用於即將移除的功能
- `功能移除` 用於已移除的功能
- `問題修復` 用於錯誤修復
- `安全性更新` 用於安全漏洞修復