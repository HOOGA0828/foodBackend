
import 'dotenv/config';
import { createAIParserService } from './services/aiParser.js';
import { createWebScraper } from './scraper/scraper.js';
import { getBrandByName } from './config/brands.js';
import { createSupabaseService } from './services/supabase.js';

async function runRealScraper() {
    console.log('🚀 Running Real Yoshinoya Scraper (Saving to DB)...');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('❌ Missing OPENAI_API_KEY');
        process.exit(1);
    }

    const aiParser = createAIParserService(apiKey);
    const scraper = createWebScraper(aiParser);
    const supabaseService = createSupabaseService();

    if (!supabaseService) {
        console.error("❌ Failed to init Supabase Service");
        process.exit(1);
    }

    const brandName = 'yoshinoya';
    const brandConfig = getBrandByName(brandName);

    if (!brandConfig) {
        console.error(`❌ Brand ${brandName} not found in config`);
        process.exit(1);
    }

    try {
        const result = await scraper.scrapeAndParseBrand(brandConfig);

        console.log(`✅ Scrape Complete. Found ${result.productsCount} products.`);

        if (result.products.length > 0) {
            console.log(`💾 Saving to Supabase...`);
            const saveResult = await supabaseService.saveScraperResult(result);
            console.log(`📦 Save Result:`, saveResult);
        } else {
            console.log(`⚠️ No products found, skipping save.`);
        }

    } catch (error) {
        console.error('❌ Execution Failed:', error);
    }
}

runRealScraper();
