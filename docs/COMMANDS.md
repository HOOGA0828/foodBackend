# 專案指令手冊 (Commands)

本文件整理了專案中可用的主要指令，包含爬蟲執行與資料維護功能。

## 🕸️ 爬蟲指令 (Scraper)

### 1. 執行所有網站爬取
啟動爬蟲系統，依序爬取並更新 `src/config/brands.ts` 中所有啟用 (`enabled: true`) 的品牌。

```bash
npm run scraper:run
```

### 2. 爬取個別網站
針對特定品牌進行爬取與更新。請將 `<BrandName>` 替換為 `src/config/brands.ts` 中的 `name` (例如 `7-Eleven`, `FamilyMart`, `McDonald's`)。
**注意：** 品牌名稱若包含空格，請用引號包起來。

```bash
npm run scraper:run -- "<BrandName>"
```

**範例：**
```bash
# 爬取 7-Eleven
npm run scraper:run -- "7-Eleven"

# 爬取星巴克
npm run scraper:run -- "Starbucks"
```

---

## 🛠️ 資料維護指令 (Maintenance)

### 3. 翻譯產品名稱 (日翻中)
檢查資料庫中 `name` 欄位為空、或內容仍為日文 (與 `name_jp` 相同) 的產品，並呼叫 AI 服務將其翻譯為繁體中文。

```bash
npm run translate:names
```

**功能說明：**
- 自動掃描資料庫產品。
- 針對 `name` 為空或尚未翻譯的項目進行處理。
- 使用 OpenAI 模型進行翻譯並更新資料庫。
- 內建速率限制，避免超過 API 額度。

---

## 🗄️ 資料庫更新 (Database)

本專案新增了產品過期追蹤機制。請確保資料庫已執行以下更新：

### 新增過期偵測欄位
請在 Supabase SQL Editor 中執行專案根目錄下的 `UPDATE_PRODUCT_SCHEMA.sql` 檔案內容，以新增 `is_expired` 與 `last_active_at` 欄位。

```sql
-- UPDATE_PRODUCT_SCHEMA.sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```
