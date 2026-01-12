# 🧪 爬蟲測試指南

## 快速測試你的爬蟲系統

### 🎯 測試方式總覽

| 方式 | 命令 | 說明 | 適用場景 |
|------|------|------|----------|
| **品牌測試** | `npm run test:scraper` | 使用 `src/config/brands.ts` 中的配置 | 測試已配置的品牌 |
| **配置測試** | `npm run test:scraper:config` | 使用 `test-urls-config.js` 中的配置 | 測試自定義網址配置 |
| **直接測試** | `node test-scraper-basic.js [網址1] [網址2]` | 直接在命令行指定網址 | 快速測試任意網址 |

### 前置準備

1. **安裝依賴**
   ```bash
   npm install
   ```

2. **安裝 Playwright 瀏覽器**
   ```bash
   npx playwright install chromium
   ```

### 📁 測試檔案說明

| 檔案 | 用途 | 資料來源 |
|------|------|----------|
| `test-scraper-basic.ts` | 基礎爬蟲測試 | 終端機輸出 |
| `test-urls-config.ts` | 測試網址配置 | **編輯此檔案添加測試網址** |
| `src/config/brands.ts` | 品牌配置 + 頁面類型模板 | 生產環境配置 |

### 🟢 基礎測試 - 多種測試方式

#### 方法一：使用測試配置檔案（推薦）
```bash
npm run test:scraper:config
```
使用 `test-urls-config.ts` 中的配置，支援多種頁面類型：

- **📋 新品資料頁面**: 圖文搭配的產品列表
- **🏠 網站首頁 Banner**: 主要抓取 swiper/banner 區域
- **🎉 活動/促銷頁面**: 促銷活動相關內容

#### 方法二：使用品牌配置
```bash
npm run test:scraper
```
使用 `src/config/brands.ts` 中 `enabled: true` 的品牌配置。

#### 方法三：直接指定網址
```bash
# 測試單個網址
node test-scraper-basic.js https://www.sej.co.jp/products/new/

# 測試多個網址
node test-scraper-basic.js https://www.sej.co.jp/products/new/ https://www.family.co.jp/goods/new.html
```

### 📝 如何添加測試網址

#### 方式一：在 `test-urls-config.ts` 中添加（推薦）
編輯 `test-urls-config.ts` 檔案，在 `TEST_URLS` 陣列中添加：

```javascript
// 簡單方式 - 使用頁面類型模板（推薦）
createBrandConfig({
  name: 'your-site',
  displayName: '您的網站',
  url: 'https://example.com/products',
  category: 'convenience_store',
  pageType: 'product_list'  // 或 'homepage_banner' 或 'campaign_page'
})

// 自定義配置 - 覆蓋預設設定
createBrandConfig({
  name: 'custom-site',
  displayName: '自定義網站',
  url: 'https://example.com',
  category: 'convenience_store',
  pageType: 'homepage_banner'
}, {
  newProductSelector: '.my-custom-banner', // 自定義選擇器
  waitFor: 5000, // 自定義等待時間
  deepCrawling: {
    maxProducts: 5 // 自定義產品數量
  }
})
```

#### 頁面類型說明

| 類型 | 適用場景 | 預設選擇器 | 特色 |
|------|----------|-----------|------|
| `product_list` | 新品資料頁面 | `.product-list, .new-products` | 圖文產品列表 |
| `homepage_banner` | 網站首頁 | `.swiper, .banner, .carousel` | Banner/Swiper 區域 |
| `campaign_page` | 活動頁面 | `.campaign-list, .promotion-list` | 促銷活動內容 |

#### 方式二：直接在命令行指定
```bash
# 測試單個網址 (會使用預設配置)
npx tsx test-scraper-basic.ts https://您的測試網址.com

# 測試多個網址
npx tsx test-scraper-basic.ts https://網址1.com https://網址2.com
```

#### 🟡 完整測試 - 確認 AI 功能
**目的**: 測試完整的爬蟲 + AI 解析流程

**前置條件**: 需要設定 OpenAI API Key
```bash
# 設定環境變數
echo "OPENAI_API_KEY=your_api_key_here" > .env
```

**命令**:
```bash
npm run test:full
```

**測試內容**:
- ✅ 所有基礎測試內容
- ✅ AI 智慧解析
- ✅ 最終 JSON 輸出
- ❌ 需要 API Key 和額度

### 🎯 資料顯示位置

**所有測試結果都會顯示在終端機中**，包含：

1. **網頁載入狀態** - 確認能否成功訪問目標網址
2. **HTML 內容統計** - 顯示抓取到的內容長度
3. **Markdown 轉換結果** - 清理後的內容預覽
4. **產品連結提取** - 如果啟用二層抓取，顯示找到的產品連結
5. **Token 使用量估算** - 粗略估算 AI 解析成本

### 📊 測試結果解讀

#### ✅ 成功指標
```
🏪 測試名稱: 7-Eleven 新品測試
🔗 目標網址: https://www.sej.co.jp/products/new/
📄 HTML 內容長度: 125,430 字元
✅ 找到新品區域，使用選擇器: .new-product-list
📝 Markdown 長度: 15,230 字元

📖 Markdown 內容預覽:
# 新商品情報
## スイーツ
### チョコクロ
- 価格: 120円（税込）
- 新商品

💰 估計 Token 使用量: 3,807 tokens
✅ 7-Eleven 新品測試 測試完成！
```

