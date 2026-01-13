import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ScraperResult } from '../types/scraper.js';

/**
 * Supabase 資料庫服務
 * 負責將爬取結果插入資料庫，並處理去重邏輯
 */
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(
    supabaseUrl?: string,
    supabaseKey?: string
  ) {
    const url = supabaseUrl || process.env.SUPABASE_URL;
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Supabase 環境變數未設定，請設定 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
    }

    this.supabase = createClient(url, key);
  }

  /**
   * 儲存爬取結果到資料庫（新設計：將個別產品儲存到 products 表）
   * @param result 爬取結果
   * @returns 插入結果
   */
  async saveScraperResult(result: ScraperResult): Promise<{ success: boolean; error?: string; inserted?: boolean }> {
    try {
      console.log(`💾 [Supabase] 準備儲存 ${result.brand.displayName} 的爬取結果...`);

      // 1. 先找到對應的品牌
      const { data: brandData, error: brandError } = await this.supabase
        .from('brands')
        .select('id')
        .eq('slug', result.brand.name.toLowerCase().replace(/\s+/g, '-'))
        .single();

      if (brandError || !brandData) {
        console.error(`❌ [Supabase] 找不到品牌: ${result.brand.name}`, brandError);
        return { success: false, error: `找不到品牌: ${result.brand.name}` };
      }

      const brandId = brandData.id;

      // 2. 處理每個產品
      let insertedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      for (const product of result.products) {
        try {
          // 檢查產品是否已存在
          // 優先使用 metadata 中的 original_name 進行比對 (如果有的話)
          let existingProduct_ = null;

          if (product.originalName) {
            // 使用原始名稱查
            const { data: byOriginalName } = await this.supabase
              .from('products')
              .select('id')
              .eq('source_url', product.sourceUrl || result.brand.url)
              // 注意: JSONB 查詢語法視 Supabase/Postgres 版本而定，這裡使用 contains 或 textSearch 可能較慢
              // 簡單起見，我們假設 source_url 足夠唯一，或者在 memory 中過濾?
              // 但為了嚴謹，我們嘗試匹配 metadata->original_name
              // .eq('metadata->>original_name', product.originalName) // Supabase JS 客戶端支援這種語法
              .filter('metadata->>original_name', 'eq', product.originalName)
              .maybeSingle(); // 使用 maybeSingle 避免多筆報錯，若有多筆則視為已存在

            existingProduct_ = byOriginalName;
          }

          // 如果沒找到，退回使用 name (translatedName)
          if (!existingProduct_) {
            const { data: byName } = await this.supabase
              .from('products')
              .select('id')
              .eq('source_url', product.sourceUrl || result.brand.url)
              .eq('name', product.translatedName)
              .maybeSingle();
            existingProduct_ = byName;
          }

          // 如果還是沒找到，且 source_url 是獨特的 (非列表頁)，嘗試僅用 source_url
          // 只有當 product.sourceUrl 不等於 brand.url (列表頁) 時才這樣做
          if (!existingProduct_ && product.sourceUrl && product.sourceUrl !== result.brand.url) {
            const { data: byUrl } = await this.supabase
              .from('products')
              .select('id')
              .eq('source_url', product.sourceUrl)
              .maybeSingle();
            // 注意: 這有風險，如果 URL 指向同一個頁面但不同產品(例如錨點不同?)。
            // 假設 scraper 處理好了 hash。
            if (byUrl) existingProduct_ = byUrl;
          }

          if (existingProduct_) {
            console.log(`📝 [Supabase] 更新產品: ${product.translatedName} (ID: ${existingProduct_.id})`);
            // 產品已存在，更新它
            const updateData = {
              // name: product.translatedName, 
              description: product.translatedName,
              name_jp: product.originalName, // 更新日文名稱
              price: product.price?.amount || null,
              currency: product.price?.currency || 'JPY',
              image_urls: product.imageUrl ? [product.imageUrl] : [],
              available_start_date: this.parseDateString(product.releaseDate),
              is_new_product: product.isNew || true,
              updated_at: new Date().toISOString(),
              last_verified_at: new Date().toISOString(),
              allergens: product.allergens || [],
              scraped_at: result.scrapedAt.toISOString(),
              crawled_from: result.brand.name,
              // 更新 metadata
              metadata: {
                original_name: product.originalName,
                price_note: product.price?.note,
                crawled_at: result.scrapedAt.toISOString(),
                brand_info: result.brand
              }
            };

            const { error: updateError } = await this.supabase
              .from('products')
              .update(updateData)
              .eq('id', existingProduct_.id);

            if (updateError) {
              console.error(`❌ [Supabase] 更新失敗: ${updateError.message}`);
              errors.push(`更新產品 ${product.translatedName} 失敗: ${updateError.message}`);
            } else {
              skippedCount++;
            }
          } else {
            console.log(`✨ [Supabase] 新增產品: ${product.translatedName}`);
            // 插入新產品
            const insertData = {
              name: product.translatedName,
              name_jp: product.originalName, // 插入日文名稱
              description: product.translatedName, // 主要欄位
              brand_id: brandId,
              price: product.price?.amount || null,
              currency: product.price?.currency || 'JPY',
              image_urls: product.imageUrl ? [product.imageUrl] : [],
              available_start_date: this.parseDateString(product.releaseDate),
              is_new_product: product.isNew || true,
              status: 'available',
              source_url: product.sourceUrl || result.brand.url,
              source_identifier: `${result.brand.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              scraped_at: result.scrapedAt.toISOString(),
              last_verified_at: result.scrapedAt.toISOString(),
              crawled_from: result.brand.name,
              allergens: product.allergens || [],
              tags: ['新品'], // 標籤
              metadata: {
                original_name: product.originalName,
                price_note: product.price?.note,
                crawled_at: result.scrapedAt.toISOString(),
                brand_info: result.brand
              }
            };

            const { error: insertError } = await this.supabase
              .from('products')
              .insert(insertData);

            if (insertError) {
              console.error(`❌ [Supabase] 插入失敗: ${insertError.message}`);
              errors.push(`插入產品 ${product.translatedName} 失敗: ${insertError.message}`);
            } else {
              insertedCount++;
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '未知錯誤';
          console.error(`❌ [Supabase] 處理例外: ${errorMessage}`);
          errors.push(`處理產品 ${product.translatedName} 時發生錯誤: ${errorMessage}`);
        }
      }

      // 3. 記錄爬蟲執行結果
      await this.recordCrawlerRun(result, insertedCount, skippedCount, errors);

      // 4. 總結
      const hasErrors = errors.length > 0;

      console.log(`📊 [Supabase] ${result.brand.displayName} 儲存完成:`);
      console.log(`   ✅ 新增產品: ${insertedCount} 個`);
      console.log(`   ⚠️  更新產品: ${skippedCount} 個`);
      console.log(`   ❌ 錯誤產品: ${errors.length} 個`);

      if (hasErrors) {
        console.log('   錯誤詳情:');
        errors.slice(0, 3).forEach(error => console.log(`     - ${error}`));
        if (errors.length > 3) {
          console.log(`     ...還有 ${errors.length - 3} 個錯誤`);
        }
      }

      return {
        success: !hasErrors || insertedCount > 0,
        inserted: insertedCount > 0,
        error: hasErrors ? errors.join('; ') : undefined
      };

    } catch (error) {
      console.error('❌ [Supabase] 儲存過程發生錯誤:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      };
    }
  }

  /**
   * 解析日期字串為 Date 物件
   * @param dateString 日期字串（如 "2026年01月06日"）
   * @returns Date 物件或 null
   */
  private parseDateString(dateString?: string): Date | null {
    if (!dateString) return null;

    try {
      // 處理日文日期格式：2026年01月06日
      const match = dateString.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      if (match && match[1] && match[2] && match[3]) {
        const year = match[1];
        const month = match[2];
        const day = match[3];
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      // 嘗試其他常見格式
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  /**
   * 記錄爬蟲執行結果
   */
  private async recordCrawlerRun(
    result: ScraperResult,
    insertedCount: number,
    updatedCount: number,
    errors: string[]
  ): Promise<void> {
    try {
      // 找到品牌 ID
      const { data: brandData } = await this.supabase
        .from('brands')
        .select('id')
        .eq('slug', result.brand.name.toLowerCase().replace(/\s+/g, '-'))
        .single();

      const crawlerRunData = {
        brand_id: brandData?.id || null,
        brand_name: result.brand.displayName,
        status: errors.length > 0 ? 'partial_success' : 'success',
        started_at: new Date(result.scrapedAt.getTime() - result.executionTime),
        completed_at: result.scrapedAt,
        duration_ms: result.executionTime,
        products_found: result.productsCount,
        products_updated: updatedCount,
        products_new: insertedCount,
        error_message: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
        metadata: {
          brand_category: result.brand.category,
          has_errors: errors.length > 0,
          error_count: errors.length
        }
      };

      await this.supabase
        .from('crawler_runs')
        .insert(crawlerRunData);

    } catch (error) {
      console.warn('⚠️ [Supabase] 記錄爬蟲執行結果失敗:', error);
      // 不阻擋主要流程
    }
  }

  /**
   * 獲取最新的爬取記錄
   * @param brandName 品牌名稱 (可選)
   * @param limit 限制數量
   * @returns 爬取記錄列表
   */
  async getLatestScrapes(brandName?: string, limit: number = 10) {
    try {
      let query = this.supabase
        .from('product_scrapes')
        .select('*')
        .order('scraped_at', { ascending: false })
        .limit(limit);

      if (brandName) {
        query = query.eq('brand_name', brandName);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [Supabase] 查詢記錄失敗:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('❌ [Supabase] 查詢記錄時發生錯誤:', error);
      return [];
    }
  }

  /**
   * 刪除指定品牌的所有產品資料（用於重置測試）
   * @param brandName 品牌名稱
   */
  async clearBrandProducts(brandName: string): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
      console.log(`🗑️ [Supabase] 準備刪除 ${brandName} 的所有產品...`);

      // 1. 找到品牌 ID
      const { data: brandData, error: brandError } = await this.supabase
        .from('brands')
        .select('id')
        .eq('slug', brandName.toLowerCase().replace(/\s+/g, '-'))
        .single();

      if (brandError || !brandData) {
        console.warn(`⚠️ [Supabase] 找不到品牌 ${brandName}，嘗試直接用 crawl_from 刪除?`);
        // 備用方案: 直接用 crawled_from 刪除? 但 products 表關聯的是 brand_id
        // 這裡假設 brands table 必須有資料
        return { success: false, error: `找不到品牌: ${brandName}` };
      }

      // 2. 刪除該品牌的所有產品
      const { count, error: deleteError } = await this.supabase
        .from('products')
        .delete({ count: 'exact' })
        .eq('brand_id', brandData.id);

      if (deleteError) {
        console.error(`❌ [Supabase] 刪除失敗:`, deleteError);
        return { success: false, error: deleteError.message };
      }

      console.log(`✅ [Supabase] 已刪除 ${brandName} 的 ${count} 筆產品資料`);
      return { success: true, deletedCount: count || 0 };

    } catch (error) {
      console.error(`❌ [Supabase] 清除過程發生錯誤:`, error);
      return { success: false, error: error instanceof Error ? error.message : '未知錯誤' };
    }
  }

  /**
   * 刪除指定條件的記錄（用於測試清理）
   * @param brandName 品牌名稱
   * @param daysAgo 刪除幾天前的記錄
   */
  async cleanupOldRecords(brandName: string, daysAgo: number = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

      const { error } = await this.supabase
        .from('product_scrapes')
        .delete()
        .eq('brand_name', brandName)
        .lt('scraped_at', cutoffDate.toISOString());

      if (error) {
        console.error('❌ [Supabase] 清理舊記錄失敗:', error);
        return false;
      }

      console.log(`🧹 [Supabase] 舊記錄清理完成`);
      return true;

    } catch (error) {
      console.error('❌ [Supabase] 清理舊記錄時發生錯誤:', error);
      return false;
    }
  }
}

/**
 * 建立 Supabase 服務實例
 */
export function createSupabaseService(): SupabaseService | null {
  try {
    return new SupabaseService();
  } catch (error) {
    console.warn('⚠️ [Supabase] 初始化失敗:', error);
    console.log('💡 如果不需要資料庫功能，可以忽略此警告');
    return null;
  }
}