/**
 * 爬蟲相關的類型定義
 */

/**
 * 原始爬取資料
 */
export interface ScrapedData {
  /** 品牌名稱 */
  brandName: string;
  /** 來源網址 */
  url: string;
  /** 爬取時間戳 */
  scrapedAt: Date;
  /** HTML 內容 */
  htmlContent: string;
  /** 簡化的 Markdown 內容 */
  markdownContent: string;
  /** 提取的產品連結清單 (第一層) */
  productLinks?: ProductLink[];
}

/**
 * 產品連結資訊
 */
export interface ProductLink {
  /** 產品標題/名稱 */
  title: string;
  /** 連結網址 (絕對路徑) */
  url: string;
  /** 產品圖片網址 (可選) */
  imageUrl?: string;
  /** 價格資訊 (可選) */
  price?: string;
  /** 是否為新品標記 */
  isNew?: boolean;
  /** 原始文本內容 (用於 AI 解析) */
  rawText?: string;
}

/**
 * 二層頁面詳細資料
 */
export interface DetailedProductData {
  /** 產品連結資訊 */
  productLink: ProductLink;
  /** 詳細頁面 HTML 內容 */
  detailHtmlContent: string;
  /** 詳細頁面 Markdown 內容 */
  detailMarkdownContent: string;
  /** 抓取時間戳 */
  scrapedAt: Date;
}

/**
 * AI 解析後的產品資訊
 */
export interface ProductInfo {
  /** 日文原名 */
  originalName: string;
  /** 中文翻譯名稱 */
  translatedName: string;
  /** 產品描述 (日文) */
  originalDescription?: string;
  /** 產品描述 (中文翻譯) */
  translatedDescription?: string;
  /** 詳細描述 (日文，來自二層頁面) */
  originalDetailedDescription?: string;
  /** 詳細描述 (中文翻譯，來自二層頁面) */
  translatedDetailedDescription?: string;
  /** 價格資訊 */
  price?: {
    /** 價格金額 */
    amount: number;
    /** 貨幣單位 */
    currency: string;
    /** 價格描述 (如: 税込) */
    note?: string;
  };
  /** 產品類別 */
  category?: string;
  /** 上市日期 */
  releaseDate?: string;
  /** 過敏原資訊 */
  allergens?: string[];
  /** 營養資訊 */
  nutrition?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    sodium?: number;
  };
  /** 圖片網址 */
  imageUrl?: string;
  /** 是否為新品 */
  isNew?: boolean;
  /** 產品詳細頁面原始連結 (用於前端跳轉) */
  sourceUrl: string;
}

/**
 * 爬蟲執行結果
 */
export interface ScraperResult {
  /** 品牌資訊 */
  brand: {
    name: string;
    displayName: string;
    category: string;
    url: string;
  };
  /** 成功解析的產品數量 */
  productsCount: number;
  /** 解析後的產品清單 */
  products: ProductInfo[];
  /** 執行狀態 */
  status: 'success' | 'partial_success' | 'failed';
  /** 錯誤訊息 */
  errorMessage?: string;
  /** 執行時間 (毫秒) */
  executionTime: number;
  /** 爬取時間戳 */
  scrapedAt: Date;
}

/**
 * AI 解析請求
 */
export interface AIParseRequest {
  /** 品牌名稱 */
  brandName: string;
  /** 第一層 Markdown 內容 */
  listMarkdownContent: string;
  /** 第二層詳細 Markdown 內容 (可選) */
  detailMarkdownContent?: string;
  /** 產品連結資訊 (用於二層解析) */
  productLink?: ProductLink;
  /** 來源網址 */
  sourceUrl: string;
}

/**
 * AI 解析回應
 */
export interface AIParseResponse {
  /** 解析是否成功 */
  success: boolean;
  /** 產品清單 */
  products: ProductInfo[];
  /** 錯誤訊息 */
  errorMessage?: string;
  /** AI 使用的 token 數量 */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}