#### 🔗 二層抓取啟用時的額外輸出
```
🔗 測試產品連結提取:
🎯 使用選擇器: .swiper-slide a[href], .banner-item a[href], .carousel-item a[href]
📊 選擇器匹配到 5 個元素
📎 成功提取 5 個產品連結:
1. 未命名產品
   連結: /campaign/melty-hot-pie/
   🆕 新品

🔄 絕對路徑轉換預覽:
1. https://www.mcdonalds.co.jp/campaign/melty-hot-pie/
```

#### ❌ 如果找不到產品連結
```
🔗 測試產品連結提取:
🎯 使用選擇器: .product-item a[href]
📊 選擇器匹配到 0 個元素
💡 建議檢查:
   1. 在瀏覽器中開啟目標網址
   2. 按 F12 開啟開發者工具
   3. 在 Console 中測試選擇器:
      document.querySelectorAll('.product-item a[href]')
   4. 調整 test-urls-config.ts 中的選擇器
```

#### 常見問題

**問題**: `沒有找到啟用的品牌`
**解決**: 檢查 `src/config/brands.ts` 中是否有 `enabled: true` 的品牌

**問題**: `無法找到新品選擇器`
**解決**: 網頁結構可能已變更，需要更新選擇器

**問題**: `請求失敗`
**解決**: 檢查網路連線，或網站有防爬措施

**問題**: `Playwright 錯誤`
**解決**: 重新安裝瀏覽器 `npx playwright install chromium`

### 自定義測試

#### 測試特定品牌
```bash
# 編輯 test-scraper-basic.js 中的品牌選擇邏輯
const testBrand = BRANDS.find(b => b.name === '7eleven'); // 指定品牌
```

#### 測試特定網址
```bash
# 編輯 src/config/brands.ts 中的 url
url: 'https://www.sej.co.jp/products/new/', // 你的測試網址
```

### 除錯技巧

1. **查看詳細日誌**
   ```bash
   DEBUG=crawlee:* npm run test:scraper
   ```

2. **檢查網頁元素**
   - 在瀏覽器中開啟目標網頁
   - 按 F12 開啟開發者工具
   - 使用選擇器測試: `document.querySelector('.your-selector')`

3. **測試選擇器**
   ```javascript
   // 在瀏覽器控制台測試
   document.querySelectorAll('.product-item a[href]')
   ```

### 下一步

1. ✅ **基礎測試通過** → 繼續完整測試
2. ✅ **完整測試通過** → 可以開始正式使用
3. ❌ **測試失敗** → 檢查錯誤訊息，調整配置

### 🎯 選擇器調整指南

#### 當產品連結提取不到東西時：

1. **在瀏覽器中檢查目標網站**
   - 開啟目標網址
   - 按 F12 開啟開發者工具
   - 在 Elements 頁籤中查看 HTML 結構

2. **在 Console 中測試選擇器**
   ```javascript
   // 測試是否能找到任何連結
   document.querySelectorAll('a[href]').length

   // 測試常見的產品容器
   document.querySelectorAll('.product, .item, .card').length

   // 測試可能的產品連結選擇器
   document.querySelectorAll('.product a, .item a, .card a').length
   document.querySelectorAll('[class*="product"] a').length

   // 測試具體的選擇器
   document.querySelectorAll('.product-item a[href]')
   ```

3. **更新配置**
   ```javascript
   // 在 test-urls-config.ts 中調整選擇器
   createBrandConfig({
     name: 'your-site',
     displayName: '您的網站',
     url: 'https://example.com',
     category: 'convenience_store',
     pageType: 'product_list'
   }, {
     deepCrawling: {
       productLinkSelector: '.product a', // 調整為您找到的正確選擇器
       productTitleSelector: '.product-name',
       maxProducts: 10
     }
   })
   ```

4. **重新測試**
   ```bash
   npm run test:scraper:config
   ```

### 🔍 常用選擇器參考

#### 產品連結選擇器
```javascript
// 通用選擇器 (優先使用)
'a[href]'                    // 所有連結
'.product a, .item a'       // 產品容器內的連結
'[class*="product"] a'      // 包含 product 的元素內的連結

// 常見的產品連結選擇器
'.product-item a[href]'
'.goods-list a[href]'
'.item-card a'
'.card a[href]'
```

#### 產品名稱選擇器
```javascript
'.product-name, .item-title'
'.card-title, .product-title'
'h3, h4'                    // 標題標籤
'[class*="title"], [class*="name"]'
```

#### 新品標記選擇器
```javascript
'.new, .badge-new, .icon-new'
'[class*="new"]'
'.campaign, .seasonal'
```

#### 產品圖片選擇器
```javascript
'.product-image img, .item-image img'
'.card img, .product img'
'img'                       // 所有圖片 (最後手段)
```

### 聯絡支援

如果測試遇到問題，請提供：
- 錯誤訊息
- 目標網址
- 預期的抓取內容