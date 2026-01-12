# 日本餐飲/超商新品爬蟲系統

自動化爬取日本各大品牌的產品資訊，使用 AI 進行智慧解析與翻譯，並準備好 Supabase 資料庫接入。

## 🔥 新功能：二層深度抓取

系統現在支援**二層深度抓取**，能夠：
- 在列表頁面提取產品連結
- 自動導航至詳細頁面抓取完整資訊
- 將第一層與第二層資訊合併解析
- 為每個產品提供原始官網連結

### 抓取流程

```
第一層抓取 (列表頁面)
    ↓ 提取產品連結
第二層抓取 (詳細頁面)
    ↓ 合併資訊
AI 智慧解析
    ↓ 輸出結構化資料
最終 JSON (含 source_url)
```

## 🏗️ 系統架構

```
src/
├── config/
│   └── brands.ts          # 品牌配置 (配置驅動設計 + 二層抓取設定)
├── services/
│   └── aiParser.ts        # AI 解析服務 (支援二層資訊合併)
├── scraper/
│   ├── index.ts           # 主執行入口
│   └── scraper.ts         # 爬蟲邏輯 (二層深度抓取)
├── types/
│   └── scraper.ts         # TypeScript 類型定義 (含二層抓取類型)
└── utils/
    └── htmlCleaner.ts     # HTML 清理工具
```

### 🔄 三階段抓取流程

1. **第一階段**: 列表頁面抓取 + 連結提取
2. **第二階段**: 詳細頁面深度抓取 (使用 RequestQueue)
3. **第三階段**: AI 智慧解析 + 資訊合併

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 環境配置

```bash
# 複製環境變數範例
cp env.example.txt .env

# 編輯 .env 檔案，填入你的 OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. 建置專案

```bash
npm run build
```

### 4. 執行爬蟲

```bash
# 處理所有啟用的品牌
npm run scraper:run

# 處理特定品牌
npm run scraper:run 7eleven familymart

