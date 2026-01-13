# 更新日誌

本專案的所有重要更新都會記錄在此文件中。

此格式基於 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)，
專案遵循 [語意化版本](https://semver.org/spec/v2.0.0.html)。

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