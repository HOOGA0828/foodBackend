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
            let insertedCount = 0;
            let skippedCount = 0;
            const errors = [];
            for (const product of result.products) {
                try {
                    const { data: existingProduct } = await this.supabase
                        .from('products')
                        .select('id')
                        .eq('source_url', product.sourceUrl || result.brand.url)
                        .eq('name', product.translatedName)
                        .single();
                    if (existingProduct) {
                        const updateData = {
                            description: product.translatedName,
                            price: product.price?.amount || null,
                            currency: product.price?.currency || 'JPY',
                            image_urls: product.imageUrl ? [product.imageUrl] : [],
                            available_start_date: this.parseDateString(product.releaseDate),
                            is_new_product: product.isNew || true,
                            updated_at: new Date().toISOString(),
                            last_verified_at: new Date().toISOString(),
                            allergens: product.allergens || [],
                            scraped_at: result.scrapedAt.toISOString(),
                            crawled_from: result.brand.name
                        };
                        const { error: updateError } = await this.supabase
                            .from('products')
                            .update(updateData)
                            .eq('id', existingProduct.id);
                        if (updateError) {
                            errors.push(`更新產品 ${product.translatedName} 失敗: ${updateError.message}`);
                        }
                        else {
                            skippedCount++;
                        }
                    }
                    else {
                        const insertData = {
                            name: product.translatedName,
                            description: product.translatedName,
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
                            tags: ['新品'],
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
                            errors.push(`插入產品 ${product.translatedName} 失敗: ${insertError.message}`);
                        }
                        else {
                            insertedCount++;
                        }
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
                    errors.push(`處理產品 ${product.translatedName} 時發生錯誤: ${errorMessage}`);
                }
            }
            await this.recordCrawlerRun(result, insertedCount, skippedCount, errors);
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
        }
        catch (error) {
            console.error('❌ [Supabase] 儲存過程發生錯誤:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '未知錯誤'
            };
        }
    }
    parseDateString(dateString) {
        if (!dateString)
            return null;
        try {
            const match = dateString.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
            if (match && match[1] && match[2] && match[3]) {
                const year = match[1];
                const month = match[2];
                const day = match[3];
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? null : date;
        }
        catch {
            return null;
        }
    }
    async recordCrawlerRun(result, insertedCount, updatedCount, errors) {
        try {
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
        }
        catch (error) {
            console.warn('⚠️ [Supabase] 記錄爬蟲執行結果失敗:', error);
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