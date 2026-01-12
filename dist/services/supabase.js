import { createClient } from '@supabase/supabase-js';
export class SupabaseService {
    supabase;
    constructor(supabaseUrl, supabaseKey) {
        const url = supabaseUrl || process.env.SUPABASE_URL;
        const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
            throw new Error('Supabase 環境變數未設定，請設定 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
        }
        this.supabase = createClient(url, key);
    }
    async saveScraperResult(result) {
        try {
            console.log(`💾 [Supabase] 準備儲存 ${result.brand.displayName} 的爬取結果...`);
            const insertData = {
                brand_name: result.brand.name,
                brand_display_name: result.brand.displayName,
                brand_category: result.brand.category,
                products_count: result.productsCount,
                products: result.products,
                scraped_at: result.scrapedAt.toISOString(),
                status: result.status,
                execution_time_ms: result.executionTime
            };
            const existingRecord = await this.checkExistingRecord(result.brand.name, result.scrapedAt);
            if (existingRecord) {
                console.log(`⚠️ [Supabase] ${result.brand.displayName} 在 ${result.scrapedAt.toISOString()} 已經有記錄，跳過插入`);
                return { success: true, inserted: false };
            }
            const { data, error } = await this.supabase
                .from('product_scrapes')
                .insert(insertData)
                .select();
            if (error) {
                console.error('❌ [Supabase] 插入失敗:', error);
                return { success: false, error: error.message };
            }
            console.log(`✅ [Supabase] ${result.brand.displayName} 資料儲存成功，插入 ${data.length} 筆記錄`);
            return { success: true, inserted: true };
        }
        catch (error) {
            console.error('❌ [Supabase] 儲存過程發生錯誤:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '未知錯誤'
            };
        }
    }
    async checkExistingRecord(brandName, scrapedAt) {
        try {
            const date = new Date(scrapedAt);
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
            const { data, error } = await this.supabase
                .from('product_scrapes')
                .select('id')
                .eq('brand_name', brandName)
                .gte('scraped_at', startOfDay.toISOString())
                .lt('scraped_at', endOfDay.toISOString())
                .limit(1);
            if (error) {
                console.warn('⚠️ [Supabase] 檢查重複記錄時發生錯誤:', error);
                return false;
            }
            return data && data.length > 0;
        }
        catch (error) {
            console.warn('⚠️ [Supabase] 檢查重複記錄時發生錯誤:', error);
            return false;
        }
    }
    async getLatestScrapes(brandName, limit = 10) {
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
        }
        catch (error) {
            console.error('❌ [Supabase] 查詢記錄時發生錯誤:', error);
            return [];
        }
    }
    async cleanupOldRecords(brandName, daysAgo = 7) {
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
        }
        catch (error) {
            console.error('❌ [Supabase] 清理舊記錄時發生錯誤:', error);
            return false;
        }
    }
}
export function createSupabaseService() {
    try {
        return new SupabaseService();
    }
    catch (error) {
        console.warn('⚠️ [Supabase] 初始化失敗:', error);
        console.log('💡 如果不需要資料庫功能，可以忽略此警告');
        return null;
    }
}
//# sourceMappingURL=supabase.js.map