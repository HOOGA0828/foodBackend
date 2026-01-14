import 'dotenv/config';
import { createSupabaseService } from '../services/supabase.ts';
async function main() {
    console.log("🚀 Testing Supabase Save Logic with name_jp...");
    const service = createSupabaseService();
    if (!service) {
        console.error("❌ No Supabase service");
        return;
    }
    const product = {
        originalName: "テスト商品",
        translatedName: "Test Product " + Date.now(),
        price: { amount: 100, currency: "JPY" },
        imageUrl: "https://example.com/test.jpg",
        sourceUrl: "https://example.com/product/" + Date.now(),
        isNew: true,
        allergens: [],
        releaseDate: "2026年01月01日"
    };
    const result = {
        brand: {
            name: "7-Eleven",
            displayName: "7-Eleven",
            url: "https://www.sej.co.jp/",
            category: "convenience_store"
        },
        products: [product],
        scrapedAt: new Date(),
        executionTime: 100,
        productsCount: 1
    };
    const saveResult = await service.saveScraperResult(result);
    console.log("💾 Save Result:", JSON.stringify(saveResult, null, 2));
    if (saveResult.success && saveResult.inserted) {
        console.log("✅ Insert Successful! Name_jp column likely exists.");
    }
    else {
        console.log("❌ Insert Failed or Skipped.");
    }
}
main().catch(console.error);
//# sourceMappingURL=test-save-logic.js.map