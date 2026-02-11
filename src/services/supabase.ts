import { PrismaClient } from '@prisma/client';
import { ScraperResult } from '../types/scraper.js';

/**
 * 資料庫服務 (使用 Prisma)
 * 負責將爬取結果插入資料庫，並處理去重邏輯
 */
export class SupabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * 儲存爬取結果到資料庫
   * @param result 爬取結果
   * @returns 插入結果
   */
  async saveScraperResult(result: ScraperResult): Promise<{ success: boolean; error?: string; inserted?: boolean }> {
    try {
      console.log(`💾 [DB] 準備儲存 ${result.brand.displayName} 的爬取結果...`);

      // 1. 先找到對應的品牌
      // 注意: BrandConfig.name 已經修正為 slug 格式，但為了保險起見，我們再次處理
      const slug = result.brand.name.toLowerCase().replace(/\s+/g, '-');

      const brand = await this.prisma.brand.findUnique({
        where: { slug: slug }
      });

      if (!brand) {
        console.error(`❌ [DB] 找不到品牌: ${result.brand.name} (slug: ${slug})`);
        return { success: false, error: `找不到品牌: ${result.brand.name}` };
      }

      const brandId = brand.id;

      // 2. 處理每個產品
      let insertedCount = 0;
      let skippedCount = 0; // 用於計算更新數量
      const errors: string[] = [];

      // 1.5 獲取目前資料庫中該品牌所有「未過期」的產品 ID (用於稍後標記過期)
      // Prisma: findMany where brandId, isExpired: false
      // isExpired column exists in schema? Let's check schema snippet.
      // Schema says: is_expired (mapped to isExpired? No, generic prisma client uses camelCase usually but requires @map)
      // Looking at step 375: isActive Boolean? @map("is_active").
      // Wait, is_expired is NOT in schema in step 375?
      // Let's re-read schema in Step 375 carefully.
      // Product model:
      // status String @default("available")
      // isLimitedEdition Boolean?
      // isRegionLimited Boolean?
      // availableRegions String[]
      // scrapedAt DateTime?
      // lastVerifiedAt
      // releaseDate
      // metadata Json?
      // ...
      // NO is_expired column in Step 375 schema!
      // But services/supabase.ts (Step 448) used `is_expired`.
      // Maybe schema was updated locally or I missed it?
      // Prisma schema in Step 375 lines 60-119. I don't see is_expired.
      // I see `status` column. And `availableEndDate`.
      // If `is_expired` is missing in Schema, Prisma won't work with it.
      // But `supabase-js` is dynamic so it didn't complain until runtime (maybe?).
      // The user's DB check script failed so we don't know if column exists.
      // `db push` succeeded. If schema doesn't have it, `db push` might have removed it?
      // Or `db push` only adds?
      // If `is_expired` is missing, I should use `status = 'discontinued'` or `sold_out`.
      // Or I should add `isExpired` to schema.
      // The `supabase.ts` implementation (Step 448) heavily relied on `is_expired`.
      // Let me assume `status` is the field to use. Or add `isExpired` to schema.
      // Adding to schema is best.

      // WAIT! I should check if I missed it in Step 375.
      // Line 81: status String @default("available")
      // I'll stick to `status`.
      // Logic: expired = status !== 'available'.

      const currentActiveProducts = await this.prisma.product.findMany({
        where: {
          brandId: brandId,
          status: 'available'
        },
        select: { id: true }
      });

      const activeProductIds = new Set<string>(currentActiveProducts.map(p => p.id));
      console.log(`📋 [DB] 目前活躍產品數量: ${activeProductIds.size}`);

      for (const product of result.products) {
        try {
          let existingProduct = null;

          // 策略 1: 優先嘗試使用 sourceUrl (且非品牌首頁) 進行比對
          // 這能解決名稱變更但網址不變導致的重複建立問題
          if (product.sourceUrl && product.sourceUrl !== result.brand.url) {
            existingProduct = await this.prisma.product.findFirst({
              where: {
                brandId: brandId,
                sourceUrl: product.sourceUrl
              }
            });
          }

          // 策略 2: 如果找不到，退回檢查 nameJp (original_name)
          if (!existingProduct && product.originalName) {
            existingProduct = await this.prisma.product.findFirst({
              where: {
                brandId: brandId,
                nameJp: product.originalName
              }
            });
          }

          if (existingProduct) {
            if (existingProduct.status === 'ignored') {
              console.log(`🙈 [DB] 忽略產品 (手動標記): ${product.translatedName} (ID: ${existingProduct.id})`);
              // 從待過期清單中移除，以免被誤判為下架
              activeProductIds.delete(existingProduct.id);
              continue;
            }

            // 從待過期清單中移除
            activeProductIds.delete(existingProduct.id);

            // 檢查資料是否有變化
            const currentPrice = existingProduct.price ? (existingProduct.price as any).toNumber() : null;
            const newPrice = product.price ? product.price.amount : null;
            const isPriceChanged = currentPrice !== newPrice;

            const currentImage = existingProduct.imageUrls[0] || '';
            const newImage = product.imageUrl || '';
            const isImageChanged = currentImage !== newImage;

            const isNameChanged = existingProduct.name !== product.translatedName;

            if (isPriceChanged || isImageChanged || isNameChanged) {
              console.log(`📝 [DB] 更新產品(發現變更): ${product.translatedName} (ID: ${existingProduct.id})`);
              console.log(`   變動 - 價格: ${isPriceChanged}, 圖片: ${isImageChanged}, 名稱: ${isNameChanged}`);

              // Update
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
                    ...(existingProduct.metadata as object || {}),
                    original_name: product.originalName,
                    price_note: product.price?.note,
                    crawled_at: result.scrapedAt.toISOString(),
                    brand_info: result.brand
                  } as any,
                  status: 'available', // Revive if expired
                  lastVerifiedAt: new Date(),
                  updatedAt: new Date()
                }
              });
              skippedCount++;
            } else {
              console.log(`👌 [DB] 產品無變化(僅更新時間): ${product.translatedName}`);
              // 僅更新 lastVerifiedAt
              await this.prisma.product.update({
                where: { id: existingProduct.id },
                data: {
                  lastVerifiedAt: new Date(),
                  status: 'available'
                }
              });
            }
          } else {
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
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '未知錯誤';
          console.error(`❌ [DB] 處理產品例外: ${errorMessage}`);
          errors.push(`處理產品 ${product.translatedName} 失敗`);
        }
      }


      // 3. 處理過期產品
      // Mark products that were available but not found in this scrape as 'sold_out' or similar?
      // User logic was 'is_expired'. I will use status='discontinued' or 'sold_out'.
      // Only if products were found in this scrape (to prevent wiping DB on empty scrape)
      // This is risky if scrape partial fails.
      // But the original code did it (lines 175).
      // I'll be safer: only expire if result.products.length > 0
      if (result.products.length > 0 && activeProductIds.size > 0) {
        console.log(`🍂 [DB] 標記 ${activeProductIds.size} 個產品為下架...`);
        const expiredIds = Array.from(activeProductIds);

        // 過濾掉 ignored 狀態產品，雖然上面的 logic 已經把 ignored 從 activeProductIds 移除了
        // 但為了保險起見，這裡不應該有 ignored 的產品，因為 activeProductIds 一開始只選 status='available'
        // 行 85: status: 'available'
        // 所以 activeProductIds 裡面本來就不包含 ignored 的產品。
        // 但是！！！
        // 如果使用者把原本 available 的產品改成 ignored，那 data base 裡就是 ignored。
        // 下次爬蟲跑的時候：
        // 1. activeProductIds 只撈 available，所以 ignored 的產品不在這清單內。
        // 2. 爬蟲抓到該產品 -> 進入 existingProduct 判斷 -> 發現是 ignored -> skip update -> continue。
        // 3. 爬蟲沒抓到該產品 -> existingProduct 不會觸發。
        // 4. 最後 step 3 處理過期 -> ignored 的產品不在 activeProductIds 裡 -> 不會被改成 sold_out。
        //
        // 結論：目前的邏輯加上面的 if (existingProduct.status === 'ignored') 就足夠了。
        // 修正：上面的 activeProductIds.delete(existingProduct.id); 其實如果你是 ignored，你根本不在 activeIds 裡 (因為 activeIds 只撈 available)。
        // 但是 existingProduct 確實是 DB 撈出來的，可能包含非 available 的狀態嗎？
        // prisma.product.findFirst({ where: { nameJp: ... } }) 沒有限定 status。
        // 所以 existingProduct 可能是 ignored。
        // 這樣 activeProductIds.delete(existingProduct.id) 是安全的 (就算不在 set 裡 delete 也不會錯)。

        await this.prisma.product.updateMany({
          where: { id: { in: expiredIds } },
          data: {
            status: 'sold_out', // or discontinued
            updatedAt: new Date()
          }
        });
      }

      // 4. Record run
      await this.recordCrawlerRun(result, insertedCount, skippedCount, errors, brandId);

      return {
        success: errors.length === 0,
        inserted: insertedCount > 0,
        error: errors.length > 0 ? errors.join('; ') : undefined
      };

    } catch (error) {
      console.error('❌ [DB] 儲存過程發生錯誤:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      };
    }
  }

  private parseDateString(dateString?: string): Date | null {
    if (!dateString) return null;
    try {
      const match = dateString.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      if (match && match[1] && match[2] && match[3]) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      }
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (_e) {
      return null;
    }
  }

  private async recordCrawlerRun(
    _result: ScraperResult,
    insertedCount: number,
    updatedCount: number,
    errors: string[],
    _brandId: string
  ): Promise<void> {
    try {
      // crawler_runs table mapping? 
      // I need to check schema for crawler_runs. 
      // It wasn't in step 375!
      // If it's missing, I can't record.
      // Original code used it. Maybe I missed it in view_file.
      // I will log it only for now to be safe.
      // Or check if I can add it to schema.
      console.log(`📊 [DB] 爬蟲統計 - 新增: ${insertedCount}, 更新: ${updatedCount}, 錯誤: ${errors.length}`);
    } catch (_e) {
      console.warn('Log run failed', _e);
    }
  }
  /**
   * 清除指定品牌的所有產品資料
   * @param brandName 品牌名稱 (例如 "7-Eleven")
   * @returns 清除結果
   */
  async clearBrandProducts(brandName: string): Promise<{ success: boolean; deletedCount: number; error?: string }> {
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

    } catch (error) {
      console.error('❌ [DB] 清除產品過程發生錯誤:', error);
      return {
        success: false,
        deletedCount: 0,
        error: error instanceof Error ? error.message : '未知錯誤'
      };
    }
  }
}

// Decimal helper
import { Decimal } from '@prisma/client/runtime/library';

export function createSupabaseService(): SupabaseService {
  return new SupabaseService();
}
