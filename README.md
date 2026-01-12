# 日本餐飲/超商新品追蹤網站 - 後端 API

使用 Node.js (TypeScript) + Supabase (PostgreSQL) 建置的後端服務，用於追蹤日本餐飲與超商的新品資訊。

## 技術棧

- **Runtime**: Node.js 20+
- **語言**: TypeScript
- **資料庫**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **框架**: Express.js

## 專案結構

```
backend/
├── src/                    # 原始碼目錄
│   ├── config/            # 設定檔
│   ├── controllers/       # 控制器
│   ├── routes/            # 路由定義
│   ├── services/          # 業務邏輯
│   ├── utils/             # 工具函數
│   ├── types/             # TypeScript 類型定義
│   └── index.ts           # 應用程式入口
├── prisma/                # Prisma 設定
│   └── schema.prisma      # 資料庫 Schema
├── supabase/              # Supabase 相關
│   └── schema.sql         # SQL DDL 腳本
├── docs/                  # 文件
│   └── SUPABASE_SETUP.md  # Supabase 初始化指引
├── dist/                  # 編譯輸出（自動生成）
└── package.json
```

## 快速開始

### 前置需求

- Node.js 20.0.0 或更高版本
- npm 或 yarn
- Supabase 帳號（[註冊連結](https://app.supabase.com/)）

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `env.example.txt` 為 `.env`，並填入您的 Supabase 憑證：

```bash
cp env.example.txt .env
```

編輯 `.env` 檔案，填入：
- `DATABASE_URL`: Supabase 資料庫連線字串
- `SUPABASE_URL`: Supabase 專案 URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key

詳細說明請參考 [Supabase 初始化指引](./docs/SUPABASE_SETUP.md)

### 3. 初始化資料庫

#### 方法 A: 使用 Supabase SQL Editor（推薦）

1. 登入 [Supabase Dashboard](https://app.supabase.com/)
2. 選擇您的專案
3. 進入 **SQL Editor**
4. 複製 `supabase/schema.sql` 的內容並執行

#### 方法 B: 使用 Prisma

```bash
# 生成 Prisma Client
npm run prisma:generate

# 推送 Schema 到資料庫（開發環境）
npm run prisma:push
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

伺服器將在 `http://localhost:3000` 啟動。

## 可用指令

```bash
# 開發模式（自動重載）
npm run dev

# 編譯 TypeScript
npm run build

# 執行編譯後的程式碼
npm start

# 程式碼檢查
npm run lint
npm run lint:fix

# 程式碼格式化
npm run format

# Prisma 指令
npm run prisma:generate  # 生成 Prisma Client
npm run prisma:push      # 推送 Schema 到資料庫
npm run prisma:pull      # 從資料庫拉取 Schema
npm run prisma:migrate   # 建立並執行遷移
npm run prisma:studio    # 開啟 Prisma Studio

# 型別檢查
npm run typecheck
```

## 資料庫 Schema

### 主要資料表

- **brands**: 品牌資訊（Lawson, 7-11, 麥當勞等）
- **categories**: 產品分類（便當、飯糰、甜點等）
- **products**: 產品詳細資訊
- **product_categories**: 產品與分類的多對多關聯

詳細 Schema 定義請參考：
- SQL DDL: `supabase/schema.sql`
- Prisma Schema: `prisma/schema.prisma`

## 環境變數說明

| 變數名稱 | 說明 | 必填 |
|---------|------|------|
| `DATABASE_URL` | Supabase PostgreSQL 連線字串 | ✅ |
| `SUPABASE_URL` | Supabase 專案 URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | ✅ |
| `NODE_ENV` | 環境模式（development/production） | ✅ |
| `PORT` | 伺服器埠號（預設: 3000） | ❌ |

完整環境變數清單請參考 `env.example.txt`

## 開發規範

- 使用 TypeScript 嚴格模式
- 遵循 ESLint 規則
- 使用 Prettier 進行程式碼格式化
- 函數需明確註明返回類型
- 使用 async/await 而非 Promise.then()

## 文件

- [Supabase 初始化指引](./docs/SUPABASE_SETUP.md) - 詳細的 Supabase 設定步驟

## 授權

MIT License