# 開發模式 (支援熱重載)
npm run scraper:dev
```

## ⚙️ 配置說明

### 品牌配置 (`src/config/brands.ts`)

系統採用配置驅動設計，你可以輕鬆新增或停用品牌：

```typescript
{
  name: 'new_brand',           // 品牌識別碼
  displayName: '新品牌',       // 顯示名稱
  url: 'https://example.com',  // 目標網址
  category: 'convenience_store', // 分類
  enabled: true,               // 是否啟用
  options: {
    waitFor: 3000,            // 等待時間
    actions: ['scrollToBottom'], // 頁面操作
    deepCrawling: {           // 🔄 二層抓取設定
      enabled: true,           // 是否啟用二層抓取
      productLinkSelector: '.product-item a[href]', // 產品連結選擇器
      productTitleSelector: '.product-name', // 產品標題選擇器
      productImageSelector: '.product-image img', // 產品圖片選擇器
      newBadgeSelector: '.new-badge', // 新品標記選擇器
      maxProducts: 20,         // 最大抓取產品數量
      detailPageWaitFor: 2000  // 詳細頁面等待時間
    }
  }
}
```

### 支援的分類

- `convenience_store`: 便利商店
- `restaurant`: 餐廳
- `fast_food`: 速食
- `bakery`: 烘焙
- `beverage`: 飲料

## 🤖 AI 解析功能

系統使用 OpenAI GPT-4o-mini 模型進行智慧解析：

- **日文產品名稱** → **繁體中文翻譯**
- **產品描述** → **中文翻譯**
- **價格資訊** 提取與格式化
- **營養資訊** 結構化
- **過敏原** 識別
- **新品判斷** 自動標記

### 解析輸出格式 (含二層資訊)

```json
{
  "originalName": "チョコクロ",
  "translatedName": "巧克力可頌",
  "originalDescription": "サクサクのクロワッサン生地に...",
  "translatedDescription": "酥脆的牛角麵包生地中...",
  "originalDetailedDescription": "詳細な商品説明...",
  "translatedDetailedDescription": "詳細的商品說明...",
  "price": {
    "amount": 120,
    "currency": "JPY",
    "note": "税込"
  },
  "nutrition": {
    "calories": 320,
    "protein": 8.5,
    "fat": 12.0
  },
  "isNew": true,
  "sourceUrl": "https://www.7eleven.co.jp/product/12345"
}
```

**🔗 新增欄位說明:**
- `originalDetailedDescription`: 來自詳細頁面的日文描述
- `translatedDetailedDescription`: 詳細頁面的中文翻譯
- `sourceUrl`: 產品詳細頁面的原始連結 (供前端使用)

## 🔧 HTML 清理優化

系統會自動清理 HTML 內容以節省 AI Token：

- 移除 `<script>`, `<style>`, `<svg>` 等標籤
- 保留結構化內容和圖片連結
- 轉換為簡潔的 Markdown 格式
- 估算並限制 Token 使用量

## ⏰ 自動化排程

### GitHub Actions 設定

系統提供完整的 CI/CD 配置：

- **每日自動執行**: 日本時間每天 12:00
- **手動觸發**: 從 GitHub UI 手動執行
- **錯誤通知**: Discord 整合 (可選)
- **日誌保存**: 7 天保留期

### 設定 Secrets

在 GitHub Repository Settings > Secrets and variables > Actions 中添加：

```
OPENAI_API_KEY=your_openai_api_key
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...  # 可選
```

## 📊 資料庫接入

### Supabase 表格結構建議

```sql
CREATE TABLE product_scrapes (
  id SERIAL PRIMARY KEY,
  brand_name TEXT NOT NULL,
  brand_display_name TEXT NOT NULL,
  brand_category TEXT NOT NULL,
  products_count INTEGER NOT NULL,
  products JSONB NOT NULL,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引
CREATE INDEX idx_product_scrapes_brand ON product_scrapes(brand_name);
CREATE INDEX idx_product_scrapes_date ON product_scrapes(scraped_at);
CREATE INDEX idx_product_scrapes_status ON product_scrapes(status);
```

### 插入資料範例

```typescript
// 在主程式最後添加 Supabase 接入
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 插入爬取結果
const { data, error } = await supabase
  .from('product_scrapes')
  .insert(supabaseData);
```

## 📈 監控與日誌

### 錯誤處理

系統提供完善的錯誤處理：

- **品牌級別**: 單一品牌失敗不影響其他品牌
- **重試機制**: 網路錯誤自動重試
- **詳細日誌**: 包含執行時間、錯誤原因
- **狀態追蹤**: success / partial_success / failed

### 日誌輸出範例

```
🇯🇵 日本新品追蹤爬蟲系統啟動
================================
🔧 初始化服務...
📋 將處理 5 個品牌:
  • 7-Eleven (convenience_store)
  • FamilyMart (convenience_store)

🕷️ [Scraper] 開始爬取 7-Eleven (https://www.sej.co.jp/products/new/)
✅ [Scraper] 7-Eleven 爬取完成，耗時 2500ms，獲得 1 筆資料
🤖 [AI Parser] 開始解析 7-Eleven 的產品資訊...
✅ [AI Parser] 7-Eleven 解析完成，找到 15 個產品
```

## 🔒 安全注意事項

1. **API Key 安全**: 絕對不要將 OpenAI API Key 提交到版本控制
2. **請求頻率**: 系統已設定合理延遲，避免被目標網站封鎖
3. **資料使用**: 請遵守各網站的使用條款
4. **隱私保護**: 不收集個人識別資訊

## 🛠️ 開發與除錯

### 本地測試

```bash
# 安裝 Playwright 瀏覽器
npx playwright install chromium

# 測試特定品牌
npm run scraper:run 7eleven

# 啟用詳細日誌
DEBUG=crawlee:* npm run scraper:run
```

### 新增品牌步驟

1. 在 `src/config/brands.ts` 中添加品牌配置
2. 測試單一品牌: `npm run scraper:run 新品牌名稱`
3. 確認解析結果正確
4. 提交配置變更

## 📝 API 使用量估算

- **平均每個品牌**: 約 2,000-5,000 tokens
- **處理 5 個品牌**: 約 10,000-25,000 tokens
- **每月費用**: 約 $0.5-2.5 USD (依 OpenAI 價格而定)

## 🤝 貢獻指南

歡迎提交 Issue 和 Pull Request！

1. Fork 此專案
2. 建立功能分支: `git checkout -b feature/新功能`
3. 提交變更: `git commit -m '新增新功能'`
4. 推送分支: `git push origin feature/新功能`
5. 建立 Pull Request

## 📄 授權

MIT License - 詳見 LICENSE 檔案