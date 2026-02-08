import { PrismaClient } from '@prisma/client';
export class SupabaseService {
    prisma;
    constructor() {
        this.prisma = new PrismaClient();
    }
    async saveScraperResult(result) {
        try {
            console.log(`💾 [DB] 準備儲存 ${result.brand.displayName} 的爬取結果...`);
            const slug = result.brand.name.toLowerCase().replace(/\s+/g, '-');
            const brand = await this.prisma.brand.findUnique({
                where: { slug: slug }
            });
            if (!brand) {
                console.error(`❌ [DB] 找不到品牌: ${result.brand.name} (slug: ${slug})`);
                return { success: false, error: `找不到品牌: ${result.brand.name}` };
            }
            const brandId = brand.id;
            let insertedCount = 0;
            let skippedCount = 0;
            const errors = [];
            const currentActiveProducts = await this.prisma.product.findMany({
                where: {
                    brandId: brandId,
                    status: 'available'
                },
                select: { id: true }
            });
            const activeProductIds = new Set(currentActiveProducts.map(p => p.id));
            console.log(`📋 [DB] 目前活躍產品數量: ${activeProductIds.size}`);
            for (const product of result.products) {
                try {
                    let existingProduct = null;
                    if (product.originalName) {
                        existingProduct = await this.prisma.product.findFirst({
                            where: {
                                brandId: brandId,
                                nameJp: product.originalName
                            }
                        });
                    }
                    if (existingProduct) {
                        activeProductIds.delete(existingProduct.id);
                        console.log(`📝 [DB] 更新產品: ${product.translatedName} (ID: ${existingProduct.id})`);
                        await this.prisma.product.update({
                            where: { id: existingProduct.id },
                            data: {
                                name: product.translatedName,
                                nameJp: product.originalName,
                                description: product.translatedName,
                                price: product.price ? new Decimal(product.price.amount) : null,
                                currency: product.price?.currency || 'JPY',
                                imageUrls: product.imageUrl ? [product.imageUrl] : [],
                                availableStartDate: this.parseDateString(product.releaseDate),
                                metadata: {
                                    ...(existingProduct.metadata || {}),
                                    original_name: product.originalName,
                                    price_note: product.price?.note,
                                    crawled_at: result.scrapedAt.toISOString(),
                                    brand_info: result.brand
                                },
                                status: 'available',
                                lastVerifiedAt: new Date(),
                                updatedAt: new Date()
                            }
                        });
                        skippedCount++;
                    }
                    else {
                        console.log(`✨ [DB] 新增產品: ${product.translatedName}`);
                        await this.prisma.product.create({
                            data: {
                                name: product.translatedName,
                                nameJp: product.originalName,
                                description: product.translatedName,
                                brandId: brandId,
                                price: product.price ? new Decimal(product.price.amount) : null,
                                currency: product.price?.currency || 'JPY',
                                imageUrls: product.imageUrl ? [product.imageUrl] : [],
                                availableStartDate: this.parseDateString(product.releaseDate),
                                status: 'available',
                                sourceUrl: product.sourceUrl || result.brand.url,
                                sourceIdentifier: `${result.brand.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                scrapedAt: result.scrapedAt,
                                lastVerifiedAt: result.scrapedAt,
                                tags: ['新品'],
                                metadata: {
                                    original_name: product.originalName,
                                    price_note: product.price?.note,
                                    crawled_at: result.scrapedAt.toISOString(),
                                    brand_info: result.brand
                                }
                            }
                        });
                        insertedCount++;
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
                    console.error(`❌ [DB] 處理產品例外: ${errorMessage}`);
                    errors.push(`處理產品 ${product.translatedName} 失敗`);
                }
            }
            if (result.products.length > 0 && activeProductIds.size > 0) {
                console.log(`🍂 [DB] 標記 ${activeProductIds.size} 個產品為下架...`);
                const expiredIds = Array.from(activeProductIds);
                await this.prisma.product.updateMany({
                    where: { id: { in: expiredIds } },
                    data: {
                        status: 'sold_out',
                        updatedAt: new Date()
                    }
                });
            }
            await this.recordCrawlerRun(result, insertedCount, skippedCount, errors, brandId);
            return {
                success: errors.length === 0,
                inserted: insertedCount > 0,
                error: errors.length > 0 ? errors.join('; ') : undefined
            };
        }
        catch (error) {
            console.error('❌ [DB] 儲存過程發生錯誤:', error);
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
                return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
            }
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? null : date;
        }
        catch (_e) {
            return null;
        }
    }
    async recordCrawlerRun(_result, insertedCount, updatedCount, errors, _brandId) {
        try {
            console.log(`📊 [DB] 爬蟲統計 - 新增: ${insertedCount}, 更新: ${updatedCount}, 錯誤: ${errors.length}`);
        }
        catch (_e) {
            console.warn('Log run failed', _e);
        }
    }
    async clearBrandProducts(brandName) {
        try {
            console.log(`🗑️ [DB] 準備清除品牌 ${brandName} 的所有產品...`);
            const slug = brandName.toLowerCase().replace(/\s+/g, '-');
            const brand = await this.prisma.brand.findUnique({
                where: { slug: slug }
            });
            if (!brand) {
                return { success: false, deletedCount: 0, error: `找不到品牌: ${brandName} (slug: ${slug})` };
            }
            const result = await this.prisma.product.deleteMany({
                where: { brandId: brand.id }
            });
            console.log(`✅ [DB] 已刪除 ${result.count} 筆產品資料`);
            return { success: true, deletedCount: result.count };
        }
        catch (error) {
            console.error('❌ [DB] 清除產品過程發生錯誤:', error);
            return {
                success: false,
                deletedCount: 0,
                error: error instanceof Error ? error.message : '未知錯誤'
            };
        }
    }
}
import { Decimal } from '@prisma/client/runtime/library';
export function createSupabaseService() {
    return new SupabaseService();
}
//# sourceMappingURL=supabase.js.map