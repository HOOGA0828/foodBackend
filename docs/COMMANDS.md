# 專案指令手冊 (Commands)

本文件整理了專案中可用的主要指令，包含爬蟲執行與資料維護功能。

## 🕸️ 爬蟲指令 (Scraper)

### 1. 執行所有網站爬取
啟動爬蟲系統，依序爬取並更新 `src/config/brands.ts` 中所有啟用 (`enabled: true`) 的品牌。

```bash
npm run scraper:run
```

### 2. 爬取個別網站
針對特定品牌進行爬取與更新。請使用 `src/config/brands.ts` 中定義的品牌代號 (英文小寫)。

**常用指令清單：**

```bash
# 超商類
npm run scraper:run -- "seven-eleven"   # 7-Eleven
npm run scraper:run -- "familymart"     # FamilyMart
npm run scraper:run -- "lawson"         # Lawson

# 速食/快餐類
npm run scraper:run -- "mcdonalds"      # McDonald's
npm run scraper:run -- "kfc"            # KFC
npm run scraper:run -- "mos-burger"     # 摩斯漢堡

# 餐廳/丼飯類
npm run scraper:run -- "yoshinoya"      # 吉野家
npm run scraper:run -- "sukiya"         # すき家 (Sukiya)
npm run scraper:run -- "matsuya"        # 松屋
npm run scraper:run -- "starbucks"      # Starbucks
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

### 4. 清空單一品牌資料
快速刪除特定品牌的**所有產品資料**。請將 `<BrandName>` 替換為 `src/config/brands.ts` 中的 `name`。
這通常用於重置測試資料或清除錯誤抓取的內容。

**注意：** 此動作無法復原，請謹慎使用。

```bash
npx tsx src/scripts/clear-brand-data.ts "<BrandName>"
```

**支援的指令清單：** (可使用品牌名稱或代號，大小寫皆可)

```bash
# 超商類
npx tsx src/scripts/clear-brand-data.ts "seven-eleven"   # 7-Eleven
npx tsx src/scripts/clear-brand-data.ts "familymart"     # FamilyMart
npx tsx src/scripts/clear-brand-data.ts "lawson"         # Lawson

# 速食/快餐類
npx tsx src/scripts/clear-brand-data.ts "mcdonalds"      # McDonald's
npx tsx src/scripts/clear-brand-data.ts "kfc"            # KFC
npx tsx src/scripts/clear-brand-data.ts "mos-burger"     # 摩斯漢堡

# 餐廳/丼飯類
npx tsx src/scripts/clear-brand-data.ts "yoshinoya"      # 吉野家
npx tsx src/scripts/clear-brand-data.ts "sukiya"         # すき家 (Sukiya)
npx tsx src/scripts/clear-brand-data.ts "matsuya"        # 松屋
npx tsx src/scripts/clear-brand-data.ts "starbucks"      # Starbucks
```

### 5. 更新品牌 Logo
自動抓取每個品牌首頁的 Open Graph 圖片或 Favicon，並更新至資料庫。

```bash
npx tsx src/scripts/fetch-brand-logos.ts
```

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

---

## 📖 相關文件

- [GitHub Actions 設定與操作指南](./GITHUB_GUIDE.md): 詳細說明如何設定 Secrets、查看排程與手動觸發爬蟲。
